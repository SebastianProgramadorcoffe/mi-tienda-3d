"use client";

import { ProductoForm } from "../../../../components/admin/ProductoForm";

export default function NuevoProductoPage() {
  return (
    <div>
      <h1 className="text-white text-2xl mb-8" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
        Nuevo producto
      </h1>
      <ProductoForm />
    </div>
  );
}
