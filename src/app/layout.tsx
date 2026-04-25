import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { CarritoProvider } from "../context/CarritoContext";
import { AuthProvider } from "../context/AuthContext";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Aura Esencia — Belleza que Transforma",
  description: "Tienda virtual de cosméticos de lujo. Yanbal, Ésika, Avon y Natura.",
  keywords: ["cosméticos", "belleza", "fragancias", "maquillaje", "Yanbal", "Ésika", "Avon", "Natura"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <CarritoProvider>
            {children}
          </CarritoProvider>
        </AuthProvider>
      </body>
    </html>
  );
}