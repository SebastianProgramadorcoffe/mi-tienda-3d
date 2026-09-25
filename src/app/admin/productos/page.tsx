"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatearPrecio } from "../../../lib/utils";
import type { Product } from "../../../components/ui/product-reveal-card";
import { urlCloudinaryOptimizada } from "../../../lib/cloudinaryImagen";

const UMBRAL_STOCK_BAJO = 5;

export default function ListaProductosAdmin() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    getDocs(query(collection(db, "productos"), orderBy("nombre", "asc"))).then((snapshot) => {
      setProductos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setCargando(false);
    });
  }, []);

  async function alternarActivo(p: Product) {
    await updateDoc(doc(db, "productos", p.id), { activo: !(p.activo ?? true) });
    setProductos((prev) => prev.map((x) => (x.id === p.id ? { ...x, activo: !(p.activo ?? true) } : x)));
  }

  async function eliminar(p: Product) {
    if (!confirm(`¿Eliminar "${p.nombre}"? Esta acción no se puede deshacer.`)) return;
    await deleteDoc(doc(db, "productos", p.id));
    setProductos((prev) => prev.filter((x) => x.id !== p.id));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-white text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Productos</h1>
        <div className="flex gap-3">
          <Link href="/admin/productos/importar-catalogo"
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-white/70"
            style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
            Importar catálogo PDF
          </Link>
          <Link href="/admin/productos/nuevo"
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest text-black"
            style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)" }}>
            + Nuevo producto
          </Link>
        </div>
      </div>

      {cargando ? (
        <p className="text-white/30 text-sm">Cargando...</p>
      ) : productos.length === 0 ? (
        <p className="text-white/30 text-sm">Aún no hay productos. Crea el primero.</p>
      ) : (
        <div className="space-y-2">
          {productos.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-12 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ background: "#0d0810" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlCloudinaryOptimizada(p.imagen, 150)} alt={p.nombre} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{p.nombre}</p>
                <p className="text-white/30 text-xs">{p.categoria} · {formatearPrecio(p.precio)}</p>
              </div>
              {p.modelo3d && (
                <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full text-emerald-300"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}>3D</span>
              )}
              {typeof p.stock === "number" && p.stock <= UMBRAL_STOCK_BAJO && (
                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                  style={{
                    color: p.stock === 0 ? "rgba(248,113,113,1)" : "rgba(251,191,36,1)",
                    background: p.stock === 0 ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                    border: `1px solid ${p.stock === 0 ? "rgba(248,113,113,0.3)" : "rgba(251,191,36,0.3)"}`,
                  }}
                >
                  {p.stock === 0 ? "Agotado" : `Stock: ${p.stock}`}
                </span>
              )}
              <button onClick={() => alternarActivo(p)}
                className="text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-full"
                style={{
                  color: p.activo === false ? "rgba(255,255,255,0.35)" : "rgba(253,164,175,1)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}>
                {p.activo === false ? "Oculto" : "Visible"}
              </button>
              <Link href={`/admin/productos/editar?id=${p.id}`}
                className="text-white/50 hover:text-white text-xs uppercase tracking-widest">Editar</Link>
              <button onClick={() => eliminar(p)} className="text-rose-400/60 hover:text-rose-400 text-xs uppercase tracking-widest">
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
