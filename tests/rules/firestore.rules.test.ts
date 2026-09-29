import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

let env: RulesTestEnvironment;

const PRODUCTOS = {
  labial: { nombre: "Labial", precio: 10000, activo: true },
  // Productos viejos pueden no tener el campo "activo": deben seguir vendiéndose.
  perfume: { nombre: "Perfume", precio: 25000 },
  descontinuado: { nombre: "Descontinuado", precio: 5000, activo: false },
};

function linea(productoId: keyof typeof PRODUCTOS | string, cantidad = 1, precio?: number) {
  const p = PRODUCTOS[productoId as keyof typeof PRODUCTOS];
  return { productoId, nombre: p?.nombre ?? "X", precio: precio ?? p?.precio ?? 1, cantidad, imagen: "/x.jpg" };
}

function pedido(userId: string, items: ReturnType<typeof linea>[], extra: Record<string, unknown> = {}) {
  return {
    referencia: "AURA-TEST",
    userId,
    itemsSnapshot: items,
    total: items.reduce((acc, i) => acc + i.precio * i.cantidad, 0),
    envio: { nombre: "Ana", email: "ana@test.co", telefono: "300", direccion: "Calle 1", ciudad: "Cali" },
    aceptoTerminos: true,
    estado: "pendiente",
    ...extra,
  };
}

const como = (uid: string) => env.authenticatedContext(uid).firestore();
const anonimo = () => env.unauthenticatedContext().firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-aura-reglas",
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "usuarios/admin"), { uid: "admin", rol: "admin", email: "admin@t.co" });
    await setDoc(doc(db, "usuarios/empleado"), { uid: "empleado", rol: "empleado", email: "emp@t.co" });
    await setDoc(doc(db, "usuarios/cliente"), { uid: "cliente", rol: "cliente", email: "cli@t.co" });
    await setDoc(doc(db, "usuarios/otro"), { uid: "otro", rol: "cliente", email: "otro@t.co" });
    for (const [id, data] of Object.entries(PRODUCTOS)) await setDoc(doc(db, "productos", id), data);
    await setDoc(doc(db, "pedidos/PEND"), { ...pedido("cliente", [linea("labial", 2)]), referencia: "PEND" });
    await setDoc(doc(db, "pedidos/PAGADO"), { ...pedido("cliente", [linea("labial")]), referencia: "PAGADO", estado: "pagado" });
  });
});

describe("pedidos: creación e integridad de precios", () => {
  it("permite un pedido con precios vigentes y total correcto", async () => {
    await assertSucceeds(setDoc(doc(como("cliente"), "pedidos/N1"), pedido("cliente", [linea("labial", 2), linea("perfume")])));
  });

  it("permite un producto antiguo sin campo 'activo'", async () => {
    await assertSucceeds(setDoc(doc(como("cliente"), "pedidos/N2"), pedido("cliente", [linea("perfume")])));
  });

  it("permite exactamente 8 líneas", async () => {
    const items = Array.from({ length: 8 }, () => linea("labial"));
    await assertSucceeds(setDoc(doc(como("cliente"), "pedidos/N3"), pedido("cliente", items)));
  });

  it("rechaza un precio de línea alterado (aunque el total cuadre con él)", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X1"), pedido("cliente", [linea("labial", 1, 100)])));
  });

  it("rechaza un total que no es la suma de las líneas", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X2"), pedido("cliente", [linea("labial")], { total: 1 })));
  });

  it("rechaza productos desactivados", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X3"), pedido("cliente", [linea("descontinuado")])));
  });

  it("rechaza productos que no existen", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X4"), pedido("cliente", [linea("inventado", 1, 1)])));
  });

  it("rechaza más de 8 líneas", async () => {
    const items = Array.from({ length: 9 }, () => linea("labial"));
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X5"), pedido("cliente", items)));
  });

  it("rechaza cantidades inválidas (0, fraccionarias o > 50)", async () => {
    const db = como("cliente");
    await assertFails(setDoc(doc(db, "pedidos/X6"), pedido("cliente", [linea("labial", 0)])));
    await assertFails(setDoc(doc(db, "pedidos/X7"), pedido("cliente", [linea("labial", 1.5)])));
    await assertFails(setDoc(doc(db, "pedidos/X8"), pedido("cliente", [linea("labial", 51)])));
  });

  it("rechaza un pedido vacío", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X9"), pedido("cliente", [])));
  });

  it("rechaza crear un pedido ya pagado", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X10"), pedido("cliente", [linea("labial")], { estado: "pagado" })));
  });

  it("rechaza crear un pedido con verificacionCliente de antemano", async () => {
    const extra = { verificacionCliente: { transaccionId: "t", estadoWompi: "APPROVED", montoCentavos: 1000000 } };
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X11"), pedido("cliente", [linea("labial")], extra)));
  });

  it("rechaza crear un pedido a nombre de otro usuario", async () => {
    await assertFails(setDoc(doc(como("cliente"), "pedidos/X12"), pedido("otro", [linea("labial")])));
  });

  it("rechaza crear pedidos sin sesión", async () => {
    await assertFails(setDoc(doc(anonimo(), "pedidos/X13"), pedido("cliente", [linea("labial")])));
  });
});

describe("pedidos: el cliente nunca se marca como pagado", () => {
  it("rechaza que el dueño pase su pedido a 'pagado'", async () => {
    await assertFails(
      updateDoc(doc(como("cliente"), "pedidos/PEND"), { estado: "pagado", wompiTransactionId: "t", updatedAt: serverTimestamp() }),
    );
  });

  it("permite dejar verificacionCliente sin cambiar el estado", async () => {
    await assertSucceeds(
      updateDoc(doc(como("cliente"), "pedidos/PEND"), {
        verificacionCliente: { transaccionId: "t", estadoWompi: "APPROVED", montoCentavos: 2000000 },
        updatedAt: serverTimestamp(),
      }),
    );
  });

  it("rechaza aprovechar verificacionCliente para cambiar el total", async () => {
    await assertFails(
      updateDoc(doc(como("cliente"), "pedidos/PEND"), {
        verificacionCliente: { transaccionId: "t", estadoWompi: "APPROVED", montoCentavos: 100 },
        total: 1,
      }),
    );
  });

  it("permite que el dueño marque su pedido como fallido o cancelado", async () => {
    await assertSucceeds(updateDoc(doc(como("cliente"), "pedidos/PEND"), { estado: "fallido", wompiTransactionId: "t" }));
  });

  it("rechaza que el dueño modifique un pedido que ya no está pendiente", async () => {
    await assertFails(updateDoc(doc(como("cliente"), "pedidos/PAGADO"), { estado: "cancelado" }));
  });

  it("rechaza que otro cliente toque el pedido", async () => {
    await assertFails(updateDoc(doc(como("otro"), "pedidos/PEND"), { estado: "cancelado" }));
  });

  it("permite que el staff marque el pedido como pagado", async () => {
    await assertSucceeds(updateDoc(doc(como("empleado"), "pedidos/PEND"), { estado: "pagado", updatedAt: serverTimestamp() }));
  });

  it("nadie puede borrar pedidos, ni el admin", async () => {
    await assertFails(deleteDoc(doc(como("admin"), "pedidos/PEND")));
  });
});

describe("pedidos: lectura", () => {
  it("el dueño lee su pedido; otro cliente no", async () => {
    await assertSucceeds(getDoc(doc(como("cliente"), "pedidos/PEND")));
    await assertFails(getDoc(doc(como("otro"), "pedidos/PEND")));
  });

  it("un cliente solo puede listar filtrando por su propio userId", async () => {
    await assertSucceeds(getDocs(query(collection(como("cliente"), "pedidos"), where("userId", "==", "cliente"))));
    await assertFails(getDocs(collection(como("cliente"), "pedidos")));
    await assertFails(getDocs(query(collection(como("otro"), "pedidos"), where("userId", "==", "cliente"))));
  });

  it("el staff lista todos los pedidos", async () => {
    await assertSucceeds(getDocs(collection(como("empleado"), "pedidos")));
  });
});

describe("usuarios: roles", () => {
  it("un usuario nuevo solo puede crearse como cliente", async () => {
    await assertSucceeds(setDoc(doc(como("nuevo"), "usuarios/nuevo"), { uid: "nuevo", rol: "cliente" }));
    await assertFails(setDoc(doc(como("nuevo2"), "usuarios/nuevo2"), { uid: "nuevo2", rol: "admin" }));
  });

  it("rechaza que el usuario cambie el campo uid de su perfil", async () => {
    await assertFails(updateDoc(doc(como("cliente"), "usuarios/cliente"), { uid: "otro" }));
  });

  it("permite editar su perfil sin tocar uid ni rol", async () => {
    await assertSucceeds(updateDoc(doc(como("cliente"), "usuarios/cliente"), { displayName: "Ana" }));
  });

  it("rechaza que el usuario se cambie el rol", async () => {
    await assertFails(updateDoc(doc(como("cliente"), "usuarios/cliente"), { rol: "admin" }));
  });

  it("solo el admin cambia roles de otros", async () => {
    await assertSucceeds(updateDoc(doc(como("admin"), "usuarios/cliente"), { rol: "empleado" }));
    await assertFails(updateDoc(doc(como("empleado"), "usuarios/otro"), { rol: "empleado" }));
  });

  it("un cliente no puede leer el perfil de otro", async () => {
    await assertFails(getDoc(doc(como("cliente"), "usuarios/otro")));
  });
});

describe("productos", () => {
  it("lectura pública, escritura solo staff", async () => {
    await assertSucceeds(getDoc(doc(anonimo(), "productos/labial")));
    await assertFails(updateDoc(doc(como("cliente"), "productos/labial"), { precio: 1 }));
    await assertSucceeds(updateDoc(doc(como("empleado"), "productos/labial"), { precio: 12000 }));
  });
});

describe("suscriptores", () => {
  it("un visitante se suscribe con su email y consentimiento", async () => {
    await assertSucceeds(setDoc(doc(anonimo(), "suscriptores/a@b.co"), { email: "a@b.co", aceptoTerminos: true }));
  });

  it("rechaza email distinto al id o sin consentimiento", async () => {
    await assertFails(setDoc(doc(anonimo(), "suscriptores/a@b.co"), { email: "x@b.co", aceptoTerminos: true }));
    await assertFails(setDoc(doc(anonimo(), "suscriptores/c@b.co"), { email: "c@b.co", aceptoTerminos: false }));
  });

  it("solo el staff lista la base de correos", async () => {
    await assertFails(getDocs(collection(anonimo(), "suscriptores")));
    await assertFails(getDocs(collection(como("cliente"), "suscriptores")));
    await assertSucceeds(getDocs(collection(como("empleado"), "suscriptores")));
  });
});
