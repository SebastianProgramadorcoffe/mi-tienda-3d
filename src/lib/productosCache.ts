// ─── Caché en memoria del catálogo de productos ──────────────────────────────
// El catálogo se lee completo (para poder filtrar/ordenar en el cliente), y
// varias páginas (home, /catalogo, /favoritos) lo necesitan. Sin esto, cada
// navegación entre esas páginas — o cada cambio de orden en el selector —
// volvía a leer TODA la colección de Firestore, lo cual se vuelve costoso
// (y golpea la cuota gratis de 50k lecturas/día) a medida que crece el
// catálogo real. Se cachea en memoria por unos minutos; suficiente para una
// sesión de compra, sin quedar desactualizado por mucho tiempo si el admin
// agrega productos.
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Product } from "../components/ui/product-reveal-card";

const TTL_MS = 5 * 60 * 1000;

let cache: { productos: Product[]; expiraEn: number } | null = null;
let enVuelo: Promise<Product[]> | null = null;

export function mapearProducto(id: string, d: Record<string, unknown>): Product {
  return {
    id,
    nombre: (d.nombre as string) ?? "Sin nombre",
    marca: (d.marca as string) ?? "",
    categoria: (d.categoria as string) ?? "",
    genero: (d.genero as Product["genero"]) ?? "unisex",
    precio: Number(d.precio) || 0,
    precioOriginal: d.precioOriginal ? Number(d.precioOriginal) : undefined,
    imagen: (d.imagen as string) ?? "/placeholder.jpg",
    imagenes: Array.isArray(d.imagenes) ? (d.imagenes as string[]) : undefined,
    modelo3d: (d.modelo3d as Product["modelo3d"]) ?? undefined,
    etiqueta: d.etiqueta as string | undefined,
    colorEtiqueta: (d.colorEtiqueta as Product["colorEtiqueta"]) ?? "rose",
    descripcion: (d.descripcion as string) ?? "",
    stock: d.stock !== null && d.stock !== undefined ? Number(d.stock) : undefined,
    activo: (d.activo as boolean) ?? true,
  };
}

export async function obtenerProductos(forzar = false): Promise<Product[]> {
  if (!forzar && cache && cache.expiraEn > Date.now()) return cache.productos;
  if (!forzar && enVuelo) return enVuelo;

  enVuelo = getDocs(collection(db, "productos")).then((snapshot) => {
    const productos = snapshot.docs.map((d) => mapearProducto(d.id, d.data()));
    cache = { productos, expiraEn: Date.now() + TTL_MS };
    enVuelo = null;
    return productos;
  });
  return enVuelo;
}
