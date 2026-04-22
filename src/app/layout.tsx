import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ─── Metadata de la tienda ────────────────────────────────────────────────────
export const metadata: Metadata = {
  title: "Aura Esencia — Belleza que Transforma",
  description:
    "Tienda virtual de cosméticos de lujo. Yanbal, Ésika, Avon y Natura en una experiencia 3D única.",
  keywords: ["cosméticos", "belleza", "fragancias", "maquillaje", "Yanbal", "Ésika", "Avon", "Natura"],
  // Preparado para Open Graph (redes sociales) — completa con tu dominio real
  // openGraph: {
  //   title: "Aura Esencia",
  //   description: "Belleza que Transforma",
  //   url: "https://tu-dominio.web.app",
  //   images: [{ url: "/og-image.jpg" }],
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}