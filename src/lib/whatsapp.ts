// ─── Número de WhatsApp de la tienda ──────────────────────────────────────────
// Centralizado acá porque se usa en varios puntos del sitio (botón flotante,
// /contacto, /afiliacion) — así solo hace falta cambiarlo en un lugar cuando
// se reemplace por el número real.
// TODO: +57 300 123 4567 es un número de ejemplo — reemplazar por el número
// real de WhatsApp de la tienda antes de publicar en serio.
export const WHATSAPP_NUMERO = "573001234567";

export function whatsappHref(mensaje: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensaje)}`;
}
