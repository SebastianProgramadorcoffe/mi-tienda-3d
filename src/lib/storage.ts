// ─── Subida de archivos a Cloudinary ──────────────────────────────────────────
// Firebase Storage exige plan Blaze (con tarjeta) incluso dentro del tier
// gratis, así que las imágenes y modelos 3D se suben directo desde el
// navegador a Cloudinary usando un "unsigned upload preset" — el patrón
// oficial de Cloudinary para apps 100% cliente (sin backend propio). El
// cloud name y el preset no son secretos: están hechos para vivir en el
// bundle del cliente.
import type { Modelo3D } from "../components/ui/product-reveal-card";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAX_MODELO_BYTES = 30 * 1024 * 1024;

export class ErrorSubida extends Error {}

function extensionDe(nombre: string) {
  return nombre.split(".").pop()?.toLowerCase() ?? "";
}

async function subirACloudinary(archivo: File, tipoRecurso: "image" | "raw"): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new ErrorSubida("Falta configurar Cloudinary (NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME / _UPLOAD_PRESET).");
  }

  const formData = new FormData();
  formData.append("file", archivo);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", "aura-esencia");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${tipoRecurso}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    throw new ErrorSubida("No se pudo subir el archivo. Intenta de nuevo.");
  }

  const data = await res.json();
  return data.secure_url as string;
}

export async function subirImagenProducto(archivo: File): Promise<string> {
  if (!archivo.type.startsWith("image/")) {
    throw new ErrorSubida("El archivo debe ser una imagen (JPG, PNG, WebP...).");
  }
  if (archivo.size > MAX_IMAGEN_BYTES) {
    throw new ErrorSubida("La imagen no puede superar 5MB.");
  }
  return subirACloudinary(archivo, "image");
}

export async function subirModelo3D(archivo: File): Promise<Modelo3D> {
  const ext = extensionDe(archivo.name);
  if (ext !== "glb" && ext !== "gltf") {
    throw new ErrorSubida("El modelo 3D debe ser un archivo .glb o .gltf.");
  }
  if (archivo.size > MAX_MODELO_BYTES) {
    throw new ErrorSubida("El modelo 3D no puede superar 30MB.");
  }
  const url = await subirACloudinary(archivo, "raw");
  return { url, tipo: ext };
}
