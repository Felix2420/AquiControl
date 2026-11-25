// Autorización por granja. Un usuario solo ve las granjas donde es miembro; el rol decide qué puede hacer.
import { and, eq } from "drizzle-orm";
import type { Context, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Db } from "./db/client";
import { estanques, granja_miembros } from "./db/schema";

export type Rol = "admin" | "biologo" | "tecnico";
const RANGO: Record<Rol, number> = { tecnico: 1, biologo: 2, admin: 3 };

export interface UsuarioSesion {
  id: string;
  name: string;
  email: string;
}

export interface Env {
  Variables: { usuario: UsuarioSesion; db: Db };
}

/** Resuelve la sesión actual (inyectado para poder sustituirlo en tests). */
export type ResolverSesion = (c: Context<Env>) => Promise<UsuarioSesion | null>;

export const exigirSesion =
  (resolver: ResolverSesion): MiddlewareHandler<Env> =>
  async (c, next) => {
    const usuario = await resolver(c);
    if (!usuario) throw new HTTPException(401, { message: "Inicia sesión para continuar" });
    c.set("usuario", usuario);
    await next();
  };

export async function rolEnGranja(db: Db, usuarioId: string, granjaId: number): Promise<Rol | null> {
  const [fila] = await db
    .select({ rol: granja_miembros.rol })
    .from(granja_miembros)
    .where(and(eq(granja_miembros.user_id, usuarioId), eq(granja_miembros.granja_id, granjaId)));
  return fila?.rol ?? null;
}

/** 404 si no es miembro (no revela que la granja existe), 403 si el rol no alcanza. */
export async function exigirRolEnGranja(db: Db, usuarioId: string, granjaId: number, minimo: Rol, noEncontrado: string) {
  const rol = await rolEnGranja(db, usuarioId, granjaId);
  if (!rol) throw new HTTPException(404, { message: noEncontrado });
  if (RANGO[rol] < RANGO[minimo]) throw new HTTPException(403, { message: "Tu rol no permite esta acción" });
  return rol;
}

export async function cargarEstanque(db: Db, usuarioId: string, estanqueId: number, minimo: Rol = "tecnico") {
  const [estanque] = await db.select().from(estanques).where(eq(estanques.id, estanqueId));
  if (!estanque) throw new HTTPException(404, { message: "Estanque no encontrado" });
  await exigirRolEnGranja(db, usuarioId, estanque.granja_id, minimo, "Estanque no encontrado");
  return estanque;
}

export function idParam(valor: string, nombre = "id"): number {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new HTTPException(422, { message: `${nombre} inválido` });
  return n;
}
