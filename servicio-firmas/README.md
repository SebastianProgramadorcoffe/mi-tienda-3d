# servicio-firmas — secretos que no pueden estar en el navegador

La tienda corre entera en el navegador de la clienta, así que cualquier clave
que esté en su código es visible para cualquiera. Este pequeño servicio
(Cloudflare Worker) guarda esas claves y firma dos cosas:

| Ruta | Para qué | Quién puede usarla |
|---|---|---|
| `POST /firma` | **Firma de integridad de Wompi**, obligatoria en cada pago. Sin ella nadie puede cambiar el valor a pagar. | La dueña del pedido. |
| `POST /firma-cloudinary` | **Firma de subida a Cloudinary**, que reemplaza el preset público que hoy deja subir archivos a cualquiera. | Solo staff (admin/empleado). |

**Costo: $0.** El plan gratuito de Cloudflare Workers da 100.000 solicitudes
al día y no pide tarjeta. Cada compra usa una solicitud y cada subida de
imagen otra.

## Cómo decide a quién atender

No guarda credenciales de Firebase. Lee Firestore **con la sesión de quien
llama**, y las reglas de Firestore deciden qué puede leer:

- **Wompi:** lee `pedidos/{referencia}`. Solo la dueña o el staff pueden
  leerlo. Firma el **total guardado en la base** (que las reglas ya validaron
  contra los precios del catálogo), nunca un monto enviado por el navegador, y
  solo si el pedido sigue `pendiente`.
- **Cloudinary:** lee `usuarios/{uid}` de quien llama y solo firma si su rol
  es `admin` o `empleado`.

## Instalación (una sola vez, ~15 minutos)

1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up. No pide
   tarjeta.
2. Desde esta carpeta, inicia sesión (se abre el navegador):
   ```
   cd servicio-firmas
   npx wrangler login
   ```
3. Publica el servicio:
   ```
   npx wrangler deploy
   ```
   Al final muestra la URL, algo como `https://aura-firmas.<tu-cuenta>.workers.dev`.
4. Carga los secretos. Cada comando te pide el valor por consola, así que no
   queda en ningún archivo:
   ```
   npx wrangler secret put WOMPI_INTEGRITY_SECRET
   npx wrangler secret put CLOUDINARY_CLOUD_NAME
   npx wrangler secret put CLOUDINARY_API_KEY
   npx wrangler secret put CLOUDINARY_API_SECRET
   ```
   - **Wompi:** panel de Wompi → Desarrolladores → Secretos para integración
     técnica → Integridad. Empieza por `test_integrity_` en pruebas y por
     `prod_integrity_` en producción.
   - **Cloudinary:** Console → Settings → API Keys (Cloud name, API Key y API
     Secret).
5. En el `.env.local` de la tienda (carpeta raíz) agrega la URL del paso 3:
   ```
   NEXT_PUBLIC_FIRMA_URL=https://aura-firmas.<tu-cuenta>.workers.dev
   ```
6. Recompila y publica la tienda:
   ```
   cd ..
   npm run build
   npx firebase-tools deploy --only hosting
   ```
7. **Cierra el hueco de Cloudinary:** prueba subir una imagen desde el admin.
   Si funciona, borra el *upload preset* sin firma en Cloudinary (Settings →
   Upload → Upload presets) y quita `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` del
   `.env.local`. Mientras ese preset exista, cualquiera puede seguir subiendo
   archivos a tu cuenta.
8. **Ajusta la política de seguridad:** en `firebase.json`, `connect-src`
   permite `https://*.workers.dev` porque la URL exacta no se conocía.
   Cámbialo por tu URL del paso 3 y vuelve a publicar la tienda.

Mientras falte el paso 5, el checkout no intenta pagar: le dice a la clienta
que los pagos en línea todavía no están habilitados.

## Al pasar a producción con Wompi

Al cambiar la llave pública de Wompi en `src/lib/wompi.ts` por la de
producción, vuelve a cargar `WOMPI_INTEGRITY_SECRET` con el valor
`prod_integrity_...`. Llave y secreto tienen que ser del mismo ambiente.

## Pruebas

- `npm run test` (desde la raíz) corre las pruebas del servicio. Incluyen los
  ejemplos oficiales de las documentaciones de Wompi y de Cloudinary.
- Para probarlo en local: crea `servicio-firmas/.dev.vars` con los secretos de
  prueba, en formato `NOMBRE=valor` (ya está en `.gitignore`), y corre
  `npx wrangler dev`.
