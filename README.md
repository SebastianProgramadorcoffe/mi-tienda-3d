# Aura & Esencia

Tienda virtual de cosméticos (Yanbal, Ésika, Avon, Natura) con roles de
cliente/empleado/administrador, visualización 3D de producto, favoritos,
checkout con Wompi y panel de analíticas. Sitio 100% estático (Next.js
`output: "export"`), pensado para desplegarse en Firebase Hosting con
presupuesto $0.

## Stack

- **Next.js 16** (App Router, export estático — sin servidor Node en producción).
- **Firebase**: Auth (email/contraseña + Google) y Firestore (productos, pedidos, usuarios, suscriptores).
- **Cloudinary**: almacenamiento de imágenes y modelos 3D (`.glb`/`.gltf`), subida directa desde el navegador con *unsigned upload preset*. Se usa en vez de Firebase Storage porque este último exige plan Blaze (tarjeta) incluso dentro del tier gratis.
- **Wompi**: pasarela de pagos (Colombia).
- **`<model-viewer>`**: visor 3D con soporte de AR, cargado solo en la ficha de producto.
- **Framer Motion / Tailwind**: UI y animaciones.

No hay backend propio: todo corre en el cliente hablando directo con Firebase/Cloudinary/Wompi. Esto es intencional (mantiene el proyecto en planes gratuitos), pero significa que **todas las reglas de seguridad viven en `firestore.rules`**, no en código de servidor.

## Requisitos y variables de entorno

Crea un archivo `.env.local` en la raíz (no se versiona) con:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=...

NEXT_PUBLIC_WOMPI_FIRMA_URL=...   # URL del servicio de firma (ver firma-wompi/README.md)
```

- Credenciales de Firebase: Firebase Console → Configuración del proyecto → "Tus apps".
- Cloudinary: cloudinary.com → Dashboard (cloud name) → Settings → Upload → Upload presets (crea uno en modo **Unsigned**). Ninguno de los dos valores es secreto — están pensados para vivir en el cliente.
- Llave pública de Wompi: hardcodeada en `src/lib/wompi.ts` (hoy una llave de prueba `pub_test_...`; cámbiala por la de producción cuando tengas cuenta real de Wompi).

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # genera ./out (export estático)
npm run lint
npm run test         # pruebas unitarias
npm run test:rules   # pruebas de firestore.rules contra el emulador local (requiere Java 21+)
```

`test:rules` usa un proyecto `demo-` aislado: nunca toca la base de datos real. Correrlo antes de desplegar cualquier cambio en `firestore.rules`.

## Firebase: reglas y roles

Las reglas de Firestore (`firestore.rules`) implementan el control de acceso por rol
(`cliente` | `empleado` | `admin`, guardado en `usuarios/{uid}.rol`). Desplegar con:

```bash
npx firebase-tools login
npx firebase-tools deploy --only firestore:rules
npx firebase-tools deploy --only firestore:indexes   # solo si cambiaron firestore.indexes.json
```

**No existen Cloud Functions ni custom claims** (para no requerir plan Blaze). Esto implica un paso manual único: el primer administrador se asigna a mano. Después de registrarte una vez en la app:

1. Firebase Console → Firestore Database → colección `usuarios` → busca tu documento (tu UID).
2. Cambia el campo `rol` de `"cliente"` a `"admin"`.

Desde ahí, ese admin puede promover a otros usuarios desde `/admin/usuarios`.

## Estructura de datos (Firestore)

- `usuarios/{uid}` — perfil + rol. Se crea automáticamente al iniciar sesión (email o Google).
- `productos/{id}` — catálogo. Incluye `imagen` (portada), `imagenes[]` (galería), `modelo3d?`, `genero` (`dama`/`caballero`/`unisex`), `stock`, `activo`.
- `pedidos/{referencia}` — un pedido por compra, ID = referencia de Wompi. `estado`: `pendiente` → `pagado`/`fallido`/`cancelado`. Las reglas validan cada línea contra el precio vigente en `productos` (máximo 8 productos distintos por pedido) y que el total sea la suma exacta.
  - **El cliente nunca puede marcar su pedido como `pagado`** (la verificación en su navegador se puede saltar). Si Wompi le aprueba el pago, `/checkout/confirmacion` guarda `verificacionCliente` y el pedido queda `pendiente`.
  - **El staff confirma el pago** en `/admin/pedidos` con el botón "Verificar pago en Wompi": consulta a Wompi desde el navegador del staff, comprueba referencia y monto, y solo entonces marca `pagado`. No despachar pedidos que sigan en `pendiente`.
- `suscriptores/{email}` — newsletter (footer del sitio).

## Funcionalidades

- Catálogo con filtro de género (Dama/Caballero), categoría, búsqueda y orden.
- Ficha de producto con galería de fotos + visor 3D (si el producto tiene modelo `.glb`/`.gltf`).
- Favoritos (persistidos en el navegador, sin necesidad de cuenta).
- Carrito + checkout con Wompi, pedido registrado en Firestore antes de redirigir a pagar.
- Cuenta de cliente (`/cuenta`) con historial de pedidos.
- Panel `/admin` (admin + empleado): CRUD de productos con subida de imágenes/modelo 3D, gestión de pedidos.
- Solo `admin`: gestión de roles de usuarios (`/admin/usuarios`) y **analíticas** (`/admin/analiticas`) — ingresos, ticket promedio, ventas de los últimos 14 días, productos más vendidos y alertas de stock bajo/agotado.
- Footer con newsletter funcional y páginas legales (`/politica-de-privacidad`, `/terminos-y-condiciones`) con checkbox de consentimiento en registro y checkout (Ley 1581 de 2012 — Habeas Data, Colombia).

## Qué falta para operar con ventas reales

Estado revisado el 2026-09-29. Hoy la tienda está publicada pero **no puede vender en serio**.

**Bloqueantes**

- **Publicar el servicio de firma de Wompi.** Wompi exige una firma de integridad (`signature:integrity`) en cada pago. La tienda ya la pide a un Cloudflare Worker gratuito (`firma-wompi/`), pero ese servicio hay que publicarlo una vez y configurar `NEXT_PUBLIC_WOMPI_FIRMA_URL`; los pasos están en [`firma-wompi/README.md`](firma-wompi/README.md). Mientras no esté publicado, el checkout le dice a la clienta que los pagos en línea no están habilitados.
- **Llave de producción de Wompi.** Hoy `src/lib/wompi.ts` usa una llave de pruebas (`pub_test_...`).
- **WhatsApp de ejemplo.** `src/lib/whatsapp.ts` tiene `573001234567`, así que los botones de contacto llevan a un número que no es de la tienda.
- **Páginas legales incompletas.** Falta la razón social/NIT, y el aviso "plantilla pendiente de revisión legal" se ve en el sitio público. Además, el correo `contacto@auraesencia.com` es de un dominio cuya titularidad no está confirmada. Estas páginas son una plantilla, no asesoría jurídica: debe revisarlas un abogado.

**Operación manual (funciona, pero depende del staff)**

- **Pagos.** Cada pedido pagado queda `pendiente` hasta que el staff pulse "Verificar pago en Wompi" en `/admin/pedidos`.
- **Stock.** No se descuenta al vender; ningún punto del flujo de compra lo toca. Hay que ajustarlo a mano después de cada venta.
- **Envío.** En el checkout aparece "A calcular", pero no se cobra en ningún momento. Hay que definir cómo se cobra.
- **Avisos.** No hay notificaciones: la clienta no recibe correo y la tienda no recibe aviso de pedidos nuevos.

**Recomendado**

- Sin respaldos programados de Firestore ni monitoreo de errores.
- Los favoritos son solo locales al navegador; no se sincronizan entre dispositivos.
- Sin Cloud Functions. Cualquier cosa que requiera servidor (la firma de Wompi, un webhook de pagos, correos) necesita el plan Blaze de Firebase o un servicio externo.
