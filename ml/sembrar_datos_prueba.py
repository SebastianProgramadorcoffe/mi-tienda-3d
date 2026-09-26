"""Genera pedidos "pagados" de PRUEBA en Firestore, sin tocar Wompi ni mover
dinero real, solo para poder probar el pipeline de ml/ (export + Random
Forest) con volumen suficiente (>= 20 ventas).

Cada documento se marca con `esDatoPrueba: true` y una referencia que empieza
por "PRUEBA-", así se puede identificar y borrar después sin riesgo de tocar
pedidos reales.

Dos modos:

  --patron (recomendado para probar que el modelo SÍ aprende algo):
    simula un patrón de negocio realista sobre 365 días — más ventas en
    quincena (14-16 y 29-31, como paga en Colombia), más los fines de
    semana, bloques reales de promoción cada ~18 días que sí aumentan la
    demanda, temporada alta real de perfumería/cosméticos (San Valentín,
    Día de la madre, Amor y Amistad, Navidad), y una tendencia
    (subiendo/bajando) asignada por producto. Si el R² del entrenamiento
    mejora con este modo, confirma que el pipeline aprende correctamente
    cuando existe una señal real que aprender.

  (sin --patron, modo por defecto):
    ventas puramente aleatorias, sin ninguna relación con fecha/promoción.
    Sirve solo para probar que el pipeline corre sin errores end-to-end —
    el R² se va a quedar bajo o negativo a propósito, porque no hay ningún
    patrón real que el modelo pueda encontrar.

Uso:
  python sembrar_datos_prueba.py --patron              -> ~180 días con patrón
  python sembrar_datos_prueba.py                        -> ~50 pedidos aleatorios
  python sembrar_datos_prueba.py --eliminar             -> borra SOLO los de prueba

Requiere FIREBASE_SERVICE_ACCOUNT_KEY en el entorno (ver firebase_client.py).
"""

import argparse
import random
from datetime import datetime, timedelta, timezone

from firebase_client import obtener_firestore

DIAS_HACIA_ATRAS_ALEATORIO = 75
DIAS_HACIA_ATRAS_PATRON = 365
CICLO_PROMOCION_DIAS = 18
DURACION_PROMOCION_DIAS = 4

# Meses de temporada alta real para una tienda de perfumería/cosméticos en
# Colombia: San Valentín (feb), Día de la madre (may), Amor y Amistad (sep),
# Navidad (dic). Multiplican la probabilidad de venta de ese mes.
MESES_TEMPORADA_ALTA = {2: 1.3, 5: 1.25, 9: 1.35, 12: 1.6}


def obtener_productos_reales(db):
    productos = [
        {**doc.to_dict(), "id": doc.id}
        for doc in db.collection("productos").stream()
    ]
    return [p for p in productos if p.get("activo", True)]


def escribir_en_lotes(db, referencias_y_pedidos):
    """Hace commit cada 450 escrituras (límite real de Firestore: 500 por batch)."""
    lote = db.batch()
    en_lote = 0
    for referencia, pedido in referencias_y_pedidos:
        lote.set(db.collection("pedidos").document(referencia), pedido)
        en_lote += 1
        if en_lote >= 450:
            lote.commit()
            lote = db.batch()
            en_lote = 0
    if en_lote > 0:
        lote.commit()


# ─── Modo aleatorio (smoke test rápido, sin ningún patrón) ───────────────────

def generar_pedido_aleatorio(referencia, productos, fecha):
    n_items = random.randint(1, 2)
    items = []
    for producto in random.sample(productos, k=min(n_items, len(productos))):
        precio = producto.get("precio", 0)
        precio_original = producto.get("precioOriginal")
        items.append({
            "productoId": producto["id"],
            "nombre": producto.get("nombre", "Producto"),
            "precio": precio,
            "precioOriginal": precio_original,
            "cantidad": random.randint(1, 3),
            "imagen": producto.get("imagen", ""),
        })
    total = sum(i["precio"] * i["cantidad"] for i in items)
    return {
        "referencia": referencia, "userId": "PRUEBA-seed-script",
        "itemsSnapshot": items, "total": total, "estado": "pagado",
        "esDatoPrueba": True, "createdAt": fecha, "updatedAt": fecha,
    }


def sembrar_aleatorio(cantidad: int):
    db = obtener_firestore()
    productos = obtener_productos_reales(db)
    if not productos:
        print("No hay productos activos en Firestore — crea al menos uno en /admin/productos antes de sembrar datos de prueba.")
        return

    ahora = datetime.now(timezone.utc)

    def generador():
        for i in range(cantidad):
            dias_atras = random.randint(0, DIAS_HACIA_ATRAS_ALEATORIO)
            fecha = ahora - timedelta(days=dias_atras, hours=random.randint(0, 23))
            referencia = f"PRUEBA-{ahora.strftime('%Y%m%d%H%M%S')}-{i}"
            yield referencia, generar_pedido_aleatorio(referencia, productos, fecha)

    escribir_en_lotes(db, generador())
    print(f"Se crearon {cantidad} pedidos de PRUEBA aleatorios, repartidos en los últimos {DIAS_HACIA_ATRAS_ALEATORIO} días.")
    print("Nota: sin --patron, las ventas no siguen ninguna lógica de fecha/promoción — el R² se quedará bajo/negativo a propósito.")


# ─── Modo con patrón (para validar que el modelo SÍ aprende) ────────────────

def es_quincena(fecha) -> bool:
    return fecha.day in (14, 15, 16, 29, 30, 31, 1, 2)


def es_fin_de_semana(fecha) -> bool:
    return fecha.weekday() in (5, 6)


def generar_eventos_patron(productos, dias_historial):
    """Genera eventos de venta (uno por producto/día con venta) siguiendo un
    patrón de negocio deliberado. Devuelve dicts puros (sin tocar Firestore),
    para poder probarlos localmente antes de escribirlos."""
    ahora = datetime.now(timezone.utc)
    tendencia_por_producto = {p["id"]: random.choice([-1, 0, 1]) for p in productos}

    eventos = []
    for offset in range(dias_historial):
        fecha = ahora - timedelta(days=dias_historial - 1 - offset, hours=random.randint(8, 20))
        progreso = offset / max(1, dias_historial - 1)  # 0 (más viejo) -> 1 (más reciente)
        promo_activa = (offset % CICLO_PROMOCION_DIAS) < DURACION_PROMOCION_DIAS

        for producto in productos:
            tendencia = tendencia_por_producto[producto["id"]]
            factor_tendencia = 1 + tendencia * (progreso - 0.5) * 1.2

            probabilidad = 0.18
            if es_quincena(fecha):
                probabilidad += 0.25
            if es_fin_de_semana(fecha):
                probabilidad += 0.08
            if promo_activa:
                probabilidad += 0.25
            factor_temporada = MESES_TEMPORADA_ALTA.get(fecha.month, 1.0)
            probabilidad = max(0.02, min(0.95, probabilidad * factor_tendencia * factor_temporada))

            if random.random() >= probabilidad:
                continue

            precio = producto.get("precio", 0)
            precio_original_catalogo = producto.get("precioOriginal")
            if promo_activa:
                precio_original = precio_original_catalogo or round(precio / 0.85)
            else:
                precio_original = None

            cantidad = 1
            if es_quincena(fecha):
                cantidad += 1
            if promo_activa:
                cantidad += 1
            if fecha.month in MESES_TEMPORADA_ALTA:
                cantidad += 1
            cantidad += random.randint(0, 1)

            eventos.append({
                "fecha": fecha,
                "productoId": producto["id"],
                "nombre": producto.get("nombre", "Producto"),
                "precio": precio,
                "precioOriginal": precio_original,
                "cantidad": cantidad,
                "imagen": producto.get("imagen", ""),
            })

    return eventos, tendencia_por_producto


def sembrar_con_patron(dias_historial: int):
    db = obtener_firestore()
    productos = obtener_productos_reales(db)
    if not productos:
        print("No hay productos activos en Firestore — crea al menos uno en /admin/productos antes de sembrar datos de prueba.")
        return

    eventos, tendencia_por_producto = generar_eventos_patron(productos, dias_historial)
    ahora = datetime.now(timezone.utc)

    def generador():
        for i, evento in enumerate(eventos):
            referencia = f"PRUEBA-PATRON-{ahora.strftime('%Y%m%d%H%M%S')}-{i}"
            pedido = {
                "referencia": referencia,
                "userId": "PRUEBA-seed-script",
                "itemsSnapshot": [{
                    "productoId": evento["productoId"],
                    "nombre": evento["nombre"],
                    "precio": evento["precio"],
                    "precioOriginal": evento["precioOriginal"],
                    "cantidad": evento["cantidad"],
                    "imagen": evento["imagen"],
                }],
                "total": evento["precio"] * evento["cantidad"],
                "estado": "pagado",
                "esDatoPrueba": True,
                "createdAt": evento["fecha"],
                "updatedAt": evento["fecha"],
            }
            yield referencia, pedido

    escribir_en_lotes(db, generador())

    nombres = {p["id"]: p.get("nombre", p["id"]) for p in productos}
    resumen_tendencias = {"subiendo": 0, "estable": 0, "bajando": 0}
    etiqueta = {1: "subiendo", 0: "estable", -1: "bajando"}
    for producto_id, t in tendencia_por_producto.items():
        resumen_tendencias[etiqueta[t]] += 1

    print(f"Se crearon {len(eventos)} eventos de venta de PRUEBA con patrón, sobre {dias_historial} días.")
    print(f"Tendencias asignadas por producto: {resumen_tendencias}")
    print("Patrón inyectado: +demanda en quincena (14-16 y 29-31), +demanda fin de semana, "
          f"promoción real activa {DURACION_PROMOCION_DIAS} de cada {CICLO_PROMOCION_DIAS} días, "
          f"+demanda en temporada alta ({sorted(MESES_TEMPORADA_ALTA)}).")
    print("Corre 'python entrenar_predecir.py' y compara el R² contra el modo aleatorio.")


def eliminar():
    db = obtener_firestore()
    docs = list(db.collection("pedidos").where("esDatoPrueba", "==", True).stream())
    if not docs:
        print("No hay pedidos de prueba para borrar.")
        return

    lote = db.batch()
    en_lote = 0
    borrados = 0
    for doc in docs:
        lote.delete(doc.reference)
        en_lote += 1
        borrados += 1
        if en_lote >= 450:
            lote.commit()
            lote = db.batch()
            en_lote = 0
    if en_lote > 0:
        lote.commit()
    print(f"Se borraron {borrados} pedidos de PRUEBA.")


def main():
    parser = argparse.ArgumentParser(description="Siembra o borra pedidos de prueba en Firestore.")
    parser.add_argument("--cantidad", type=int, default=50, help="Modo aleatorio: cuántos pedidos crear")
    parser.add_argument("--dias", type=int, default=DIAS_HACIA_ATRAS_PATRON, help="Modo patrón: cuántos días de historial simular")
    parser.add_argument("--patron", action="store_true", help="Genera ventas con un patrón de negocio real (quincena/fin de semana/promo/tendencia)")
    parser.add_argument("--eliminar", action="store_true", help="Borra los pedidos de prueba en vez de crearlos")
    args = parser.parse_args()

    if args.eliminar:
        eliminar()
    elif args.patron:
        sembrar_con_patron(args.dias)
    else:
        sembrar_aleatorio(args.cantidad)


if __name__ == "__main__":
    main()
