import "./env";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { crearApp } from "./app";
import { crearAuth, resolverConBetterAuth } from "./auth";
import { conectar } from "./db/client";

const { db } = await conectar();
const auth = crearAuth(db);
const app = crearApp({ db, auth, resolverSesion: resolverConBetterAuth(auth), logs: true });

// Producción: si existe el build de la web (apps/web/dist), la API también la sirve en el mismo
// origen, así las cookies de Better Auth funcionan igual que con el proxy de Vite en desarrollo.
const WEB_DIST = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
if (existsSync(WEB_DIST)) {
  const root = path.relative(process.cwd(), WEB_DIST) || ".";
  app.use("*", async (c, next) => (c.req.path.startsWith("/api") ? next() : serveStatic({ root })(c, next)));
  // Fallback de SPA: cualquier ruta que no sea archivo ni /api devuelve index.html (React Router).
  app.get("*", async (c, next) =>
    c.req.path.startsWith("/api") ? next() : serveStatic({ root, path: "index.html" })(c, next),
  );
}

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port }, () => {
  const motor = process.env.DATABASE_URL ? "Postgres (DATABASE_URL)" : "PGlite (.data/pglite)";
  console.log(`API Acuicontrol en http://localhost:${port}  ·  base de datos: ${motor}`);
});
