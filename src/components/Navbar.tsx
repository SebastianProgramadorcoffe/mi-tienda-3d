"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useCarrito } from "../context/CarritoContext";
import { useAuth } from "../context/AuthContext";
import { useFavoritos } from "../context/FavoritosContext";

interface NavbarProps {
  onBuscar?: (texto: string) => void;
  busqueda?: string;
}

export function Navbar({ onBuscar, busqueda = "" }: NavbarProps) {
  const { totalItems, toggleCarrito } = useCarrito();
  const { totalFavoritos } = useFavoritos();
  const { usuario, rol, cerrarSesion } = useAuth();
  const [menuUsuario, setMenuUsuario] = useState(false);
  const [busquedaActiva, setBusquedaActiva] = useState(false);
  const [menuMovilAbierto, setMenuMovilAbierto] = useState(false);

  // "Catálogo" no está: Inicio ya muestra el catálogo completo con hero,
  // así que tenerlo aparte era un link redundante a lo mismo que se está
  // viendo. La página /catalogo sigue existiendo por si algo más la enlaza.
  const enlacesNav = [
    { href: "/",          label: "Inicio"    },
    { href: "/nosotros",  label: "Nosotros"  },
    { href: "/contacto",  label: "Contacto"  },
  ];

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "rgba(8,5,16,0.85)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        .logo-brillo {
          text-shadow: 0 0 8px rgba(244,114,182,0.85), 0 0 18px rgba(244,114,182,0.5), 0 0 34px rgba(251,191,36,0.4);
        }
        .nav-link-brillo {
          text-shadow: 0 0 8px rgba(244,114,182,0.7), 0 0 18px rgba(244,114,182,0.35);
          transition: text-shadow 0.25s ease, color 0.2s ease;
        }
        .nav-link-brillo:hover {
          text-shadow: 0 0 10px rgba(244,114,182,0.95), 0 0 22px rgba(244,114,182,0.6), 0 0 34px rgba(251,191,36,0.45);
        }
        .buscador-boton {
          transition: box-shadow 0.25s ease, background 0.2s ease, color 0.2s ease;
          box-shadow: 0 0 14px 1px rgba(244,114,182,0.35);
        }
        .buscador-boton:hover {
          box-shadow: 0 0 18px 3px rgba(244,114,182,0.55), 0 0 32px 8px rgba(251,191,36,0.3);
        }
      `}</style>

      <div className="mx-auto px-4 md:px-6 py-4 flex items-center justify-between" style={{ maxWidth: "1200px" }}>

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}
          >
            <span className="text-black font-bold text-xs">AE</span>
          </div>
          <span
            className="text-white font-semibold tracking-wide text-sm whitespace-nowrap logo-brillo"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "1.1rem" }}
          >
            Aura & Esencia
          </span>
        </Link>

        {/* Links centrales */}
        <div className="hidden md:flex items-center gap-8">
          {enlacesNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white/50 hover:text-white text-xs tracking-widest uppercase transition-colors duration-200 nav-link-brillo"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/afiliacion"
            className="px-4 py-1.5 rounded-full text-xs tracking-widest uppercase font-semibold transition-colors duration-200"
            style={{ border: "1px solid rgba(244,114,182,0.5)", color: "rgba(253,164,175,1)" }}
          >
            Afíliate
          </Link>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 md:gap-3">

          {/* Buscador */}
          <AnimatePresence>
            {busquedaActiva && (
              <motion.input
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 180, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                type="text"
                placeholder="Buscar productos..."
                value={busqueda}
                onChange={(e) => onBuscar?.(e.target.value)}
                className="text-white text-xs px-3 py-1.5 rounded-full outline-none"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
                autoFocus
              />
            )}
          </AnimatePresence>

          <button
            onClick={() => setBusquedaActiva(!busquedaActiva)}
            className="w-11 h-11 md:w-auto md:px-5 rounded-full flex items-center justify-center md:justify-start gap-2 text-white/50 hover:text-white transition-colors buscador-boton"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Buscar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="hidden md:inline text-[11px] uppercase tracking-widest">Buscar</span>
          </button>

          {/* Favoritos — oculto en mobile (entra al menú hamburguesa) para
              que los 3 iconos restantes + logo entren en 375px sin overflow */}
          <Link
            href="/favoritos"
            className="relative hidden md:flex w-11 h-11 rounded-full items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Favoritos"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
            {totalFavoritos > 0 && (
              <motion.span
                key={totalFavoritos}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-black"
                style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}
              >
                {totalFavoritos}
              </motion.span>
            )}
          </Link>

          {/* Carrito */}
          <button
            onClick={toggleCarrito}
            className="relative w-11 h-11 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label="Carrito"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            {totalItems > 0 && (
              <motion.span
                key={totalItems}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-black"
                style={{ background: "linear-gradient(135deg, #f43f5e, #fbbf24)" }}
              >
                {totalItems}
              </motion.span>
            )}
          </button>

          {/* Usuario — oculto en mobile (entra al menú hamburguesa), mismo
              motivo que Favoritos arriba */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setMenuUsuario(!menuUsuario)}
              className="w-11 h-11 rounded-full flex items-center justify-center overflow-hidden transition-all"
              style={{
                background: usuario
                  ? "linear-gradient(135deg, #f43f5e, #fbbf24)"
                  : "rgba(255,255,255,0.06)",
                border: usuario ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
              aria-label="Usuario"
            >
              {usuario ? (
                <span className="text-black font-bold text-xs">
                  {usuario.displayName?.[0]?.toUpperCase() ?? usuario.email?.[0]?.toUpperCase()}
                </span>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
              )}
            </button>

            <AnimatePresence>
              {menuUsuario && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 rounded-2xl overflow-hidden"
                  style={{
                    width: 200,
                    background: "rgba(15,10,25,0.95)",
                    backdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
                  }}
                >
                  {usuario ? (
                    <>
                      <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                        <p className="text-white text-xs font-medium truncate">{usuario.displayName ?? "Usuario"}</p>
                        <p className="text-white/30 text-[10px] truncate">{usuario.email}</p>
                      </div>
                      <Link href="/cuenta" onClick={() => setMenuUsuario(false)}
                        className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 text-xs transition-colors">
                        Mi cuenta
                      </Link>
                      {(rol === "admin" || rol === "empleado") && (
                        <Link href="/admin" onClick={() => setMenuUsuario(false)}
                          className="flex items-center gap-3 px-4 py-3 text-amber-300/90 hover:text-amber-200 hover:bg-amber-500/10 text-xs font-medium transition-colors">
                          Panel {rol === "admin" ? "admin" : "empleado"}
                        </Link>
                      )}
                      <button
                        onClick={() => { cerrarSesion(); setMenuUsuario(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 text-xs transition-colors"
                      >
                        Cerrar sesión
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMenuUsuario(false)}
                        className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/5 text-xs transition-colors">
                        Iniciar sesión
                      </Link>
                      <Link href="/registro" onClick={() => setMenuUsuario(false)}
                        className="flex items-center gap-3 px-4 py-3 text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 text-xs font-medium transition-colors">
                        Crear cuenta
                      </Link>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Menú móvil (hamburguesa) — los enlaces centrales están ocultos con
              "hidden md:flex" arriba, así que por debajo de md esto es la
              única forma de llegar a Catálogo/Nosotros/Contacto/Afíliate. */}
          <button
            onClick={() => setMenuMovilAbierto(!menuMovilAbierto)}
            className="md:hidden w-11 h-11 -mr-1 rounded-full flex items-center justify-center text-white/50 hover:text-white transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}
            aria-label={menuMovilAbierto ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={menuMovilAbierto}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {menuMovilAbierto ? <path d="M18 6 6 18M6 6l12 12" /> : <path d="M3 6h18M3 12h18M3 18h18" />}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuMovilAbierto && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="md:hidden overflow-hidden"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
          >
            <div className="px-6 py-4 flex flex-col gap-1">
              {enlacesNav.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuMovilAbierto(false)}
                  className="text-white/60 hover:text-white text-sm tracking-widest uppercase py-3 transition-colors duration-200"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href="/afiliacion"
                onClick={() => setMenuMovilAbierto(false)}
                className="mt-2 px-4 py-3 rounded-full text-xs tracking-widest uppercase font-semibold text-center transition-colors duration-200"
                style={{ border: "1px solid rgba(244,114,182,0.5)", color: "rgba(253,164,175,1)" }}
              >
                Afíliate
              </Link>

              <div className="mt-3 pt-3 flex flex-col gap-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <Link
                  href="/favoritos"
                  onClick={() => setMenuMovilAbierto(false)}
                  className="text-white/50 hover:text-white text-xs uppercase tracking-widest py-2 transition-colors"
                >
                  Favoritos{totalFavoritos > 0 ? ` (${totalFavoritos})` : ""}
                </Link>
                {usuario ? (
                  <>
                    <Link
                      href="/cuenta"
                      onClick={() => setMenuMovilAbierto(false)}
                      className="text-white/50 hover:text-white text-xs uppercase tracking-widest py-2 transition-colors"
                    >
                      Mi cuenta
                    </Link>
                    {(rol === "admin" || rol === "empleado") && (
                      <Link
                        href="/admin"
                        onClick={() => setMenuMovilAbierto(false)}
                        className="text-amber-300/90 hover:text-amber-200 text-xs uppercase tracking-widest py-2 transition-colors"
                      >
                        Panel {rol === "admin" ? "admin" : "empleado"}
                      </Link>
                    )}
                    <button
                      onClick={() => { cerrarSesion(); setMenuMovilAbierto(false); }}
                      className="text-left text-rose-400/80 hover:text-rose-300 text-xs uppercase tracking-widest py-2 transition-colors"
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setMenuMovilAbierto(false)}
                    className="text-white/50 hover:text-white text-xs uppercase tracking-widest py-2 transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}