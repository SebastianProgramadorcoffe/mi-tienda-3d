"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { RutaProtegida } from "../../../components/RutaProtegida";

type Tendencia = "subiendo" | "estable" | "bajando";

interface PrediccionProducto {
  productoId: string;
  nombre: string;
  ventaPredicha30Dias: number;
  ventaPredicha30DiasConPromo: number;
  tendencia: Tendencia;
  promocionSugerida: boolean;
  descuentoSugeridoPct: number;
  generadoEn?: { toDate: () => Date };
}

interface Meta {
  estado: "ok" | "datos_insuficientes";
  filasDisponibles?: number;
  minimoRequerido?: number;
  metricas?: { mae: number; r2: number | null; filasEntrenamiento: number };
  productosPredichos?: number;
  generadoEn?: { toDate: () => Date };
}

const COLOR_TENDENCIA: Record<Tendencia, string> = {
  subiendo: "rgba(52,211,153,1)",
  estable: "rgba(255,255,255,0.4)",
  bajando: "rgba(248,113,113,1)",
};

const ETIQUETA_TENDENCIA: Record<Tendencia, string> = {
  subiendo: "Subiendo",
  estable: "Estable",
  bajando: "Bajando",
};

function StatTile({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <p className="text-white/40 text-[10px] uppercase tracking-widest mb-2">{etiqueta}</p>
      <p className="text-white text-2xl font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{valor}</p>
    </div>
  );
}

function formatearFecha(ts?: { toDate: () => Date }) {
  if (!ts) return "—";
  return ts.toDate().toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
}

function ContenidoPredicciones() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [productos, setProductos] = useState<PrediccionProducto[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, "predicciones"))
      .then((snapshot) => {
        const filas: PrediccionProducto[] = [];
        let metaEncontrada: Meta | null = null;
        for (const d of snapshot.docs) {
          if (d.id === "_meta") {
            metaEncontrada = d.data() as Meta;
          } else {
            filas.push(d.data() as PrediccionProducto);
          }
        }
        setMeta(metaEncontrada);
        setProductos(filas);
      })
      .catch(() => {
        setError("No se pudieron cargar las predicciones. Intenta de nuevo más tarde.");
      })
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <p className="text-white/30 text-sm">Cargando predicciones...</p>;

  if (error) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.25)" }}>
        <p className="text-white/70 text-sm">{error}</p>
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-white/50 text-sm">
          Todavía no se ha ejecutado el workflow de predicciones. Ve a la pestaña
          {" "}<strong>Actions</strong> del repositorio en GitHub y corre
          {" "}<strong>&quot;Predicciones de ventas (Random Forest)&quot;</strong> manualmente,
          o espera a la ejecución automática diaria.
        </p>
      </div>
    );
  }

  if (meta.estado === "datos_insuficientes") {
    return (
      <div className="rounded-2xl p-5" style={{ background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.25)" }}>
        <p className="text-white/70 text-sm mb-1">
          Aún no hay suficiente historial de ventas pagadas para entrenar el modelo con confianza.
        </p>
        <p className="text-white/40 text-xs">
          {meta.filasDisponibles ?? 0} de {meta.minimoRequerido ?? 20} ventas mínimas registradas · última revisión {formatearFecha(meta.generadoEn)}
        </p>
      </div>
    );
  }

  const productosOrdenados = [...productos].sort((a, b) => {
    if (a.promocionSugerida !== b.promocionSugerida) return a.promocionSugerida ? -1 : 1;
    return b.ventaPredicha30Dias - a.ventaPredicha30Dias;
  });

  return (
    <div>
      {/* Metadatos del último entrenamiento */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
        <StatTile etiqueta="Productos predichos" valor={String(meta.productosPredichos ?? productos.length)} />
        <StatTile etiqueta="Error promedio (MAE)" valor={meta.metricas ? meta.metricas.mae.toFixed(2) : "—"} />
        <StatTile etiqueta="R²" valor={meta.metricas?.r2 != null ? meta.metricas.r2.toFixed(2) : "—"} />
        <StatTile etiqueta="Última actualización" valor={formatearFecha(meta.generadoEn)} />
      </div>

      {productosOrdenados.length === 0 ? (
        <p className="text-white/25 text-xs">No hay predicciones por producto todavía.</p>
      ) : (
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <h2 className="text-white/70 text-xs uppercase tracking-widest mb-6">Demanda estimada — próximos 30 días</h2>
          <div className="space-y-3">
            {productosOrdenados.map((p) => (
              <div
                key={p.productoId}
                className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-white/80 text-sm flex-1 truncate">{p.nombre}</span>

                <span
                  className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0 w-fit"
                  style={{ color: COLOR_TENDENCIA[p.tendencia], background: `${COLOR_TENDENCIA[p.tendencia]}1a` }}
                >
                  {ETIQUETA_TENDENCIA[p.tendencia]}
                </span>

                <span className="text-white/40 text-xs flex-shrink-0">
                  {p.ventaPredicha30Dias.toFixed(0)} und. sin promo · {p.ventaPredicha30DiasConPromo.toFixed(0)} und. con promo
                </span>

                {p.promocionSugerida && (
                  <span
                    className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-full flex-shrink-0 w-fit"
                    style={{ color: "rgba(253,164,175,1)", background: "rgba(244,63,94,0.1)" }}
                  >
                    Promocionar · -{p.descuentoSugeridoPct}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PaginaPredicciones() {
  return (
    <RutaProtegida rolesPermitidos={["admin"]}>
      <div>
        <h1 className="text-white text-2xl mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Predicciones</h1>
        <p className="text-white/30 text-xs uppercase tracking-widest mb-8">
          Demanda estimada y promociones sugeridas por IA (Random Forest)
        </p>
        <ContenidoPredicciones />
      </div>
    </RutaProtegida>
  );
}
