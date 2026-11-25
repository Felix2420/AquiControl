// Carga el .env de la raíz del monorepo (el cwd de pnpm es apps/api, donde no hay .env, así que
// `dotenv/config` a secas nunca lo encontraba y se caía en PGlite sin avisar). Importar PRIMERO.
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../.env") });
