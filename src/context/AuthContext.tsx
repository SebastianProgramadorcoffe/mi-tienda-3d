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
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type RolUsuario = "cliente" | "empleado" | "admin";

interface ContextoAuth {
  usuario: User | null;
  cargando: boolean;
  rol: RolUsuario | null;
  cargandoRol: boolean;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  registrarse: (email: string, password: string, nombre: string, aceptoTerminos: boolean) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  iniciarConGoogle: () => Promise<void>;
  recuperarPassword: (email: string) => Promise<void>;
}

const AuthCtx = createContext<ContextoAuth | null>(null);

// Crea el documento usuarios/{uid} la primera vez que se ve a este usuario
// (cubre tanto registro por email como el primer login con Google).
// El rol SIEMPRE nace como "cliente": las reglas de Firestore rechazan
// cualquier otro valor en la creación, así nadie se auto-asciende.
async function asegurarPerfilUsuario(user: User) {
  const ref = doc(db, "usuarios", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName ?? "",
      rol: "cliente",
      createdAt: serverTimestamp(),
    });
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<User | null>(null);
  const [cargando, setCargando] = useState(true);
  const [rol, setRol] = useState<RolUsuario | null>(null);
  // Mientras hay usuario pero su rol todavía no llegó de Firestore, se
  // considera "cargando" — se deriva en vez de guardarse aparte para no
  // tener que hacer setState síncrono al inicio del efecto de abajo.
  const cargandoRol = !!usuario && rol === null;

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUsuario(user);
      setCargando(false);
      // Se resetea aquí (no en el efecto de onSnapshot) para que, si cambia
      // de cuenta, "cargandoRol" vuelva a true de inmediato mientras se
      // suscribe al doc del nuevo usuario.
      setRol(null);
      if (user) {
        await asegurarPerfilUsuario(user);
      }
    });
    return unsub;
  }, []);

  // Se mantiene sincronizado con el rol en Firestore (por si un admin lo cambia).
  useEffect(() => {
    if (!usuario) return;
    const ref = doc(db, "usuarios", usuario.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setRol((snap.data()?.rol as RolUsuario) ?? "cliente");
    });
    return unsub;
  }, [usuario]);

  async function iniciarSesion(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function registrarse(email: string, password: string, nombre: string, aceptoTerminos: boolean) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: nombre });
    // Se guarda aquí (no en asegurarPerfilUsuario, que también corre para
    // Google) para dejar registrado el consentimiento explícito exigido
    // por la Ley 1581 de 2012 — con merge, funciona sin importar si
    // asegurarPerfilUsuario ya alcanzó a crear el doc base o no.
    await setDoc(doc(db, "usuarios", cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      displayName: nombre,
      rol: "cliente",
      aceptoTerminos,
      aceptoTerminosFecha: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true });
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
      usuario, cargando, rol, cargandoRol,
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