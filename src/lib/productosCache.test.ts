import { describe, it, expect, vi } from "vitest";

// mapearProducto no toca Firestore, pero productosCache.ts importa ./firebase
// a nivel de módulo, y ese archivo llama getAuth() con las env vars reales
// (ausentes en el entorno de test) — se mockea para poder probar la función
// pura de mapeo sin inicializar Firebase de verdad.
vi.mock("./firebase", () => ({ db: {} }));

const { mapearProducto } = await import("./productosCache");

describe("mapearProducto", () => {
  it("mapea un documento completo de Firestore al tipo Product", () => {
    const producto = mapearProducto("abc123", {
      nombre: "Aura Nocturna",
      marca: "Aura Esencia",
      categoria: "Perfumes",
      genero: "femenino",
      precio: "129900",
      imagen: "https://cdn/img.jpg",
      activo: true,
    });

    expect(producto.id).toBe("abc123");
    expect(producto.nombre).toBe("Aura Nocturna");
    expect(producto.precio).toBe(129900);
    expect(producto.activo).toBe(true);
  });

  it("aplica valores por defecto seguros cuando el documento viene incompleto", () => {
    const producto = mapearProducto("sin-datos", {});

    expect(producto.nombre).toBe("Sin nombre");
    expect(producto.precio).toBe(0);
    expect(producto.imagen).toBe("/placeholder.jpg");
    expect(producto.genero).toBe("unisex");
    expect(producto.colorEtiqueta).toBe("rose");
    expect(producto.activo).toBe(true);
    expect(producto.stock).toBeUndefined();
  });
});
