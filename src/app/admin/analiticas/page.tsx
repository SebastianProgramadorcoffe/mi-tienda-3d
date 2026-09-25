"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { formatearPrecio } from "../../../lib/utils";
import { RutaProtegida } from "../../../components/RutaProtegida";
import type { Product } from "../../../components/ui/product-reveal-card";

interface ItemPedido {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

interface Pedido {
  id: string;
  total: number;
  estado: "pendiente" | "pagado" | "fallido" | "cancelado";
  itemsSnapshot?: ItemPedido[];
  createdAt?: { toDate: () => Date };
}

const DIAS_HISTORIAL = 14;
const UMBRAL_STOCK_BAJO = 5;

function claveFecha(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function StatTile({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">{etiqueta}</p>
      <p className="text-white text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{valor}</p>
    </div>
  );
}

// Gráfico de barras de una sola serie (ventas por día): una tonalidad, eje
// recesivo, sin etiqueta en cada barra — el valor exacto aparece al pasar
// el mouse, para no saturar 14 barras con texto.
function GraficoVentas({ datos }: { datos: { fecha: string; total: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const maximo = Math.max(1, ...datos.map((d) => d.total));
  const alto = 160;

  return (
    <div className="relative">
      <div className="flex items-end gap-[2px]" style={{ height: alto }}>
        {datos.map((d, i) => {
          const h = Math.max(2, (d.total / maximo) * (alto - 8));
          return (
            <div
              key={d.fecha}
              className="relative flex-1 flex items-end justify-center"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            >
              {hover === i && (
                <div
                  className="absolute -top-9 px-2 py-1 rounded-lg text-[10px] whitespace-nowrap z-10"
                  style={{ background: "rgba(15,10,25,0.95)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
                >
                  {formatearPrecio(d.total)}
                </div>
              )}
              <div
                className="w-full rounded-t-md transition-opacity"
                style={{
                  height: h,
                  background: hover === i ? "rgba(244,63,94,0.95)" : "rgba(244,63,94,0.6)",
                  minWidth: 8,
                }}
              />
            </div>
          );
        })}
      </div>
      {/* Línea base recesiva */}
      <div style={{ height: 1, background: "rgba(255,255,255,0.08)" }} />
      <div className="flex gap-[2px] mt-2">
        {datos.map((d, i) => (
          <div key={d.fecha} className="flex-1 text-center">
            {i % 2 === 0 && (
              <span className="text-white/25 text-[9px]">{d.fecha.slice(8, 10)}/{d.fecha.slice(5, 7)}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContenidoAnaliticas() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    Promise.all([
      getDocs(collection(db, "pedidos")),
      getDocs(collection(db, "productos")),
    ]).then(([pedidosSnap, productosSnap]) => {
      setPedidos(pedidosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Pedido)));
      setProductos(productosSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      setCargando(false);
    });
  }, []);

  const pagados = useMemo(() => pedidos.filter((p) => p.estado === "pagado"), [pedidos]);

  const ingresosTotales = useMemo(() => pagados.reduce((acc, p) => acc + (p.total || 0), 0), [pagados]);
  const ticketPromedio = pagados.length > 0 ? ingresosTotales / pagados.length : 0;
  const productosActivos = productos.filter((p) => p.activo !== false).length;

  const ventasPorDia = useMemo(() => {
    const hoy = new Date();
    const dias: { fecha: string; total: number }[] = [];
    for (let i = DIAS_HISTORIAL - 1; i >= 0; i--) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      dias.push({ fecha: claveFecha(d), total: 0 });
    }
    const mapa = new Map(dias.map((d) => [d.fecha, d]));
    for (const p of pagados) {
      if (!p.createdAt) continue;
      const clave = claveFecha(p.createdAt.toDate());
      const entrada = mapa.get(clave);
      if (entrada) entrada.total += p.total || 0;
    }
    return dias;
  }, [pagados]);

  const topProductos = useMemo(() => {
    const conteo = new Map<string, { nombre: string; cantidad: number }>();
    for (const p of pagados) {
      for (const item of p.itemsSnapshot ?? []) {
        const actual = conteo.get(item.productoId) ?? { nombre: item.nombre, cantidad: 0 };
        actual.cantidad += item.cantidad;
        conteo.set(item.productoId, actual);
      }
    }
    return [...conteo.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);
  }, [pagados]);

  const alertasStock = useMemo(() => {
    return productos
      .filter((p) => typeof p.stock === "number" && p.stock <= UMBRAL_STOCK_BAJO && p.activo !== false)
      .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
  }, [productos]);

  if (cargando) return <p className="text-white/30 text-sm">Cargando analíticas...</p>;

  return (
    <div>
      <h1 className="text-white text-2xl mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Analíticas</h1>
      <p className="text-white/30 text-xs uppercase tracking-widest mb-8">Cómo va evolucionando la tienda</p>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatTile etiqueta="Ingresos (pagados)" valor={formatearPrecio(ingresosTotales)} />
        <StatTile etiqueta="Pedidos pagados" valor={String(pagados.length)} />
        <StatTile etiqueta="Ticket promedio" valor={formatearPrecio(ticketPromedio)} />
        <StatTile etiqueta="Productos activos" valor={String(productosActivos)} />
      </div>

      {/* Alertas de stock */}
      {alertasStock.length > 0 && (
        <div className="mb-10 rounded-2xl p-5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)" }}>
          <h2 className="text-white text-sm font-semibold uppercase tracking-widest mb-4">
            ⚠ Alertas de stock ({alertasStock.length})
          </h2>
          <div className="space-y-2">
            {alertasStock.map((p) => {
              const agotado = (p.stock ?? 0) === 0;
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <Link href={`/admin/productos/editar?id=${p.id}`} className="text-white/70 hover:text-white truncate">
                    {p.nombre}
                  </Link>
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0"
                    style={{
                      color: agotado ? "rgba(248,113,113,1)" : "rgba(251,191,36,1)",
                      background: agotado ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                    }}
                  >
                    {agotado ? "Agotado" : `${p.stock} en stock`}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ventas por día */}
      <div className="mb-10 rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="text-white/70 text-xs uppercase tracking-widest mb-6">Ventas — últimos {DIAS_HISTORIAL} días</h2>
        {ingresosTotales === 0 ? (
          <p className="text-white/25 text-xs">Todavía no hay pedidos pagados en este período.</p>
        ) : (
          <GraficoVentas datos={ventasPorDia} />
        )}
      </div>

      {/* Top productos */}
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <h2 className="text-white/70 text-xs uppercase tracking-widest mb-6">Productos más vendidos</h2>
        {topProductos.length === 0 ? (
          <p className="text-white/25 text-xs">Todavía no hay ventas registradas.</p>
        ) : (
          <div className="space-y-3">
            {topProductos.map((p, i) => {
              const maximo = topProductos[0].cantidad;
              return (
                <div key={p.nombre + i} className="flex items-center gap-3">
                  <span className="text-white/30 text-xs w-4">{i + 1}</span>
                  <span className="text-white/70 text-sm flex-1 truncate">{p.nombre}</span>
                  <div className="flex-1 max-w-[160px] h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="h-full rounded-full" style={{ width: `${(p.cantidad / maximo) * 100}%`, background: "rgba(244,63,94,0.7)" }} />
                  </div>
                  <span className="text-white/40 text-xs w-16 text-right">{p.cantidad} und.</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PaginaAnaliticas() {
  return (
    <RutaProtegida rolesPermitidos={["admin"]}>
      <ContenidoAnaliticas />
    </RutaProtegida>
  );
}
