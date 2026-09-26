"use client";

import { motion } from "framer-motion";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";
import { whatsappHref } from "../../lib/whatsapp";

const BENEFICIOS = [
  {
    titulo: "Descuento del 25% al 35%",
    detalle: "Cada producto tiene su propio margen: dependiendo de lo que vendas, tu descuento va del 25% al 35% — entre más variedad muevas, mayor es tu ganancia.",
  },
  {
    titulo: "Premiación Unicampañal y Bicampañal",
    detalle: "Cumple tus metas y accede a premios en efectivo, ya sea por resultados de una sola campaña (unicampañal) o acumulados en dos campañas seguidas (bicampañal). Nivel 1: $445.000 COP, con niveles superiores según tus resultados.",
  },
  {
    titulo: "Bono de bienvenida",
    detalle: "¿Eres nueva o nuevo en el equipo? Recibes un producto de regalo en cada pedido durante tus primeras 3 campañas.",
  },
  {
    titulo: "Compra a crédito, sin pagar de contado",
    detalle: "No pagas tus pedidos por adelantado: se realiza un estudio de crédito y solo asumes el flete y los productos que solicites, contra factura.",
  },
  {
    titulo: "Modelo multinivel: forma tu propio grupo",
    detalle: "Haces tus pedidos y pagos directamente con la empresa proveedora, pero sigues perteneciendo a nuestro grupo. Es un negocio multinivel: eres independiente, así que también puedes formar tu propio grupo de afiliadas y afiliados y crecer hasta convertirte en directora o director.",
  },
];

const PASOS = [
  "Escríbenos por WhatsApp: te conectamos con una directora o director de nuestro equipo, quien te acompaña en todo el proceso.",
  "Te acompañamos en el estudio de crédito con la empresa.",
  "Empiezas a hacer pedidos con tu descuento de afiliada y accedes a premios desde tu primera campaña.",
];

const MENSAJE_WHATSAPP = "Hola, quiero información para afiliarme al equipo de Aura & Esencia.";

export default function PaginaAfiliacion() {
  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-16" style={{ maxWidth: "960px" }}>
          <motion.p
            className="text-rose-400/80 text-xs uppercase font-medium mb-4 text-center"
            style={{ letterSpacing: "0.4em" }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            Programa de afiliación
          </motion.p>

          <motion.h1
            className="text-white text-center mb-4"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            Vende con nosotros, <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>gana con tu esfuerzo</span>
          </motion.h1>

          <motion.p
            className="text-white/40 text-sm text-center mb-14 mx-auto"
            style={{ maxWidth: "560px" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          >
            Únete a nuestro grupo de afiliadas y afiliados: vende los productos del catálogo con descuento,
            gana premios por cumplir tus metas y recibe beneficios especiales desde tu primera campaña.
          </motion.p>

          {/* Beneficios */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-16">
            {BENEFICIOS.map((b, i) => (
              <motion.div
                key={b.titulo}
                className="rounded-2xl p-6"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
                initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 + i * 0.08 }}
              >
                <p className="text-rose-300/90 text-sm font-medium mb-2">{b.titulo}</p>
                <p className="text-white/40 text-xs leading-relaxed">{b.detalle}</p>
              </motion.div>
            ))}
          </div>

          {/* Cómo funciona */}
          <motion.div
            className="mb-14"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          >
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-6 text-center">¿Cómo funciona?</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {PASOS.map((paso, i) => (
                <div key={paso} className="text-center px-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-3 text-black text-xs font-bold"
                    style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}
                  >
                    {i + 1}
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">{paso}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          >
            <a
              href={whatsappHref(MENSAJE_WHATSAPP)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-10 py-4 rounded-full text-xs font-bold uppercase tracking-widest text-black"
              style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)" }}
            >
              Quiero afiliarme
            </a>
            <p className="text-white/20 text-[11px] mt-4 mx-auto" style={{ maxWidth: "480px" }}>
              Los porcentajes de descuento, premios y condiciones de crédito los define la empresa proveedora
              y pueden variar según la campaña vigente — te confirmamos los detalles exactos al iniciar tu proceso.
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
