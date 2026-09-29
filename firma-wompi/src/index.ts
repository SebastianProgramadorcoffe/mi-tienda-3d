// Servicio mínimo que calcula la "firma de integridad" que Wompi exige en el
// Web Checkout. El secreto de integridad no puede vivir en el navegador, así
// que se guarda acá (secret de Cloudflare) y nunca sale del servidor.
//
// No usa credenciales de Firebase: lee el pedido con el token de la propia
// clienta, así Firestore aplica sus reglas (solo la dueña o el staff pueden
// leerlo) y el monto firmado es el total guardado en la base — que las reglas
// ya validaron contra los precios reales del catálogo —, nunca uno enviado
// por el navegador.

export interface Env {
  WOMPI_INTEGRITY_SECRET: string;
  FIREBASE_PROJECT_ID: string;
  ORIGENES_PERMITIDOS: string;
}

const MONEDA = "COP";
// Mismo formato que generarReferencia() en src/app/checkout/page.tsx.
const REFERENCIA_VALIDA = /^AURA-\d{13}-[A-Z0-9]{1,5}$/;

export async function calcularFirmaIntegridad(
  referencia: string,
  montoCentavos: number,
  moneda: string,
  secreto: string,
): Promise<string> {
  const datos = new TextEncoder().encode(`${referencia}${montoCentavos}${moneda}${secreto}`);
  const hash = await crypto.subtle.digest("SHA-256", datos);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function responder(cuerpo: unknown, estado: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(cuerpo), {
    status: estado,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function valorNumerico(campo: { integerValue?: string; doubleValue?: number } | undefined): number {
  if (!campo) return NaN;
  if (campo.integerValue !== undefined) return Number(campo.integerValue);
  if (campo.doubleValue !== undefined) return campo.doubleValue;
  return NaN;
}

export async function manejarSolicitud(
  request: Request,
  env: Env,
  fetchFn: typeof fetch = fetch,
): Promise<Response> {
  const origen = request.headers.get("Origin") ?? "";
  const permitidos = env.ORIGENES_PERMITIDOS.split(",").map((o) => o.trim());
  if (!permitidos.includes(origen)) {
    return new Response("Origen no permitido", { status: 403 });
  }
  const cors = {
    "Access-Control-Allow-Origin": origen,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST" || new URL(request.url).pathname !== "/firma") {
    return responder({ error: "Ruta no encontrada" }, 404, cors);
  }

  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return responder({ error: "Falta la sesión" }, 401, cors);

  let referencia: unknown;
  try {
    referencia = ((await request.json()) as { referencia?: unknown }).referencia;
  } catch {
    return responder({ error: "Cuerpo inválido" }, 400, cors);
  }
  if (typeof referencia !== "string" || !REFERENCIA_VALIDA.test(referencia)) {
    return responder({ error: "Referencia inválida" }, 400, cors);
  }

  const url =
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}` +
    `/databases/(default)/documents/pedidos/${encodeURIComponent(referencia)}`;
  const res = await fetchFn(url, { headers: { Authorization: `Bearer ${token}` } });

  if (res.status === 401 || res.status === 403) return responder({ error: "No autorizado" }, 403, cors);
  if (res.status === 404) return responder({ error: "Pedido no encontrado" }, 404, cors);
  if (!res.ok) return responder({ error: "No se pudo leer el pedido" }, 502, cors);

  const pedido = (await res.json()) as {
    fields?: { estado?: { stringValue?: string }; total?: { integerValue?: string; doubleValue?: number } };
  };
  if (pedido.fields?.estado?.stringValue !== "pendiente") {
    return responder({ error: "El pedido ya no está pendiente de pago" }, 409, cors);
  }
  const total = valorNumerico(pedido.fields?.total);
  const montoCentavos = Math.round(total * 100);
  if (!Number.isFinite(montoCentavos) || montoCentavos <= 0) {
    return responder({ error: "Total del pedido inválido" }, 422, cors);
  }

  const firma = await calcularFirmaIntegridad(referencia, montoCentavos, MONEDA, env.WOMPI_INTEGRITY_SECRET);
  return responder({ firma, montoCentavos, moneda: MONEDA }, 200, cors);
}

const worker = {
  fetch: (request: Request, env: Env) => manejarSolicitud(request, env),
};

export default worker;
