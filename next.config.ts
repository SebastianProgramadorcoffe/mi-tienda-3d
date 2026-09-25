/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",

  // Solo afecta `next dev`: permite abrir el servidor de desarrollo desde
  // la IP de red local (VS Code / navegador embebido a veces usan esta IP
  // en vez de localhost). No tiene efecto en el build de producción.
  allowedDevOrigins: ["192.168.1.32"],

  // Sin servidor de optimización de imágenes (sitio 100% estático), así que
  // next/image usa un loader propio que delega la optimización a Cloudinary
  // (formato/calidad/ancho automáticos) — ver src/lib/cloudinaryImagen.ts.
  images: {
    loader: "custom",
    loaderFile: "./src/lib/cloudinaryImagen.ts",
  },

  typescript: {
    ignoreBuildErrors: false,
  },
};

export default nextConfig;