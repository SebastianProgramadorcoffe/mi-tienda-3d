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

export default function PaginaTerminos() {
  return (
    <>
      <Navbar />
      <CarritoDrawer />
      <main className="min-h-screen" style={{ background: "#080510", paddingTop: "100px" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400&family=DM+Sans:wght@300;400;500&display=swap');`}</style>

        <div className="mx-auto px-6 py-16" style={{ maxWidth: "720px" }}>
          <h1 className="text-white text-3xl mb-2" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 300 }}>
            Términos y <span style={{ color: "rgba(255,210,225,0.9)", fontStyle: "italic" }}>Condiciones</span>
          </h1>
          <p className="text-white/25 text-xs uppercase tracking-widest mb-12">
            Vigente desde [completa la fecha de publicación]
          </p>

          <div
            className="mb-10 p-4 rounded-xl text-xs leading-relaxed"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)", color: "rgba(253,230,138,0.9)" }}
          >
            ⚠ Plantilla base pendiente de revisión legal. Antes de publicar, completa los datos de
            [Razón social / NIT] y confírmalos con un abogado — esta página no reemplaza asesoría jurídica.
          </div>

          <Seccion titulo="1. Objeto">
            <p>
              Estos términos regulan el uso del sitio web de <strong>Aura & Esencia</strong> y la compra
              de productos de cosmética y cuidado personal ofrecidos a través de esta plataforma.
              Al usar el sitio o realizar una compra, aceptas estos términos.
            </p>
          </Seccion>

          <Seccion titulo="2. Cuenta de usuario">
            <p>
              Para comprar necesitas crear una cuenta con correo y contraseña, o iniciar sesión con
              Google. Eres responsable de mantener la confidencialidad de tu contraseña y de toda
              actividad realizada desde tu cuenta.
            </p>
          </Seccion>

          <Seccion titulo="3. Precios y disponibilidad">
            <p>
              Los precios se muestran en pesos colombianos (COP) e incluyen los impuestos aplicables,
              salvo que se indique lo contrario. Pueden cambiar sin previo aviso. La disponibilidad de
              stock se muestra de forma referencial y puede variar.
            </p>
          </Seccion>

          <Seccion titulo="4. Pago">
            <p>
              Los pagos se procesan a través de <strong>Wompi</strong>, aceptando tarjetas débito/crédito,
              PSE y Nequi. Aura & Esencia no almacena datos de tarjetas; esa información es gestionada
              directamente por la pasarela de pago.
            </p>
          </Seccion>

          <Seccion titulo="5. Envíos">
            <p>
              Los tiempos y costos de envío se confirman durante el proceso de compra o después de
              realizado el pedido. [Completa aquí tu política real: ciudades de cobertura, tiempos
              estimados y costo de envío.]
            </p>
          </Seccion>

          <Seccion titulo="6. Derecho de retracto y devoluciones">
            <p>
              De acuerdo con el artículo 47 de la Ley 1480 de 2011 (Estatuto del Consumidor), tienes
              derecho a retractarte de tu compra dentro de los <strong>5 días hábiles</strong> siguientes
              a la entrega del producto, siempre que este no haya sido usado y conserve su empaque
              original. Para solicitarlo, escríbenos a{" "}
              <a href="mailto:contacto@auraesencia.com" className="underline text-rose-300/70">contacto@auraesencia.com</a>.
            </p>
            <p>
              Aplican también las garantías legales mínimas establecidas por el Estatuto del
              Consumidor frente a productos defectuosos.
            </p>
          </Seccion>

          <Seccion titulo="7. Propiedad intelectual">
            <p>
              El contenido de este sitio (textos, imágenes, marca y diseño) es propiedad de Aura
              Esencia o de sus respectivos titulares, y no puede reproducirse sin autorización.
            </p>
          </Seccion>

          <Seccion titulo="8. Tratamiento de datos personales">
            <p>
              El uso de tus datos personales se rige por nuestra{" "}
              <a href="/politica-de-privacidad" className="underline text-rose-300/70">Política de Tratamiento de Datos</a>.
            </p>
          </Seccion>

          <Seccion titulo="9. Ley aplicable">
            <p>
              Estos términos se rigen por las leyes de la República de Colombia. Cualquier
              controversia se someterá a los jueces competentes de Colombia.
            </p>
          </Seccion>

          <Seccion titulo="10. Cambios a estos términos">
            <p>
              Podemos actualizar estos términos en cualquier momento. Los cambios se publicarán en
              esta misma página con su nueva fecha de vigencia.
            </p>
          </Seccion>
        </div>
      </main>
      <Footer />
    </>
  );
}
