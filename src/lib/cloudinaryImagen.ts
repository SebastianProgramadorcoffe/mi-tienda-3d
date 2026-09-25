// ─── Loader de imágenes para next/image + Cloudinary ─────────────────────────
// `output: "export"` no tiene el servidor de optimización de imágenes de
// Next (no hay servidor en producción), así que next/image necesita un
// "loader" propio — ver node_modules/next/dist/docs/01-app/02-guides/
// static-exports.md, sección "Image Optimization". Cloudinary ya hace ese
// trabajo gratis en su URL de entrega: convierte al formato más liviano que
// soporte el navegador (f_auto → WebP/AVIF), ajusta la calidad
// automáticamente (q_auto) y redimensiona al ancho que pida cada breakpoint
// (w_{width}) — así ninguna imagen del catálogo pesa más de lo necesario
// para el tamaño en que realmente se muestra, sin tener que re-subir nada.
const MARCADOR_SUBIDA = "/upload/";

export function urlCloudinaryOptimizada(src: string, ancho?: number, calidad: number | "auto" = "auto"): string {
  if (!src.includes("res.cloudinary.com") || !src.includes(MARCADOR_SUBIDA)) return src;
  const params = ["f_auto", "c_limit", `q_${calidad}`, ...(ancho ? [`w_${ancho}`] : [])].join(",");
  return src.replace(MARCADOR_SUBIDA, `${MARCADOR_SUBIDA}${params}/`);
}

export default function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  return urlCloudinaryOptimizada(src, width, quality ?? "auto");
}
