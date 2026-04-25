"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";

export default function PaginaLogin() {
  const [modo, setModo] = useState<"login" | "registro" | "recovery">("login");
  const [nombre,   setNombre]   = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState("");
  const [exito,    setExito]    = useState("");

  const { iniciarSesion, registrarse, iniciarConGoogle, recuperarPassword } = useAuth();
  const router = useRouter();

  const ERRORES: Record<string, string> = {
    "auth/invalid-credential":      "Correo o contraseña incorrectos.",
    "auth/email-already-in-use":    "Este correo ya está registrado.",
    "auth/weak-password":           "La contraseña debe tener al menos 6 caracteres.",
    "auth/user-not-found":          "No existe una cuenta con este correo.",
    "auth/too-many-requests":       "Demasiados intentos. Espera un momento.",
  };

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError("");
    setExito("");
    try {
      if (modo === "login") {
        await iniciarSesion(email, password);
        router.push("/");
      } else if (modo === "registro") {
        await registrarse(email, password, nombre);
        router.push("/");
      } else {
        await recuperarPassword(email);
        setExito("Te enviamos un correo para restablecer tu contraseña.");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(ERRORES[code] ?? "Ocurrió un error. Intenta de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  async function alGoogle() {
    setCargando(true);
    setError("");
    try {
      await iniciarConGoogle();
      router.push("/");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(ERRORES[code] ?? "Error al iniciar con Google.");
    } finally {
      setCargando(false);
    }
  }

  const titulos = { login: "Bienvenida", registro: "Crear cuenta", recovery: "Recuperar contraseña" };
  const subtitulos = { login: "Accede a tu cuenta de Aura Esencia", registro: "Únete a nuestra comunidad de belleza", recovery: "Te enviaremos un enlace a tu correo" };

  return (
    <main className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden" style={{ background: "#080510" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

      {/* Orbes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute rounded-full" style={{ width: 400, height: 400, background: "rgba(190,24,93,0.15)", filter: "blur(80px)", top: -100, left: -100 }} />
        <div className="absolute rounded-full" style={{ width: 300, height: 300, background: "rgba(251,191,36,0.08)", filter: "blur(80px)", bottom: 0, right: -50 }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full rounded-3xl p-8"
        style={{
          maxWidth: 420,
          background: "rgba(255,255,255,0.03)",
          backdropFilter: "blur(30px)",
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}>
            <span className="text-black font-bold text-xs">AE</span>
          </div>
          <span className="text-white font-semibold" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}>Aura Esencia</span>
        </div>

        {/* Título */}
        <AnimatePresence mode="wait">
          <motion.div key={modo} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="mb-6">
            <h1 className="text-white text-2xl mb-1" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
              <span style={{ fontStyle: "italic", color: "rgba(255,210,225,0.9)" }}>{titulos[modo].split(" ")[0]}</span>
              {titulos[modo].includes(" ") && <> {titulos[modo].split(" ").slice(1).join(" ")}</>}
            </h1>
            <p className="text-white/30 text-xs">{subtitulos[modo]}</p>
          </motion.div>
        </AnimatePresence>

        {/* Google */}
        {modo !== "recovery" && (
          <button
            onClick={alGoogle}
            disabled={cargando}
            className="w-full py-3 rounded-xl flex items-center justify-center gap-3 text-sm font-medium text-white/70 hover:text-white transition-all mb-6"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continuar con Google
          </button>
        )}

        {modo !== "recovery" && (
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-white/20 text-[10px] uppercase tracking-widest">o</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={alEnviar} className="space-y-4">
          {modo === "registro" && (
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Nombre</label>
              <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre completo" required className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          )}

          <div>
            <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Correo electrónico</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" required className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
          </div>

          {modo !== "recovery" && (
            <div>
              <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>
          )}

          {error && <p className="text-rose-400 text-xs">{error}</p>}
          {exito && <p className="text-emerald-400 text-xs">{exito}</p>}

          <motion.button
            type="submit"
            disabled={cargando}
            className="w-full py-3.5 rounded-xl text-sm font-bold tracking-widest uppercase text-black"
            style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)", opacity: cargando ? 0.7 : 1 }}
            whileHover={{ scale: cargando ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {cargando ? "..." : modo === "login" ? "Iniciar sesión" : modo === "registro" ? "Crear cuenta" : "Enviar correo"}
          </motion.button>
        </form>

        {/* Links */}
        <div className="mt-6 text-center space-y-2">
          {modo === "login" && (
            <>
              <button onClick={() => setModo("recovery")} className="text-white/30 hover:text-white/60 text-xs transition-colors block w-full">¿Olvidaste tu contraseña?</button>
              <button onClick={() => setModo("registro")} className="text-rose-300/60 hover:text-rose-300 text-xs transition-colors">¿No tienes cuenta? <span className="underline">Regístrate</span></button>
            </>
          )}
          {modo === "registro" && (
            <button onClick={() => setModo("login")} className="text-white/30 hover:text-white/60 text-xs transition-colors">¿Ya tienes cuenta? <span className="underline">Inicia sesión</span></button>
          )}
          {modo === "recovery" && (
            <button onClick={() => setModo("login")} className="text-white/30 hover:text-white/60 text-xs transition-colors">← Volver al inicio de sesión</button>
          )}
        </div>
      </motion.div>
    </main>
  );
}