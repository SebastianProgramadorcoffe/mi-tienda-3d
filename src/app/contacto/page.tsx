"use client";

import { motion } from "framer-motion";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";

const CANALES = [
  {
    nombre: "WhatsApp",
    valor: "+57 300 123 4567",
    href: "https://wa.me/573001234567?text=Hola,%20tengo%20una%20pregunta%20sobre%20Aura%20Esencia",
    color: "#25D366",
  },
  {
    nombre: "Correo electrónico",
    valor: "contacto@auraesencia.com",
    href: "mailto:contacto@auraesencia.com",
    color: "#f43f5e",
  },
];

export default function PaginaContacto() {
  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-16" style={{ maxWidth: "560px" }}>
          <motion.p
            className="text-rose-400/80 text-xs uppercase font-medium mb-4 text-center"
            style={{ letterSpacing: "0.4em" }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            Estamos para ayudarte
          </motion.p>

          <motion.h1
            className="text-white text-center mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>Contáctanos</span>
          </motion.h1>

          <motion.p
            className="text-white/40 text-sm text-center mb-12"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          >
            ¿Dudas sobre un producto, tu pedido o un envío? Escríbenos por el canal que prefieras.
          </motion.p>

          <div className="space-y-4">
            {CANALES.map((canal, i) => (
              <motion.a
                key={canal.nombre}
                href={canal.href}
                target={canal.href.startsWith("http") ? "_blank" : undefined}
                rel={canal.href.startsWith("http") ? "noopener noreferrer" : undefined}
                className="flex items-center justify-between px-6 py-5 rounded-2xl transition-colors"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }}
                whileHover={{ borderColor: `${canal.color}80`, backgroundColor: `${canal.color}10` }}
              >
                <div>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mb-1">{canal.nombre}</p>
                  <p className="text-white text-sm font-medium">{canal.valor}</p>
                </div>
                <span style={{ color: canal.color }}>→</span>
              </motion.a>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
