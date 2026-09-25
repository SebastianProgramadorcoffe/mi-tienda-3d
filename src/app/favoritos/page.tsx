"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { obtenerProductos } from "../../lib/productosCache";
import { useFavoritos } from "../../context/FavoritosContext";
import { ProductRevealCard, type Product } from "../../components/ui/product-reveal-card";
import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";

export default function PaginaFavoritos() {
  const { ids } = useFavoritos();
  const [productos, setProductos] = useState<Product[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    obtenerProductos().then((datos) => {
      setProductos(datos);
      setCargando(false);
    });
  }, []);

  const favoritos = productos.filter((p) => ids.includes(p.id));

  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-12" style={{ maxWidth: "1200px" }}>
          <h1 className="text-white text-3xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            Mis <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>favoritos</span>
          </h1>
          <p className="text-white/30 text-xs uppercase tracking-widest mb-10">
            {cargando ? "Cargando..." : `${favoritos.length} producto${favoritos.length === 1 ? "" : "s"}`}
          </p>

          {cargando ? null : favoritos.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-white/30 text-sm mb-4">Todavía no tienes productos favoritos.</p>
              <Link href="/catalogo" className="text-rose-300/70 text-xs underline">Explorar catálogo</Link>
            </div>
          ) : (
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {favoritos.map((producto, i) => (
                <ProductRevealCard key={producto.id} product={producto} index={i} />
              ))}
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
