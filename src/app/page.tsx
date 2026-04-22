"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  collection,
  getDocs,
  orderBy,
  query,
  where,
  Query,
  CollectionReference,
  DocumentData,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import {
  ProductRevealCard,
  type Product,
} from "../components/ui/product-reveal-card";

// ─── Opciones de ordenamiento ─────────────────────────────────────────────────
type Ordenamiento = "nombre" | "precio_asc" | "precio_desc";

const OPCIONES_ORDEN: { valor: Ordenamiento; etiqueta: string }[] = [
  { valor: "nombre",      etiqueta: "Nombre A-Z"     },
  { valor: "precio_asc",  etiqueta: "Menor precio"   },
  { valor: "precio_desc", etiqueta: "Mayor precio"   },
];

// ─── Orbe de fondo ────────────────────────────────────────────────────────────
function OrbeFondo({
  tamanio, color, posicion, retraso = 0,
}: {
  tamanio: number;
  color: string;
  posicion: React.CSSProperties;
  retraso?: number;
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

// ─── Esqueleto de carga ───────────────────────────────────────────────────────
function EsqueletoTarjeta() {
  return (
    <div className="relative rounded-4xl overflow-hidden animate-pulse" style={{ aspectRatio: "3/4" }}>
      <div className="w-full h-full" style={{ background: "rgba(255,255,255,0.05)" }} />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="h-2 w-16 rounded mb-2" style={{ background: "rgba(255,255,255,0.1)" }} />
          <div className="h-4 w-32 rounded mb-3" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="h-6 w-20 rounded" style={{ background: "rgba(255,255,255,0.1)" }} />
        </div>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function PaginaPrincipal() {
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ordenamiento, setOrdenamiento] = useState<Ordenamiento>("nombre");

  // ── Consulta a Firestore ──────────────────────────────────────────────────
  useEffect(() => {
    async function cargarProductos() {
      try {
        setCargando(true);
        setError(null);

        // Construir query según ordenamiento seleccionado
        // precio es number → orderBy funciona correctamente
        const ref = collection(db, "productos") as CollectionReference<DocumentData>;

        let consulta: Query<DocumentData>;

        if (ordenamiento === "precio_asc") {
          consulta = query(ref, orderBy("precio", "asc"));
        } else if (ordenamiento === "precio_desc") {
          consulta = query(ref, orderBy("precio", "desc"));
        } else {
          consulta = query(ref, orderBy("nombre", "asc"));
        }

        const snapshot = await getDocs(consulta);

        const productosFirestore: Product[] = snapshot.docs.map((doc) => {
          const d = doc.data();
          return {
            id:             doc.id,
            nombre:         d.nombre          ?? "Sin nombre",
            marca:          d.marca           ?? "",
            categoria:      d.categoria       ?? "",
            precio:         Number(d.precio)  ?? 0,         // ← number
            precioOriginal: d.precioOriginal
                              ? Number(d.precioOriginal)    // ← number
                              : undefined,
            imagen:         d.imagen          ?? "/placeholder.jpg",
            etiqueta:       d.etiqueta        ?? undefined,
            colorEtiqueta:  d.colorEtiqueta   ?? "rose",
            descripcion:    d.descripcion     ?? "",
            stock:          d.stock           ? Number(d.stock) : undefined,
          };
        });

        setProductos(productosFirestore);
      } catch (err) {
        console.error("Error al cargar productos desde Firestore:", err);
        setError("No se pudieron cargar los productos. Intenta de nuevo.");
      } finally {
        setCargando(false);
      }
    }

    cargarProductos();
  }, [ordenamiento]); // Re-consulta cuando cambia el ordenamiento

  return (
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

      {/* Contenido */}
      <div className="relative z-10 mx-auto px-6 py-16" style={{ maxWidth: "1200px" }}>

        {/* Header */}
        <header className="text-center mb-12">
          <motion.p
            className="text-rose-400/80 text-xs uppercase font-medium mb-4"
            style={{ letterSpacing: "0.4em" }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            Colección Exclusiva · 2025
          </motion.p>

          <motion.h1
            className="text-white mb-4 leading-none"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5.5rem)", fontFamily: "'Cormorant Garamond', serif" }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic", fontWeight: 300 }}>Belleza</span>
            <br />
            <span style={{ fontWeight: 300 }}>que Transforma</span>
          </motion.h1>

          <motion.p
            className="text-white/40 text-sm mx-auto leading-relaxed"
            style={{ maxWidth: "380px" }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.25 }}
          >
            Las mejores marcas de cosméticos — Yanbal, Ésika, Avon y Natura —
            en una sola experiencia de lujo.
          </motion.p>

          {/* Divisor decorativo */}
          <motion.div
            className="flex items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div style={{ height: 1, width: 80, background: "linear-gradient(to right, transparent, rgba(244,114,182,0.5))" }} />
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(244,114,182,0.6)" }} />
            <div style={{ height: 1, width: 80, background: "linear-gradient(to left, transparent, rgba(244,114,182,0.5))" }} />
          </motion.div>
        </header>

        {/* ── Barra de ordenamiento ── */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <p className="text-white/30 text-xs uppercase" style={{ letterSpacing: "0.2em" }}>
            {cargando ? "Cargando..." : `${productos.length} productos`}
          </p>

          {/* Selector de orden */}
          <div className="flex gap-2">
            {OPCIONES_ORDEN.map((opcion) => (
              <button
                key={opcion.valor}
                onClick={() => setOrdenamiento(opcion.valor)}
                className="px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200"
                style={{
                  border: ordenamiento === opcion.valor
                    ? "1px solid rgba(244,114,182,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  background: ordenamiento === opcion.valor
                    ? "rgba(244,63,94,0.12)"
                    : "transparent",
                  color: ordenamiento === opcion.valor
                    ? "rgba(253,164,175,1)"
                    : "rgba(255,255,255,0.4)",
                }}
              >
                {opcion.etiqueta}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Error ── */}
        <AnimatePresence>
          {error && (
            <motion.div
              className="text-center py-12"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <p className="text-rose-400/80 text-sm mb-4">{error}</p>
              <button
                className="text-white/50 text-xs underline"
                onClick={() => setOrdenamiento((v) => v)}
              >
                Reintentar
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Grid de productos ── */}
        <section
          aria-label="Galería de productos"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {cargando
            ? Array.from({ length: 4 }).map((_, i) => <EsqueletoTarjeta key={i} />)
            : productos.map((producto, i) => (
                <ProductRevealCard
                  key={producto.id}
                  product={producto}
                  index={i}
                />
              ))}
        </section>

        {!cargando && !error && productos.length === 0 && (
          <p className="text-center text-white/30 text-sm mt-12">
            No hay productos disponibles en este momento.
          </p>
        )}

        {/* ── Footer CTA ── */}
        {!cargando && productos.length > 0 && (
          <motion.div
            className="text-center mt-20"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-white/25 text-xs uppercase mb-6" style={{ letterSpacing: "0.3em" }}>
              {productos.length} productos disponibles
            </p>
            <motion.button
              className="px-10 py-3.5 rounded-full text-sm font-medium uppercase text-white"
              style={{ letterSpacing: "0.15em", border: "1px solid rgba(255,255,255,0.15)", background: "transparent" }}
              whileHover={{ borderColor: "rgba(244,114,182,0.5)", backgroundColor: "rgba(244,63,94,0.08)", scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              Ver Catálogo Completo
            </motion.button>
          </motion.div>
        )}
      </div>
    </main>
  );
}