"""Cliente compartido de Firestore para los scripts de ml/.

La credencial NUNCA se lee de un archivo del repo: viene de la variable de
entorno FIREBASE_SERVICE_ACCOUNT_KEY (el JSON completo de la service account,
inyectado como secret de GitHub Actions o exportado localmente a mano).
"""

import json
import os

import firebase_admin
from firebase_admin import credentials, firestore


def obtener_firestore():
    if not firebase_admin._apps:
        credencial_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY")
        if not credencial_json:
            raise RuntimeError(
                "Falta la variable de entorno FIREBASE_SERVICE_ACCOUNT_KEY "
                "(JSON de la service account de Firebase)."
            )
        credencial = credentials.Certificate(json.loads(credencial_json))
        firebase_admin.initialize_app(credencial)
    return firestore.client()
