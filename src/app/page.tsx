"use client";

import { motion } from "framer-motion";
import {
  ProductRevealCard,
  type Product,
} from "../components/ui/product-reveal-card";

const products: Product[] = [
  {
    id: 1,
    name: "Ésika Pro Velvet",
    brand: "Ésika",
    category: "Labiales",
    price: "$28.900",
    originalPrice: "$38.500",
    tag: "Oferta",
    tagColor: "rose",
    description:
      "Labial de larga duración con acabado aterciopelado. 12 horas de color intenso y nutrición profunda.",
    image:
      "https://images.unsplash.com/photo-1586495777744-4e6232bf5e75?w=800&q=85&fit=crop&crop=center",
  },
  {
    id: 2,
    name: "Natura Tododia",
    brand: "Natura",
    category: "Fragancias",
    price: "$65.000",
    tag: "Nuevo",
    tagColor: "gold",
    description:
      "Fragancia femenina floral con notas de jazmín, sándalo y vainilla. Frasco de 75ml Eau de Parfum.",
    image:
      "https://images.unsplash.com/photo-1590736969955-71cc94901144?w=800&q=85&fit=crop&crop=center",
  },
  {
    id: 3,
    name: "Yanbal Unique Gold",
    brand: "Yanbal",
    category: "Base de Maquillaje",
    price: "$52.500",
    originalPrice: "$68.000",
    tag: "Top Ventas",
    tagColor: "gold",
    description:
      "Base de cobertura total con FPS 30. Fórmula enriquecida con oro coloidal para un acabado radiante.",
    image:
      "https://images.unsplash.com/photo-1631214524020-3c69f6061ebe?w=800&q=85&fit=crop&crop=center",
  },
  {
    id: 4,
    name: "Avon Far Away",
    brand: "Avon",
    category: "Fragancias",
    price: "$43.900",
    tag: "Exclusivo",
    tagColor: "emerald",
    description:
      "Fragancia oriental con notas de ámbar, rosa y madera. Elegancia intemporal en un frasco icónico.",
    image:
      "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=85&fit=crop&crop=center",
  },
];

function FloatingOrb({
  className,
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className ?? ""}`}
      style={{ filter: "blur(80px)" }}
      animate={{
        y: [0, -24, 0],
        scale: [1, 1.06, 1],
        opacity: [0.35, 0.55, 0.35],
      }}
      transition={{
        duration: 6 + delay,
        repeat: Infinity,
        ease: "easeInOut",
        delay,
      }}
    />
  );
}

export default function HomePage() {
  return (
    <main
      className="min-h-screen relative overflow-hidden"
      style={{ background: "#080510" }}
    >
      {/* ✅ @import debe ir antes de todo — lo movemos a globals.css.
          Aquí solo estilos que no conflictúan con Tailwind v4 */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');
        .font-display { font-family: 'Cormorant Garamond', serif !important; }
        .font-body    { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* Fondo */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(157,23,77,0.18) 0%, transparent 60%)",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: 0.025,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
        <FloatingOrb
          className="w-[500px] h-[500px] bg-rose-700/30 -top-32 -left-24"
          delay={0}
        />
        <FloatingOrb
          className="w-[400px] h-[400px] bg-pink-600/20 top-1/3 -right-32"
          delay={2}
        />
        <FloatingOrb
          className="w-[350px] h-[350px] bg-amber-700/15 bottom-0 left-1/3"
          delay={4}
        />
      </div>

      {/* Contenido */}
      <div
        className="relative z-10 mx-auto px-6 py-16"
        style={{ maxWidth: "1200px" }}
      >
        {/* Header */}
        <header className="text-center mb-16">
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
            className="font-display text-white mb-4 leading-none"
            style={{
              fontSize: "clamp(2.8rem, 7vw, 5.5rem)",
              fontFamily: "'Cormorant Garamond', serif",
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            <span
              style={{
                color: "rgba(255,210,225,0.9)",
                fontStyle: "italic",
                fontWeight: 300,
              }}
            >
              Belleza
            </span>
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

          <motion.div
            className="flex items-center justify-center gap-4 mt-8"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            transition={{ duration: 0.7, delay: 0.4 }}
          >
            <div
              className="h-px w-20"
              style={{
                background: "linear-gradient(to right, transparent, rgba(244,114,182,0.5))",
              }}
            />
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "rgba(244,114,182,0.6)" }}
            />
            <div
              className="h-px w-20"
              style={{
                background: "linear-gradient(to left, transparent, rgba(244,114,182,0.5))",
              }}
            />
          </motion.div>
        </header>

        {/* Grid */}
        <section
          aria-label="Galería de productos"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {products.map((product, i) => (
            <ProductRevealCard
              key={product.id}
              product={product}
              index={i}
            />
          ))}
        </section>

        {/* Footer CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-white/25 text-xs uppercase mb-6"
            style={{ letterSpacing: "0.3em" }}
          >
            Más de 200 productos disponibles
          </p>
          <motion.button
            className="px-10 py-3.5 rounded-full text-sm font-medium uppercase text-white"
            style={{
              letterSpacing: "0.15em",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "transparent",
            }}
            whileHover={{
              borderColor: "rgba(244,114,182,0.5)",
              backgroundColor: "rgba(244,63,94,0.08)",
              scale: 1.02,
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
          >
            Ver Catálogo Completo
          </motion.button>
        </motion.div>
      </div>
    </main>
  );
}