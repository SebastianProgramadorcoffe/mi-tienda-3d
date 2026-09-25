// ─── Lectura de catálogos PDF de proveedores (Yanbal y similares) ───────────
// Todo corre en el navegador (pdf.js) — sin servidor, consistente con el
// resto del sitio. Detecta candidatos a producto (nombre/precio/código) por
// posición en la página; el recorte de la foto real queda a cargo del
// usuario en la UI de revisión, porque en catálogos tipo revista varios
// productos comparten una sola foto compuesta y no hay forma confiable de
// separarlas automáticamente (verificado a mano contra un catálogo real).
import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

// Necesario para decodificar imágenes JPEG 2000 (frecuentes en PDFs de
// prepress/imprenta como este catálogo) — sin esto, pdf.js falla en
// silencio al decodificar la foto de fondo y la página queda en blanco.
// Turbopack no puede empaquetar una carpeta completa con `new URL()` (solo
// archivos sueltos), así que los .wasm se sirven como estáticos desde
// /public/pdfjs-wasm/ (copiados de node_modules/pdfjs-dist/wasm/).
const WASM_URL = "/pdfjs-wasm/";

export interface CandidatoProducto {
  id: string;
  pagina: number;
  // Página que el propio catálogo referencia como "Pág. NN" cerca de este
  // candidato (frecuente en portadas/teasers) — suele tener la foto
  // dedicada del producto, a diferencia de la página del teaser.
  paginaReferencia: number | null;
  nombre: string;
  precio: number;
  // Precio de lista antes de la oferta (línea "P. Normal $ N" del catálogo).
  // Si el producto no tiene oferta, el catálogo solo trae un precio y esto
  // queda en null.
  precioOriginal: number | null;
  codigo: string;
  esNuevo: boolean;
}

const RE_PRECIO = /\$\s*([\d.]{3,})/;
const RE_PRECIO_NORMAL = /P\.?\s*Normal\s*\$\s*([\d.]{3,})/i;
const RE_CODIGO = /C[ÓO]D\.?\s*(\d{3,6})/i;
const RE_PAGINA_REF = /P[áa]g\.\s*(\d+)/i;
const RE_NUEVO = /^NUEVOS?$/i;
const RE_RUIDO = /%|dscto|OFERTA\s+OFERTA|P[áa]g\.\s*\d+$/i;

export async function cargarPdf(archivo: File): Promise<PDFDocumentProxy> {
  const buffer = await archivo.arrayBuffer();
  return pdfjsLib.getDocument({ data: buffer, wasmUrl: WASM_URL }).promise;
}

interface ItemTexto {
  texto: string;
  x: number;
  y: number;
}

async function extraerItemsPagina(doc: PDFDocumentProxy, numPagina: number): Promise<ItemTexto[]> {
  const page = await doc.getPage(numPagina);
  const contenido = await page.getTextContent();
  return contenido.items
    .filter((it): it is typeof it & { str: string; transform: number[] } => "str" in it)
    .map((it) => ({ texto: it.str, x: it.transform[4], y: it.transform[5] }));
}

// Agrupa items en "líneas" por cercanía vertical (los ejes de texto de una
// misma línea visual quedan casi a la misma altura y).
function agruparEnLineas(items: ItemTexto[]): { y: number; texto: string }[] {
  const ordenado = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lineas: { y: number; items: ItemTexto[] }[] = [];
  for (const item of ordenado) {
    const linea = lineas.find((l) => Math.abs(l.y - item.y) < 3);
    if (linea) linea.items.push(item);
    else lineas.push({ y: item.y, items: [item] });
  }
  return lineas.map((l) => ({
    y: l.y,
    texto: l.items.sort((a, b) => a.x - b.x).map((i) => i.texto).join(" ").trim(),
  }));
}

export async function detectarCandidatos(
  doc: PDFDocumentProxy,
  onProgreso?: (pagina: number, total: number) => void
): Promise<CandidatoProducto[]> {
  const candidatos: CandidatoProducto[] = [];
  const totalPaginas = doc.numPages;

  for (let n = 1; n <= totalPaginas; n++) {
    const items = await extraerItemsPagina(doc, n);
    const lineas = agruparEnLineas(items).filter((l) => l.texto.length > 0);

    for (let i = 0; i < lineas.length; i++) {
      // Una línea "P. Normal $ N" también matchea RE_PRECIO — se salta como
      // disparador de candidato (solo se consulta como precio de lista de
      // OTRA línea de oferta cercana, más abajo).
      if (RE_PRECIO_NORMAL.test(lineas[i].texto)) continue;
      const mPrecio = RE_PRECIO.exec(lineas[i].texto);
      if (!mPrecio) continue;
      // El código puede estar 1 o 2 líneas más abajo si entre medio viene
      // la línea de "P. Normal $ N".
      const mCodigo = RE_CODIGO.exec(lineas[i].texto)
        ?? RE_CODIGO.exec(lineas[i + 1]?.texto ?? "")
        ?? RE_CODIGO.exec(lineas[i + 2]?.texto ?? "");
      if (!mCodigo) continue;

      const precio = Number(mPrecio[1].replace(/\./g, ""));
      const codigo = mCodigo[1];

      // Precio de lista ("P. Normal $ N") cerca de la línea de oferta.
      let precioOriginal: number | null = null;
      const mPrecioNormal = RE_PRECIO_NORMAL.exec(lineas[i + 1]?.texto ?? "") ?? RE_PRECIO_NORMAL.exec(lineas[i + 2]?.texto ?? "");
      if (mPrecioNormal) precioOriginal = Number(mPrecioNormal[1].replace(/\./g, ""));

      // "Pág. NN" cerca del precio/código suele apuntar a la página con la
      // foto dedicada del producto (frecuente en páginas "destacados").
      let paginaReferencia: number | null = null;
      const mPagRef = RE_PAGINA_REF.exec(lineas[i + 2]?.texto ?? "") ?? RE_PAGINA_REF.exec(lineas[i + 1]?.texto ?? "");
      if (mPagRef) paginaReferencia = Number(mPagRef[1]);

      let esNuevo = false;
      const partesNombre: string[] = [];
      let j = i - 1;
      while (j >= 0 && partesNombre.length < 3) {
        const cand = lineas[j].texto.trim();
        if (RE_PRECIO.test(cand) || RE_CODIGO.test(cand)) break;
        if (RE_NUEVO.test(cand)) { esNuevo = true; j--; continue; }
        if (!RE_RUIDO.test(cand)) partesNombre.unshift(cand);
        j--;
      }

      candidatos.push({
        id: `${n}-${codigo}-${candidatos.length}`,
        pagina: n,
        paginaReferencia,
        nombre: partesNombre.join(" ").trim() || `Producto ${codigo}`,
        precio,
        precioOriginal,
        codigo,
        esNuevo,
      });
    }
    onProgreso?.(n, totalPaginas);
  }
  return candidatos;
}

// Renderiza una página a un canvas (para mostrarla y recortarla en la UI).
export async function renderizarPagina(
  doc: PDFDocumentProxy,
  numPagina: number,
  escala = 2
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(numPagina);
  const viewport = page.getViewport({ scale: escala });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

// Escala usada SOLO para exportar el recorte final (la vista previa se queda
// en ESCALA_RENDER, pensada para que la página cargue rápido en pantalla).
// Recortar directo de la vista previa amplía una imagen que ya salió "corta"
// de píxeles cuando la foto real ocupa solo una fracción de la página — por
// eso al confirmar un recorte se le vuelve a pedir esa página a pdf.js a
// mayor resolución antes de recortar, así el resultado sale nítido de verdad
// (viene del PDF vectorial/la imagen fuente, no de un simple zoom).
export const ESCALA_EXPORTACION = 6;
// Lado más largo del recorte final, en píxeles: suficiente para verse nítido
// en la ficha de producto (incluido un acercamiento), sin generar archivos
// más pesados de lo que hace falta para cargar rápido.
const LADO_MAXIMO_EXPORTACION = 1400;

// Recorta un rectángulo (definido en las coordenadas de un canvas de vista
// previa a `escalaOrigen`) desde `fuente` — un canvas renderizado a mayor
// resolución (`ESCALA_EXPORTACION`) — y lo devuelve como JPEG ya reducido al
// tamaño final recomendado para la tienda.
export function recortarDeCanvasAltaResolucion(
  fuente: HTMLCanvasElement,
  rect: { x0: number; y0: number; x1: number; y1: number },
  escalaOrigen: number,
  calidad = 0.85
): Promise<Blob | null> {
  const factor = ESCALA_EXPORTACION / escalaOrigen;
  const x0 = rect.x0 * factor;
  const y0 = rect.y0 * factor;
  const ancho = (rect.x1 - rect.x0) * factor;
  const alto = (rect.y1 - rect.y0) * factor;
  if (ancho < 1 || alto < 1) return Promise.resolve(null);

  const escalaSalida = Math.min(1, LADO_MAXIMO_EXPORTACION / Math.max(ancho, alto));
  const destino = document.createElement("canvas");
  destino.width = Math.max(1, Math.round(ancho * escalaSalida));
  destino.height = Math.max(1, Math.round(alto * escalaSalida));
  const ctx = destino.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente, x0, y0, ancho, alto, 0, 0, destino.width, destino.height);
  return new Promise((resolve) => destino.toBlob(resolve, "image/jpeg", calidad));
}

// Crea una capa de texto real (spans posicionados) sobre el contenedor dado,
// en la MISMA escala que la página renderizada, para poder seleccionar y
// copiar el texto real del PDF con el mouse (los nombres detectados
// automáticamente a veces salen mal, esto permite corregirlos a mano rápido).
export async function crearCapaTexto(
  doc: PDFDocumentProxy,
  numPagina: number,
  escala: number,
  contenedor: HTMLElement
) {
  const page = await doc.getPage(numPagina);
  const viewport = page.getViewport({ scale: escala });
  contenedor.replaceChildren();
  // TextLayer.render() fija su propio ancho/alto con una fórmula CSS que
  // depende de --total-scale-factor (= --scale-factor * --user-unit); si no
  // se define, el contenedor queda con un tamaño base incorrecto y todo el
  // texto se desalinea. Se define aquí para que coincida exactamente con
  // los píxeles del canvas ya renderizado a esta misma `escala`.
  // --total-scale-factor normalmente se deriva de --scale-factor/--user-unit
  // mediante una regla CSS que vive en `.pdfViewer .page` (el visor completo
  // de pdf.js) — como no se usa esa jerarquía de clases, se define directo.
  contenedor.style.setProperty("--total-scale-factor", String(escala));
  contenedor.style.setProperty("--scale-round-x", "1px");
  contenedor.style.setProperty("--scale-round-y", "1px");
  const capa = new pdfjsLib.TextLayer({
    textContentSource: page.streamTextContent(),
    container: contenedor,
    viewport,
  });
  await capa.render();
  return capa;
}
