"use client";

import { createContext, useContext, useReducer, useEffect, ReactNode } from "react";
import { Product } from "../components/ui/product-reveal-card";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface ItemCarrito {
  producto: Product;
  cantidad: number;
}

interface EstadoCarrito {
  items: ItemCarrito[];
  abierto: boolean;
}

type AccionCarrito =
  | { type: "AGREGAR"; producto: Product }
  | { type: "QUITAR"; id: string }
  | { type: "CAMBIAR_CANTIDAD"; id: string; cantidad: number }
  | { type: "VACIAR" }
  | { type: "TOGGLE_CARRITO" }
  | { type: "ABRIR_CARRITO" }
  | { type: "CERRAR_CARRITO" }
  | { type: "HIDRATAR"; items: ItemCarrito[] };

interface ContextoCarrito {
  items: ItemCarrito[];
  abierto: boolean;
  totalItems: number;
  totalPrecio: number;
  agregar: (producto: Product) => void;
  quitar: (id: string) => void;
  cambiarCantidad: (id: string, cantidad: number) => void;
  vaciar: () => void;
  toggleCarrito: () => void;
  abrirCarrito: () => void;
  cerrarCarrito: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
function reducerCarrito(estado: EstadoCarrito, accion: AccionCarrito): EstadoCarrito {
  switch (accion.type) {
    case "AGREGAR": {
      const existe = estado.items.find((i) => i.producto.id === accion.producto.id);
      if (existe) {
        return {
          ...estado,
          items: estado.items.map((i) =>
            i.producto.id === accion.producto.id
              ? { ...i, cantidad: i.cantidad + 1 }
              : i
          ),
        };
      }
      return { ...estado, items: [...estado.items, { producto: accion.producto, cantidad: 1 }] };
    }
    case "QUITAR":
      return { ...estado, items: estado.items.filter((i) => i.producto.id !== accion.id) };
    case "CAMBIAR_CANTIDAD":
      if (accion.cantidad <= 0) {
        return { ...estado, items: estado.items.filter((i) => i.producto.id !== accion.id) };
      }
      return {
        ...estado,
        items: estado.items.map((i) =>
          i.producto.id === accion.id ? { ...i, cantidad: accion.cantidad } : i
        ),
      };
    case "VACIAR":
      return { ...estado, items: [] };
    case "TOGGLE_CARRITO":
      return { ...estado, abierto: !estado.abierto };
    case "ABRIR_CARRITO":
      return { ...estado, abierto: true };
    case "CERRAR_CARRITO":
      return { ...estado, abierto: false };
    case "HIDRATAR":
      return { ...estado, items: accion.items };
    default:
      return estado;
  }
}

// ─── Contexto ─────────────────────────────────────────────────────────────────
const CarritoCtx = createContext<ContextoCarrito | null>(null);

export function CarritoProvider({ children }: { children: ReactNode }) {
  const [estado, dispatch] = useReducer(reducerCarrito, { items: [], abierto: false });

  // Persistencia en localStorage
  useEffect(() => {
    const guardado = localStorage.getItem("aura_carrito");
    if (guardado) {
      try {
        dispatch({ type: "HIDRATAR", items: JSON.parse(guardado) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("aura_carrito", JSON.stringify(estado.items));
  }, [estado.items]);

  const totalItems = estado.items.reduce((acc, i) => acc + i.cantidad, 0);
  const totalPrecio = estado.items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0);

  return (
    <CarritoCtx.Provider value={{
      items: estado.items,
      abierto: estado.abierto,
      totalItems,
      totalPrecio,
      agregar: (producto) => dispatch({ type: "AGREGAR", producto }),
      quitar: (id) => dispatch({ type: "QUITAR", id }),
      cambiarCantidad: (id, cantidad) => dispatch({ type: "CAMBIAR_CANTIDAD", id, cantidad }),
      vaciar: () => dispatch({ type: "VACIAR" }),
      toggleCarrito: () => dispatch({ type: "TOGGLE_CARRITO" }),
      abrirCarrito: () => dispatch({ type: "ABRIR_CARRITO" }),
      cerrarCarrito: () => dispatch({ type: "CERRAR_CARRITO" }),
    }}>
      {children}
    </CarritoCtx.Provider>
  );
}

export function useCarrito() {
  const ctx = useContext(CarritoCtx);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de CarritoProvider");
  return ctx;
}