"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  collection, getDocs, orderBy, query,
  Query, CollectionReference, DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { ProductRevealCard, type Product } from "../components/ui/product-reveal-card";
import { Navbar } from "../components/Navbar";
import { CarritoDrawer } from "../components/CarritoDrawer";

type Ordenamiento = "nombre" | "precio_asc" | "precio_desc";

const CATEGORIAS = ["Todas", "Labiales", "Fragancias", "Base de Maquillaje", "Skincare", "Ojos"];

function OrbeFondo({
  tamanio, color, posicion, retraso = 0,
}: {
  tamanio: number; color: string;
  posicion: React.CSSProperties; retraso?: number;
}) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{ width: tamanio, height: tamanio, background: color, filter: "blur(80px)", ...posicion }}
      animate={{ y: [0, -24, 0], scale: [1, 1.06, 1], opacity: [0.35, 0.55, 0.35] }}
      transition={{ duration: 6 + retraso, repeat: Infinity, ease: "easeInOut", delay: retraso }}
    />
  );
}

function EsqueletoTarjeta() {
  return (
    <div
      className="relative rounded-4xl overflow-hidden animate-pulse"
      style={{ aspectRatio: "3/4", background: "rgba(255,255,255,0.04)" }}
    >
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.03)" }}>
          <div className="h-2 w-16 rounded mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-4 w-32 rounded mb-3" style={{ background: "rgba(255,255,255,0.10)" }} />
          <div className="h-6 w-20 rounded"     style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
      </div>
    </div>
  );
}

export default function PaginaPrincipal() {
  const [productos,        setProductos]        = useState<Product[]>([]);
  const [cargando,         setCargando]         = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [busqueda,         setBusqueda]         = useState("");
  const [categoriaActiva,  setCategoriaActiva]  = useState("Todas");
  const [ordenamiento,     setOrdenamiento]     = useState<Ordenamiento>("nombre");

  useEffect(() => {
    async function cargarProductos() {
      try {
        setCargando(true);
        const ref = collection(db, "productos") as CollectionReference<DocumentData>;

        let consulta: Query<DocumentData>;
        if (ordenamiento === "precio_asc")       consulta = query(ref, orderBy("precio", "asc"));
        else if (ordenamiento === "precio_desc") consulta = query(ref, orderBy("precio", "desc"));
        else                                     consulta = query(ref, orderBy("nombre", "asc"));

        const snapshot = await getDocs(consulta);
        const datos: Product[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id:             doc.id,
            nombre:         d.nombre          ?? "Sin nombre",
            marca:          d.marca           ?? "",
            categoria:      d.categoria       ?? "",
            precio:         Number(d.precio)  || 0,
            precioOriginal: d.precioOriginal  ? Number(d.precioOriginal) : undefined,
            imagen:         d.imagen          ?? "/placeholder.jpg",
            etiqueta:       d.etiqueta,
            colorEtiqueta:  d.colorEtiqueta   ?? "rose",
            descripcion:    d.descripcion     ?? "",
            stock:          d.stock           ? Number(d.stock) : undefined,
          };
        });
        setProductos(datos);
      } catch (err) {
        console.error(err);
        setError("No se pudieron cargar los productos.");
      } finally {
        setCargando(false);
      }
    }
    cargarProductos();
  }, [ordenamiento]);

  // ✅ Filtrado sin rangoPrecio (eliminado para evitar unused var)
  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const coincideBusqueda =
        busqueda === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.marca     ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.categoria ?? "").toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria =
        categoriaActiva === "Todas" || p.categoria === categoriaActiva;
      return coincideBusqueda && coincideCategoria;
    });
  }, [productos, busqueda, categoriaActiva]);

  return (
    <>
      <Navbar onBuscar={setBusqueda} busqueda={busqueda} />
      <CarritoDrawer />

      <main
        className="min-h-screen relative overflow-hidden"
        style={{ background: "#080510" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        `}</style>

        {/* Fondo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(157,23,77,0.18) 0%, transparent 60%)" }} />
          <div className="absolute inset-0" style={{ opacity: 0.025, backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
          <OrbeFondo tamanio={500} color="rgba(190,24,93,0.28)"  posicion={{ top: -128, left: -96 }}    retraso={0} />
          <OrbeFondo tamanio={400} color="rgba(219,39,119,0.18)" posicion={{ top: "33%", right: -128 }} retraso={2} />
          <OrbeFondo tamanio={350} color="rgba(180,83,9,0.13)"   posicion={{ bottom: 0, left: "33%" }}  retraso={4} />
        </div>

        <div
          className="relative z-10 mx-auto px-6"
          style={{ maxWidth: "1200px", paddingTop: "100px", paddingBottom: "80px" }}
        >
          {/* Hero */}
          <header className="text-center mb-16">
            <motion.p
              className="text-rose-400/80 text-xs uppercase font-medium mb-4"
              style={{ letterSpacing: "0.4em" }}
              initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            >
              Colección Exclusiva · 2025
            </motion.p>

            <motion.h1
              className="text-white mb-4 leading-none"
              style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontFamily: "'Cormorant Garamond', serif" }}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic", fontWeight: 300 }}>Belleza</span>
              <br />
              <span style={{ fontWeight: 300 }}>que Transforma</span>
            </motion.h1>

            <motion.p
              className="text-white/40 text-sm mx-auto leading-relaxed"
              style={{ maxWidth: "380px" }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            >
              Las mejores marcas de cosméticos en una sola experiencia de lujo.
            </motion.p>

            <motion.div
              className="flex items-center justify-center gap-4 mt-8"
              initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: 0.7, delay: 0.4 }}
            >
              <div style={{ height: 1, width: 80, background: "linear-gradient(to right, transparent, rgba(244,114,182,0.5))" }} />
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(244,114,182,0.6)" }} />
              <div style={{ height: 1, width: 80, background: "linear-gradient(to left, transparent, rgba(244,114,182,0.5))" }} />
            </motion.div>
          </header>

          {/* Filtros */}
          <motion.div
            className="mb-8 space-y-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          >
            {/* Categorías */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className="px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                  style={{
                    border: categoriaActiva === cat ? "1px solid rgba(244,114,182,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    background: categoriaActiva === cat ? "rgba(244,63,94,0.12)" : "rgba(255,255,255,0.03)",
                    color: categoriaActiva === cat ? "rgba(253,164,175,1)" : "rgba(255,255,255,0.4)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Ordenamiento + contador */}
            <div className="flex items-center justify-between">
              <p className="text-white/30 text-xs uppercase" style={{ letterSpacing: "0.2em" }}>
                {cargando ? "Cargando..." : `${productosFiltrados.length} productos`}
              </p>
              <div className="flex gap-2">
                {([
                  { valor: "nombre",      label: "A-Z"          },
                  { valor: "precio_asc",  label: "Menor precio" },
                  { valor: "precio_desc", label: "Mayor precio" },
                ] as { valor: Ordenamiento; label: string }[]).map((op) => (
                  <button
                    key={op.valor}
                    onClick={() => setOrdenamiento(op.valor)}
                    className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                    style={{
                      border: ordenamiento === op.valor ? "1px solid rgba(244,114,182,0.5)" : "1px solid rgba(255,255,255,0.08)",
                      background: ordenamiento === op.valor ? "rgba(244,63,94,0.12)" : "transparent",
                      color: ordenamiento === op.valor ? "rgba(253,164,175,1)" : "rgba(255,255,255,0.35)",
                    }}
                  >
                    {op.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-rose-400/80 text-sm mb-4">{error}</p>
                <button className="text-white/50 text-xs underline" onClick={() => setOrdenamiento("nombre")}>
                  Reintentar
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Grid de productos */}
          <section
            aria-label="Galería de productos"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {cargando
              ? Array.from({ length: 4 }).map((_, i) => <EsqueletoTarjeta key={i} />)
              : productosFiltrados.map((producto, i) => (
                  <ProductRevealCard key={producto.id} product={producto} index={i} />
                ))}
          </section>

          {!cargando && !error && productosFiltrados.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/30 text-sm mb-2">No se encontraron productos</p>
              <button
                onClick={() => { setBusqueda(""); setCategoriaActiva("Todas"); }}
                className="text-rose-300/60 text-xs underline"
              >
                Limpiar filtros
              </button>
            </div>
          )}

          {/* Footer CTA */}
          {!cargando && productosFiltrados.length > 0 && (
            <motion.div
              className="text-center mt-20"
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            >
              <p className="text-white/25 text-xs uppercase mb-6" style={{ letterSpacing: "0.3em" }}>
                {productos.length} productos en catálogo
              </p>
              {/* ✅ Link en lugar de <a> */}
              <Link href="/catalogo">
                <motion.span
                  className="inline-block px-10 py-3.5 rounded-full text-sm font-medium uppercase text-white"
                  style={{ letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.15)" }}
                  whileHover={{ borderColor: "rgba(244,114,182,0.5)", backgroundColor: "rgba(244,63,94,0.08)", scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Ver Catálogo Completo
                </motion.span>
              </Link>
            </motion.div>
          )}
        </div>

        {/* WhatsApp flotante */}
        <motion.a
          href="https://wa.me/573001234567?text=Hola,%20me%20interesa%20un%20producto%20de%20Aura%20Esencia"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl"
          style={{ background: "#25D366", boxShadow: "0 8px 30px rgba(37,211,102,0.4)" }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.5, type: "spring" }}
          aria-label="Contactar por WhatsApp"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </motion.a>
      </main>
    </>
  );
}