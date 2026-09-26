"""Exporta las ventas pagadas de Firestore a un DataFrame / JSON limpio.

Solo lee `pedidos` con estado == "pagado" y únicamente los campos de
`itemsSnapshot` (producto, precio, cantidad) más la fecha — nunca los datos
de envío (nombre/email/dirección del cliente), que no hacen falta para
entrenar el modelo y son información personal.
"""

import argparse
import json
from pathlib import Path

import pandas as pd
from google.cloud.firestore_v1.base_query import FieldFilter

from firebase_client import obtener_firestore


def obtener_ventas_dataframe() -> pd.DataFrame:
    db = obtener_firestore()
    filas = []

    consulta = db.collection("pedidos").where(filter=FieldFilter("estado", "==", "pagado"))
    for doc in consulta.stream():
        pedido = doc.to_dict()
        creado_en = pedido.get("createdAt")
        if creado_en is None:
            continue
        fecha = creado_en.replace(tzinfo=None) if hasattr(creado_en, "replace") else creado_en

        for item in pedido.get("itemsSnapshot", []):
            precio = item.get("precio", 0)
            precio_original = item.get("precioOriginal")
            filas.append({
                "fecha": fecha,
                "productoId": item.get("productoId"),
                "nombre": item.get("nombre"),
                "cantidad": item.get("cantidad", 0),
                "precio": precio,
                "precioOriginal": precio_original,
                "enPromocion": bool(precio_original and precio_original > precio),
                "subtotal": precio * item.get("cantidad", 0),
            })

    if not filas:
        return pd.DataFrame(columns=[
            "fecha", "productoId", "nombre", "cantidad", "precio",
            "precioOriginal", "enPromocion", "subtotal",
        ])

    df = pd.DataFrame(filas)
    df["fecha"] = pd.to_datetime(df["fecha"])
    return df


def resumen_para_json(df: pd.DataFrame) -> dict:
    """Agrega la misma info en vistas por día, mes, año y producto."""
    if df.empty:
        return {"porDia": [], "porMes": [], "porAnio": [], "porProducto": []}

    df = df.copy()
    df["dia"] = df["fecha"].dt.date.astype(str)
    df["mes"] = df["fecha"].dt.to_period("M").astype(str)
    df["anio"] = df["fecha"].dt.year

    por_dia = (
        df.groupby("dia")
        .agg(unidades=("cantidad", "sum"), ventasTotales=("subtotal", "sum"))
        .reset_index()
        .to_dict(orient="records")
    )
    por_mes = (
        df.groupby("mes")
        .agg(unidades=("cantidad", "sum"), ventasTotales=("subtotal", "sum"))
        .reset_index()
        .to_dict(orient="records")
    )
    por_anio = (
        df.groupby("anio")
        .agg(unidades=("cantidad", "sum"), ventasTotales=("subtotal", "sum"))
        .reset_index()
        .to_dict(orient="records")
    )
    por_producto = (
        df.groupby(["productoId", "nombre"])
        .agg(
            unidades=("cantidad", "sum"),
            ventasTotales=("subtotal", "sum"),
            vecesEnPromocion=("enPromocion", "sum"),
        )
        .reset_index()
        .to_dict(orient="records")
    )

    return {
        "porDia": por_dia,
        "porMes": por_mes,
        "porAnio": por_anio,
        "porProducto": por_producto,
    }


def main():
    parser = argparse.ArgumentParser(description="Exporta ventas de Firestore a JSON.")
    parser.add_argument(
        "--salida",
        default=str(Path(__file__).parent / "data" / "ventas_export.json"),
        help="Ruta del JSON de salida",
    )
    args = parser.parse_args()

    df = obtener_ventas_dataframe()
    resumen = resumen_para_json(df)

    ruta_salida = Path(args.salida)
    ruta_salida.parent.mkdir(parents=True, exist_ok=True)
    ruta_salida.write_text(json.dumps(resumen, ensure_ascii=False, indent=2, default=str))
    print(f"{len(df)} filas de venta exportadas -> {ruta_salida}")


if __name__ == "__main__":
    main()
