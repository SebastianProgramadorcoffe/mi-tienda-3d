#!/usr/bin/env python
"""
Extrae productos (nombre, precio, código, página) y una foto candidata por
producto desde un catálogo PDF de proveedor (ej. Yanbal) tipo revista, donde
cada página es UNA sola imagen de fondo con el texto superpuesto por separado
(no hay una foto por producto como objeto independiente en el PDF).

Estrategia:
  1. El texto correcto (con tildes) se saca con `pdftotext -layout -enc UTF-8`
     de poppler, porque PyMuPDF decodifica mal los acentos de la fuente de
     este PDF en particular. De ahí se leen nombre/precio/código por página
     con regex (los dígitos y el símbolo $ sí se decodifican bien en ambos).
  2. La UBICACIÓN de cada producto en la página se saca con PyMuPDF buscando
     la posición del número de código (los dígitos sí quedan bien ubicados
     aunque el texto alrededor esté mal decodificado).
  3. Cada página se renderiza en alta resolución, y el área de cada producto
     se recorta con una partición tipo Voronoi (cada celda de una grilla de
     la página se asigna al código más cercano) para aproximar "la foto de
     este producto" sin que el PDF tenga esa info explícita.

Esto es un punto de partida automatizado, NO un resultado perfecto: revisa
las fotos recortadas antes de subirlas a la tienda — layouts con productos
muy pegados o fondos compartidos pueden salir recortados de más o de menos.

Uso:
    python extraer_catalogo.py "ruta/al/catalogo.pdf" "carpeta_salida"
"""
import csv
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import pymupdf as fitz

POPPLER_BIN = r"C:\Users\USER\AppData\Local\Microsoft\WinGet\Packages\oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe\poppler-25.07.0\Library\bin"
ZOOM = 300 / 72  # render a ~300 DPI para recortes con buena calidad

# Precio: "OFERTA $ 29.500", "$ 74.000", "OFERTA $ 25.000 c/u"
RE_PRECIO = re.compile(r"\$\s*([\d.]{3,})")
# Código: tolera que "CÓD." salga mal decodificado (ej. "C�D.", "C.D.")
RE_CODIGO = re.compile(r"C.D\.?\s*(\d{3,6})", re.IGNORECASE)


def extraer_texto_poppler(pdf_path: Path) -> list[str]:
    """Devuelve el texto de cada página (correctamente decodificado)."""
    pdftotext = str(Path(POPPLER_BIN) / "pdftotext.exe")
    resultado = subprocess.run(
        [pdftotext, "-layout", "-enc", "UTF-8", str(pdf_path), "-"],
        capture_output=True, text=True, encoding="utf-8", check=True,
    )
    return resultado.stdout.split("\f")


def detectar_productos_por_pagina(texto_pagina: str) -> list[dict]:
    """Busca bloques 'nombre + precio + código' dentro del texto de una página."""
    productos = []
    lineas = texto_pagina.split("\n")
    for i, linea in enumerate(lineas):
        m_precio = RE_PRECIO.search(linea)
        if not m_precio:
            continue
        m_codigo = RE_CODIGO.search(linea) or (
            RE_CODIGO.search(lineas[i + 1]) if i + 1 < len(lineas) else None
        )
        if not m_codigo:
            continue
        precio = int(m_precio.group(1).replace(".", ""))
        codigo = m_codigo.group(1)
        # el nombre: 1-3 líneas no vacías inmediatamente ANTERIORES al precio
        nombre_partes = []
        j = i - 1
        while j >= 0 and len(nombre_partes) < 3:
            cand = lineas[j].strip()
            if not cand:
                j -= 1
                continue
            if RE_PRECIO.search(cand) or RE_CODIGO.search(cand):
                break
            nombre_partes.insert(0, cand)
            j -= 1
        nombre = " ".join(nombre_partes).strip() or f"Producto {codigo}"
        productos.append({"codigo": codigo, "nombre": nombre, "precio": precio})
    return productos


def ubicar_codigos_en_pagina(page: "fitz.Page", codigos: set) -> dict:
    """Devuelve {codigo: (x0,y0,x1,y1)} en coordenadas de PÁGINA (puntos PDF)."""
    ubicaciones = {}
    for x0, y0, x1, y1, palabra, *_ in page.get_text("words"):
        solo_digitos = re.sub(r"\D", "", palabra)
        if solo_digitos in codigos and solo_digitos not in ubicaciones:
            ubicaciones[solo_digitos] = (x0, y0, x1, y1)
    return ubicaciones


def calcular_regiones_voronoi(anclas: dict, page_rect) -> dict:
    """
    Para cada código, aproxima su 'región de foto' asignando cada celda de una
    grilla al ancla (código) más cercana (partición tipo Voronoi). Devuelve
    cajas en coordenadas de PÁGINA (puntos PDF), listas para usar como `clip`.
    """
    if not anclas:
        return {}
    codigos = list(anclas.keys())
    puntos = np.array([
        ((x0 + x1) / 2, (y0 + y1) / 2) for (x0, y0, x1, y1) in anclas.values()
    ])

    GRID_W, GRID_H = 60, 84
    xs = np.linspace(0, page_rect.width, GRID_W)
    ys = np.linspace(0, page_rect.height, GRID_H)
    gx, gy = np.meshgrid(xs, ys)
    celdas = np.stack([gx.ravel(), gy.ravel()], axis=1)

    dists = np.linalg.norm(celdas[:, None, :] - puntos[None, :, :], axis=2)
    asignacion = dists.argmin(axis=1).reshape(GRID_H, GRID_W)

    cajas = {}
    for idx, codigo in enumerate(codigos):
        mask = asignacion == idx
        if not mask.any():
            continue
        filas, cols = np.where(mask)
        cajas[codigo] = (
            float(xs[cols.min()]), float(ys[filas.min()]),
            float(xs[cols.max()]), float(ys[filas.max()]),
        )
    return cajas


def main():
    if len(sys.argv) < 3:
        print("Uso: python extraer_catalogo.py <catalogo.pdf> <carpeta_salida>")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    salida = Path(sys.argv[2])
    (salida / "imagenes").mkdir(parents=True, exist_ok=True)
    (salida / "paginas").mkdir(parents=True, exist_ok=True)

    print(f"Leyendo texto (poppler) de {pdf_path.name}...")
    paginas_texto = extraer_texto_poppler(pdf_path)

    print(f"Abriendo PDF con PyMuPDF ({len(paginas_texto)} páginas de texto)...")
    doc = fitz.open(str(pdf_path))

    filas_csv = []
    total_con_foto = 0
    mat = fitz.Matrix(ZOOM, ZOOM)

    for pno in range(len(doc)):
        texto_pagina = paginas_texto[pno] if pno < len(paginas_texto) else ""
        productos = detectar_productos_por_pagina(texto_pagina)
        if not productos:
            continue

        page = doc[pno]
        codigos_pagina = {p["codigo"] for p in productos}
        anclas = ubicar_codigos_en_pagina(page, codigos_pagina)

        # Página completa (respaldo visual, siempre se genera)
        pagina_img_path = salida / "paginas" / f"pagina_{pno + 1:03d}.jpg"
        page.get_pixmap(matrix=mat).save(str(pagina_img_path))

        cajas = calcular_regiones_voronoi(anclas, page.rect)

        for prod in productos:
            imagen_rel = ""
            caja = cajas.get(prod["codigo"])
            if caja:
                clip_rect = fitz.Rect(*caja)
                if clip_rect.width > 5 and clip_rect.height > 5:
                    img_path = salida / "imagenes" / f"{prod['codigo']}.jpg"
                    page.get_pixmap(matrix=mat, clip=clip_rect).save(str(img_path))
                    imagen_rel = f"imagenes/{prod['codigo']}.jpg"
                    total_con_foto += 1

            filas_csv.append({
                "codigo": prod["codigo"],
                "nombre": prod["nombre"],
                "precio": prod["precio"],
                "pagina": pno + 1,
                "imagen": imagen_rel,
                "imagen_pagina_completa": f"paginas/pagina_{pno + 1:03d}.jpg",
            })

        if (pno + 1) % 20 == 0:
            print(f"  ...página {pno + 1}/{len(doc)}")

    csv_path = salida / "productos.csv"
    with open(csv_path, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "codigo", "nombre", "precio", "pagina", "imagen", "imagen_pagina_completa",
        ])
        writer.writeheader()
        writer.writerows(filas_csv)

    print(f"\nListo: {len(filas_csv)} productos detectados, {total_con_foto} con foto recortada.")
    print(f"CSV: {csv_path}")
    print(f"Imágenes: {salida / 'imagenes'}")
    print(f"Páginas completas (respaldo visual): {salida / 'paginas'}")


if __name__ == "__main__":
    main()
