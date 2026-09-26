"use client";

import { motion } from "framer-motion";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";

export default function PaginaNosotros() {
  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-16" style={{ maxWidth: "720px" }}>
          <motion.p
            className="text-rose-400/80 text-xs uppercase font-medium mb-4 text-center"
            style={{ letterSpacing: "0.4em" }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          >
            Nuestra historia
          </motion.p>

          <motion.h1
            className="text-white text-center mb-10"
            style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)", fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          >
            Sobre <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>Aura & Esencia</span>
          </motion.h1>

          <motion.div
            className="space-y-6 text-white/50 text-sm leading-relaxed"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          >
            <p>
              Aura & Esencia nace con una idea simple: reunir en un solo lugar las mejores marcas de
              cosméticos y cuidado personal, con una experiencia de compra tan cuidada como los
              productos que ofrecemos.
            </p>
            <p>
              Trabajamos con marcas reconocidas como Yanbal, Ésika, Avon y Natura, seleccionando
              cada producto pensando en la calidad, el precio justo y la confianza de nuestras
              clientas.
            </p>
            <p>
              Somos un negocio en crecimiento, así que cada pedido cuenta — y cada persona que
              confía en nosotros nos ayuda a seguir mejorando.
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
