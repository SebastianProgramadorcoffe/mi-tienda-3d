import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// ─── Clases de Tailwind ───────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Formateo de precios (COP) ────────────────────────────────────────────────
// Uso: formatearPrecio(28900) → "$28.900"
// Uso: formatearPrecio(28900, true) → "$28.900 COP"
export function formatearPrecio(valor: number, mostrarMoneda = false): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
    currencyDisplay: mostrarMoneda ? "code" : "narrowSymbol",
  }).format(valor);
}

// ─── Calcula el porcentaje de descuento ──────────────────────────────────────
// Uso: calcularDescuento(28900, 38500) → 25  (25% de descuento)
export function calcularDescuento(
  precioActual: number,
  precioOriginal: number
): number {
  if (precioOriginal <= 0) return 0;
  return Math.round(((precioOriginal - precioActual) / precioOriginal) * 100);
}