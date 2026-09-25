"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { obtenerEstadoTransaccion, type EstadoPedido } from "../../../lib/wompi";
import { Navbar } from "../../../components/Navbar";
import { CarritoDrawer } from "../../../components/CarritoDrawer";

const MENSAJE: Record<EstadoPedido, { titulo: string; detalle: string; color: string }> = {
  pagado:    { titulo: "¡Pago confirmado!", detalle: "Tu pedido fue recibido y ya lo estamos preparando.", color: "rgba(52,211,153,1)" },
  pendiente: { titulo: "Pago en proceso", detalle: "Wompi todavía está confirmando tu pago. Te avisaremos por correo.", color: "rgba(251,191,36,1)" },
  fallido:   { titulo: "El pago no se pudo procesar", detalle: "Intenta de nuevo o usa otro método de pago.", color: "rgba(248,113,113,1)" },
  cancelado: { titulo: "Pago cancelado", detalle: "No se realizó ningún cobro.", color: "rgba(255,255,255,0.5)" },
};

function ConfirmacionContenido() {
  const params = useSearchParams();
  const referencia = params.get("ref");
  const transaccionId = params.get("id");

  const [estado, setEstado] = useState<EstadoPedido | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function verificar() {
      if (!referencia || !transaccionId) {
        setError("Faltan datos para verificar el pago.");
        setCargando(false);
        return;
      }
      try {
        // El estado real siempre se obtiene de Wompi, nunca de los
        // parámetros de la URL (se podrían editar a mano). Además se
        // cruza contra el pedido guardado ANTES de ir a Wompi: la
        // referencia debe coincidir (que no reusen la transacción de OTRO
        // pedido) y el monto cobrado debe coincidir con el total real (que
        // no hayan alterado "amount-in-cents" en la URL de pago).
        const pedidoSnap = await getDoc(doc(db, "pedidos", referencia));
        if (!pedidoSnap.exists()) {
          setError("No encontramos este pedido. Si ya pagaste, contáctanos con tu referencia.");
          return;
        }
        const pedido = pedidoSnap.data();

        // Si ya se verificó antes (ej. recargaste esta página), no se
        // vuelve a intentar el updateDoc: las reglas solo permiten esa
        // transición una vez (desde 'pendiente'), y el resultado guardado
        // ya es el definitivo.
        if (pedido.estado !== "pendiente") {
          setEstado(pedido.estado as EstadoPedido);
          return;
        }

        const transaccion = await obtenerEstadoTransaccion(transaccionId);
        const montoEsperado = Math.round(Number(pedido.total) * 100);
        const coincide = transaccion.referencia === referencia && transaccion.montoCentavos === montoEsperado;

        const estadoFinal = coincide ? transaccion.estado : "fallido";
        await updateDoc(doc(db, "pedidos", referencia), {
          estado: estadoFinal,
          wompiTransactionId: transaccionId,
          updatedAt: serverTimestamp(),
        });

        if (!coincide) {
          setError("El monto cobrado no coincide con tu pedido. No se confirmó como pagado — contáctanos con tu referencia antes de reintentar.");
          return;
        }
        setEstado(estadoFinal);
      } catch {
        setError("No pudimos verificar el estado de tu pago. Si ya pagaste, contáctanos con tu referencia.");
      } finally {
        setCargando(false);
      }
    }
    verificar();
  }, [referencia, transaccionId]);

  const info = estado ? MENSAJE[estado] : null;

  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "#080510" }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="w-full text-center rounded-3xl p-10"
          style={{ maxWidth: 440, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {cargando ? (
            <p className="text-white/40 text-sm">Verificando tu pago...</p>
          ) : error ? (
            <>
              <h1 className="text-white text-xl mb-3" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Algo salió mal</h1>
              <p className="text-white/40 text-sm mb-2">{error}</p>
              {referencia && <p className="text-white/20 text-xs">Referencia: {referencia}</p>}
            </>
          ) : (
            <>
              <h1 className="text-2xl mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", color: info?.color }}>
                {info?.titulo}
              </h1>
              <p className="text-white/40 text-sm mb-2">{info?.detalle}</p>
              <p className="text-white/20 text-xs mb-8">Referencia: {referencia}</p>
            </>
          )}

          <Link href="/" className="inline-block px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest text-black"
            style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)" }}>
            Volver a la tienda
          </Link>
        </motion.div>
      </main>
    </>
  );
}

export default function PaginaConfirmacion() {
  return (
    <Suspense fallback={<p className="text-white/30 text-sm p-12">Cargando...</p>}>
      <ConfirmacionContenido />
    </Suspense>
  );
}
