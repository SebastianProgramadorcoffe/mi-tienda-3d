// Servicio mínimo de firmas para la tienda (Cloudflare Worker, plan gratis).
// Guarda los secretos que no pueden vivir en el navegador:
//
//  POST /firma             → firma de integridad de Wompi para un pedido.
//  POST /firma-cloudinary  → firma de subida a Cloudinary, solo para staff.
//
// No usa credenciales de Firebase: lee Firestore con el token de quien llama,
// así las reglas de Firestore deciden qué puede leer (su propio pedido, su
// propio perfil) y el servicio nunca confía en datos enviados por el navegador.

export interface Env {
  FIREBASE_PROJECT_ID: string;
  ORIGENES_PERMITIDOS: string;
  WOMPI_INTEGRITY_SECRET: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
}

const MONEDA = "COP";
// Mismo formato que generarReferencia() en src/app/checkout/page.tsx.
const REFERENCIA_VALIDA = /^AURA-\d{13}-[A-Z0-9]{1,5}$/;
const CARPETA_CLOUDINARY = "aura-esencia";
const ROLES_STAFF = ["admin", "empleado"];

async function hashHex(algoritmo: "SHA-256" | "SHA-1", texto: string): Promise<string> {
  const hash = await crypto.subtle.digest(algoritmo, new TextEncoder().encode(texto));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function calcularFirmaIntegridad(
  referencia: string,
  montoCentavos: number,
  moneda: string,
  secreto: string,
): Promise<string> {
  return hashHex("SHA-256", `${referencia}${montoCentavos}${moneda}${secreto}`);
}

// Firma de Cloudinary: parámetros ordenados alfabéticamente, unidos con "&",
// con el api_secret concatenado al final, en SHA-1.
export function calcularFirmaCloudinary(parametros: Record<string, string | number>, apiSecret: string): Promise<string> {
  const serializado = Object.keys(parametros)
    .sort()
    .map((k) => `${k}=${parametros[k]}`)
    .join("&");
  return hashHex("SHA-1", `${serializado}${apiSecret}`);
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

// uid declarado en el token. No se verifica acá a propósito: Firestore
// verifica la firma del token al leer, y sus reglas solo dejan leer
// usuarios/{uid} al propio dueño o al staff.
export function uidDelToken(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const uid = json.user_id ?? json.sub;
    return typeof uid === "string" && /^[A-Za-z0-9]{1,128}$/.test(uid) ? uid : null;
  } catch {
    return null;
  }
}

function urlDocumento(env: Env, ruta: string): string {
  return (
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(env.FIREBASE_PROJECT_ID)}` +
    `/databases/(default)/documents/${ruta}`
  );
}

async function firmaWompi(
  request: Request,
  env: Env,
  token: string,
  cors: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<Response> {
  let referencia: unknown;
  try {
    referencia = ((await request.json()) as { referencia?: unknown }).referencia;
  } catch {
    return responder({ error: "Cuerpo inválido" }, 400, cors);
  }
  if (typeof referencia !== "string" || !REFERENCIA_VALIDA.test(referencia)) {
    return responder({ error: "Referencia inválida" }, 400, cors);
  }

  const res = await fetchFn(urlDocumento(env, `pedidos/${encodeURIComponent(referencia)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401 || res.status === 403) return responder({ error: "No autorizado" }, 403, cors);
  if (res.status === 404) return responder({ error: "Pedido no encontrado" }, 404, cors);
  if (!res.ok) return responder({ error: "No se pudo leer el pedido" }, 502, cors);

  const pedido = (await res.json()) as {
    fields?: { estado?: { stringValue?: string }; total?: { integerValue?: string; doubleValue?: number } };
  };
  if (pedido.fields?.estado?.stringValue !== "pendiente") {
    return responder({ error: "El pedido ya no está pendiente de pago" }, 409, cors);
  }
  const montoCentavos = Math.round(valorNumerico(pedido.fields?.total) * 100);
  if (!Number.isFinite(montoCentavos) || montoCentavos <= 0) {
    return responder({ error: "Total del pedido inválido" }, 422, cors);
  }

  const firma = await calcularFirmaIntegridad(referencia, montoCentavos, MONEDA, env.WOMPI_INTEGRITY_SECRET);
  return responder({ firma, montoCentavos, moneda: MONEDA }, 200, cors);
}

async function firmaCloudinary(
  env: Env,
  token: string,
  cors: Record<string, string>,
  fetchFn: typeof fetch,
): Promise<Response> {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return responder({ error: "Cloudinary no está configurado en el servicio" }, 503, cors);
  }
  const uid = uidDelToken(token);
  if (!uid) return responder({ error: "Sesión inválida" }, 401, cors);

  const res = await fetchFn(urlDocumento(env, `usuarios/${encodeURIComponent(uid)}`), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return responder({ error: "No autorizado" }, 403, cors);
  const perfil = (await res.json()) as { fields?: { rol?: { stringValue?: string } } };
  if (!ROLES_STAFF.includes(perfil.fields?.rol?.stringValue ?? "")) {
    return responder({ error: "Solo el staff puede subir archivos" }, 403, cors);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const firma = await calcularFirmaCloudinary({ folder: CARPETA_CLOUDINARY, timestamp }, env.CLOUDINARY_API_SECRET);
  return responder(
    {
      firma,
      timestamp,
      carpeta: CARPETA_CLOUDINARY,
      apiKey: env.CLOUDINARY_API_KEY,
      cloudName: env.CLOUDINARY_CLOUD_NAME,
    },
    200,
    cors,
  );
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

  const ruta = new URL(request.url).pathname;
  if (request.method !== "POST" || (ruta !== "/firma" && ruta !== "/firma-cloudinary")) {
    return responder({ error: "Ruta no encontrada" }, 404, cors);
  }

  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return responder({ error: "Falta la sesión" }, 401, cors);

  return ruta === "/firma"
    ? firmaWompi(request, env, token, cors, fetchFn)
    : firmaCloudinary(env, token, cors, fetchFn);
}

const worker = {
  fetch: (request: Request, env: Env) => manejarSolicitud(request, env),
};

export default worker;
