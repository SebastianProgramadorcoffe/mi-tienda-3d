"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { crearCapaTexto, renderizarPagina, recortarDeCanvasAltaResolucion, ESCALA_EXPORTACION } from "../../lib/pdfCatalogo";

interface RecortadorPaginaProps {
  paginaCanvas: HTMLCanvasElement;
  doc: PDFDocumentProxy;
  numPagina: number;
  escala: number;
  onRecorte: (blob: Blob | null) => void;
  onGenerandoCambio?: (generando: boolean) => void;
}

type Modo = "recortar" | "seleccionar";

// Muestra la página renderizada y permite:
//  - "Recortar foto": arrastrar un rectángulo para recortar la foto real
//    del producto (el recorte automático no es confiable en catálogos
//    tipo revista).
//  - "Seleccionar texto": una capa de texto real de pdf.js superpuesta,
//    para seleccionar y copiar el nombre tal cual sale en el PDF cuando
//    la detección automática lo arma mal.
export function RecortadorPagina({ paginaCanvas, doc, numPagina, escala, onRecorte, onGenerandoCambio }: RecortadorPaginaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const capaTextoRef = useRef<HTMLDivElement>(null);
  const [modo, setModo] = useState<Modo>("recortar");

  const [inicio, setInicio] = useState<{ x: number; y: number } | null>(null);
  const [actual, setActual] = useState<{ x: number; y: number } | null>(null);
  const [seleccion, setSeleccion] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [generandoRecorte, setGenerandoRecorte] = useState(false);

  // Canvas de la página a resolución de exportación (mucho más nítido que
  // `paginaCanvas`, que solo está pensado para la vista previa). Se genera
  // una sola vez por página y se reutiliza para todos los recortes que se
  // hagan de ella (varios productos pueden salir de la misma foto).
  const altaResRef = useRef<{ pagina: number; canvas: HTMLCanvasElement } | null>(null);

  // Dibuja la página + el rectángulo de selección (si hay).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = paginaCanvas.width;
    canvas.height = paginaCanvas.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(paginaCanvas, 0, 0);

    const rect = inicio && actual
      ? { x0: Math.min(inicio.x, actual.x), y0: Math.min(inicio.y, actual.y), x1: Math.max(inicio.x, actual.x), y1: Math.max(inicio.y, actual.y) }
      : seleccion;

    if (rect) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, rect.y0);
      ctx.fillRect(0, rect.y1, canvas.width, canvas.height - rect.y1);
      ctx.fillRect(0, rect.y0, rect.x0, rect.y1 - rect.y0);
      ctx.fillRect(rect.x1, rect.y0, canvas.width - rect.x1, rect.y1 - rect.y0);
      ctx.strokeStyle = "rgba(244,63,94,0.9)";
      ctx.lineWidth = 3;
      ctx.strokeRect(rect.x0, rect.y0, rect.x1 - rect.x0, rect.y1 - rect.y0);
    }
  }, [paginaCanvas, inicio, actual, seleccion]);

  // Capa de texto: se arma en la misma escala del render, y se re-escala
  // por CSS para que quede pixel a pixel sobre el canvas (que se ve a
  // ancho variable según el layout responsivo).
  useEffect(() => {
    const contenedor = capaTextoRef.current;
    if (!contenedor) return;
    let cancelado = false;
    crearCapaTexto(doc, numPagina, escala, contenedor).then(() => {
      if (cancelado) contenedor.replaceChildren();
    });
    return () => { cancelado = true; };
  }, [doc, numPagina, escala]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const contenedor = capaTextoRef.current;
    if (!canvas || !contenedor) return;
    function sincronizarEscala() {
      const anchoMostrado = canvas!.getBoundingClientRect().width;
      if (!anchoMostrado || !paginaCanvas.width) return;
      const factor = anchoMostrado / paginaCanvas.width;
      contenedor!.style.transform = `scale(${factor})`;
      contenedor!.style.transformOrigin = "top left";
    }
    sincronizarEscala();
    const observador = new ResizeObserver(sincronizarEscala);
    observador.observe(canvas);
    return () => observador.disconnect();
  }, [paginaCanvas]);

  function coordsCanvas(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const box = canvas.getBoundingClientRect();
    const escalaX = canvas.width / box.width;
    const escalaY = canvas.height / box.height;
    return { x: (e.clientX - box.left) * escalaX, y: (e.clientY - box.top) * escalaY };
  }

  async function alConfirmarSeleccion(rect: { x0: number; y0: number; x1: number; y1: number }) {
    setSeleccion(rect);
    setInicio(null);
    setActual(null);

    const ancho = rect.x1 - rect.x0;
    const alto = rect.y1 - rect.y0;
    if (ancho < 10 || alto < 10) {
      onRecorte(null);
      return;
    }

    // Se limpia el recorte anterior mientras se genera el nuevo en alta
    // resolución (toma un instante): así, si el usuario alcanza a crear el
    // producto en ese hueco, nunca termina usando la foto de un recorte
    // viejo — en el peor caso usa la página completa como respaldo.
    onRecorte(null);
    setGenerandoRecorte(true);
    onGenerandoCambio?.(true);
    try {
      let altaRes = altaResRef.current?.pagina === numPagina ? altaResRef.current.canvas : null;
      if (!altaRes) {
        altaRes = await renderizarPagina(doc, numPagina, ESCALA_EXPORTACION);
        altaResRef.current = { pagina: numPagina, canvas: altaRes };
      }
      const blob = await recortarDeCanvasAltaResolucion(altaRes, rect, escala);
      onRecorte(blob);
    } catch (err) {
      console.error(err);
      // Si algo falla al re-renderizar en alta resolución, no se bloquea el
      // flujo: se recorta de la vista previa como antes (menos nítido, pero
      // el usuario puede seguir importando productos).
      const recorte = document.createElement("canvas");
      recorte.width = ancho;
      recorte.height = alto;
      recorte.getContext("2d")!.drawImage(paginaCanvas, rect.x0, rect.y0, ancho, alto, 0, 0, ancho, alto);
      recorte.toBlob((blob) => onRecorte(blob), "image/jpeg", 0.9);
    } finally {
      setGenerandoRecorte(false);
      onGenerandoCambio?.(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {(["recortar", "seleccionar"] as Modo[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setModo(m)}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium uppercase tracking-wider"
            style={{
              background: modo === m ? "rgba(244,63,94,0.15)" : "transparent",
              color: modo === m ? "rgba(253,164,175,1)" : "rgba(255,255,255,0.4)",
              border: `1px solid ${modo === m ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.1)"}`,
            }}
          >
            {m === "recortar" ? "Recortar foto" : "Seleccionar texto"}
          </button>
        ))}
      </div>

      <div className="relative" style={{ isolation: "isolate" }}>
        <canvas
          ref={canvasRef}
          className="w-full rounded-xl select-none"
          style={{ border: "1px solid rgba(255,255,255,0.1)", cursor: modo === "recortar" ? "crosshair" : "default" }}
          onMouseDown={(e) => { if (modo !== "recortar") return; setInicio(coordsCanvas(e)); setActual(coordsCanvas(e)); }}
          onMouseMove={(e) => { if (modo !== "recortar" || !inicio) return; setActual(coordsCanvas(e)); }}
          onMouseUp={(e) => {
            if (modo !== "recortar" || !inicio) return;
            const fin = coordsCanvas(e);
            alConfirmarSeleccion({
              x0: Math.min(inicio.x, fin.x), y0: Math.min(inicio.y, fin.y),
              x1: Math.max(inicio.x, fin.x), y1: Math.max(inicio.y, fin.y),
            });
          }}
        />
        <div
          ref={capaTextoRef}
          className="textLayer"
          style={{ pointerEvents: modo === "seleccionar" ? "auto" : "none" }}
        />
      </div>

      <div className="flex items-center gap-3 mt-2">
        {modo === "recortar" ? (
          <>
            <p className="text-white/30 text-[11px]">
              {generandoRecorte ? "Generando recorte en alta resolución..." : "Arrastra sobre la imagen para recortar la foto del producto."}
            </p>
            {seleccion && !generandoRecorte && (
              <button
                type="button"
                onClick={() => { setSeleccion(null); onRecorte(null); }}
                className="text-rose-300/70 hover:text-rose-300 text-[11px] underline"
              >
                Quitar recorte (usar página completa)
              </button>
            )}
          </>
        ) : (
          <p className="text-white/30 text-[11px]">Selecciona el texto con el mouse y cópialo (Ctrl+C) para pegarlo donde lo necesites.</p>
        )}
      </div>
    </div>
  );
}
