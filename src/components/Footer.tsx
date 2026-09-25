"use client";

import { useState } from "react";
import Link from "next/link";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { BarraConfianza } from "./BarraConfianza";

const ENLACES_LEGALES = [
  { href: "/politica-de-privacidad", label: "Política de Tratamiento de Datos" },
  { href: "/terminos-y-condiciones", label: "Términos y Condiciones" },
];

const ENLACES_TIENDA = [
  { href: "/catalogo", label: "Catálogo" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/contacto", label: "Contacto" },
];

export function Footer() {
  const [email, setEmail] = useState("");
  const [aceptoTerminos, setAceptoTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  async function alSuscribirse(e: React.FormEvent) {
    e.preventDefault();
    setMensaje(null);

    const correo = email.trim().toLowerCase();
    if (!correo || !correo.includes("@")) {
      setMensaje({ tipo: "error", texto: "Ingresa un correo válido." });
      return;
    }
    if (!aceptoTerminos) {
      setMensaje({ tipo: "error", texto: "Debes aceptar el tratamiento de datos personales." });
      return;
    }

    setEnviando(true);
    try {
      await setDoc(doc(db, "suscriptores", correo), {
        email: correo,
        aceptoTerminos: true,
        createdAt: serverTimestamp(),
      });
      setMensaje({ tipo: "ok", texto: "¡Listo! Ya estás suscrito a nuestras novedades." });
      setEmail("");
      setAceptoTerminos(false);
    } catch {
      setMensaje({ tipo: "error", texto: "No se pudo completar la suscripción. Intenta de nuevo." });
    } finally {
      setEnviando(false);
    }
  }

  return (
    <footer style={{ background: "#0a0714", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
      <div className="mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-2 gap-12" style={{ maxWidth: "1200px" }}>

        {/* Newsletter */}
        <div>
          <p className="text-white text-sm font-medium mb-4">Infórmate de nuestras novedades y ofertas:</p>
          <form onSubmit={alSuscribirse} className="space-y-3">
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">E-mail*</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
              />
            </div>

            <label className="flex items-start gap-2 text-white/40 text-[11px] leading-relaxed">
              <input type="checkbox" checked={aceptoTerminos} onChange={(e) => setAceptoTerminos(e.target.checked)} className="mt-0.5" />
              <span>
                Acepto{" "}
                <Link href="/terminos-y-condiciones" className="underline hover:text-white/60">términos y condiciones</Link>
                {" "}y autorizo el tratamiento de datos personales.*
              </span>
            </label>

            {mensaje && (
              <p className={`text-xs ${mensaje.tipo === "ok" ? "text-emerald-400" : "text-rose-400"}`}>{mensaje.texto}</p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest"
              style={{
                background: "transparent",
                border: "1px solid rgba(244,114,182,0.5)",
                color: "rgba(253,164,175,1)",
                opacity: enviando ? 0.6 : 1,
              }}
            >
              {enviando ? "Enviando..." : "¡Suscríbete aquí!"}
            </button>
          </form>
        </div>

        {/* Enlaces */}
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Tienda</p>
            <ul className="space-y-2">
              {ENLACES_TIENDA.map((e) => (
                <li key={e.href}>
                  <Link href={e.href} className="text-white/50 hover:text-white text-xs transition-colors">{e.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3">Legal</p>
            <ul className="space-y-2">
              {ENLACES_LEGALES.map((e) => (
                <li key={e.href}>
                  <Link href={e.href} className="text-white/50 hover:text-white text-xs transition-colors">{e.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <BarraConfianza />

      <div className="px-6 py-5 text-center">
        <p className="text-white/25 text-[11px]">© {new Date().getFullYear()} Aura Esencia. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
