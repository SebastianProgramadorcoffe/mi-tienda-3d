// ── Configuración de Wompi ────────────────────────────────────────────────────
// Reemplaza esta llave por la de producción cuando tengas una cuenta real de
// Wompi (Panel Wompi → Desarrolladores → Llaves). Mientras empiece con
// "pub_test_" se usa automáticamente el ambiente sandbox.
export const WOMPI_LLAVE_PUBLICA = "pub_test_qCTBUTQbPHTf0FEvZWUqZzsprY6hCnEv";
export const WOMPI_URL_CHECKOUT = "https://checkout.wompi.co/p/";

const ES_SANDBOX = WOMPI_LLAVE_PUBLICA.startsWith("pub_test_");
const WOMPI_API_BASE = ES_SANDBOX ? "https://sandbox.wompi.co/v1" : "https://production.wompi.co/v1";

export type EstadoPedido = "pendiente" | "pagado" | "fallido" | "cancelado";

// Servicio que calcula la firma de integridad (ver servicio-firmas/). Wompi la
// exige en el Web Checkout y su secreto no puede estar en el navegador.
const URL_FIRMA = process.env.NEXT_PUBLIC_FIRMA_URL;

export class PagosNoConfiguradosError extends Error {}

export async function obtenerFirmaIntegridad(
  referencia: string,
  idToken: string,
): Promise<{ firma: string; montoCentavos: number }> {
  if (!URL_FIRMA) throw new PagosNoConfiguradosError("Falta NEXT_PUBLIC_FIRMA_URL");
  const res = await fetch(`${URL_FIRMA.replace(/\/$/, "")}/firma`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    body: JSON.stringify({ referencia }),
  });
  if (!res.ok) throw new Error(`No se pudo firmar el pago (HTTP ${res.status})`);
  const json = await res.json();
  if (typeof json?.firma !== "string" || typeof json?.montoCentavos !== "number") {
    throw new Error("Respuesta de firma inválida");
  }
  return { firma: json.firma, montoCentavos: json.montoCentavos };
}

// Wompi permite consultar el estado real de una transacción con un GET
// público (sin autenticación) usando el id que Wompi agrega al redirect.
// Nunca hay que confiar en los parámetros de la URL de vuelta: se pueden
// editar a mano, así que esto es lo único que determina si se pagó de verdad.
export async function obtenerEstadoTransaccion(transaccionId: string): Promise<{
  estado: EstadoPedido;
  estadoWompi: string;
  montoCentavos: number;
  referencia: string;
}> {
  // El id llega en la URL de retorno (editable), así que se codifica para
  // que no pueda apuntar a otra ruta de la API.
  const res = await fetch(`${WOMPI_API_BASE}/transactions/${encodeURIComponent(transaccionId)}`);
  if (!res.ok) throw new Error("No se pudo verificar la transacción con Wompi.");
  const json = await res.json();
  const estadoWompi: string = json?.data?.status ?? "ERROR";

  const mapa: Record<string, EstadoPedido> = {
    APPROVED: "pagado",
    DECLINED: "fallido",
    ERROR: "fallido",
    VOIDED: "cancelado",
    PENDING: "pendiente",
  };

  return {
    estado: mapa[estadoWompi] ?? "pendiente",
    estadoWompi,
    montoCentavos: Number(json?.data?.amount_in_cents ?? 0),
    referencia: String(json?.data?.reference ?? ""),
  };
}
