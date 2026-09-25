"use client";

import { createContext, useContext, useEffect, useReducer, ReactNode } from "react";

const CLAVE_LOCALSTORAGE = "aura_favoritos";

type AccionFavoritos =
  | { type: "ALTERNAR"; id: string }
  | { type: "HIDRATAR"; ids: string[] };

function reducerFavoritos(ids: string[], accion: AccionFavoritos): string[] {
  switch (accion.type) {
    case "ALTERNAR":
      return ids.includes(accion.id) ? ids.filter((x) => x !== accion.id) : [...ids, accion.id];
    case "HIDRATAR":
      return accion.ids;
    default:
      return ids;
  }
}

interface ContextoFavoritos {
  ids: string[];
  totalFavoritos: number;
  esFavorito: (id: string) => boolean;
  alternarFavorito: (id: string) => void;
}

const FavoritosCtx = createContext<ContextoFavoritos | null>(null);

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [ids, dispatch] = useReducer(reducerFavoritos, []);

  // Persistencia en localStorage (mismo patrón que CarritoContext).
  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE_LOCALSTORAGE);
    if (guardado) {
      try {
        dispatch({ type: "HIDRATAR", ids: JSON.parse(guardado) });
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CLAVE_LOCALSTORAGE, JSON.stringify(ids));
  }, [ids]);

  function esFavorito(id: string) {
    return ids.includes(id);
  }

  function alternarFavorito(id: string) {
    dispatch({ type: "ALTERNAR", id });
  }

  return (
    <FavoritosCtx.Provider value={{ ids, totalFavoritos: ids.length, esFavorito, alternarFavorito }}>
      {children}
    </FavoritosCtx.Provider>
  );
}

export function useFavoritos() {
  const ctx = useContext(FavoritosCtx);
  if (!ctx) throw new Error("useFavoritos debe usarse dentro de FavoritosProvider");
  return ctx;
}
