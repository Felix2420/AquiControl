import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { logger } from "hono/logger";
import { exigirSesion, type Env, type ResolverSesion } from "./access";
import type { Auth } from "./auth";
import type { Db } from "./db/client";
import { estanquesRoutes } from "./routes/estanques";
import { granjasRoutes } from "./routes/granjas";

export interface OpcionesApp {
  db: Db;
  resolverSesion: ResolverSesion;
  /** Si se pasa, monta Better Auth en /api/auth/*. En tests se omite y se inyecta resolverSesion. */
  auth?: Auth;
  logs?: boolean;
}

export function crearApp({ db, resolverSesion, auth, logs = false }: OpcionesApp) {
  const app = new Hono<Env>();
  if (logs) app.use(logger());

  app.get("/api/salud", (c) => c.json({ ok: true }));

  if (auth) app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

  const api = new Hono<Env>();
  api.use("*", exigirSesion(resolverSesion));
  api.route("/granjas", granjasRoutes(db));
  api.route("/estanques", estanquesRoutes(db));
  app.route("/api", api);

  // Mismo formato de error que FastAPI: { detail }.
  app.onError((err, c) => {
    if (err instanceof HTTPException) return c.json({ detail: err.message }, err.status);
    console.error(err);
    return c.json({ detail: "Error interno del servidor" }, 500);
  });
  app.notFound((c) => c.json({ detail: "No encontrado" }, 404));

  return app;
}
