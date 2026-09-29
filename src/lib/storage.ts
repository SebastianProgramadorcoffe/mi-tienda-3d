// ─── Subida de archivos a Cloudinary ──────────────────────────────────────────
// Firebase Storage exige plan Blaze (con tarjeta), así que las imágenes y
// modelos 3D van a Cloudinary.
//
// Con NEXT_PUBLIC_FIRMA_URL configurado, cada subida va firmada por
// servicio-firmas/, que solo firma para staff: nadie más puede subir.
// Sin él se usa el "unsigned upload preset" — solo como respaldo temporal:
// ese preset es público (va en el bundle) y deja subir archivos a
// cualquiera. Borrarlo en Cloudinary en cuanto el servicio esté publicado.
import type { Modelo3D } from "../components/ui/product-reveal-card";
import { auth } from "./firebase";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const URL_FIRMA = process.env.NEXT_PUBLIC_FIRMA_URL;

interface FirmaSubida {
  firma: string;
  timestamp: number;
  carpeta: string;
  apiKey: string;
  cloudName: string;
}

async function pedirFirmaSubida(): Promise<FirmaSubida> {
  const usuario = auth.currentUser;
  if (!usuario) throw new ErrorSubida("Tu sesión expiró. Vuelve a iniciar sesión.");
  const res = await fetch(`${URL_FIRMA!.replace(/\/$/, "")}/firma-cloudinary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await usuario.getIdToken()}` },
  });
  if (res.status === 403) throw new ErrorSubida("Tu cuenta no tiene permiso para subir archivos.");
  if (!res.ok) throw new ErrorSubida("No se pudo autorizar la subida. Intenta de nuevo.");
  return res.json();
}

const MAX_IMAGEN_BYTES = 5 * 1024 * 1024;
const MAX_MODELO_BYTES = 30 * 1024 * 1024;

export class ErrorSubida extends Error {}

function extensionDe(nombre: string) {
  return nombre.split(".").pop()?.toLowerCase() ?? "";
}

async function subirACloudinary(archivo: File, tipoRecurso: "image" | "raw"): Promise<string> {
  const formData = new FormData();
  formData.append("file", archivo);
  let cloudName: string;

  if (URL_FIRMA) {
    const f = await pedirFirmaSubida();
    cloudName = f.cloudName;
    formData.append("api_key", f.apiKey);
    formData.append("timestamp", String(f.timestamp));
    formData.append("folder", f.carpeta);
    formData.append("signature", f.firma);
  } else if (CLOUD_NAME && UPLOAD_PRESET) {
    cloudName = CLOUD_NAME;
    formData.append("upload_preset", UPLOAD_PRESET);
    formData.append("folder", "aura-esencia");
  } else {
    throw new ErrorSubida("Falta configurar Cloudinary (NEXT_PUBLIC_FIRMA_URL, ver servicio-firmas/README.md).");
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${tipoRecurso}/upload`, {
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
