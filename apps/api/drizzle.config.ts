import { defineConfig } from "drizzle-kit";

// Solo se usa para `drizzle-kit generate` (no necesita conexión a la base de datos).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
