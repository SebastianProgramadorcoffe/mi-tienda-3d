"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { obtenerProductos } from "../lib/productosCache";
import { whatsappHref } from "../lib/whatsapp";
import { ProductRevealCard, type Product, type Genero } from "./ui/product-reveal-card";
import { Navbar } from "./Navbar";
import { CarritoDrawer } from "./CarritoDrawer";
import { Footer } from "./Footer";
import { BarraConfianza } from "./BarraConfianza";

type Ordenamiento = "nombre" | "precio_asc" | "precio_desc";

const CATEGORIAS = [
  "Todas", "Labiales", "Fragancias", "Base de Maquillaje", "Skincare", "Ojos",
  "Joyería", "Protección Solar", "Cuidado Personal", "Mundo Hombre", "Bebés y Niños",
];
const GENEROS: { valor: Genero; label: string }[] = [
  { valor: "dama", label: "Dama" },
  { valor: "caballero", label: "Caballero" },
];

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

interface CatalogoProductosProps {
  // false en /catalogo: se omite el hero grande y el CTA de "ver catálogo
  // completo" (redundante ahí), pero se mantiene todo lo demás igual.
  mostrarHero?: boolean;
}

export function CatalogoProductos({ mostrarHero = true }: CatalogoProductosProps) {
  const [productos,        setProductos]        = useState<Product[]>([]);
  const [cargando,         setCargando]         = useState(true);
  const [error,            setError]            = useState<string | null>(null);
  const [busqueda,         setBusqueda]         = useState("");
  const [categoriaActiva,  setCategoriaActiva]  = useState("Todas");
  const [generoActivo,     setGeneroActivo]     = useState<Genero>("dama");
  const [ordenamiento,     setOrdenamiento]     = useState<Ordenamiento>("nombre");

  // Se trae la colección UNA vez (con caché compartida entre home/catálogo/
  // favoritos — ver lib/productosCache) y el orden/filtro se resuelven en
  // el cliente. Antes, cambiar el selector de orden volvía a leer toda la
  // colección de Firestore en cada clic.
  useEffect(() => {
    let cancelado = false;
    obtenerProductos()
      .then((datos) => { if (!cancelado) setProductos(datos.filter((p) => p.activo !== false)); })
      .catch((err) => { console.error(err); if (!cancelado) setError("No se pudieron cargar los productos."); })
      .finally(() => { if (!cancelado) setCargando(false); });
    return () => { cancelado = true; };
  }, []);

  const productosFiltrados = useMemo(() => {
    const filtrados = productos.filter((p) => {
      const coincideBusqueda =
        busqueda === "" ||
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.marca     ?? "").toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.categoria ?? "").toLowerCase().includes(busqueda.toLowerCase());
      const coincideCategoria =
        categoriaActiva === "Todas" || p.categoria === categoriaActiva;
      // Los productos "unisex" (o sin género asignado) se muestran en ambas
      // pestañas; solo se ocultan los que tienen el género contrario.
      const coincideGenero = (p.genero ?? "unisex") !== "unisex" ? p.genero === generoActivo : true;
      return coincideBusqueda && coincideCategoria && coincideGenero;
    });
    const ordenados = [...filtrados];
    if (ordenamiento === "precio_asc") ordenados.sort((a, b) => a.precio - b.precio);
    else if (ordenamiento === "precio_desc") ordenados.sort((a, b) => b.precio - a.precio);
    else ordenados.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return ordenados;
  }, [productos, busqueda, categoriaActiva, generoActivo, ordenamiento]);

  return (
    <>
      <Navbar onBuscar={setBusqueda} busqueda={busqueda} />
      <CarritoDrawer />

      <main
        className="min-h-screen relative overflow-hidden"
        style={{ background: "#080510" }}
      >
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

          /* Brillo de la categoría activa en el filtro — solo box-shadow,
             no toca tamaño/padding/posición del botón */
          @keyframes brilloPildora {
            0%, 100% {
              box-shadow: 0 0 0 1px rgba(244,114,182,0.5), 0 0 16px 2px rgba(244,63,94,0.45), 0 0 32px 6px rgba(251,191,36,0.16);
            }
            50% {
              box-shadow: 0 0 0 1px rgba(244,114,182,0.75), 0 0 24px 4px rgba(244,63,94,0.65), 0 0 46px 10px rgba(251,191,36,0.28);
            }
          }
          .pildora-categoria {
            transition: box-shadow 0.25s ease, border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
          }
          .pildora-categoria:hover {
            box-shadow: 0 0 14px 1px rgba(244,114,182,0.28);
          }
          .pildora-categoria-activa {
            animation: brilloPildora 2.6s ease-in-out infinite;
          }

          /* Mismo tratamiento para el toggle de Género, pero con el tono
             rosa-claro/dorado del propio degradado del botón (es un chip
             relleno, no un contorno como las categorías) */
          @keyframes brilloGenero {
            0%, 100% {
              box-shadow: 0 0 14px 2px rgba(253,164,175,0.45), 0 0 28px 6px rgba(252,211,77,0.25);
            }
            50% {
              box-shadow: 0 0 20px 4px rgba(253,164,175,0.65), 0 0 40px 10px rgba(252,211,77,0.4);
            }
          }
          .pildora-genero {
            transition: box-shadow 0.25s ease;
          }
          .pildora-genero:hover {
            box-shadow: 0 0 12px 1px rgba(253,164,175,0.3);
          }
          .pildora-genero-activa {
            animation: brilloGenero 2.6s ease-in-out infinite;
          }
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
          {mostrarHero ? (
            <header className="text-center mb-16">
              <motion.p
                className="text-rose-400/80 text-xs uppercase font-medium mb-4"
                style={{ letterSpacing: "0.4em" }}
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              >
                Colección Exclusiva · 2026
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
          ) : (
            <header className="text-center mb-12">
              <h1 className="text-white text-3xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
                Catálogo <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>completo</span>
              </h1>
              <p className="text-white/30 text-xs uppercase" style={{ letterSpacing: "0.3em" }}>Todas nuestras categorías</p>
            </header>
          )}

          {/* Filtros */}
          <motion.div
            className="mb-8 space-y-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          >
            {/* Género */}
            <div
              className="inline-flex rounded-full p-1 gap-1"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {GENEROS.map((g) => (
                <button
                  key={g.valor}
                  onClick={() => setGeneroActivo(g.valor)}
                  className={`px-5 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 pildora-genero ${generoActivo === g.valor ? "pildora-genero-activa" : ""}`}
                  style={{
                    background: generoActivo === g.valor ? "linear-gradient(90deg, #fda4af, #fcd34d)" : "transparent",
                    color: generoActivo === g.valor ? "#1a1a1a" : "rgba(255,255,255,0.45)",
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Categorías */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategoriaActiva(cat)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 pildora-categoria ${categoriaActiva === cat ? "pildora-categoria-activa" : ""}`}
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
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 pildora-categoria ${ordenamiento === op.valor ? "pildora-categoria-activa" : ""}`}
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

          {/* h2 solo para lectores de pantalla: el h1 (hero) salta directo a
              los h3 de cada tarjeta de producto sin nivel intermedio */}
          <h2 className="sr-only">Catálogo de productos</h2>

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

        </div>

        {/* Se muestra justo donde terminan los productos (antes estaba
            pegada al pie del Footer, mucho más abajo) */}
        <BarraConfianza />

        {/* WhatsApp flotante */}
        <motion.a
          href={whatsappHref("Hola, me interesa un producto de Aura & Esencia")}
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
      <Footer />
    </>
  );
}
