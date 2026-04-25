"use client";

import Link from "next/link";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useCarrito } from "../context/CarritoContext";
import { formatearPrecio } from "../lib/utils";

export function CarritoDrawer() {
  const {
    items, abierto, cerrarCarrito,
    quitar, cambiarCantidad,
    totalPrecio, totalItems, vaciar,
  } = useCarrito();

  return (
    <AnimatePresence>
      {abierto && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
            onClick={cerrarCarrito}
          />

          {/* Panel lateral */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: "min(420px, 100vw)",
              background: "rgba(10,6,20,0.98)",
              backdropFilter: "blur(40px)",
              borderLeft: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "-20px 0 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div>
                <h2
                  className="text-white font-semibold text-base"
                  style={{ fontFamily: "'Cormorant Garamond', serif" }}
                >
                  Mi Carrito
                </h2>
                <p className="text-white/30 text-xs mt-0.5">
                  {totalItems} {totalItems === 1 ? "producto" : "productos"}
                </p>
              </div>
              <button
                onClick={cerrarCarrito}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Lista de items */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                  </div>
                  <p className="text-white/30 text-sm">Tu carrito está vacío</p>
                  <button onClick={cerrarCarrito} className="text-rose-300/70 text-xs underline">
                    Ver productos
                  </button>
                </div>
              ) : (
                <AnimatePresence>
                  {items.map((item) => (
                    <motion.div
                      key={item.producto.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className="flex gap-4 py-4"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      {/* ✅ next/image con fill en lugar de <img> */}
                      <div
                        className="relative w-16 h-20 rounded-xl overflow-hidden"
                        style={{ background: "#0d0810", flexShrink: 0 }}
                      >
                        <Image
                          src={item.producto.imagen}
                          alt={item.producto.nombre}
                          fill
                          className="object-cover"
                          sizes="64px"
                          unoptimized
                        />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-0.5">
                          {item.producto.marca}
                        </p>
                        <p className="text-white text-sm font-medium leading-tight truncate">
                          {item.producto.nombre}
                        </p>
                        <p className="text-rose-300 text-sm font-bold mt-1">
                          {formatearPrecio(item.producto.precio)}
                        </p>

                        {/* Control de cantidad */}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => cambiarCantidad(item.producto.id, item.cantidad - 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors text-sm"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >−</button>

                          <span className="text-white text-xs w-4 text-center">
                            {item.cantidad}
                          </span>

                          <button
                            onClick={() => cambiarCantidad(item.producto.id, item.cantidad + 1)}
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-colors text-sm"
                            style={{ background: "rgba(255,255,255,0.08)" }}
                          >+</button>

                          <button
                            onClick={() => quitar(item.producto.id)}
                            className="ml-auto text-white/20 hover:text-rose-400 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer con total y CTA */}
            {items.length > 0 && (
              <div
                className="px-6 py-5"
                style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
              >
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white/50 text-sm">Total</span>
                  <span
                    className="text-white font-bold text-xl"
                    style={{ fontFamily: "'Cormorant Garamond', serif" }}
                  >
                    {formatearPrecio(totalPrecio)}
                  </span>
                </div>

                {/* ✅ Link en lugar de <a> */}
                <Link
                  href="/checkout"
                  onClick={cerrarCarrito}
                  className="w-full py-3.5 rounded-2xl text-sm font-bold tracking-widest uppercase text-black flex items-center justify-center"
                  style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)" }}
                >
                  Finalizar compra
                </Link>

                <button
                  onClick={vaciar}
                  className="w-full mt-2 py-2 text-white/25 text-xs hover:text-white/50 transition-colors"
                >
                  Vaciar carrito
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}