"use client";

import Link from "next/link";
import { useAuth } from "../../context/AuthContext";

export default function PanelAdmin() {
  const { usuario, rol } = useAuth();

  return (
    <div>
      <h1 className="text-white text-2xl mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Hola, {usuario?.displayName || usuario?.email}
      </h1>
      <p className="text-white/30 text-xs uppercase tracking-widest mb-10">
        Panel de {rol === "admin" ? "administración" : "empleado"}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ...(rol === "admin"
            ? [{ href: "/admin/analiticas", titulo: "Analíticas", desc: "Ventas, evolución de la tienda y alertas de stock." }]
            : []),
          { href: "/admin/productos", titulo: "Productos", desc: "Crear, editar y desactivar productos del catálogo." },
          { href: "/admin/pedidos", titulo: "Pedidos", desc: "Ver pedidos de clientes y actualizar su estado." },
          ...(rol === "admin"
            ? [{ href: "/admin/usuarios", titulo: "Usuarios", desc: "Asignar roles de empleado o administrador." }]
            : []),
        ].map((tarjeta) => (
          <Link
            key={tarjeta.href}
            href={tarjeta.href}
            className="block rounded-2xl p-6 transition-colors hover:bg-white/[0.04]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <h2 className="text-white text-sm font-semibold mb-2">{tarjeta.titulo}</h2>
            <p className="text-white/40 text-xs leading-relaxed">{tarjeta.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
