"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatearPrecio } from "../../../lib/utils";
import { obtenerEstadoTransaccion, type EstadoPedido } from "../../../lib/wompi";
import { transaccionCorrespondeAPedido, type VerificacionCliente } from "../../../lib/pedidos";

interface Pedido {
  id: string;
  referencia: string;
  userId: string;
  total: number;
  estado: EstadoPedido;
  envio?: { nombre?: string; email?: string; ciudad?: string };
  verificacionCliente?: VerificacionCliente;
  wompiTransactionId?: string;
  createdAt?: { toDate: () => Date };
}

const COLOR_ESTADO: Record<EstadoPedido, string> = {
  pendiente: "rgba(251,191,36,1)",
  pagado: "rgba(52,211,153,1)",
  fallido: "rgba(248,113,113,1)",
  cancelado: "rgba(255,255,255,0.4)",
};

export default function ListaPedidosAdmin() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [verificando, setVerificando] = useState<string | null>(null);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<Record<string, string>>({});

  useEffect(() => {
    async function cargar() {
      try {
        const snapshot = await getDocs(query(collection(db, "pedidos"), orderBy("createdAt", "desc")));
        setPedidos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido)));
      } catch {
        setError("No se pudieron cargar los pedidos. Revisa tu conexión y recarga.");
      } finally {
        setCargando(false);
      }
    }
    cargar();
  }, []);

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    try {
      await updateDoc(doc(db, "pedidos", id), { estado, updatedAt: serverTimestamp() });
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
    } catch {
      alert("No se pudo cambiar el estado del pedido.");
    }
  }

  // La verificación del cliente (verificacionCliente) la escribe su propio
  // navegador, así que no prueba nada: acá se vuelve a consultar a Wompi
  // desde el navegador del staff antes de marcar el pedido como pagado.
  async function verificarEnWompi(p: Pedido) {
    const transaccionId = p.verificacionCliente?.transaccionId ?? p.wompiTransactionId;
    if (!transaccionId) return;
    setVerificando(p.id);
    try {
      const transaccion = await obtenerEstadoTransaccion(transaccionId);
      let mensaje: string;
      if (!transaccionCorrespondeAPedido(transaccion, p)) {
        mensaje = `✗ La transacción ${transaccionId} no corresponde a este pedido (referencia o monto distintos). No se marcó como pagado.`;
      } else if (transaccion.estado !== "pagado") {
        mensaje = `Wompi reporta la transacción como "${transaccion.estadoWompi}". No se marcó como pagado.`;
      } else {
        await updateDoc(doc(db, "pedidos", p.id), {
          estado: "pagado",
          wompiTransactionId: transaccionId,
          updatedAt: serverTimestamp(),
        });
        setPedidos((prev) => prev.map((x) => (x.id === p.id ? { ...x, estado: "pagado" } : x)));
        mensaje = "✓ Wompi confirmó el pago. Pedido marcado como pagado.";
      }
      setResultadoVerificacion((prev) => ({ ...prev, [p.id]: mensaje }));
    } catch {
      setResultadoVerificacion((prev) => ({ ...prev, [p.id]: "No se pudo consultar a Wompi. Intenta de nuevo." }));
    } finally {
      setVerificando(null);
    }
  }

  return (
    <div>
      <h1 className="text-white text-2xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Pedidos</h1>

      {cargando ? (
        <p className="text-white/30 text-sm">Cargando...</p>
      ) : error ? (
        <p className="text-red-300/80 text-sm">{error}</p>
      ) : pedidos.length === 0 ? (
        <p className="text-white/30 text-sm">Todavía no hay pedidos.</p>
      ) : (
        <div className="space-y-2">
          {pedidos.map((p) => {
            const puedeVerificar = p.estado === "pendiente" && Boolean(p.verificacionCliente?.transaccionId ?? p.wompiTransactionId);
            return (
              <div key={p.id} className="p-4 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-[160px]">
                    <p className="text-white text-sm font-medium">{p.referencia}</p>
                    <p className="text-white/30 text-xs">{p.envio?.nombre ?? "—"} · {p.envio?.email ?? "—"}</p>
                  </div>
                  <p className="text-rose-300 text-sm font-bold">{formatearPrecio(p.total)}</p>
                  <select
                    value={p.estado}
                    onChange={(e) => cambiarEstado(p.id, e.target.value as EstadoPedido)}
                    className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: COLOR_ESTADO[p.estado] }}
                  >
                    {(["pendiente", "pagado", "fallido", "cancelado"] as EstadoPedido[]).map((e) => (
                      <option key={e} value={e} style={{ background: "#0d0810", color: "#fff" }}>{e}</option>
                    ))}
                  </select>
                </div>

                {puedeVerificar && (
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    {p.verificacionCliente && (
                      <p className="text-amber-300/80 text-xs">
                        El cliente reporta un pago aprobado (sin confirmar).
                      </p>
                    )}
                    <button
                      onClick={() => verificarEnWompi(p)}
                      disabled={verificando === p.id}
                      className="px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest text-black"
                      style={{ background: "linear-gradient(90deg, #6ee7b7, #fcd34d)", opacity: verificando === p.id ? 0.6 : 1 }}
                    >
                      {verificando === p.id ? "Consultando..." : "Verificar pago en Wompi"}
                    </button>
                  </div>
                )}
                {resultadoVerificacion[p.id] && (
                  <p className="text-white/50 text-xs mt-2">{resultadoVerificacion[p.id]}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
