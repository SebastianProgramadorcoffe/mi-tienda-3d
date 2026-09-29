// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { calcularFirmaCloudinary, calcularFirmaIntegridad, manejarSolicitud, uidDelToken, type Env } from "./index";

const ORIGEN = "https://tienda-productos-aura-esencia.web.app";
const REF = "AURA-1790708687000-AB12C";
const env: Env = {
  WOMPI_INTEGRITY_SECRET: "test_integrity_secreto",
  FIREBASE_PROJECT_ID: "tienda-productos-aura-esencia",
  ORIGENES_PERMITIDOS: `${ORIGEN},http://localhost:3000`,
};

function solicitud({
  origen = ORIGEN,
  token = "token-clienta",
  cuerpo = { referencia: REF } as unknown,
  metodo = "POST",
  ruta = "/firma",
} = {}) {
  const headers: Record<string, string> = { Origin: origen, "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return new Request(`https://firma.test${ruta}`, {
    method: metodo,
    headers,
    body: metodo === "POST" ? JSON.stringify(cuerpo) : undefined,
  });
}

function firestoreResponde(estado: number, cuerpo: unknown = {}) {
  return vi.fn().mockResolvedValue(new Response(JSON.stringify(cuerpo), { status: estado }));
}

const pedidoPendiente = (total: Record<string, unknown>) => ({
  fields: { estado: { stringValue: "pendiente" }, total },
});

describe("calcularFirmaIntegridad", () => {
  it("reproduce el ejemplo oficial de la documentación de Wompi", async () => {
    const firma = await calcularFirmaIntegridad(
      "sk8-438k4-xmxm392-sn2m",
      2490000,
      "COP",
      "prod_integrity_Z5mMke9x0k8gpErbDqwrJXMqsI6SFli6",
    );
    expect(firma).toBe("37c8407747e595535433ef8f6a811d853cd943046624a0ec04662b17bbf33bf5");
  });
});

describe("manejarSolicitud", () => {
  it("firma el total guardado en Firestore, leyendo el pedido con el token de la clienta", async () => {
    const fetchFn = firestoreResponde(200, pedidoPendiente({ integerValue: "45900" }));

    const res = await manejarSolicitud(solicitud(), env, fetchFn);
    const cuerpo = await res.json();

    expect(res.status).toBe(200);
    expect(cuerpo.montoCentavos).toBe(4590000);
    expect(cuerpo.firma).toBe(await calcularFirmaIntegridad(REF, 4590000, "COP", env.WOMPI_INTEGRITY_SECRET));
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(ORIGEN);
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toBe(
      `https://firestore.googleapis.com/v1/projects/tienda-productos-aura-esencia/databases/(default)/documents/pedidos/${REF}`,
    );
    expect(opciones.headers.Authorization).toBe("Bearer token-clienta");
  });

  it("acepta totales guardados como doubleValue", async () => {
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(200, pedidoPendiente({ doubleValue: 19.99 })));
    expect((await res.json()).montoCentavos).toBe(1999);
  });

  it("nunca revela el secreto en la respuesta", async () => {
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(200, pedidoPendiente({ integerValue: "100" })));
    expect(await res.text()).not.toContain(env.WOMPI_INTEGRITY_SECRET);
  });

  it("responde el preflight CORS de un origen permitido", async () => {
    const res = await manejarSolicitud(solicitud({ metodo: "OPTIONS" }), env, vi.fn());
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("rechaza orígenes no permitidos sin consultar Firestore", async () => {
    const fetchFn = vi.fn();
    const res = await manejarSolicitud(solicitud({ origen: "https://sitio-malicioso.com" }), env, fetchFn);
    expect(res.status).toBe(403);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rechaza solicitudes sin sesión", async () => {
    const res = await manejarSolicitud(solicitud({ token: "" }), env, vi.fn());
    expect(res.status).toBe(401);
  });

  it("rechaza referencias con formato inválido (evita consultar otras rutas de Firestore)", async () => {
    const fetchFn = vi.fn();
    for (const referencia of ["../usuarios/admin", "AURA-1-X/../../y", 123, ""]) {
      const res = await manejarSolicitud(solicitud({ cuerpo: { referencia } }), env, fetchFn);
      expect(res.status).toBe(400);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("rechaza un cuerpo que no es JSON", async () => {
    const req = new Request("https://firma.test/firma", {
      method: "POST",
      headers: { Origin: ORIGEN, Authorization: "Bearer t" },
      body: "no-json",
    });
    expect((await manejarSolicitud(req, env, vi.fn())).status).toBe(400);
  });

  it("no firma pedidos de otra persona (Firestore niega la lectura)", async () => {
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(403));
    expect(res.status).toBe(403);
  });

  it("devuelve 404 si el pedido no existe", async () => {
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(404));
    expect(res.status).toBe(404);
  });

  it("no firma pedidos que ya no están pendientes", async () => {
    const pagado = { fields: { estado: { stringValue: "pagado" }, total: { integerValue: "100" } } };
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(200, pagado));
    expect(res.status).toBe(409);
  });

  it("rechaza totales inválidos", async () => {
    const res = await manejarSolicitud(solicitud(), env, firestoreResponde(200, pedidoPendiente({ integerValue: "0" })));
    expect(res.status).toBe(422);
  });

  it("solo atiende POST /firma", async () => {
    const res = await manejarSolicitud(solicitud({ ruta: "/otra" }), env, vi.fn());
    expect(res.status).toBe(404);
  });
});

describe("firma de Cloudinary", () => {
  const envCloudinary: Env = {
    ...env,
    CLOUDINARY_CLOUD_NAME: "nube-prueba",
    CLOUDINARY_API_KEY: "123456",
    CLOUDINARY_API_SECRET: "secreto-cloudinary",
  };
  // Token con payload {"user_id":"empleado1"} (la firma del token la valida Firestore, no el servicio).
  const tokenDe = (uid: string) => `x.${btoa(JSON.stringify({ user_id: uid })).replace(/=+$/, "")}.y`;
  const perfil = (rol: string) => ({ fields: { rol: { stringValue: rol } } });

  it("reproduce el ejemplo oficial de la documentación de Cloudinary", async () => {
    const firma = await calcularFirmaCloudinary(
      { timestamp: 1315060510, public_id: "sample_image", eager: "w_400,h_300,c_pad|w_260,h_200,c_crop" },
      "abcd",
    );
    expect(firma).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("firma la subida para el staff, leyendo su perfil con su propio token", async () => {
    const fetchFn = firestoreResponde(200, perfil("empleado"));
    const res = await manejarSolicitud(
      solicitud({ ruta: "/firma-cloudinary", token: tokenDe("empleado1") }),
      envCloudinary,
      fetchFn,
    );
    const cuerpo = await res.json();

    expect(res.status).toBe(200);
    expect(cuerpo.apiKey).toBe("123456");
    expect(cuerpo.carpeta).toBe("aura-esencia");
    expect(cuerpo.firma).toBe(
      await calcularFirmaCloudinary({ folder: "aura-esencia", timestamp: cuerpo.timestamp }, "secreto-cloudinary"),
    );
    expect(JSON.stringify(cuerpo)).not.toContain("secreto-cloudinary");
    const [url, opciones] = fetchFn.mock.calls[0];
    expect(url).toMatch(/\/documents\/usuarios\/empleado1$/);
    expect(opciones.headers.Authorization).toBe(`Bearer ${tokenDe("empleado1")}`);
  });

  it("rechaza a una clienta", async () => {
    const res = await manejarSolicitud(
      solicitud({ ruta: "/firma-cloudinary", token: tokenDe("cliente1") }),
      envCloudinary,
      firestoreResponde(200, perfil("cliente")),
    );
    expect(res.status).toBe(403);
  });

  it("rechaza si Firestore niega leer el perfil (token falso o uid ajeno)", async () => {
    const res = await manejarSolicitud(
      solicitud({ ruta: "/firma-cloudinary", token: tokenDe("admin1") }),
      envCloudinary,
      firestoreResponde(403),
    );
    expect(res.status).toBe(403);
  });

  it("rechaza tokens ilegibles o con uid inválido sin consultar Firestore", async () => {
    const fetchFn = vi.fn();
    for (const token of ["basura", tokenDe("../pedidos/x")]) {
      const res = await manejarSolicitud(solicitud({ ruta: "/firma-cloudinary", token }), envCloudinary, fetchFn);
      expect(res.status).toBe(401);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("responde 503 si Cloudinary no está configurado en el servicio", async () => {
    const res = await manejarSolicitud(solicitud({ ruta: "/firma-cloudinary" }), env, vi.fn());
    expect(res.status).toBe(503);
  });

  it("uidDelToken lee user_id del payload", () => {
    expect(uidDelToken(tokenDe("abc123"))).toBe("abc123");
    expect(uidDelToken("sin-puntos")).toBeNull();
  });
});
