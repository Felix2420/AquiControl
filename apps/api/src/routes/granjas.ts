import { and, eq, inArray } from "drizzle-orm";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { exigirRolEnGranja, idParam, type Env } from "../access";
import type { Db } from "../db/client";
import {
  alimentacion_diaria,
  estanques,
  granja_miembros,
  granjas,
  lecturas_charolas,
  muestreos_biometria,
  parametros_agua,
  user,
} from "../db/schema";
import { GranjaCreate, MiembroUpsert, json } from "../schemas";

export function granjasRoutes(db: Db) {
  const app = new Hono<Env>();

  // Quien crea la granja queda como admin.
  app.post("/", json(GranjaCreate), async (c) => {
    const datos = c.req.valid("json");
    const u = c.get("usuario");
    const granja = await db.transaction(async (tx) => {
      const [g] = await tx.insert(granjas).values(datos).returning();
      await tx.insert(granja_miembros).values({ user_id: u.id, granja_id: g!.id, rol: "admin" });
      return g!;
    });
    return c.json({ ...granja, rol: "admin" }, 201);
  });

  app.get("/", async (c) => {
    const u = c.get("usuario");
    const filas = await db
      .select({ granja: granjas, rol: granja_miembros.rol })
      .from(granja_miembros)
      .innerJoin(granjas, eq(granjas.id, granja_miembros.granja_id))
      .where(eq(granja_miembros.user_id, u.id))
      .orderBy(granjas.id);
    return c.json(filas.map((f) => ({ ...f.granja, rol: f.rol })));
  });

  app.get("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    const rol = await exigirRolEnGranja(db, c.get("usuario").id, id, "tecnico", "Granja no encontrada");
    const [granja] = await db.select().from(granjas).where(eq(granjas.id, id));
    return c.json({ ...granja, rol });
  });

  // ── Miembros (solo admin) ──
  app.get("/:id/miembros", async (c) => {
    const id = idParam(c.req.param("id"));
    await exigirRolEnGranja(db, c.get("usuario").id, id, "admin", "Granja no encontrada");
    const filas = await db
      .select({ user_id: user.id, nombre: user.name, email: user.email, rol: granja_miembros.rol })
      .from(granja_miembros)
      .innerJoin(user, eq(user.id, granja_miembros.user_id))
      .where(eq(granja_miembros.granja_id, id));
    return c.json(filas);
  });

  // Agrega o cambia el rol de un usuario ya registrado (por email).
  app.put("/:id/miembros", json(MiembroUpsert), async (c) => {
    const id = idParam(c.req.param("id"));
    const actual = c.get("usuario");
    await exigirRolEnGranja(db, actual.id, id, "admin", "Granja no encontrada");
    const { email, rol } = c.req.valid("json");
    const [objetivo] = await db.select().from(user).where(eq(user.email, email.toLowerCase()));
    if (!objetivo) throw new HTTPException(404, { message: "No hay un usuario registrado con ese correo" });
    if (objetivo.id === actual.id && rol !== "admin") {
      throw new HTTPException(422, { message: "No puedes quitarte tu propio rol de admin" });
    }
    await db
      .insert(granja_miembros)
      .values({ user_id: objetivo.id, granja_id: id, rol })
      .onConflictDoUpdate({ target: [granja_miembros.user_id, granja_miembros.granja_id], set: { rol } });
    return c.json({ user_id: objetivo.id, nombre: objetivo.name, email: objetivo.email, rol });
  });

  app.delete("/:id/miembros/:userId", async (c) => {
    const id = idParam(c.req.param("id"));
    const actual = c.get("usuario");
    await exigirRolEnGranja(db, actual.id, id, "admin", "Granja no encontrada");
    const userId = c.req.param("userId");
    if (userId === actual.id) throw new HTTPException(422, { message: "No puedes quitarte a ti mismo" });
    await db.delete(granja_miembros).where(and(eq(granja_miembros.granja_id, id), eq(granja_miembros.user_id, userId)));
    return c.body(null, 204);
  });

  // Elimina la granja con sus estanques, historial y miembros. Solo el admin; es irreversible.
  app.delete("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    await exigirRolEnGranja(db, c.get("usuario").id, id, "admin", "Granja no encontrada");
    await db.transaction(async (tx) => {
      const ests = await tx.select({ id: estanques.id }).from(estanques).where(eq(estanques.granja_id, id));
      const ids = ests.map((e) => e.id);
      if (ids.length > 0) {
        await tx.delete(alimentacion_diaria).where(inArray(alimentacion_diaria.estanque_id, ids));
        await tx.delete(parametros_agua).where(inArray(parametros_agua.estanque_id, ids));
        await tx.delete(lecturas_charolas).where(inArray(lecturas_charolas.estanque_id, ids));
        await tx.delete(muestreos_biometria).where(inArray(muestreos_biometria.estanque_id, ids));
        await tx.delete(estanques).where(eq(estanques.granja_id, id));
      }
      await tx.delete(granja_miembros).where(eq(granja_miembros.granja_id, id));
      await tx.delete(granjas).where(eq(granjas.id, id));
    });
    return c.body(null, 204);
  });

  return app;
}

/** IDs de granjas visibles para un usuario. */
export async function granjasDe(db: Db, usuarioId: string): Promise<number[]> {
  const filas = await db
    .select({ id: granja_miembros.granja_id })
    .from(granja_miembros)
    .where(eq(granja_miembros.user_id, usuarioId));
  return filas.map((f) => f.id);
}
