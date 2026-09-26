"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  doc, collection, setDoc, updateDoc, serverTimestamp,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { subirImagenProducto, subirModelo3D, ErrorSubida } from "../../lib/storage";
import { urlCloudinaryOptimizada } from "../../lib/cloudinaryImagen";
import { useAuth } from "../../context/AuthContext";
import type { Product, Genero, VarianteColor } from "../ui/product-reveal-card";

const CATEGORIAS = [
  "Labiales", "Fragancias", "Base de Maquillaje", "Skincare", "Ojos",
  "Joyería", "Protección Solar", "Cuidado Personal", "Mundo Hombre", "Bebés y Niños",
];
const GENEROS: { valor: Genero; label: string }[] = [
  { valor: "dama", label: "Dama" },
  { valor: "caballero", label: "Caballero" },
  { valor: "unisex", label: "Unisex" },
];

interface ProductoFormProps {
  producto?: Product; // si viene, es edición
}

const inputStyle = {
  background: "rgba(255,255,255,0.04)",
  border: "1px solid rgba(255,255,255,0.08)",
};

export function ProductoForm({ producto }: ProductoFormProps) {
  const router = useRouter();
  const { usuario } = useAuth();
  const esEdicion = !!producto;

  const [nombre, setNombre] = useState(producto?.nombre ?? "");
  const [marca, setMarca] = useState(producto?.marca ?? "");
  const [categoria, setCategoria] = useState(producto?.categoria ?? CATEGORIAS[0]);
  const [genero, setGenero] = useState<Genero>(producto?.genero ?? "unisex");
  const [precio, setPrecio] = useState(String(producto?.precio ?? ""));
  const [precioOriginal, setPrecioOriginal] = useState(String(producto?.precioOriginal ?? ""));
  const [descripcion, setDescripcion] = useState(producto?.descripcion ?? "");
  const [stock, setStock] = useState(String(producto?.stock ?? ""));
  const [codigoProveedor, setCodigoProveedor] = useState(producto?.codigoProveedor ?? "");
  const [activo, setActivo] = useState(producto?.activo ?? true);

  // Colores del mismo producto (opcional). Si hay al menos uno, el stock
  // total se calcula solo (suma de cada color) y el campo "código proveedor"
  // de arriba deja de usarse — cada color tiene el suyo.
  type FilaVariante = { color: string; codigoProveedor: string; stock: string };
  const [variantes, setVariantes] = useState<FilaVariante[]>(
    producto?.variantes?.map((v) => ({ color: v.color, codigoProveedor: v.codigoProveedor, stock: String(v.stock) })) ?? []
  );

  function agregarFilaVariante() {
    setVariantes((prev) => [...prev, { color: "", codigoProveedor: "", stock: "" }]);
  }
  function actualizarFilaVariante(i: number, campo: keyof FilaVariante, valor: string) {
    setVariantes((prev) => prev.map((v, idx) => (idx === i ? { ...v, [campo]: valor } : v)));
  }
  function quitarFilaVariante(i: number) {
    setVariantes((prev) => prev.filter((_, idx) => idx !== i));
  }

  const [imagenesExistentes, setImagenesExistentes] = useState<string[]>(producto?.imagenes ?? (producto?.imagen ? [producto.imagen] : []));
  const [imagenesNuevas, setImagenesNuevas] = useState<File[]>([]);
  const [modeloNuevo, setModeloNuevo] = useState<File | null>(null);
  const [modeloActual] = useState(producto?.modelo3d);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  function quitarImagenExistente(url: string) {
    setImagenesExistentes((prev) => prev.filter((u) => u !== url));
  }

  async function alEnviar(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!nombre.trim() || !precio) {
      setError("Nombre y precio son obligatorios.");
      return;
    }
    const tieneVariantes = variantes.length > 0;
    if (!tieneVariantes && stock.trim() === "") {
      setError("La cantidad en stock es obligatoria (usa 0 si está agotado).");
      return;
    }
    if (tieneVariantes && variantes.some((v) => !v.color.trim() || !v.codigoProveedor.trim() || v.stock.trim() === "")) {
      setError("Cada color necesita nombre, código de proveedor y stock (usa 0 si está agotado).");
      return;
    }
    if (imagenesExistentes.length === 0 && imagenesNuevas.length === 0) {
      setError("Sube al menos una imagen del producto.");
      return;
    }

    setGuardando(true);
    try {
      const productId = producto?.id ?? doc(collection(db, "productos")).id;

      const urlsSubidas = await Promise.all(
        imagenesNuevas.map((archivo) => subirImagenProducto(archivo))
      );
      const imagenes = [...imagenesExistentes, ...urlsSubidas];

      const modelo3d = modeloNuevo ? await subirModelo3D(modeloNuevo) : modeloActual;

      const variantesGuardadas: VarianteColor[] = tieneVariantes
        ? variantes.map((v) => ({ color: v.color.trim(), codigoProveedor: v.codigoProveedor.trim(), stock: Number(v.stock) }))
        : [];
      const stockTotal = tieneVariantes
        ? variantesGuardadas.reduce((acc, v) => acc + v.stock, 0)
        : Number(stock);

      const datos = {
        nombre: nombre.trim(),
        marca: marca.trim(),
        categoria,
        genero,
        precio: Number(precio),
        precioOriginal: precioOriginal ? Number(precioOriginal) : null,
        descripcion: descripcion.trim(),
        stock: stockTotal,
        codigoProveedor: tieneVariantes ? null : (codigoProveedor.trim() || null),
        variantes: tieneVariantes ? variantesGuardadas : null,
        activo,
        imagen: imagenes[0],
        imagenes,
        modelo3d: modelo3d ?? null,
        updatedAt: serverTimestamp(),
      };

      if (esEdicion) {
        await updateDoc(doc(db, "productos", productId), datos);
      } else {
        await setDoc(doc(db, "productos", productId), {
          ...datos,
          creadoPor: usuario?.uid,
          createdAt: serverTimestamp(),
        });
      }

      router.push("/admin/productos");
    } catch (err) {
      setError(err instanceof ErrorSubida ? err.message : "No se pudo guardar el producto. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={alEnviar} className="space-y-6 max-w-xl">
      {error && <p className="text-rose-400 text-xs">{error}</p>}

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Nombre</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} required
          className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Marca</label>
          <input value={marca} onChange={(e) => setMarca(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Categoría</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle}>
            {CATEGORIAS.map((c) => <option key={c} value={c} style={{ background: "#0d0810" }}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Género</label>
          <select value={genero} onChange={(e) => setGenero(e.target.value as Genero)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle}>
            {GENEROS.map((g) => <option key={g.valor} value={g.valor} style={{ background: "#0d0810" }}>{g.label}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Precio (COP)</label>
          <input type="number" min="0" value={precio} onChange={(e) => setPrecio(e.target.value)} required
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Precio original</label>
          <input type="number" min="0" value={precioOriginal} onChange={(e) => setPrecioOriginal(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
        </div>
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">
            Stock{variantes.length > 0 ? " (suma de los colores)" : ""}
          </label>
          {variantes.length > 0 ? (
            <p className="w-full px-4 py-3 rounded-xl text-white/50 text-sm" style={inputStyle}>
              {variantes.reduce((acc, v) => acc + (Number(v.stock) || 0), 0)}
            </p>
          ) : (
            <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
          )}
        </div>
      </div>

      {variantes.length === 0 && (
        <div>
          <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Código proveedor (opcional)</label>
          <input value={codigoProveedor} onChange={(e) => setCodigoProveedor(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-white/40 text-[10px] uppercase tracking-widest">Colores (opcional)</label>
          <button type="button" onClick={agregarFilaVariante} className="text-rose-300/70 hover:text-rose-300 text-[10px] uppercase tracking-widest">
            + Agregar color
          </button>
        </div>
        {variantes.length === 0 ? (
          <p className="text-white/20 text-[11px]">
            Si este producto viene en varios colores del mismo proveedor (mismo nombre, distinto código), agregalos acá en vez de crear un producto por cada uno.
          </p>
        ) : (
          <div className="space-y-2">
            {variantes.map((v, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_80px_32px] gap-2 items-center">
                <input placeholder="Color (ej. Palo Rosa)" value={v.color}
                  onChange={(e) => actualizarFilaVariante(i, "color", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-white text-xs outline-none" style={inputStyle} />
                <input placeholder="Código proveedor" value={v.codigoProveedor}
                  onChange={(e) => actualizarFilaVariante(i, "codigoProveedor", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-white text-xs outline-none" style={inputStyle} />
                <input type="number" min="0" placeholder="Stock" value={v.stock}
                  onChange={(e) => actualizarFilaVariante(i, "stock", e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-white text-xs outline-none" style={inputStyle} />
                <button type="button" onClick={() => quitarFilaVariante(i)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white/40 hover:text-rose-400 transition-colors"
                  style={{ background: "rgba(255,255,255,0.04)" }} aria-label="Quitar color">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Descripción</label>
        <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3}
          className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={inputStyle} />
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Imágenes</label>
        {imagenesExistentes.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {imagenesExistentes.map((url) => (
              <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden" style={{ background: "#0d0810" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={urlCloudinaryOptimizada(url, 150)} alt="" className="w-full h-full object-cover" />
                <button type="button" onClick={() => quitarImagenExistente(url)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 text-white text-[10px] flex items-center justify-center">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
        <input type="file" accept="image/*" multiple
          onChange={(e) => setImagenesNuevas(Array.from(e.target.files ?? []))}
          className="w-full text-white/60 text-xs" />
        <p className="text-white/20 text-[10px] mt-1">La primera imagen (existente o nueva) es la portada. Máx. 5MB cada una.</p>
      </div>

      <div>
        <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Modelo 3D (opcional)</label>
        {modeloActual && !modeloNuevo && (
          <p className="text-white/30 text-xs mb-2">Actual: {modeloActual.url.split("/").pop()?.split("?")[0]}</p>
        )}
        <input type="file" accept=".glb,.gltf"
          onChange={(e) => setModeloNuevo(e.target.files?.[0] ?? null)}
          className="w-full text-white/60 text-xs" />
        <p className="text-white/20 text-[10px] mt-1">Formato .glb o .gltf, máx. 30MB. Se mostrará en la ficha del producto.</p>
      </div>

      <label className="flex items-center gap-2 text-white/50 text-xs">
        <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
        Producto visible en la tienda
      </label>

      <button type="submit" disabled={guardando}
        className="px-8 py-3 rounded-xl text-sm font-bold tracking-widest uppercase text-black"
        style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)", opacity: guardando ? 0.7 : 1 }}>
        {guardando ? "Guardando..." : esEdicion ? "Guardar cambios" : "Crear producto"}
      </button>
    </form>
  );
}
