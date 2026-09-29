"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { formatearPrecio } from "../../lib/utils";
import { useAuth } from "../../context/AuthContext";
import { RutaProtegida } from "../../components/RutaProtegida";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";

interface Pedido {
  id: string;
  referencia: string;
  total: number;
  estado: "pendiente" | "pagado" | "fallido" | "cancelado";
  itemsSnapshot?: { nombre: string; cantidad: number; color?: string | null }[];
  verificacionCliente?: unknown;
  createdAt?: { toDate: () => Date };
}

const COLOR_ESTADO: Record<Pedido["estado"], string> = {
  pendiente: "rgba(251,191,36,1)",
  pagado: "rgba(52,211,153,1)",
  fallido: "rgba(248,113,113,1)",
  cancelado: "rgba(255,255,255,0.4)",
};

function CuentaContenido() {
  const { usuario } = useAuth();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    if (!usuario) return;
    async function cargar() {
      const snapshot = await getDocs(
        query(collection(db, "pedidos"), where("userId", "==", usuario!.uid), orderBy("createdAt", "desc"))
      );
      setPedidos(snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido)));
      setCargando(false);
    }
    cargar();
  }, [usuario]);

  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <div className="mx-auto px-6 py-12" style={{ maxWidth: "800px" }}>
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-black font-bold text-lg"
              style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}>
              {usuario?.displayName?.[0]?.toUpperCase() ?? usuario?.email?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-white text-xl">{usuario?.displayName || "Mi cuenta"}</h1>
              <p className="text-white/30 text-xs">{usuario?.email}</p>
            </div>
          </div>

          <h2 className="text-white/70 text-xs uppercase tracking-widest mb-4">Mis pedidos</h2>

          {cargando ? (
            <p className="text-white/30 text-sm">Cargando...</p>
          ) : pedidos.length === 0 ? (
            <p className="text-white/30 text-sm">Todavía no has hecho ningún pedido.</p>
          ) : (
            <div className="space-y-2">
              {pedidos.map((p) => (
                <div key={p.id} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white text-sm font-medium">{p.referencia}</p>
                    <span className="text-[10px] uppercase tracking-widest" style={{ color: COLOR_ESTADO[p.estado] }}>
                      {p.estado === "pendiente" && p.verificacionCliente ? "pago en verificación" : p.estado}
                    </span>
                  </div>
                  <p className="text-white/30 text-xs mb-1">
                    {p.itemsSnapshot?.map((i) => `${i.cantidad}× ${i.nombre}${i.color ? ` (${i.color})` : ""}`).join(", ")}
                  </p>
                  <p className="text-rose-300 text-sm font-bold">{formatearPrecio(p.total)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function PaginaCuenta() {
  return (
    <RutaProtegida>
      <CuentaContenido />
    </RutaProtegida>
  );
}
