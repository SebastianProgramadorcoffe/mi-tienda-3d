"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatearPrecio } from "../../../lib/utils";

type EstadoPedido = "pendiente" | "pagado" | "fallido" | "cancelado";

interface Pedido {
  id: string;
  referencia: string;
  userId: string;
  total: number;
  estado: EstadoPedido;
  envio?: { nombre?: string; email?: string; ciudad?: string };
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

  useEffect(() => {
    async function cargar() {
      const snapshot = await getDocs(query(collection(db, "pedidos"), orderBy("createdAt", "desc")));
      setPedidos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido)));
      setCargando(false);
    }
    cargar();
  }, []);

  async function cambiarEstado(id: string, estado: EstadoPedido) {
    await updateDoc(doc(db, "pedidos", id), { estado });
    setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
  }

  return (
    <div>
      <h1 className="text-white text-2xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Pedidos</h1>

      {cargando ? (
        <p className="text-white/30 text-sm">Cargando...</p>
      ) : pedidos.length === 0 ? (
        <p className="text-white/30 text-sm">Todavía no hay pedidos.</p>
      ) : (
        <div className="space-y-2">
          {pedidos.map((p) => (
            <div key={p.id} className="flex items-center gap-4 p-4 rounded-xl flex-wrap"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
          ))}
        </div>
      )}
    </div>
  );
}
