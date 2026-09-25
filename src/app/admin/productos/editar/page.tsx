"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import { ProductoForm } from "../../../../components/admin/ProductoForm";
import type { Product } from "../../../../components/ui/product-reveal-card";

function EditarProductoContenido() {
  const id = useSearchParams().get("id");
  const [producto, setProducto] = useState<Product | null>(null);
  const [cargando, setCargando] = useState(!!id);
  const [error, setError] = useState(id ? "" : "Falta el id del producto.");

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "productos", id)).then((snap) => {
      if (!snap.exists()) setError("Producto no encontrado.");
      else setProducto({ id: snap.id, ...snap.data() } as Product);
      setCargando(false);
    });
  }, [id]);

  if (cargando) return <p className="text-white/30 text-sm">Cargando...</p>;
  if (error) return <p className="text-rose-400 text-sm">{error}</p>;

  return (
    <div>
      <h1 className="text-white text-2xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Editar producto
      </h1>
      <ProductoForm producto={producto!} />
    </div>
  );
}

export default function EditarProductoPage() {
  return (
    <Suspense fallback={<p className="text-white/30 text-sm">Cargando...</p>}>
      <EditarProductoContenido />
    </Suspense>
  );
}
