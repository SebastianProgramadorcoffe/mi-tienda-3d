"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDocs, orderBy, query, updateDoc } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import { RutaProtegida } from "../../../components/RutaProtegida";
import { useAuth, type RolUsuario } from "../../../context/AuthContext";

interface UsuarioDoc {
  uid: string;
  email?: string;
  displayName?: string;
  rol: RolUsuario;
}

const ROLES: RolUsuario[] = ["cliente", "empleado", "admin"];

function ListaUsuarios() {
  const { usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioDoc[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function cargar() {
      const snapshot = await getDocs(query(collection(db, "usuarios"), orderBy("email", "asc")));
      setUsuarios(snapshot.docs.map((d) => d.data() as UsuarioDoc));
      setCargando(false);
    }
    cargar();
  }, []);

  async function cambiarRol(uid: string, rol: RolUsuario) {
    await updateDoc(doc(db, "usuarios", uid), { rol });
    setUsuarios((prev) => prev.map((u) => (u.uid === uid ? { ...u, rol } : u)));
  }

  return (
    <div>
      <h1 className="text-white text-2xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Usuarios</h1>
      <p className="text-white/30 text-xs mb-8">Asigna quién es cliente, empleado o administrador.</p>

      {cargando ? (
        <p className="text-white/30 text-sm">Cargando...</p>
      ) : (
        <div className="space-y-2">
          {usuarios.map((u) => (
            <div key={u.uid} className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">{u.displayName || "Sin nombre"}</p>
                <p className="text-white/30 text-xs truncate">{u.email}</p>
              </div>
              <select
                value={u.rol}
                disabled={u.uid === yo?.uid}
                onChange={(e) => cambiarRol(u.uid, e.target.value as RolUsuario)}
                className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest outline-none text-white"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
                title={u.uid === yo?.uid ? "No puedes cambiar tu propio rol" : undefined}
              >
                {ROLES.map((r) => <option key={r} value={r} style={{ background: "#0d0810" }}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function UsuariosAdminPage() {
  return (
    <RutaProtegida rolesPermitidos={["admin"]}>
      <ListaUsuarios />
    </RutaProtegida>
  );
}
