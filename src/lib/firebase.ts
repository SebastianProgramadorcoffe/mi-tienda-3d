// ─── Firebase Core ────────────────────────────────────────────────────────────
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDJzZe_2ozJ3xLcXgiGNTJfjInr2DDiBsc",
  authDomain: "tienda-productos-aura-esencia.firebaseapp.com",
  projectId: "tienda-productos-aura-esencia",
  storageBucket: "tienda-productos-aura-esencia.firebasestorage.app",
  messagingSenderId: "591466725758",
  appId: "1:591466725758:web:7e49cece777946dd52b32f",
};

// Previene doble inicialización en hot-reload de Next.js
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Base de datos Firestore — lista para usar en toda la app
export const db = getFirestore(app);

// ─── Exports futuros (Auth, Storage) ─────────────────────────────────────────
// import { getAuth }    from "firebase/auth";
// import { getStorage } from "firebase/storage";
// export const auth    = getAuth(app);
// export const storage = getStorage(app);