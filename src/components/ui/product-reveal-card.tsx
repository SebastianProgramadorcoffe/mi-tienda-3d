"use client";

import { useRef, useState } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export interface Product {
  id: number;
  name: string;
  brand: string;
  category: string;
  price: string;
  originalPrice?: string;
  image: string;
  tag?: string;
  tagColor?: "rose" | "gold" | "emerald";
  description: string;
}

export interface ProductRevealCardProps {
  product: Product;
  className?: string;
  index?: number;
}

const TAG_STYLES: Record<string, string> = {
  rose:    "bg-rose-500/20 border-rose-400/40 text-rose-300",
  gold:    "bg-amber-500/20 border-amber-400/40 text-amber-300",
  emerald: "bg-emerald-500/20 border-emerald-400/40 text-emerald-300",
};

export function ProductRevealCard({
  product,
  className,
  index = 0,
}: ProductRevealCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const springCfg = { stiffness: 180, damping: 20, mass: 0.4 };
  const xSpring = useSpring(rawX, springCfg);
  const ySpring = useSpring(rawY, springCfg);

  const rotateX = useTransform(ySpring, [-0.5, 0.5], ["15deg", "-15deg"]);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ["-15deg", "15deg"]);

  // ✅ Glare como CSS custom property via MotionValue — sin .get()
  const glareX = useTransform(xSpring, [-0.5, 0.5], [10, 90]);
  const glareY = useTransform(ySpring, [-0.5, 0.5], [10, 90]);

  function onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    rawX.set((e.clientX - left) / width - 0.5);
    rawY.set((e.clientY - top) / height - 0.5);
  }

  function onMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  }

  const tagStyle = TAG_STYLES[product.tagColor ?? "rose"];

  return (
    <motion.div
      ref={ref}
      className={cn("relative cursor-pointer select-none", className)}
      style={{ perspective: "1100px" }}
      onMouseMove={onMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onMouseLeave}
      initial={{ opacity: 0, y: 60, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.75,
        delay: index * 0.12,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <motion.div
        style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        className="relative w-full rounded-[2rem] overflow-hidden"
      >
        {/* ── Imagen ── */}
        <div
          className="relative w-full overflow-hidden bg-[#0d0810]"
          style={{ aspectRatio: "3/4" }}
        >
          <motion.img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
            animate={{ scale: hovered ? 1.1 : 1 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="absolute inset-0 bg-gradient-to-t from-[#080510]/95 via-[#080510]/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-br from-rose-950/20 via-transparent to-transparent" />

          {/* ✅ Glare — usa motion style con números, no strings con .get() */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            animate={{ opacity: hovered ? 1 : 0 }}
            transition={{ duration: 0.3 }}
            style={{
              background: "radial-gradient(circle at 50% 50%, rgba(255,192,203,0.18) 0%, transparent 55%)",
            }}
          />

          {/* Badge */}
          {product.tag && (
            <motion.div
              className="absolute top-4 left-4"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.12 + 0.4 }}
            >
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase backdrop-blur-sm border",
                  tagStyle
                )}
              >
                {product.tag}
              </span>
            </motion.div>
          )}

          {/* Marca */}
          <div className="absolute top-4 right-4">
            <span className="text-[10px] tracking-[0.25em] uppercase text-white/30 font-medium">
              {product.brand}
            </span>
          </div>
        </div>

        {/* ── Panel glassmorphism ── */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-4"
          style={{ translateZ: "45px" }}
        >
          <div
            className="rounded-2xl p-4"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
            }}
          >
            <p className="text-rose-300/70 text-[10px] tracking-[0.22em] uppercase font-medium mb-1">
              {product.category}
            </p>

            <h3 className="text-white font-semibold text-base leading-snug tracking-tight mb-1">
              {product.name}
            </h3>

            <AnimatePresence>
              {hovered && (
                <motion.p
                  className="text-white/45 text-[11px] leading-relaxed mb-2"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {product.description}
                </motion.p>
              )}
            </AnimatePresence>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-baseline gap-2">
                <span className="text-rose-300 font-bold text-xl tracking-tight">
                  {product.price}
                </span>
                {product.originalPrice && (
                  <span className="text-white/30 text-xs line-through">
                    {product.originalPrice}
                  </span>
                )}
              </div>

              <motion.button
                className="w-9 h-9 rounded-full flex items-center justify-center bg-rose-500/80 border border-rose-400/30 text-white"
                style={{ boxShadow: "0 4px 15px rgba(159,18,57,0.4)" }}
                whileHover={{ scale: 1.1, backgroundColor: "rgba(251,113,133,0.95)" }}
                whileTap={{ scale: 0.92 }}
                aria-label="Agregar al carrito"
              >
                <svg
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <path d="M16 10a4 4 0 0 1-8 0" />
                </svg>
              </motion.button>
            </div>

            <AnimatePresence>
              {hovered && (
                <motion.button
                  className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold tracking-[0.18em] uppercase text-black"
                  style={{
                    background: "linear-gradient(90deg, #fda4af, #fcd34d)",
                    boxShadow: "0 4px 20px rgba(159,18,57,0.3)",
                  }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.2 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Ver Detalles
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Borde glow */}
        <motion.div
          className="absolute inset-0 rounded-[2rem] pointer-events-none"
          animate={{
            boxShadow: hovered
              ? "0 0 0 1.5px rgba(244,114,182,0.35), 0 25px 70px rgba(0,0,0,0.65), 0 0 60px rgba(244,114,182,0.08)"
              : "0 0 0 1px rgba(255,255,255,0.06), 0 15px 45px rgba(0,0,0,0.45)",
          }}
          transition={{ duration: 0.35 }}
        />
      </motion.div>
    </motion.div>
  );
}