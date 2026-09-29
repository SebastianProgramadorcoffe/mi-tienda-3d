"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { RutaProtegida } from "../../components/RutaProtegida";
import { useAuth } from "../../context/AuthContext";

const ENLACES = [
  { href: "/admin", label: "Panel", soloAdmin: false },
  { href: "/admin/analiticas", label: "Analíticas", soloAdmin: true },
  { href: "/admin/productos", label: "Productos", soloAdmin: false },
  { href: "/admin/pedidos", label: "Pedidos", soloAdmin: false },
  { href: "/admin/usuarios", label: "Usuarios", soloAdmin: true },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RutaProtegida rolesPermitidos={["admin", "empleado"]}>
      <AdminShell>{children}</AdminShell>
    </RutaProtegida>
  );
}

function AdminShell({ children }: { children: React.ReactNode }) {
  const { rol } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen" style={{ background: "#080510" }}>
      <header
        className="sticky top-0 z-30 px-6 py-4 flex items-center gap-8"
        style={{ background: "rgba(8,5,16,0.9)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <Link href="/" className="text-white/50 hover:text-white text-xs uppercase tracking-widest transition-colors">
          ← Aura & Esencia
        </Link>
        <nav className="flex items-center gap-6">
          {ENLACES.filter((e) => !e.soloAdmin || rol === "admin").map((enlace) => (
            <Link
              key={enlace.href}
              href={enlace.href}
              className="text-xs uppercase tracking-widest transition-colors"
              style={{ color: pathname === enlace.href ? "rgba(253,164,175,1)" : "rgba(255,255,255,0.4)" }}
            >
              {enlace.label}
            </Link>
          ))}
        </nav>
        <span className="ml-auto text-white/25 text-[10px] uppercase tracking-widest">
          Rol: {rol}
        </span>
      </header>
      <main className="px-6 py-10 mx-auto" style={{ maxWidth: "1100px" }}>
        {children}
      </main>
    </div>
  );
}
