"""Entrena un RandomForestRegressor con el historial de ventas y escribe en
Firestore, por producto, la demanda esperada para los próximos 30 días y si
conviene lanzar una promoción.

Uso: python entrenar_predecir.py
Requiere FIREBASE_SERVICE_ACCOUNT_KEY en el entorno (ver firebase_client.py).

La lógica de "¿promociono o no?" no la decide el bosque directamente (no hay
una etiqueta histórica de "esto debió promocionarse"): el modelo solo predice
unidades vendidas por producto/día bajo distintos escenarios de precio, y una
regla de negocio simple y explicable traduce esa predicción en una
recomendación. Así el resultado se puede justificar al usuario final, no es
una caja negra.
"""

import sys
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

from exportar_datos import obtener_ventas_dataframe
from firebase_client import obtener_firestore

MINIMO_FILAS_PARA_ENTRENAR = 20
DIAS_A_PREDECIR = 30
UMBRAL_TENDENCIA_BAJA = -0.15  # -15% respecto al periodo previo -> "bajando"
UMBRAL_UPLIFT_PROMO = 0.10     # +10% de unidades con promo -> vale la pena sugerirla


def construir_grilla_diaria(df: pd.DataFrame) -> pd.DataFrame:
    """Expande las ventas reales a una grilla producto x día completa,
    con cantidad=0 en los días sin venta (necesario para que el modelo
    aprenda también cuándo NO se vende, no solo cuándo sí)."""
    fecha_min, fecha_max = df["fecha"].min().normalize(), df["fecha"].max().normalize()
    rango_fechas = pd.date_range(fecha_min, fecha_max, freq="D")

    filas = []
    for producto_id, grupo in df.groupby("productoId"):
        nombre = grupo["nombre"].mode().iat[0]
        ventas_por_dia = (
            grupo.assign(dia=grupo["fecha"].dt.normalize())
            .groupby("dia")
            .agg(cantidad=("cantidad", "sum"), precio=("precio", "last"),
                 precioOriginal=("precioOriginal", "last"), enPromocion=("enPromocion", "max"))
        )
        grilla = ventas_por_dia.reindex(rango_fechas)
        grilla["cantidad"] = grilla["cantidad"].fillna(0)
        grilla["precio"] = grilla["precio"].ffill().bfill()
        grilla["precioOriginal"] = grilla["precioOriginal"].ffill().bfill()
        grilla["enPromocion"] = grilla["enPromocion"].fillna(False).astype(bool)
        grilla["productoId"] = producto_id
        grilla["nombre"] = nombre
        grilla.index.name = "fecha"
        filas.append(grilla.reset_index())

    return pd.concat(filas, ignore_index=True)


def agregar_features_de_fecha(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["anio"] = df["fecha"].dt.year
    df["mes"] = df["fecha"].dt.month
    df["dia"] = df["fecha"].dt.day
    df["diaAnio"] = df["fecha"].dt.dayofyear
    df["diaSemana"] = df["fecha"].dt.dayofweek
    df["esFinDeSemana"] = df["diaSemana"].isin([5, 6]).astype(int)
    return df


COLUMNAS_FEATURES = [
    "anio", "mes", "dia", "diaAnio", "diaSemana", "esFinDeSemana",
    "precio", "enPromocion", "productoIdCod",
]


def entrenar(df: pd.DataFrame):
    codigos, categorias = pd.factorize(df["productoId"])
    df = df.assign(productoIdCod=codigos)

    X = df[COLUMNAS_FEATURES].astype(float)
    y = df["cantidad"].astype(float)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    modelo = RandomForestRegressor(n_estimators=200, max_depth=12, random_state=42, n_jobs=-1)
    modelo.fit(X_train, y_train)

    predicciones_test = modelo.predict(X_test)
    metricas = {
        "mae": float(mean_absolute_error(y_test, predicciones_test)),
        "r2": float(r2_score(y_test, predicciones_test)) if len(y_test) > 1 else None,
        "filasEntrenamiento": int(len(df)),
    }
    return modelo, categorias, metricas


def predecir_producto(modelo, categorias, producto_id, precio_actual, ultima_fecha):
    codigo = int(np.where(categorias == producto_id)[0][0])
    fechas_futuras = [ultima_fecha + timedelta(days=i) for i in range(1, DIAS_A_PREDECIR + 1)]

    filas_normal, filas_promo = [], []
    for fecha in fechas_futuras:
        base = {
            "anio": fecha.year, "mes": fecha.month, "dia": fecha.day,
            "diaAnio": fecha.timetuple().tm_yday, "diaSemana": fecha.weekday(),
            "esFinDeSemana": int(fecha.weekday() in (5, 6)),
            "precio": precio_actual, "productoIdCod": codigo,
        }
        filas_normal.append({**base, "enPromocion": 0})
        filas_promo.append({**base, "enPromocion": 1})

    df_normal = pd.DataFrame(filas_normal)[COLUMNAS_FEATURES]
    df_promo = pd.DataFrame(filas_promo)[COLUMNAS_FEATURES]

    prediccion_normal = float(modelo.predict(df_normal).sum())
    prediccion_promo = float(modelo.predict(df_promo).sum())
    return max(0.0, prediccion_normal), max(0.0, prediccion_promo)


def calcular_tendencia(df_producto: pd.DataFrame, ultima_fecha) -> str:
    ventana_reciente = df_producto[df_producto["fecha"] > ultima_fecha - timedelta(days=30)]["cantidad"].sum()
    ventana_previa = df_producto[
        (df_producto["fecha"] <= ultima_fecha - timedelta(days=30))
        & (df_producto["fecha"] > ultima_fecha - timedelta(days=60))
    ]["cantidad"].sum()

    if ventana_previa == 0:
        return "estable" if ventana_reciente == 0 else "subiendo"

    cambio = (ventana_reciente - ventana_previa) / ventana_previa
    if cambio <= UMBRAL_TENDENCIA_BAJA:
        return "bajando"
    if cambio >= -UMBRAL_TENDENCIA_BAJA:
        return "subiendo"
    return "estable"


def decidir_promocion(tendencia: str, uplift_relativo: float) -> tuple[bool, float]:
    if tendencia == "bajando":
        return True, 20.0
    if uplift_relativo >= UMBRAL_UPLIFT_PROMO:
        return True, 10.0
    return False, 0.0


def main():
    df_crudo = obtener_ventas_dataframe()

    if len(df_crudo) < MINIMO_FILAS_PARA_ENTRENAR:
        print(
            f"Solo hay {len(df_crudo)} ventas pagadas registradas "
            f"(mínimo {MINIMO_FILAS_PARA_ENTRENAR}) — aún no hay suficiente "
            "historial para entrenar el modelo con confianza. No se escriben "
            "predicciones todavía."
        )
        db = obtener_firestore()
        db.collection("predicciones").document("_meta").set({
            "estado": "datos_insuficientes",
            "filasDisponibles": int(len(df_crudo)),
            "minimoRequerido": MINIMO_FILAS_PARA_ENTRENAR,
            "generadoEn": datetime.utcnow(),
        })
        return

    df_grilla = agregar_features_de_fecha(construir_grilla_diaria(df_crudo))
    modelo, categorias, metricas = entrenar(df_grilla)
    ultima_fecha = df_grilla["fecha"].max()

    db = obtener_firestore()
    lote = db.batch()
    operaciones_en_lote = 0
    MAX_OPERACIONES_POR_LOTE = 450  # Firestore limita cada batch a 500

    def confirmar_si_lote_lleno():
        nonlocal lote, operaciones_en_lote
        if operaciones_en_lote >= MAX_OPERACIONES_POR_LOTE:
            lote.commit()
            lote = db.batch()
            operaciones_en_lote = 0

    for producto_id, grupo in df_grilla.groupby("productoId"):
        nombre = grupo["nombre"].mode().iat[0]
        precio_actual = grupo.sort_values("fecha")["precio"].iloc[-1]

        prediccion_normal, prediccion_promo = predecir_producto(
            modelo, categorias, producto_id, precio_actual, ultima_fecha
        )
        uplift_relativo = (
            (prediccion_promo - prediccion_normal) / prediccion_normal
            if prediccion_normal > 0 else (1.0 if prediccion_promo > 0 else 0.0)
        )
        tendencia = calcular_tendencia(grupo, ultima_fecha)
        promocion_sugerida, descuento_sugerido = decidir_promocion(tendencia, uplift_relativo)

        ref = db.collection("predicciones").document(producto_id)
        lote.set(ref, {
            "productoId": producto_id,
            "nombre": nombre,
            "ventaPredicha30Dias": round(prediccion_normal, 1),
            "ventaPredicha30DiasConPromo": round(prediccion_promo, 1),
            "tendencia": tendencia,
            "promocionSugerida": promocion_sugerida,
            "descuentoSugeridoPct": descuento_sugerido,
            "generadoEn": datetime.utcnow(),
        })
        operaciones_en_lote += 1
        confirmar_si_lote_lleno()

    ref_meta = db.collection("predicciones").document("_meta")
    lote.set(ref_meta, {
        "estado": "ok",
        "metricas": metricas,
        "productosPredichos": int(df_grilla["productoId"].nunique()),
        "generadoEn": datetime.utcnow(),
    })

    lote.commit()
    print(f"Predicciones escritas para {df_grilla['productoId'].nunique()} productos. Métricas: {metricas}")


if __name__ == "__main__":
    sys.exit(main() or 0)
