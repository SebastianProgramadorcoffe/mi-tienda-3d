"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useCarrito } from "../../context/CarritoContext";
import { useAuth } from "../../context/AuthContext";
import { formatearPrecio } from "../../lib/utils";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";

// ── Reemplaza con tu llave pública de Wompi ───────────────────────────────────
const WOMPI_LLAVE_PUBLICA = "pub_test_qCTBUTQbPHTf0FEvZWUqZzsprY6hCnEv";
const WOMPI_URL = "https://checkout.wompi.co/p/";

export default function PaginaCheckout() {
  const { items, totalPrecio, vaciar } = useCarrito();
  const { usuario } = useAuth();

  const [nombre,    setNombre]    = useState(usuario?.displayName ?? "");
  const [email,     setEmail]     = useState(usuario?.email ?? "");
  const [telefono,  setTelefono]  = useState("");
  const [direccion, setDireccion] = useState("");
  const [ciudad,    setCiudad]    = useState("");

  // Genera referencia única para Wompi
  const referencia = `AURA-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

  function irAWompi() {
    if (!nombre || !email || !telefono || !direccion) {
      alert("Por favor completa todos los campos");
      return;
    }

    // Wompi recibe el monto en centavos
    const montoCentavos = totalPrecio * 100;

    const params = new URLSearchParams({
      "public-key":            WOMPI_LLAVE_PUBLICA,
      "currency":              "COP",
      "amount-in-cents":       montoCentavos.toString(),
      "reference":             referencia,
      "customer-data:email":   email,
      "customer-data:full-name": nombre,
      "customer-data:phone-number": telefono,
      "redirect-url":          `${window.location.origin}/checkout/confirmacion`,
    });

    window.location.href = `${WOMPI_URL}?${params.toString()}`;
  }

  if (items.length === 0) {
    return (
      <>
        <Navbar />
        <CarritoDrawer />
        <main className="min-h-screen flex items-center justify-center" style={{ background: "#080510" }}>
          <div className="text-center">
            <p className="text-white/40 text-sm mb-4">Tu carrito está vacío</p>
            <a href="/" className="text-rose-300/70 text-xs underline">Volver a la tienda</a>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen relative" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-12" style={{ maxWidth: "1000px" }}>
          <motion.h1
            className="text-white text-3xl mb-10"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          >
            <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>Finalizar</span> Compra
          </motion.h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* Formulario */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <h2 className="text-white/70 text-xs uppercase tracking-widest mb-6">Datos de envío</h2>
              <div className="space-y-4">
                {[
                  { label: "Nombre completo", value: nombre,    set: setNombre,    type: "text",  placeholder: "Tu nombre" },
                  { label: "Correo electrónico", value: email,  set: setEmail,     type: "email", placeholder: "tu@correo.com" },
                  { label: "Teléfono",  value: telefono,        set: setTelefono,  type: "tel",   placeholder: "300 000 0000" },
                  { label: "Dirección", value: direccion,       set: setDireccion, type: "text",  placeholder: "Calle 123 # 45-67" },
                  { label: "Ciudad",    value: ciudad,          set: setCiudad,    type: "text",  placeholder: "Bogotá" },
                ].map((campo) => (
                  <div key={campo.label}>
                    <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">{campo.label}</label>
                    <input
                      type={campo.type}
                      value={campo.value}
                      onChange={(e) => campo.set(e.target.value)}
                      placeholder={campo.placeholder}
                      className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(244,114,182,0.4)"}
                      onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                    />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Resumen del pedido */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <h2 className="text-white/70 text-xs uppercase tracking-widest mb-6">Resumen del pedido</h2>

              <div className="rounded-2xl p-6 mb-6 space-y-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                {items.map((item) => (
                  <div key={item.producto.id} className="flex gap-4 items-center">
                    <div className="w-12 h-14 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#0d0810" }}>
                      <img src={item.producto.imagen} alt={item.producto.nombre} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{item.producto.nombre}</p>
                      <p className="text-white/30 text-xs">Cantidad: {item.cantidad}</p>
                    </div>
                    <p className="text-rose-300 text-sm font-bold flex-shrink-0">
                      {formatearPrecio(item.producto.precio * item.cantidad)}
                    </p>
                  </div>
                ))}

                <div className="pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="flex justify-between items-center">
                    <span className="text-white/50 text-sm">Subtotal</span>
                    <span className="text-white/70 text-sm">{formatearPrecio(totalPrecio)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-white/50 text-sm">Envío</span>
                    <span className="text-emerald-400 text-sm text-xs">A calcular</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-white font-semibold">Total</span>
                    <span className="text-white font-bold text-xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                      {formatearPrecio(totalPrecio)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón Wompi */}
              <motion.button
                onClick={irAWompi}
                className="w-full py-4 rounded-2xl text-sm font-bold tracking-widest uppercase text-black flex items-center justify-center gap-3"
                style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)", boxShadow: "0 8px 30px rgba(244,63,94,0.3)" }}
                whileHover={{ scale: 1.02, boxShadow: "0 12px 40px rgba(244,63,94,0.4)" }}
                whileTap={{ scale: 0.98 }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
                </svg>
                Pagar con Wompi
              </motion.button>

              <p className="text-white/20 text-[10px] text-center mt-3 leading-relaxed">
                Pago seguro procesado por Wompi. Aceptamos tarjetas débito, crédito, Nequi y PSE.
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </>
  );
}