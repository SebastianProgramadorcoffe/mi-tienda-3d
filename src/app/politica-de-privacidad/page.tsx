"use client";

import { Navbar } from "../../components/Navbar";
import { CarritoDrawer } from "../../components/CarritoDrawer";
import { Footer } from "../../components/Footer";

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-white text-sm font-semibold uppercase tracking-widest mb-3">{titulo}</h2>
      <div className="text-white/50 text-sm leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

export default function PaginaPoliticaPrivacidad() {
  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-16" style={{ maxWidth: "720px" }}>
          <h1 className="text-white text-3xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            Política de <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>Tratamiento de Datos</span>
          </h1>
          <p className="text-white/25 text-xs uppercase tracking-widest mb-12">
            Vigente desde [completa la fecha de publicación]
          </p>

          <div
            className="mb-10 p-4 rounded-xl text-xs leading-relaxed"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "rgba(253,230,138,0.9)" }}
          >
            ⚠ Plantilla base pendiente de revisión legal. Antes de publicar, completa los datos de
            [Razón social / NIT], [dirección física, si aplica] y haz que un abogado la revise —
            esta página no reemplaza asesoría jurídica.
          </div>

          <Seccion titulo="1. Responsable del tratamiento">
            <p>
              <strong>Aura Esencia</strong> [Razón social / NIT — completa este dato], con correo de
              contacto <a href="mailto:contacto@auraesencia.com" className="underline text-rose-300/70">contacto@auraesencia.com</a>,
              es responsable del tratamiento de los datos personales que recolecta a través de este
              sitio web, en cumplimiento de la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia.
            </p>
          </Seccion>

          <Seccion titulo="2. Datos que recolectamos">
            <p>Recolectamos únicamente los datos necesarios para operar la tienda:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Al crear una cuenta: nombre y correo electrónico (o los datos básicos de tu cuenta de Google si inicias sesión con ella).</li>
              <li>Al hacer un pedido: nombre, correo, teléfono, dirección de envío y ciudad.</li>
              <li>Al suscribirte a novedades: tu correo electrónico.</li>
              <li>Información técnica básica de navegación (por ejemplo, el contenido de tu carrito, guardado localmente en tu navegador).</li>
            </ul>
            <p>No recolectamos datos de tarjetas ni de pago: esos los procesa directamente nuestra pasarela de pagos, Wompi.</p>
          </Seccion>

          <Seccion titulo="3. Finalidad">
            <p>Usamos tus datos para:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Crear y administrar tu cuenta.</li>
              <li>Procesar, confirmar y entregar tus pedidos.</li>
              <li>Responder tus solicitudes de contacto o soporte.</li>
              <li>Enviarte novedades u ofertas, solo si te suscribiste voluntariamente al newsletter.</li>
              <li>Cumplir obligaciones legales y contables.</li>
            </ul>
          </Seccion>

          <Seccion titulo="4. Con quién compartimos tus datos">
            <p>
              Tus datos se almacenan y procesan a través de proveedores tecnológicos que actúan como
              encargados del tratamiento: <strong>Google Firebase</strong> (autenticación y base de
              datos), <strong>Cloudinary</strong> (almacenamiento de imágenes) y <strong>Wompi</strong> (procesamiento de pagos).
              No vendemos ni compartimos tus datos con terceros para fines distintos a la operación de la tienda.
            </p>
          </Seccion>

          <Seccion titulo="5. Tus derechos (Habeas Data)">
            <p>Como titular de tus datos, tienes derecho a:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Conocer, actualizar y rectificar tus datos personales.</li>
              <li>Solicitar prueba de la autorización otorgada.</li>
              <li>Ser informado sobre el uso que se le ha dado a tus datos.</li>
              <li>Revocar tu autorización y/o solicitar la supresión de tus datos, cuando no exista un deber legal de conservarlos.</li>
              <li>Acceder de forma gratuita a tus datos.</li>
            </ul>
            <p>
              Para ejercer cualquiera de estos derechos, escríbenos a{" "}
              <a href="mailto:contacto@auraesencia.com" className="underline text-rose-300/70">contacto@auraesencia.com</a>.
            </p>
          </Seccion>

          <Seccion titulo="6. Seguridad">
            <p>
              Aplicamos controles de acceso: tus datos de pedido y de cuenta solo son visibles para
              ti y para el personal autorizado de la tienda. No almacenamos contraseñas en texto
              plano (las gestiona directamente Google Firebase Authentication).
            </p>
          </Seccion>

          <Seccion titulo="7. Vigencia y cambios">
            <p>
              Esta política puede actualizarse. Los cambios se publicarán en esta misma página con
              su nueva fecha de vigencia.
            </p>
          </Seccion>
        </div>
      </main>
      <Footer />
    </>
  );
}
