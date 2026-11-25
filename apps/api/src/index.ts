import "./env";
import { serve } from "@hono/node-server";
import { crearApp } from "./app";
import { crearAuth, resolverConBetterAuth } from "./auth";
import { conectar } from "./db/client";

const { db } = await conectar();
const auth = crearAuth(db);
const app = crearApp({ db, auth, resolverSesion: resolverConBetterAuth(auth), logs: true });

const port = Number(process.env.PORT ?? 8000);
serve({ fetch: app.fetch, port }, () => {
  const motor = process.env.DATABASE_URL ? "Postgres (DATABASE_URL)" : "PGlite (.data/pglite)";
  console.log(`API Acuicontrol en http://localhost:${port}  ·  base de datos: ${motor}`);
});
