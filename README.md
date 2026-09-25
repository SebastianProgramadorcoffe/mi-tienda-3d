# Aura Esencia

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
```

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
- `pedidos/{referencia}` — un pedido por compra, ID = referencia de Wompi. `estado`: `pendiente` → `pagado`/`fallido`/`cancelado` (se actualiza en `/checkout/confirmacion` consultando el estado real a la API de Wompi, nunca confiando en los parámetros de la URL).
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

## Pendiente / decisiones que le corresponden al dueño de la tienda

- **Revisión legal**: las páginas de política de privacidad y términos son una plantilla de buena práctica, no asesoría jurídica — hace falta completar razón social/NIT y que un abogado las revise antes de publicar en serio.
- **Llave de producción de Wompi** (hoy en modo prueba/sandbox).
- **`/registro`**: el menú de usuario (sin sesión) enlaza a `/registro`, que no existe — hoy `/login` ya incluye el flujo de registro; falta decidir si se crea esa ruta aparte o se deja así.
- Favoritos son solo locales al navegador (no sincronizan entre dispositivos); si se quiere eso, hay que moverlos a Firestore.
- Sin Cloud Functions: si más adelante se necesita algo que sí requiera servidor (por ejemplo, confirmar pagos por webhook en vez de al volver del checkout), eso obliga a evaluar el plan Blaze.
