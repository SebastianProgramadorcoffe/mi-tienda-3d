// ─── Firebase Core ────────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDJzZe_2ozJ3xLcXgiGNTJfjInr2DDiBsc",
  authDomain: "tienda-productos-aura-esencia.firebaseapp.com",
  projectId: "tienda-productos-aura-esencia",
  storageBucket: "tienda-productos-aura-esencia.firebasestorage.app",
  messagingSenderId: "591466725758",
  appId: "1:591466725758:web:7e49cece777946dd52b32f",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db   = getFirestore(app);
export const auth = getAuth(app);