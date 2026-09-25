"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import { formatearPrecio, calcularDescuento } from "../../lib/utils";
import { useCarrito } from "../../context/CarritoContext";
import { useFavoritos } from "../../context/FavoritosContext";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface Modelo3D {
  url: string;
  tipo: "glb" | "gltf";
}

export type Genero = "dama" | "caballero" | "unisex";

export interface Product {
  id: string;
  nombre: string;
  marca?: string;
  categoria?: string;
  genero?: Genero;
  precio: number;
  precioOriginal?: number;
  imagen: string;
  imagenes?: string[];
  modelo3d?: Modelo3D;
  etiqueta?: string;
  colorEtiqueta?: "rose" | "gold" | "emerald";
  descripcion: string;
  stock?: number;
  activo?: boolean;
}

export interface ProductRevealCardProps {
  product: Product;
  className?: string;
  index?: number;
}

const ESTILOS_ETIQUETA: Record<string, string> = {
  rose:    "bg-rose-500/20 border-rose-400/40 text-rose-300",
  gold:    "bg-amber-500/20 border-amber-400/40 text-amber-300",
  emerald: "bg-emerald-500/20 border-emerald-400/40 text-emerald-300",
};

export function ProductRevealCard({ product, className, index = 0 }: ProductRevealCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [estaHovered, setEstaHovered] = useState(false);
  const [agregado, setAgregado] = useState(false);
  const { agregar, abrirCarrito } = useCarrito();
  const { esFavorito, alternarFavorito } = useFavoritos();
  const favorito = esFavorito(product.id);

  const movimientoX = useMotionValue(0);
  const movimientoY = useMotionValue(0);
  const springConfig = { stiffness: 180, damping: 20, mass: 0.4 };
  const xSpring = useSpring(movimientoX, springConfig);
  const ySpring = useSpring(movimientoY, springConfig);
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  function alMoverMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    movimientoX.set((e.clientX - left) / width - 0.5);
    movimientoY.set((e.clientY - top) / height - 0.5);
  }

  function alSalirMouse() {
    movimientoX.set(0);
    movimientoY.set(0);
    setEstaHovered(false);
  }

  function alAgregarCarrito(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    agregar(product);
    setAgregado(true);
    abrirCarrito();
    setTimeout(() => setAgregado(false), 1500);
  }

  function alAlternarFavorito(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    alternarFavorito(product.id);
  }

  const porcentajeDescuento = product.precioOriginal
    ? calcularDescuento(product.precio, product.precioOriginal)
    : 0;

  const estiloEtiqueta = ESTILOS_ETIQUETA[product.colorEtiqueta ?? "rose"];

  return (
    <motion.div
      ref={ref}
      className={cn("relative cursor-pointer select-none", className)}
      style={{ perspective: "1100px", zIndex: estaHovered ? 30 : 1 }}
      onMouseMove={alMoverMouse}
      onMouseEnter={() => setEstaHovered(true)}
      onMouseLeave={alSalirMouse}
      initial={{ opacity: 0, y: 60, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ scale: 1.18, y: -14, transition: { type: "spring", stiffness: 300, damping: 20, delay: 0 } }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.75, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full rounded-4xl overflow-hidden"
      >
        {/* ── Imagen ── */}
        <div className="relative w-full overflow-hidden bg-[#0d0810]" style={{ aspectRatio: "3/4" }}>
          {/* ✅ next/image con fill */}
          <Image
            src={product.imagen}
            alt={product.nombre}
            fill
            className="object-cover transition-transform duration-700"
            style={{ transform: estaHovered ? "scale(1.1)" : "scale(1)" }}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />

          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(8,5,16,0.95) 0%, rgba(8,5,16,0.20) 50%, transparent 100%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom right, rgba(76,5,25,0.20), transparent)" }} />

          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: estaHovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{ background: "radial-gradient(circle at 50% 50%, rgba(255,192,203,0.18) 0%, transparent 55%)" }}
          />

          {product.etiqueta && (
            <motion.div className="absolute top-4 left-4" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.12 + 0.4 }}>
              <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase backdrop-blur-sm border", estiloEtiqueta)}>
                {product.etiqueta}
              </span>
            </motion.div>
          )}

          {/* Favorito */}
          <motion.button
            onClick={alAlternarFavorito}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-sm border"
            style={{
              background: favorito ? "rgba(244,63,94,0.85)" : "rgba(8,5,16,0.45)",
              borderColor: favorito ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.15)",
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label={favorito ? `Quitar ${product.nombre} de favoritos` : `Agregar ${product.nombre} a favoritos`}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill={favorito ? "white" : "none"} stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </motion.button>

          {porcentajeDescuento > 0 ? (
            <div className="absolute top-14 right-4">
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-600/80 border border-rose-400/40 text-white backdrop-blur-sm">
                -{porcentajeDescuento}%
              </span>
            </div>
          ) : product.marca ? (
            <div className="absolute top-14 right-4">
              <span className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-medium">{product.marca}</span>
            </div>
          ) : null}
        </div>

        {/* ── Panel glassmorphism ── */}
        <motion.div className="absolute bottom-0 left-0 right-0 p-3" style={{ translateZ: "45px" }}>
          <div className="rounded-2xl p-3" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>
            {product.categoria && (
              <p className="text-rose-300/70 text-[9px] tracking-[0.2em] uppercase font-medium mb-0.5">{product.categoria}</p>
            )}

            <h3 className="text-white font-semibold text-sm leading-snug tracking-tight mb-0.5 line-clamp-1">{product.nombre}</h3>

            <AnimatePresence>
              {estaHovered && (
                <motion.p className="text-white/45 text-[10px] leading-relaxed mb-1.5 line-clamp-2" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
                  {product.descripcion}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-1.5">
              <div className="flex items-baseline gap-1.5">
                <span className="text-rose-300 font-bold text-base tracking-tight">{formatearPrecio(product.precio)}</span>
                {product.precioOriginal && (
                  <span className="text-white/30 text-[11px] line-through">{formatearPrecio(product.precioOriginal)}</span>
                )}
              </div>

              <motion.button
                onClick={alAgregarCarrito}
                className="w-8 h-8 rounded-full flex items-center justify-center border text-white flex-shrink-0"
                style={{
                  background: agregado ? "rgba(34,197,94,0.8)" : "rgba(244,63,94,0.8)",
                  borderColor: agregado ? "rgba(34,197,94,0.4)" : "rgba(244,114,182,0.3)",
                  boxShadow: "0 4px 15px rgba(159,18,57,0.4)",
                }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                aria-label={`Agregar ${product.nombre} al carrito`}
              >
                <AnimatePresence mode="wait">
                  {agregado ? (
                    <motion.svg key="check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <path d="M20 6 9 17l-5-5"/>
                    </motion.svg>
                  ) : (
                    <motion.svg key="cart" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
                    </motion.svg>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>

            <AnimatePresence>
              {estaHovered && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.2 }}>
                  {/* ✅ Link en lugar de <a> */}
                  <Link
                    href={`/producto?id=${product.id}`}
                    className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold tracking-[0.18em] uppercase text-black flex items-center justify-center"
                    style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)", boxShadow: "0 4px 20px rgba(159,18,57,0.3)" }}
                  >
                    Ver Detalles
                  </Link>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        <motion.div
          className="absolute inset-0 rounded-4xl pointer-events-none"
          animate={{ boxShadow: estaHovered ? "0 0 0 2px rgba(244,114,182,0.55), 0 40px 100px rgba(0,0,0,0.75), 0 0 90px rgba(244,114,182,0.18)" : "0 0 0 1px rgba(255,255,255,0.06), 0 15px 45px rgba(0,0,0,0.45)" }}
          transition={{ duration: 0.35 }}
        />
      </motion.div>
    </motion.div>
  );
}