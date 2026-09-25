"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, collection, setDoc, serverTimestamp, query, where, limit, getDocs } from "firebase/firestore";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { db } from "../../../../lib/firebase";
import { subirImagenProducto, ErrorSubida } from "../../../../lib/storage";
import { useAuth } from "../../../../context/AuthContext";
import { cargarPdf, detectarCandidatos, renderizarPagina, type CandidatoProducto } from "../../../../lib/pdfCatalogo";
import { RecortadorPagina } from "../../../../components/admin/RecortadorPagina";
import type { Genero } from "../../../../components/ui/product-reveal-card";

const CATEGORIAS = [
  "Labiales", "Fragancias", "Base de Maquillaje", "Skincare", "Ojos",
  "Joyería", "Protección Solar", "Cuidado Personal", "Mundo Hombre", "Bebés y Niños",
];
const GENEROS: { valor: Genero; label: string }[] = [
  { valor: "unisex", label: "Unisex" }, { valor: "dama", label: "Dama" }, { valor: "caballero", label: "Caballero" },
];

type Estado = "inicio" | "procesando" | "revisando";
type EstadoCandidato = "pendiente" | "creando" | "creado" | "omitido";

const inputStyle = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" };
const ESCALA_RENDER = 1.8;

export default function ImportarCatalogoPage() {
  const router = useRouter();
  const { usuario } = useAuth();

  const [estado, setEstado] = useState<Estado>("inicio");
  const [progreso, setProgreso] = useState({ pagina: 0, total: 0 });
  const [error, setError] = useState("");

  const docRef = useRef<PDFDocumentProxy | null>(null);
  const cachePaginas = useRef<Map<number, HTMLCanvasElement>>(new Map());

  const [candidatos, setCandidatos] = useState<CandidatoProducto[]>([]);
  const [indice, setIndice] = useState(0);
  const [estadosCandidatos, setEstadosCandidatos] = useState<Record<string, EstadoCandidato>>({});

  const [paginaCanvas, setPaginaCanvas] = useState<HTMLCanvasElement | null>(null);
  const [paginaMostrada, setPaginaMostrada] = useState(1);
  const [recorte, setRecorte] = useState<Blob | null>(null);

  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [precioOriginal, setPrecioOriginal] = useState("");
  const [codigo, setCodigo] = useState("");
  const [stock, setStock] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [esNuevo, setEsNuevo] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS[0]);
  const [genero, setGenero] = useState<Genero>("unisex");
  const [guardando, setGuardando] = useState(false);
  const [generandoRecorte, setGenerandoRecorte] = useState(false);
  const [productosCreados, setProductosCreados] = useState(0);
  const [mensajeExito, setMensajeExito] = useState("");

  const candidatoActual = candidatos[indice];

  async function alSubirArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    setError("");
    setEstado("procesando");
    try {
      const doc_ = await cargarPdf(archivo);
      docRef.current = doc_;
      const detectados = await detectarCandidatos(doc_, (pagina, total) => setProgreso({ pagina, total }));
      if (detectados.length === 0) {
        setError("No se detectaron productos (nombre + precio + código) en este PDF.");
        setEstado("inicio");
        return;
      }
      setCandidatos(detectados);
      setIndice(0);
      setEstado("revisando");
      await cargarCandidato(detectados[0], doc_);
    } catch (err) {
      console.error(err);
      setError("No se pudo leer el PDF. Verifica que sea un archivo válido.");
      setEstado("inicio");
    }
  }

  async function mostrarPagina(numPagina: number, doc_: PDFDocumentProxy) {
    let canvas = cachePaginas.current.get(numPagina);
    if (!canvas) {
      canvas = await renderizarPagina(doc_, numPagina, ESCALA_RENDER);
      cachePaginas.current.set(numPagina, canvas);
    }
    setPaginaMostrada(numPagina);
    setPaginaCanvas(canvas);
    setRecorte(null);
  }

  async function cargarCandidato(candidato: CandidatoProducto, doc_: PDFDocumentProxy) {
    setNombre(candidato.nombre);
    setPrecio(String(candidato.precio));
    setPrecioOriginal(candidato.precioOriginal ? String(candidato.precioOriginal) : "");
    setCodigo(candidato.codigo);
    setStock("");
    setDescripcion("");
    setEsNuevo(candidato.esNuevo);
    setCategoria(CATEGORIAS[0]);
    setGenero("unisex");
    setMensajeExito("");
    // Si el catálogo referencia otra página (ej. "Pág. 15" en una portada),
    // esa suele tener la foto dedicada del producto — se muestra esa de
    // entrada en vez de la página del teaser.
    await mostrarPagina(candidato.paginaReferencia ?? candidato.pagina, doc_);
  }

  async function irA(nuevoIndice: number) {
    if (nuevoIndice < 0 || nuevoIndice >= candidatos.length || !docRef.current) return;
    setIndice(nuevoIndice);
    await cargarCandidato(candidatos[nuevoIndice], docRef.current);
  }

  async function cambiarPaginaMostrada(delta: number) {
    if (!docRef.current) return;
    const nueva = paginaMostrada + delta;
    if (nueva < 1 || nueva > docRef.current.numPages) return;
    await mostrarPagina(nueva, docRef.current);
  }

  function marcarEstado(id: string, valor: EstadoCandidato) {
    setEstadosCandidatos((prev) => ({ ...prev, [id]: valor }));
  }

  async function alOmitir() {
    marcarEstado(candidatoActual.id, "omitido");
    await irA(indice + 1);
  }

  async function alSiguienteProducto() {
    await irA(indice + 1);
  }

  async function alCrearProducto() {
    if (!candidatoActual || !nombre.trim() || !precio) {
      setError("Nombre y precio son obligatorios.");
      return;
    }
    if (stock.trim() === "") {
      setError("La cantidad en stock es obligatoria (usa 0 si está agotado).");
      return;
    }
    setError("");
    setMensajeExito("");
    setGuardando(true);
    marcarEstado(candidatoActual.id, "creando");
    try {
      const codigoNormalizado = codigo.trim();
      if (codigoNormalizado) {
        const existentes = await getDocs(
          query(collection(db, "productos"), where("codigoProveedor", "==", codigoNormalizado), limit(1))
        );
        if (!existentes.empty) {
          const existente = existentes.docs[0].data();
          setError(`Ya existe un producto con el código ${codigoNormalizado}: "${existente.nombre}". Cambia el código o edita el producto existente.`);
          marcarEstado(candidatoActual.id, "pendiente");
          setGuardando(false);
          return;
        }
      }

      const productoId = doc(collection(db, "productos")).id;

      let urlImagen = "/placeholder.jpg";
      if (paginaCanvas) {
        const fuente = recorte ?? await new Promise<Blob | null>((res) => paginaCanvas.toBlob(res, "image/jpeg", 0.9));
        if (fuente) {
          const archivo = new File([fuente], `${candidatoActual.codigo}.jpg`, { type: "image/jpeg" });
          urlImagen = await subirImagenProducto(archivo);
        }
      }

      await setDoc(doc(db, "productos", productoId), {
        nombre: nombre.trim(),
        marca: "Yanbal",
        codigoProveedor: codigoNormalizado || null,
        categoria,
        genero,
        precio: Number(precio),
        precioOriginal: precioOriginal ? Number(precioOriginal) : null,
        descripcion: descripcion.trim() || `Código de proveedor: ${codigo}.`,
        etiqueta: esNuevo ? "NUEVO" : null,
        colorEtiqueta: esNuevo ? "gold" : null,
        stock: Number(stock),
        activo: true,
        imagen: urlImagen,
        imagenes: [urlImagen],
        modelo3d: null,
        creadoPor: usuario?.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      marcarEstado(candidatoActual.id, "creado");
      setProductosCreados((n) => n + 1);
      setMensajeExito(`✓ "${nombre.trim()}" creado. Puedes agregar otro producto de esta misma imagen (algunos catálogos agrupan varios en una foto), o pasar al siguiente.`);
      // No se avanza solo: se limpian los campos de identidad del producto
      // para el siguiente, pero se conserva la imagen/recorte, categoría y
      // género actuales — así es rápido cargar 2-3 productos de una misma
      // foto que no se puede separar.
      setNombre("");
      setPrecio("");
      setPrecioOriginal("");
      setCodigo("");
      setStock("");
      setDescripcion("");
      setEsNuevo(false);
    } catch (err) {
      marcarEstado(candidatoActual.id, "pendiente");
      setError(err instanceof ErrorSubida ? err.message : "No se pudo crear el producto. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  }

  const omitidos = Object.values(estadosCandidatos).filter((s) => s === "omitido").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-white text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Importar catálogo PDF</h1>
          <p className="text-white/30 text-xs mt-1">
            Sube el catálogo de un proveedor (ej. Yanbal) — se detectan candidatos a producto por nombre/precio/código
            y los revisas uno por uno antes de crearlos.
          </p>
        </div>
        <button onClick={() => router.push("/admin/productos")} className="text-white/40 hover:text-white text-xs uppercase tracking-widest">
          ← Volver
        </button>
      </div>

      {estado === "inicio" && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.15)" }}>
          <p className="text-white/50 text-sm mb-4">Selecciona el PDF del catálogo</p>
          <input type="file" accept="application/pdf" onChange={alSubirArchivo} className="text-white/60 text-xs mx-auto" />
          {error && <p className="text-rose-400 text-xs mt-4">{error}</p>}
          <div className="mt-6 text-left mx-auto text-white/25 text-[11px] leading-relaxed" style={{ maxWidth: 480 }}>
            <strong className="text-white/40">Cómo funciona:</strong> el nombre/precio/código se detectan automáticamente
            del texto del PDF. La foto NO se recorta sola (en catálogos tipo revista varios productos comparten una
            sola foto compuesta) — arrastras sobre la página para seleccionar la foto real de cada producto, o usas
            la página completa si prefieres recortarla después.
          </div>
        </div>
      )}

      {estado === "procesando" && (
        <div className="rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-white/50 text-sm mb-2">Procesando PDF...</p>
          <p className="text-white/30 text-xs">Página {progreso.pagina} de {progreso.total}</p>
        </div>
      )}

      {estado === "revisando" && candidatoActual && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white/40 text-xs uppercase tracking-widest">
              Candidato {indice + 1} de {candidatos.length} — detectado en pág. {candidatoActual.pagina}
              {candidatoActual.paginaReferencia && ` (referencia a pág. ${candidatoActual.paginaReferencia})`}
            </p>
            <p className="text-white/30 text-xs">{productosCreados} productos creados · {omitidos} omitidos</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center justify-between mb-2">
                <button onClick={() => cambiarPaginaMostrada(-1)}
                  className="text-white/40 hover:text-white text-xs uppercase tracking-widest">
                  ← Página anterior
                </button>
                <span className="text-white/30 text-xs">Mostrando pág. {paginaMostrada}</span>
                <button onClick={() => cambiarPaginaMostrada(1)}
                  className="text-white/40 hover:text-white text-xs uppercase tracking-widest">
                  Página siguiente →
                </button>
              </div>
              {paginaCanvas && docRef.current && (
                <RecortadorPagina
                  paginaCanvas={paginaCanvas}
                  doc={docRef.current}
                  numPagina={paginaMostrada}
                  escala={ESCALA_RENDER}
                  onRecorte={setRecorte}
                  onGenerandoCambio={setGenerandoRecorte}
                />
              )}
              <p className="text-white/20 text-[11px] mt-2">
                Si la foto real del producto está en otra página (ej. la que dice &quot;Pág. NN&quot;), navega hasta ahí y recorta ahí mismo — el resto de los datos del candidato no cambia.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Nombre</label>
                <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Precio oferta (COP)</label>
                  <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Precio normal (si aplica)</label>
                  <input type="number" value={precioOriginal} onChange={(e) => setPrecioOriginal(e.target.value)}
                    placeholder="Vacío = sin oferta" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Código proveedor</label>
                  <input value={codigo} onChange={(e) => setCodigo(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
                </div>
              </div>
              <p className="text-white/20 text-[11px] -mt-2">
                Si el catálogo trae &quot;P. Normal $ N&quot;, ese es el precio normal y el que aparece como &quot;OFERTA&quot; va en Precio oferta. Si solo hay un precio, deja Precio normal vacío.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Categoría</label>
                  <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle}>
                    {CATEGORIAS.map((c) => <option key={c} value={c} style={{ background: "#0d0810" }}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Género</label>
                  <select value={genero} onChange={(e) => setGenero(e.target.value as Genero)} className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle}>
                    {GENEROS.map((g) => <option key={g.valor} value={g.valor} style={{ background: "#0d0810" }}>{g.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">Stock</label>
                  <input type="number" min="0" value={stock} onChange={(e) => setStock(e.target.value)}
                    placeholder="0 = agotado" className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none" style={inputStyle} />
                </div>
              </div>

              <div>
                <label className="text-white/40 text-[10px] uppercase tracking-widest block mb-1.5">
                  Descripción (el texto naranja de la página, si tiene)
                </label>
                <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2}
                  placeholder="Pégala leyéndola de la imagen — no se detecta sola todavía"
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none" style={inputStyle} />
              </div>

              <label className="flex items-center gap-2 text-white/50 text-xs">
                <input type="checkbox" checked={esNuevo} onChange={(e) => setEsNuevo(e.target.checked)} />
                Marcado como &quot;NUEVO&quot; en el catálogo (se resalta en la tienda)
              </label>

              {error && <p className="text-rose-400 text-xs">{error}</p>}
              {mensajeExito && <p className="text-emerald-400 text-xs">{mensajeExito}</p>}

              <div className="flex gap-3 pt-2">
                <button onClick={() => irA(indice - 1)} disabled={indice === 0}
                  className="px-4 py-3 rounded-xl text-xs uppercase tracking-widest text-white/50 disabled:opacity-30"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  ← Anterior
                </button>
                <button onClick={alOmitir}
                  className="px-4 py-3 rounded-xl text-xs uppercase tracking-widest text-white/50"
                  style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                  Omitir
                </button>
                <button onClick={alCrearProducto} disabled={guardando || generandoRecorte}
                  className="flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-black"
                  style={{ background: "linear-gradient(90deg, #fda4af, #fcd34d)", opacity: guardando || generandoRecorte ? 0.7 : 1 }}>
                  {guardando ? "Creando..." : generandoRecorte ? "Generando recorte..." : "Crear producto"}
                </button>
              </div>
              <button onClick={alSiguienteProducto} disabled={indice >= candidatos.length - 1}
                className="w-full py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-white/70 disabled:opacity-30"
                style={{ border: "1px solid rgba(244,114,182,0.4)" }}>
                Siguiente producto →
              </button>
              <p className="text-white/20 text-[11px]">
                &quot;Crear producto&quot; guarda y se queda aquí — útil para agregar 2 o 3 productos de la misma foto cuando no se pueden separar. Cuando termines con esta imagen, usa &quot;Siguiente producto&quot;.
              </p>
            </div>
          </div>
        </div>
      )}

      {estado === "revisando" && !candidatoActual && (
        <div className="text-center py-16">
          <p className="text-white/50 text-sm mb-4">Terminaste de revisar todos los candidatos ({productosCreados} productos creados, {omitidos} omitidos).</p>
          <button onClick={() => router.push("/admin/productos")} className="text-rose-300/70 text-xs underline">Ver productos</button>
        </div>
      )}
    </div>
  );
}
