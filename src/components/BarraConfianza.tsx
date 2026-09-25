"use client";

const ITEMS = [
  { texto: "Envíos a nivel nacional", icono: "truck" as const },
  { texto: "Compra fácil y segura", icono: "cart" as const },
  { texto: "Excelente calidad", icono: "badge" as const },
  { texto: "Asesoría personalizada", icono: "headset" as const },
];

function Icono({ tipo }: { tipo: (typeof ITEMS)[number]["icono"] }) {
  const props = {
    width: 16, height: 16, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const,
  };
  switch (tipo) {
    case "truck":
      return <svg {...props}><path d="M10 17h4V5H2v12h3" /><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" /><circle cx="7.5" cy="17.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></svg>;
    case "cart":
      return <svg {...props}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>;
    case "badge":
      return <svg {...props}><circle cx="12" cy="8" r="6" /><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" /></svg>;
    case "headset":
      return <svg {...props}><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><path d="M21 14v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2h3z" /><path d="M3 14v3a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2H3z" /></svg>;
  }
}

export function BarraConfianza() {
  // Se duplica una vez para que la animación pueda recorrer -50% y
  // "reiniciarse" sin que se note el salto (scroll infinito real).
  const fila = [...ITEMS, ...ITEMS];

  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(90deg, rgba(244,63,94,0.10), rgba(251,191,36,0.06))",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        @keyframes ae-marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        .ae-marquee-track { animation: ae-marquee 22s linear infinite; }
      `}</style>
      <div className="flex whitespace-nowrap py-3 ae-marquee-track" style={{ width: "max-content" }}>
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
