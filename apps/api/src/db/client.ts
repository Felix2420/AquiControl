// Conexión a Postgres. Con DATABASE_URL usa node-postgres (Docker/producción); sin ella usa
// PGlite (Postgres embebido en WASM, solo dependencia npm) con datos en .data/pglite.
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { migrate as migratePg } from "drizzle-orm/node-postgres/migrator";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import * as schema from "./schema";

export type Db = PgliteDatabase<typeof schema>;

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const MIGRACIONES = path.resolve(AQUI, "../../drizzle");
const RAIZ = path.resolve(AQUI, "../../../..");

export interface Conexion {
  db: Db;
  cerrar: () => Promise<void>;
}

/**
 * @param opciones.url   cadena de conexión Postgres; si se omite se lee DATABASE_URL.
 * @param opciones.memoria  true → PGlite en memoria (tests); ignora DATABASE_URL.
 */
export async function conectar(opciones: { url?: string; memoria?: boolean } = {}): Promise<Conexion> {
  const url = opciones.memoria ? undefined : (opciones.url ?? process.env.DATABASE_URL);

  if (url) {
    const pool = new pg.Pool({ connectionString: url });
    const db = drizzlePg(pool, { schema });
    await migratePg(db, { migrationsFolder: MIGRACIONES });
    // Misma API de consultas en ambos drivers; el tipo común es PgliteDatabase por conveniencia.
    return { db: db as unknown as Db, cerrar: () => pool.end() };
  }

  const dir = opciones.memoria ? undefined : (process.env.PGLITE_DIR ?? path.join(RAIZ, ".data", "pglite"));
  if (dir) mkdirSync(path.dirname(dir), { recursive: true }); // PGlite no crea carpetas padre
  const cliente = new PGlite(dir);
  const db = drizzlePglite(cliente, { schema });
  await migratePglite(db, { migrationsFolder: MIGRACIONES });
  return { db, cerrar: () => cliente.close() };
}
