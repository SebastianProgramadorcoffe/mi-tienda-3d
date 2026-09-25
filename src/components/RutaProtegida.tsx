"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type RolUsuario } from "../context/AuthContext";

interface RutaProtegidaProps {
  children: ReactNode;
  rolesPermitidos?: RolUsuario[];
}

// Guarda de cliente: no hay servidor que valide sesión/rol (sitio estático),
// así que la protección real vive en las reglas de Firestore/Storage; esto
// solo evita que un usuario sin permiso vea la pantalla del panel.
export function RutaProtegida({ children, rolesPermitidos }: RutaProtegidaProps) {
  const { usuario, cargando, rol, cargandoRol } = useAuth();
  const router = useRouter();

  const listo = !cargando && !cargandoRol;
  const autorizado =
    listo && !!usuario && (!rolesPermitidos || (rol !== null && rolesPermitidos.includes(rol)));

  useEffect(() => {
    if (!listo) return;
    if (!usuario) {
      router.replace("/login");
      return;
    }
    if (rolesPermitidos && (rol === null || !rolesPermitidos.includes(rol))) {
      router.replace("/");
    }
  }, [listo, usuario, rol, rolesPermitidos, router]);

  if (!autorizado) {
    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#080510" }}
      >
        <p className="text-white/40 text-sm">Verificando acceso...</p>
      </main>
    );
  }

  return <>{children}</>;
}
