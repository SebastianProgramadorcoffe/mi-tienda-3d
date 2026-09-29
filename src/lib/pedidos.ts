import type { Product } from "../components/ui/product-reveal-card";
import type { ItemCarrito } from "../context/CarritoContext";
import type { EstadoPedido } from "./wompi";

// Mismo límite que pedidoConPreciosValidos en firestore.rules: cada línea
// cuesta un get() en la evaluación de reglas. Si se cambia, cambiar ambos.
export const MAX_LINEAS_PEDIDO = 8;

// Lo que /checkout/confirmacion deja en el pedido cuando Wompi le respondió
// "aprobado" al navegador del cliente. Es solo informativo: lo escribe el
// cliente, así que el staff siempre vuelve a consultar a Wompi antes de
// marcar el pedido como pagado.
export interface VerificacionCliente {
  transaccionId: string;
  estadoWompi: string;
  montoCentavos: number;
}

export function totalEnCentavos(total: number): number {
  return Math.round(total * 100);
}

// Una transacción de Wompi solo cuenta para un pedido si es de ESE pedido
// (misma referencia, que no reusen la transacción de otro) y cobró
// exactamente su total (que no alteren "amount-in-cents" en la URL de pago).
export function transaccionCorrespondeAPedido(
  transaccion: { referencia: string; montoCentavos: number },
  pedido: { referencia: string; total: number },
): boolean {
  return (
    transaccion.referencia === pedido.referencia &&
    transaccion.montoCentavos === totalEnCentavos(pedido.total)
  );
}

export function estadoTrasVerificarPago(
  transaccion: { referencia: string; montoCentavos: number; estado: EstadoPedido },
  pedido: { referencia: string; total: number },
): EstadoPedido {
  return transaccionCorrespondeAPedido(transaccion, pedido) ? transaccion.estado : "fallido";
}

// El carrito vive en localStorage con una copia del producto de cuando se
// agregó; si el admin cambió el precio o desactivó el producto después, el
// pedido sería rechazado por las reglas. Esto reemplaza cada producto por su
// versión vigente y saca los que ya no están disponibles.
export function sincronizarItemsConCatalogo(
  items: ItemCarrito[],
  vigentes: Map<string, Product>,
): { items: ItemCarrito[]; preciosCambiados: string[]; noDisponibles: string[] } {
  const preciosCambiados: string[] = [];
  const noDisponibles: string[] = [];
  const resultado: ItemCarrito[] = [];

  for (const item of items) {
    const vigente = vigentes.get(item.producto.id);
    if (!vigente || vigente.activo === false) {
      noDisponibles.push(item.producto.nombre);
      continue;
    }
    if (vigente.precio !== item.producto.precio) preciosCambiados.push(vigente.nombre);
    resultado.push({ ...item, producto: vigente });
  }

  return { items: resultado, preciosCambiados, noDisponibles };
}
