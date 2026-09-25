"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { motion } from "framer-motion";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatearPrecio, calcularDescuento } from "../../lib/utils";
import { useCarrito } from "../../context/CarritoContext";
import { useFavoritos } from "../../context/FavoritosContext";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";
import type { Product } from "../../components/ui/product-reveal-card";
import { urlCloudinaryOptimizada } from "../../lib/cloudinaryImagen";

function DetalleProducto() {
  const id = useSearchParams().get("id");
  const [producto, setProducto] = useState<Product | null>(null);
  const [cargando, setCargando] = useState(!!id);
  const [error, setError] = useState(id ? "" : "Producto no especificado.");
  const [vista, setVista] = useState<"fotos" | "3d">("fotos");
  const [imagenActiva, setImagenActiva] = useState(0);
  const [agregado, setAgregado] = useState(false);
  const { agregar, abrirCarrito } = useCarrito();
  const { esFavorito, alternarFavorito } = useFavoritos();

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "productos", id)).then((snap) => {
      if (!snap.exists()) setError("No encontramos este producto.");
      else setProducto({ id: snap.id, ...snap.data() } as Product);
      setCargando(false);
    });
  }, [id]);

  const imagenes = producto?.imagenes?.length ? producto.imagenes : producto ? [producto.imagen] : [];
  const descuento = producto?.precioOriginal ? calcularDescuento(producto.precio, producto.precioOriginal) : 0;

  function alAgregar() {
    if (!producto) return;
    agregar(producto);
    setAgregado(true);
    abrirCarrito();
    setTimeout(() => setAgregado(false), 1500);
  }

  return (
    <>
      <Navbar />
      <CarritoDrawer />
      {producto?.modelo3d && (
        <Script src="https://unpkg.com/@google/model-viewer@3/dist/model-viewer.min.js" strategy="lazyOnload" type="module" />
      )}

      <main className="min-h-screen relative" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-12" style={{ maxWidth: "1100px" }}>
          {cargando ? (
            <p className="text-white/30 text-sm">Cargando producto...</p>
          ) : error || !producto ? (
            <div className="text-center py-20">
              <p className="text-white/40 text-sm mb-4">{error || "Producto no encontrado."}</p>
              <Link href="/" className="text-rose-300/70 text-xs underline">Volver a la tienda</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Visual: fotos o 3D */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                {producto.modelo3d && (
                  <div className="flex gap-2 mb-4">
                    {(["fotos", "3d"] as const).map((v) => (
                      <button key={v} onClick={() => setVista(v)}
                        className="px-4 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-widest"
                        style={{
                          border: vista === v ? "1px solid rgba(244,114,182,0.5)" : "1px solid rgba(255,255,255,0.08)",
                          background: vista === v ? "rgba(244,63,94,0.12)" : "transparent",
                          color: vista === v ? "rgba(253,164,175,1)" : "rgba(255,255,255,0.4)",
                        }}>
                        {v === "fotos" ? "Fotos" : "Vista 3D"}
                      </button>
                    ))}
                  </div>
                )}

                {vista === "3d" && producto.modelo3d ? (
                  <model-viewer
                    src={producto.modelo3d.url}
                    alt={producto.nombre}
                    camera-controls
                    auto-rotate
                    ar
                    ar-modes="webxr scene-viewer quick-look"
                    shadow-intensity="1"
                    style={{ width: "100%", aspectRatio: "1/1", borderRadius: "1.5rem", background: "#0d0810" }}
                  />
                ) : (
                  <div>
                    <div className="relative w-full rounded-3xl overflow-hidden mb-3" style={{ aspectRatio: "1/1", background: "#0d0810" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urlCloudinaryOptimizada(imagenes[imagenActiva], 900)} alt={producto.nombre} className="w-full h-full object-cover" />
                    </div>
                    {imagenes.length > 1 && (
                      <div className="flex gap-2">
                        {imagenes.map((url, i) => (
                          <button key={url} onClick={() => setImagenActiva(i)}
                            className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0"
                            style={{ outline: i === imagenActiva ? "2px solid rgba(244,114,182,0.6)" : "1px solid rgba(255,255,255,0.1)" }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={urlCloudinaryOptimizada(url, 150)} alt="" className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Info */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {producto.categoria && (
                  <p className="text-rose-300/70 text-[10px] tracking-[0.22em] uppercase font-medium mb-2">{producto.categoria}</p>
                )}
                <h1 className="text-white text-3xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                  {producto.nombre}
                </h1>
                {producto.marca && <p className="text-white/30 text-xs uppercase tracking-widest mb-6">{producto.marca}</p>}

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-rose-300 font-bold text-2xl">{formatearPrecio(producto.precio)}</span>
                  {producto.precioOriginal && (
                    <>
                      <span className="text-white/30 text-sm line-through">{formatearPrecio(producto.precioOriginal)}</span>
                      <span className="text-emerald-400 text-xs">-{descuento}%</span>
                    </>
                  )}
                </div>

                <p className="text-white/50 text-sm leading-relaxed mb-8">{producto.descripcion}</p>

                {typeof producto.stock === "number" && (
                  <p className="text-white/30 text-xs mb-6">
                    {producto.stock > 0 ? `${producto.stock} disponibles` : "Agotado temporalmente"}
                  </p>
                )}

                <div className="flex gap-3">
                  <motion.button
                    onClick={alAgregar}
                    disabled={producto.stock === 0}
                    className="flex-1 py-4 rounded-2xl text-sm font-bold tracking-widest uppercase text-black"
                    style={{
                      background: agregado ? "rgba(34,197,94,0.9)" : "linear-gradient(90deg, #fda4af, #fcd34d)",
                      opacity: producto.stock === 0 ? 0.5 : 1,
                    }}
                    whileHover={{ scale: producto.stock === 0 ? 1 : 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {agregado ? "Agregado ✓" : "Agregar al carrito"}
                  </motion.button>

                  <motion.button
                    onClick={() => alternarFavorito(producto.id)}
                    className="w-14 rounded-2xl flex items-center justify-center border flex-shrink-0"
                    style={{
                      background: esFavorito(producto.id) ? "rgba(244,63,94,0.15)" : "rgba(255,255,255,0.04)",
                      borderColor: esFavorito(producto.id) ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.1)",
                    }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    aria-label={esFavorito(producto.id) ? "Quitar de favoritos" : "Agregar a favoritos"}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={esFavorito(producto.id) ? "rgba(244,63,94,1)" : "none"} stroke="rgba(244,114,182,1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaginaProducto() {
  return (
    <Suspense fallback={<p className="text-white/30 text-sm p-12">Cargando...</p>}>
      <DetalleProducto />
    </Suspense>
  );
}
