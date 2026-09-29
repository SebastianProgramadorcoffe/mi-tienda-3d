import { describe, it, expect } from "vitest";
import {
  estadoTrasVerificarPago,
  sincronizarItemsConCatalogo,
  totalEnCentavos,
  transaccionCorrespondeAPedido,
} from "./pedidos";
import type { Product } from "../components/ui/product-reveal-card";
import type { ItemCarrito } from "../context/CarritoContext";

function producto(parcial: Partial<Product> & { id: string }): Product {
  return { nombre: `Producto ${parcial.id}`, precio: 10000, imagen: "/x.jpg", ...parcial } as Product;
}

describe("transaccionCorrespondeAPedido", () => {
  const pedido = { referencia: "AURA-1", total: 45900 };

  it("acepta una transacción con la misma referencia y el monto exacto en centavos", () => {
    expect(transaccionCorrespondeAPedido({ referencia: "AURA-1", montoCentavos: 4590000 }, pedido)).toBe(true);
  });

  it("rechaza una transacción de otro pedido aunque el monto coincida", () => {
    expect(transaccionCorrespondeAPedido({ referencia: "AURA-2", montoCentavos: 4590000 }, pedido)).toBe(false);
  });

  it("rechaza un monto cobrado menor al total del pedido", () => {
    expect(transaccionCorrespondeAPedido({ referencia: "AURA-1", montoCentavos: 100000 }, pedido)).toBe(false);
  });
});

describe("estadoTrasVerificarPago", () => {
  it("devuelve fallido si Wompi aprobó una transacción que no corresponde al pedido", () => {
    const estado = estadoTrasVerificarPago(
      { referencia: "OTRO", montoCentavos: 100, estado: "pagado" },
      { referencia: "AURA-1", total: 1 },
    );
    expect(estado).toBe("fallido");
  });

  it("devuelve el estado de Wompi cuando la transacción corresponde", () => {
    const estado = estadoTrasVerificarPago(
      { referencia: "AURA-1", montoCentavos: 100, estado: "pagado" },
      { referencia: "AURA-1", total: 1 },
    );
    expect(estado).toBe("pagado");
  });
});

describe("totalEnCentavos", () => {
  it("redondea en vez de arrastrar errores de punto flotante", () => {
    expect(totalEnCentavos(19.99)).toBe(1999);
  });
});

describe("sincronizarItemsConCatalogo", () => {
  it("reemplaza el precio guardado en el carrito por el vigente y lo reporta", () => {
    const items: ItemCarrito[] = [{ producto: producto({ id: "a", precio: 10000 }), cantidad: 2 }];
    const vigentes = new Map([["a", producto({ id: "a", precio: 12000 })]]);

    const r = sincronizarItemsConCatalogo(items, vigentes);

    expect(r.items[0].producto.precio).toBe(12000);
    expect(r.items[0].cantidad).toBe(2);
    expect(r.preciosCambiados).toEqual(["Producto a"]);
    expect(r.noDisponibles).toEqual([]);
  });

  it("quita productos borrados o desactivados", () => {
    const items: ItemCarrito[] = [
      { producto: producto({ id: "borrado" }), cantidad: 1 },
      { producto: producto({ id: "inactivo" }), cantidad: 1 },
      { producto: producto({ id: "ok" }), cantidad: 1 },
    ];
    const vigentes = new Map([
      ["inactivo", producto({ id: "inactivo", activo: false })],
      ["ok", producto({ id: "ok" })],
    ]);

    const r = sincronizarItemsConCatalogo(items, vigentes);

    expect(r.items.map((i) => i.producto.id)).toEqual(["ok"]);
    expect(r.noDisponibles).toEqual(["Producto borrado", "Producto inactivo"]);
    expect(r.preciosCambiados).toEqual([]);
  });

  it("conserva la variante de color elegida", () => {
    const variante = { codigoProveedor: "C1", color: "Rojo", stock: 3 };
    const items: ItemCarrito[] = [{ producto: producto({ id: "a" }), variante, cantidad: 1 }];

    const r = sincronizarItemsConCatalogo(items, new Map([["a", producto({ id: "a" })]]));

    expect(r.items[0].variante).toEqual(variante);
  });
});
