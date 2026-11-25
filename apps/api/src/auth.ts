import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import type { Context } from "hono";
import type { Env, ResolverSesion } from "./access";
import type { Db } from "./db/client";
import { account, session, user, verification } from "./db/schema";

const SECRETO_DEV = "dev-only-secret-no-usar-en-produccion-0123456789";

export function crearAuth(db: Db) {
  const secret = process.env.BETTER_AUTH_SECRET ?? (process.env.NODE_ENV === "production" ? undefined : SECRETO_DEV);
  if (!secret) throw new Error("Define BETTER_AUTH_SECRET en producción");

  const puerto = process.env.PORT ?? "8000";
  const baseURL = process.env.BETTER_AUTH_URL ?? `http://localhost:${puerto}`;

  return betterAuth({
    secret,
    baseURL,
    // Vite (dev) usa proxy same-origin, pero se permite también por si se llama directo.
    trustedOrigins: [baseURL, "http://localhost:5173", "http://127.0.0.1:5173"],
    database: drizzleAdapter(db, { provider: "pg", schema: { user, session, account, verification } }),
    emailAndPassword: { enabled: true, minPasswordLength: 8, autoSignIn: true },
  });
}

export type Auth = ReturnType<typeof crearAuth>;

export const resolverConBetterAuth =
  (auth: Auth): ResolverSesion =>
  async (c: Context<Env>) => {
    const s = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!s) return null;
    return { id: s.user.id, name: s.user.name, email: s.user.email };
  };
