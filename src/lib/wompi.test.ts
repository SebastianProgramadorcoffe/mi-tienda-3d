import { describe, it, expect, vi, afterEach } from "vitest";
import { obtenerEstadoTransaccion } from "./wompi";

describe("obtenerEstadoTransaccion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mapea APPROVED de Wompi a estado pagado con el monto real", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { status: "APPROVED", amount_in_cents: 150000, reference: "PED-1" },
        }),
      }),
    );

    const resultado = await obtenerEstadoTransaccion("txn-123");

    expect(resultado.estado).toBe("pagado");
    expect(resultado.montoCentavos).toBe(150000);
    expect(resultado.referencia).toBe("PED-1");
  });

  it("mapea un estado desconocido de Wompi a pendiente en vez de fallar", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: "ALGO_NUEVO" } }),
      }),
    );

    const resultado = await obtenerEstadoTransaccion("txn-456");

    expect(resultado.estado).toBe("pendiente");
  });

  it("codifica el id de transacción para que no pueda cambiar la ruta consultada", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: {} }) });
    vi.stubGlobal("fetch", fetchMock);

    await obtenerEstadoTransaccion("../merchants/x");

    expect(fetchMock).toHaveBeenCalledWith(expect.stringMatching(/\/transactions\/\.\.%2Fmerchants%2Fx$/));
  });

  it("lanza un error cuando Wompi responde con un status HTTP no exitoso", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(obtenerEstadoTransaccion("txn-789")).rejects.toThrow(
      "No se pudo verificar la transacción con Wompi.",
    );
  });
});
