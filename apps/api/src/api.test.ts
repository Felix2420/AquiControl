import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { crearApp } from "./app";
import { conectar, type Conexion } from "./db/client";
import { granja_miembros, user } from "./db/schema";

let conn: Conexion;
let app: ReturnType<typeof crearApp>;

// La sesión se simula con la cabecera x-test-user (el id del usuario).
const resolverSesion = async (c: { req: { header: (n: string) => string | undefined } }) => {
  const id = c.req.header("x-test-user");
  return id ? { id, name: id, email: `${id}@test.dev` } : null;
};

const llamar = (como: string | null, metodo: string, ruta: string, cuerpo?: unknown) =>
  app.request(ruta, {
    method: metodo,
    headers: { "content-type": "application/json", ...(como ? { "x-test-user": como } : {}) },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
  });

beforeAll(async () => {
  conn = await conectar({ memoria: true });
  app = crearApp({ db: conn.db, resolverSesion: resolverSesion as never });
  const ahora = new Date();
  await conn.db.insert(user).values(
    ["ana", "beto", "carla", "dana"].map((id) => ({
      id,
      name: id,
      email: `${id}@test.dev`,
      createdAt: ahora,
      updatedAt: ahora,
    })),
  );
});
afterAll(async () => conn.cerrar());

describe("flujo completo", () => {
  let granjaId: number;
  let estanqueId: number;

  it("rechaza sin sesión", async () => {
    expect((await llamar(null, "GET", "/api/granjas")).status).toBe(401);
  });

  it("crea granja y el creador queda como admin", async () => {
    const r = await llamar("ana", "POST", "/api/granjas", { nombre: "Norte", hectareas_totales: 10 });
    expect(r.status).toBe(201);
    const g = await r.json();
    expect(g.rol).toBe("admin");
    granjaId = g.id;
  });

  it("valida con 422 como FastAPI", async () => {
    const r = await llamar("ana", "POST", "/api/granjas", { nombre: "X", hectareas_totales: 0 });
    expect(r.status).toBe(422);
    expect((await r.json()).detail).toBeDefined();
  });

  it("crea estanque y rechaza identificador duplicado con 409", async () => {
    const cuerpo = {
      granja_id: granjaId,
      identificador_estanque: "E1",
      hectareas: 1,
      densidad_siembra: 20,
      fecha_siembra: "2026-06-01",
    };
    const r = await llamar("ana", "POST", "/api/estanques", cuerpo);
    expect(r.status).toBe(201);
    estanqueId = (await r.json()).id;
    expect((await llamar("ana", "POST", "/api/estanques", cuerpo)).status).toBe(409);
  });

  it("recomendación sin biometría → 422", async () => {
    const r = await llamar("ana", "POST", `/api/estanques/${estanqueId}/dosis/recomendacion`, {});
    expect(r.status).toBe(422);
  });

  it("recomienda con la última biometría y las lecturas, sin persistir", async () => {
    await llamar("ana", "POST", `/api/estanques/${estanqueId}/biometria`, { fecha: "2026-09-14", peso_promedio_g: 12.5 });
    await llamar("ana", "POST", `/api/estanques/${estanqueId}/charolas`, {
      fecha: "2026-09-15",
      hora_toma: "mañana",
      porcentaje_sobrante: 18,
    });
    const r = await llamar("ana", "POST", `/api/estanques/${estanqueId}/dosis/recomendacion`);
    expect(r.status).toBe(200);
    const d = await r.json();
    expect(d.factor_ajuste_total).toBeCloseTo(0.9);
    expect(d.justificacion).toContain("18% de sobrante");

    const hist = await (await llamar("ana", "GET", `/api/estanques/${estanqueId}/alimentacion`)).json();
    expect(hist).toHaveLength(0); // el preview no persiste
  });

  it("los overrides del body tienen prioridad sobre las lecturas guardadas", async () => {
    const r = await llamar("ana", "POST", `/api/estanques/${estanqueId}/dosis/recomendacion`, { oxigeno_mg_l: 1.5 });
    const d = await r.json();
    expect(d.dosis_recomendada_kg).toBe(0);
    expect(d.justificacion).toContain("suspendida");
  });

  it("registrar alimentación es idempotente por client_id", async () => {
    const cuerpo = {
      fecha: "2026-09-15",
      dosis_calculada_kg: 10,
      dosis_aplicada_kg: 9.5,
      client_id: "3f2b8a52-1c8e-4d0a-9d0e-0a5f2d3b7c11",
    };
    const a = await llamar("ana", "POST", `/api/estanques/${estanqueId}/alimentacion`, cuerpo);
    const b = await llamar("ana", "POST", `/api/estanques/${estanqueId}/alimentacion`, cuerpo);
    expect(a.status).toBe(201);
    expect(b.status).toBe(200);
    expect((await a.json()).id).toBe((await b.json()).id);
    const hist = await (await llamar("ana", "GET", `/api/estanques/${estanqueId}/alimentacion`)).json();
    expect(hist).toHaveLength(1);
  });
});

describe("autorización multi-granja", () => {
  let granjaId: number;
  let estanqueId: number;

  beforeAll(async () => {
    granjaId = (await (await llamar("ana", "POST", "/api/granjas", { nombre: "Sur", hectareas_totales: 5 })).json()).id;
    estanqueId = (
      await (
        await llamar("ana", "POST", "/api/estanques", {
          granja_id: granjaId,
          identificador_estanque: "S1",
          hectareas: 1,
          densidad_siembra: 15,
          fecha_siembra: "2026-06-01",
        })
      ).json()
    ).id;
    await conn.db.insert(granja_miembros).values([
      { user_id: "beto", granja_id: granjaId, rol: "tecnico" },
      { user_id: "carla", granja_id: granjaId, rol: "biologo" },
    ]);
  });

  it("un usuario ajeno no ve la granja ni sus estanques (404, no 403)", async () => {
    expect((await llamar("dana", "GET", `/api/granjas/${granjaId}`)).status).toBe(404);
    expect((await llamar("dana", "GET", `/api/estanques/${estanqueId}`)).status).toBe(404);
    expect(await (await llamar("dana", "GET", "/api/estanques")).json()).toEqual([]);
    expect(await (await llamar("dana", "GET", "/api/granjas")).json()).toEqual([]);
  });

  it("el técnico captura lecturas pero no registra biometría ni crea estanques", async () => {
    expect(
      (
        await llamar("beto", "POST", `/api/estanques/${estanqueId}/agua`, { fecha: "2026-09-15", temperatura_c: 28 })
      ).status,
    ).toBe(201);
    expect(
      (await llamar("beto", "POST", `/api/estanques/${estanqueId}/biometria`, { fecha: "2026-09-15", peso_promedio_g: 5 })).status,
    ).toBe(403);
    expect(
      (
        await llamar("beto", "POST", "/api/estanques", {
          granja_id: granjaId,
          identificador_estanque: "S2",
          hectareas: 1,
          densidad_siembra: 10,
          fecha_siembra: "2026-06-01",
        })
      ).status,
    ).toBe(403);
  });

  it("el biólogo registra biometría; solo el admin gestiona miembros", async () => {
    expect(
      (await llamar("carla", "POST", `/api/estanques/${estanqueId}/biometria`, { fecha: "2026-09-15", peso_promedio_g: 5 })).status,
    ).toBe(201);
    expect((await llamar("carla", "GET", `/api/granjas/${granjaId}/miembros`)).status).toBe(403);

    const r = await llamar("ana", "PUT", `/api/granjas/${granjaId}/miembros`, { email: "dana@test.dev", rol: "tecnico" });
    expect(r.status).toBe(200);
    expect((await llamar("dana", "GET", `/api/estanques/${estanqueId}`)).status).toBe(200);
  });

  it("el admin no puede quitarse su propio rol", async () => {
    const r = await llamar("ana", "PUT", `/api/granjas/${granjaId}/miembros`, { email: "ana@test.dev", rol: "tecnico" });
    expect(r.status).toBe(422);
  });
});
