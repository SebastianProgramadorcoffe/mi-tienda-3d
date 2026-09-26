import { describe, it, expect } from "vitest";
import { whatsappHref, WHATSAPP_NUMERO } from "./whatsapp";

describe("whatsappHref", () => {
  it("arma el link wa.me con el número de la tienda y el mensaje codificado", () => {
    const href = whatsappHref("Hola, quiero info del perfume X");

    expect(href).toBe(
      `https://wa.me/${WHATSAPP_NUMERO}?text=Hola%2C%20quiero%20info%20del%20perfume%20X`,
    );
  });

  it("codifica caracteres especiales del mensaje (acentos, símbolos)", () => {
    const href = whatsappHref("¿Tienen envío a Medellín?");

    expect(href).toContain(encodeURIComponent("¿Tienen envío a Medellín?"));
  });
});
