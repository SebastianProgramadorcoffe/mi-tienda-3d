"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface ContextoAuth {
  usuario: User | null;
  cargando: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (email: string, password: string, nombre: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  iniciarConGoogle: () => Promise<void>;
  recuperarPassword: (email: string) => Promise<void>;
}

const AuthCtx = createContext<ContextoAuth | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUsuario(user);
      setCargando(false);
    });
    return unsub;
  }, []);

  async function iniciarSesion(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function registrarse(email: string, password: string, nombre: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nombre });
  }

  async function cerrarSesion() {
    await signOut(auth);
  }

  async function iniciarConGoogle() {
    const proveedor = new GoogleAuthProvider();
    await signInWithPopup(auth, proveedor);
  }

  async function recuperarPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  return (
    <AuthCtx.Provider value={{
      usuario, cargando,
      iniciarSesion, registrarse, cerrarSesion,
      iniciarConGoogle, recuperarPassword,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth debe usarse dentro de AuthProvider");
  return ctx;
}