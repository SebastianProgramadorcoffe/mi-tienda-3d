"""Genera pedidos "pagados" de PRUEBA en Firestore, sin tocar Wompi ni mover
dinero real, solo para poder probar el pipeline de ml/ (export + Random
Forest) con volumen suficiente (>= 20 ventas).

Cada documento se marca con `esDatoPrueba: true` y una referencia que empieza
por "PRUEBA-", así se puede identificar y borrar después sin riesgo de tocar
pedidos reales.

Uso:
  python sembrar_datos_prueba.py              -> crea ~50 pedidos de prueba
  python sembrar_datos_prueba.py --cantidad 30 -> crea 30
  python sembrar_datos_prueba.py --eliminar    -> borra SOLO los de prueba

Requiere FIREBASE_SERVICE_ACCOUNT_KEY en el entorno (ver firebase_client.py).
"""

import argparse
import random
from datetime import datetime, timedelta, timezone

from firebase_client import obtener_firestore

DIAS_HACIA_ATRAS = 75


def obtener_productos_reales(db):
    productos = [
        {**doc.to_dict(), "id": doc.id}
        for doc in db.collection("productos").stream()
    ]
    return [p for p in productos if p.get("activo", True)]


def generar_pedido_de_prueba(referencia, productos, fecha):
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
        "referencia": referencia,
        "userId": "PRUEBA-seed-script",
        "itemsSnapshot": items,
        "total": total,
        "estado": "pagado",
        "esDatoPrueba": True,
        "createdAt": fecha,
        "updatedAt": fecha,
    }


def sembrar(cantidad: int):
    db = obtener_firestore()
    productos = obtener_productos_reales(db)

    if not productos:
        print("No hay productos activos en Firestore — crea al menos uno en /admin/productos antes de sembrar datos de prueba.")
        return

    ahora = datetime.now(timezone.utc)
    lote = db.batch()

    for i in range(cantidad):
        dias_atras = random.randint(0, DIAS_HACIA_ATRAS)
        fecha = ahora - timedelta(days=dias_atras, hours=random.randint(0, 23))
        referencia = f"PRUEBA-{ahora.strftime('%Y%m%d%H%M%S')}-{i}"
        pedido = generar_pedido_de_prueba(referencia, productos, fecha)
        lote.set(db.collection("pedidos").document(referencia), pedido)

    lote.commit()
    print(f"Se crearon {cantidad} pedidos de PRUEBA (estado=pagado) repartidos en los últimos {DIAS_HACIA_ATRAS} días.")
    print("Corre 'python entrenar_predecir.py' para generar predicciones con estos datos.")
    print("Cuando termines de probar, borra los datos de prueba con: python sembrar_datos_prueba.py --eliminar")


def eliminar():
    db = obtener_firestore()
    docs = list(db.collection("pedidos").where("esDatoPrueba", "==", True).stream())

    if not docs:
        print("No hay pedidos de prueba para borrar.")
        return

    lote = db.batch()
    for doc in docs:
        lote.delete(doc.reference)
    lote.commit()
    print(f"Se borraron {len(docs)} pedidos de PRUEBA.")


def main():
    parser = argparse.ArgumentParser(description="Siembra o borra pedidos de prueba en Firestore.")
    parser.add_argument("--cantidad", type=int, default=50, help="Cuántos pedidos de prueba crear")
    parser.add_argument("--eliminar", action="store_true", help="Borra los pedidos de prueba en vez de crearlos")
    args = parser.parse_args()

    if args.eliminar:
        eliminar()
    else:
        sembrar(args.cantidad)


if __name__ == "__main__":
    main()
