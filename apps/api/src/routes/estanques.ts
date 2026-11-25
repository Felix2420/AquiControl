import { desc, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { recomendarDosis } from "@acuicontrol/reglas";
import { cargarEstanque, exigirRolEnGranja, idParam, type Env } from "../access";
import type { Db } from "../db/client";
import {
  alimentacion_diaria,
  estanques,
  lecturas_charolas,
  muestreos_biometria,
  parametros_agua,
} from "../db/schema";
import {
  AguaCreate,
  AlimentacionCreate,
  BiometriaCreate,
  CharolaCreate,
  DosisRecomendacionRequest,
  EstanqueCreate,
  json,
  leerJsonOpcional,
} from "../schemas";
import { granjasDe } from "./granjas";

export function estanquesRoutes(db: Db) {
  const app = new Hono<Env>();

  app.post("/", json(EstanqueCreate), async (c) => {
    const datos = c.req.valid("json");
    await exigirRolEnGranja(db, c.get("usuario").id, datos.granja_id, "biologo", "Granja no encontrada");
    try {
      const [e] = await db.insert(estanques).values(datos).returning();
      return c.json(e, 201);
    } catch (err) {
      if (esViolacionUnica(err)) {
        throw new HTTPException(409, { message: "Ya existe un estanque con ese identificador en la granja" });
      }
      throw err;
    }
  });

  app.get("/", async (c) => {
    const visibles = await granjasDe(db, c.get("usuario").id);
    if (visibles.length === 0) return c.json([]);
    const filtro = c.req.query("granja_id");
    let ids = visibles;
    if (filtro !== undefined) {
      const g = idParam(filtro, "granja_id");
      ids = visibles.includes(g) ? [g] : [];
    }
    if (ids.length === 0) return c.json([]);
    return c.json(await db.select().from(estanques).where(inArray(estanques.granja_id, ids)).orderBy(estanques.id));
  });

  app.get("/:id", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    return c.json(e);
  });

  // ── Biometría ──
  app.post("/:id/biometria", json(BiometriaCreate), async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")), "biologo");
    const [fila] = await db
      .insert(muestreos_biometria)
      .values({ ...c.req.valid("json"), estanque_id: e.id })
      .returning();
    return c.json(fila, 201);
  });

  app.get("/:id/biometria", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    return c.json(
      await db
        .select()
        .from(muestreos_biometria)
        .where(eq(muestreos_biometria.estanque_id, e.id))
        .orderBy(desc(muestreos_biometria.fecha), desc(muestreos_biometria.id)),
    );
  });

  // ── Charolas ──
  app.post("/:id/charolas", json(CharolaCreate), async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    const [fila] = await db
      .insert(lecturas_charolas)
      .values({ ...c.req.valid("json"), estanque_id: e.id })
      .returning();
    return c.json(fila, 201);
  });

  app.get("/:id/charolas", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    return c.json(
      await db
        .select()
        .from(lecturas_charolas)
        .where(eq(lecturas_charolas.estanque_id, e.id))
        .orderBy(desc(lecturas_charolas.fecha), desc(lecturas_charolas.id)),
    );
  });

  // ── Agua ──
  app.post("/:id/agua", json(AguaCreate), async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    const [fila] = await db
      .insert(parametros_agua)
      .values({ ...c.req.valid("json"), estanque_id: e.id })
      .returning();
    return c.json(fila, 201);
  });

  app.get("/:id/agua", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    return c.json(
      await db
        .select()
        .from(parametros_agua)
        .where(eq(parametros_agua.estanque_id, e.id))
        .orderBy(desc(parametros_agua.fecha), desc(parametros_agua.id)),
    );
  });

  // ── Dosis: preview que NO persiste ──
  app.post("/:id/dosis/recomendacion", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    const overrides = await leerJsonOpcional(c.req.raw, DosisRecomendacionRequest);

    const [biometria] = await db
      .select()
      .from(muestreos_biometria)
      .where(eq(muestreos_biometria.estanque_id, e.id))
      .orderBy(desc(muestreos_biometria.fecha), desc(muestreos_biometria.id))
      .limit(1);
    if (!biometria) {
      return c.json({ detail: "No hay muestreos de biometría registrados para este estanque" }, 422);
    }

    const [charola] = await db
      .select()
      .from(lecturas_charolas)
      .where(eq(lecturas_charolas.estanque_id, e.id))
      .orderBy(desc(lecturas_charolas.fecha), desc(lecturas_charolas.id))
      .limit(1);
    const [agua] = await db
      .select()
      .from(parametros_agua)
      .where(eq(parametros_agua.estanque_id, e.id))
      .orderBy(desc(parametros_agua.fecha), desc(parametros_agua.id))
      .limit(1);

    const r = recomendarDosis({
      densidadSiembra: e.densidad_siembra,
      hectareas: e.hectareas,
      pesoPromedioG: biometria.peso_promedio_g,
      // `||` como el `or` de Python: un 0 o null cae al valor por defecto.
      supervivenciaEstimada: overrides.supervivencia_estimada || undefined,
      porcentajeSobranteCharola: overrides.porcentaje_sobrante_charola ?? charola?.porcentaje_sobrante ?? null,
      temperaturaC: overrides.temperatura_c ?? agua?.temperatura_c ?? null,
      oxigenoMgL: overrides.oxigeno_mg_l ?? agua?.oxigeno_mg_l ?? null,
    });

    return c.json({
      dosis_recomendada_kg: r.dosisRecomendadaKg,
      biomasa_estimada_kg: r.biomasaEstimadaKg,
      tasa_base_pct: r.tasaBasePct,
      factor_ajuste_total: r.factorAjusteTotal,
      fca_estimado: r.fcaEstimado,
      justificacion: r.justificacion,
    });
  });

  // ── Alimentación: confirma y persiste (idempotente por client_id) ──
  app.post("/:id/alimentacion", json(AlimentacionCreate), async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    const datos = c.req.valid("json");

    const [nuevo] = await db
      .insert(alimentacion_diaria)
      .values({ ...datos, estanque_id: e.id })
      .onConflictDoNothing({ target: alimentacion_diaria.client_id })
      .returning();
    if (nuevo) return c.json(nuevo, 201);

    // Reenvío de la cola offline: ya existía, se devuelve el registro original.
    const [existente] = await db
      .select()
      .from(alimentacion_diaria)
      .where(eq(alimentacion_diaria.client_id, datos.client_id!));
    if (!existente || existente.estanque_id !== e.id) {
      throw new HTTPException(409, { message: "client_id ya usado en otro estanque" });
    }
    return c.json(existente, 200);
  });

  app.get("/:id/alimentacion", async (c) => {
    const e = await cargarEstanque(db, c.get("usuario").id, idParam(c.req.param("id")));
    return c.json(
      await db
        .select()
        .from(alimentacion_diaria)
        .where(eq(alimentacion_diaria.estanque_id, e.id))
        .orderBy(desc(alimentacion_diaria.fecha), desc(alimentacion_diaria.id)),
    );
  });

  return app;
}

function esViolacionUnica(err: unknown): boolean {
  const e = err as { code?: string; cause?: { code?: string } };
  return e?.code === "23505" || e?.cause?.code === "23505";
}
