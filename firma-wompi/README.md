# firma-wompi — firma de integridad para pagos con Wompi

Wompi exige que cada enlace de pago lleve una **firma de integridad**: un
SHA-256 de `referencia + montoEnCentavos + COP + secreto de integridad`. Con
ella, nadie puede cambiar el valor a pagar por el camino. El secreto no puede
estar en la tienda, porque todo lo que corre en el navegador es visible; por
eso vive en este pequeño servicio (Cloudflare Worker).

**Costo: $0.** El plan gratuito de Cloudflare Workers da 100.000 solicitudes
al día y no pide tarjeta. Cada compra usa una sola solicitud.

## Cómo funciona

1. El checkout crea el pedido en Firestore. Las reglas validan los precios
   contra el catálogo.
2. El checkout le pide la firma a este servicio y le envía la referencia y la
   sesión de la clienta.
3. El servicio lee el pedido **con la sesión de la clienta**: Firestore solo
   deja leerlo a su dueña o al staff. Así no hace falta guardar aquí ninguna
   credencial de Firebase.
4. El servicio firma el **total guardado en la base de datos**, nunca un monto
   enviado por el navegador, y solo si el pedido sigue `pendiente`.

## Instalación (una sola vez, ~10 minutos)

1. Crea una cuenta gratuita en https://dash.cloudflare.com/sign-up. No pide
   tarjeta.
2. Desde esta carpeta, inicia sesión (se abre el navegador):
   ```
   cd firma-wompi
   npx wrangler login
   ```
3. Publica el servicio:
   ```
   npx wrangler deploy
   ```
   Al final muestra la URL, algo como
   `https://aura-firma-wompi.<tu-cuenta>.workers.dev`.
4. Carga el secreto de integridad (te lo pide por consola, no queda en ningún
   archivo):
   ```
   npx wrangler secret put WOMPI_INTEGRITY_SECRET
   ```
   Lo encuentras en el panel de Wompi → **Desarrolladores → Secretos para
   integración técnica → Integridad**. En modo pruebas empieza por
   `test_integrity_`; en producción, por `prod_integrity_`.
5. En el `.env.local` de la tienda (carpeta raíz) agrega la URL del paso 3:
   ```
   NEXT_PUBLIC_WOMPI_FIRMA_URL=https://aura-firma-wompi.<tu-cuenta>.workers.dev
   ```
6. Recompila y publica la tienda:
   ```
   cd ..
   npm run build
   npx firebase-tools deploy --only hosting
   ```

Mientras falte el paso 5, el checkout no intenta pagar: le dice a la clienta
que los pagos en línea todavía no están habilitados.

## Al pasar a producción

Al cambiar la llave pública de Wompi en `src/lib/wompi.ts` por la de
producción, vuelve a correr el paso 4 con el secreto `prod_integrity_...`.
Llave y secreto tienen que ser del mismo ambiente.

## Recomendado después de publicar

En `firebase.json`, la política de seguridad (`connect-src`) permite
`https://*.workers.dev` porque la URL exacta no se conoce hasta publicar.
Cámbialo por tu URL exacta (la del paso 3) y vuelve a publicar la tienda.

## Pruebas

- `npm run test` (desde la raíz) corre las pruebas del servicio. Una de ellas
  reproduce el ejemplo oficial de la documentación de Wompi.
- Para probarlo en local: crea `firma-wompi/.dev.vars` con
  `WOMPI_INTEGRITY_SECRET=test_integrity_...` (ya está en `.gitignore`) y corre
  `npx wrangler dev`.
