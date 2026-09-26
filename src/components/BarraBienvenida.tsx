"use client";

const MENSAJES = [
  { texto: "Gracias por elegirnos", icono: "corazon" as const },
  { texto: "Hecho con cariño para vos", icono: "chispa" as const },
  { texto: "Tu belleza, nuestra pasión", icono: "flor" as const },
  { texto: "Miles de clientas felices en toda Colombia", icono: "estrella" as const },
];

function Icono({ tipo }: { tipo: (typeof MENSAJES)[number]["icono"] }) {
  const props = {
    width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (tipo) {
    case "corazon":
      return <svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>;
    case "chispa":
      return <svg {...props}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>;
    case "flor":
      return <svg {...props}><circle cx="12" cy="12" r="2.5" /><path d="M12 2c2 2 2 5 0 7-2-2-2-5 0-7ZM12 22c2-2 2-5 0-7-2 2-2 5 0 7ZM2 12c2-2 5-2 7 0-2 2-5 2-7 0ZM22 12c-2 2-5 2-7 0 2-2 5-2 7 0Z" /></svg>;
    case "estrella":
      return <svg {...props}><path d="m12 2 2.9 6.6 7.1.6-5.4 4.7 1.7 6.9L12 17.3 5.7 20.8l1.7-6.9-5.4-4.7 7.1-.6L12 2Z" /></svg>;
  }
}

export function BarraBienvenida() {
  // Misma técnica que BarraConfianza: se duplica la fila para que la
  // animación pueda recorrer -50% y "reiniciarse" sin que se note el salto.
  const fila = [...MENSAJES, ...MENSAJES];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(90deg, rgba(251,191,36,0.08), rgba(244,63,94,0.10))",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        @keyframes ae-bienvenida-marquee { from { transform: translateX(-50%); } to { transform: translateX(0); } }
        .ae-bienvenida-track { animation: ae-bienvenida-marquee 26s linear infinite; }
      `}</style>
      <div className="flex whitespace-nowrap py-3 ae-bienvenida-track" style={{ width: "max-content" }}>
        {fila.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-6" style={{ color: "rgba(253,164,175,1)" }}>
            <Icono tipo={item.icono} />
            <span className="text-xs font-medium uppercase tracking-wider">{item.texto}</span>
            <span className="ml-6" style={{ color: "rgba(255,255,255,0.15)" }}>|</span>
          </div>
        ))}
      </div>
    </div>
  );
}
