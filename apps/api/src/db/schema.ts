// Esquema Postgres. Dominio equivalente a backend/db/schema.sql (nombres en español, columnas
// en snake_case para que las filas se serialicen tal cual en la API, igual que la API Python).
import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ───────────── Better Auth (nombres de tabla/campos según su esquema por defecto) ─────────────
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ───────────── Dominio ─────────────
export const granjas = pgTable(
  "granjas",
  {
    id: serial("id").primaryKey(),
    nombre: text("nombre").notNull(),
    ubicacion: text("ubicacion"),
    hectareas_totales: doublePrecision("hectareas_totales").notNull(),
    fecha_registro: date("fecha_registro", { mode: "string" })
      .notNull()
      .default(sql`CURRENT_DATE`),
  },
  (t) => [check("granjas_hectareas_totales_pos", sql`${t.hectareas_totales} > 0`)],
);

export const rolGranja = pgEnum("rol_granja", ["admin", "biologo", "tecnico"]);

export const granja_miembros = pgTable(
  "granja_miembros",
  {
    user_id: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    granja_id: integer("granja_id")
      .notNull()
      .references(() => granjas.id, { onDelete: "cascade" }),
    rol: rolGranja("rol").notNull(),
  },
  (t) => [unique("granja_miembros_uq").on(t.user_id, t.granja_id), index("idx_miembros_user").on(t.user_id)],
);

export const estanques = pgTable(
  "estanques",
  {
    id: serial("id").primaryKey(),
    granja_id: integer("granja_id")
      .notNull()
      .references(() => granjas.id),
    identificador_estanque: text("identificador_estanque").notNull(),
    hectareas: doublePrecision("hectareas").notNull(),
    densidad_siembra: doublePrecision("densidad_siembra").notNull(),
    fecha_siembra: date("fecha_siembra", { mode: "string" }).notNull(),
  },
  (t) => [
    unique("estanques_granja_identificador_uq").on(t.granja_id, t.identificador_estanque),
    check("estanques_hectareas_pos", sql`${t.hectareas} > 0`),
    check("estanques_densidad_pos", sql`${t.densidad_siembra} > 0`),
    index("idx_estanques_granja").on(t.granja_id),
  ],
);

export const muestreos_biometria = pgTable(
  "muestreos_biometria",
  {
    id: serial("id").primaryKey(),
    estanque_id: integer("estanque_id")
      .notNull()
      .references(() => estanques.id),
    fecha: date("fecha", { mode: "string" }).notNull(),
    peso_promedio_g: doublePrecision("peso_promedio_g").notNull(),
    ganancia_semanal_g: doublePrecision("ganancia_semanal_g"),
    biomasa_estimada_kg: doublePrecision("biomasa_estimada_kg"),
  },
  (t) => [
    check("biometria_peso_pos", sql`${t.peso_promedio_g} > 0`),
    index("idx_biometria_estanque").on(t.estanque_id, t.fecha),
  ],
);

export const horaToma = pgEnum("hora_toma", ["mañana", "tarde"]);

export const lecturas_charolas = pgTable(
  "lecturas_charolas",
  {
    id: serial("id").primaryKey(),
    estanque_id: integer("estanque_id")
      .notNull()
      .references(() => estanques.id),
    fecha: date("fecha", { mode: "string" }).notNull(),
    hora_toma: horaToma("hora_toma").notNull(),
    porcentaje_sobrante: doublePrecision("porcentaje_sobrante").notNull(),
    ajuste_realizado_kg: doublePrecision("ajuste_realizado_kg"),
  },
  (t) => [
    check("charolas_sobrante_rango", sql`${t.porcentaje_sobrante} BETWEEN 0 AND 100`),
    index("idx_charolas_estanque").on(t.estanque_id, t.fecha),
  ],
);

export const parametros_agua = pgTable(
  "parametros_agua",
  {
    id: serial("id").primaryKey(),
    estanque_id: integer("estanque_id")
      .notNull()
      .references(() => estanques.id),
    fecha: date("fecha", { mode: "string" }).notNull(),
    temperatura_c: doublePrecision("temperatura_c"),
    oxigeno_mg_l: doublePrecision("oxigeno_mg_l"),
    salinidad_ppm: doublePrecision("salinidad_ppm"),
    ph: doublePrecision("ph"),
    amonio_ppm: doublePrecision("amonio_ppm"),
  },
  (t) => [
    check("agua_oxigeno_nonneg", sql`${t.oxigeno_mg_l} IS NULL OR ${t.oxigeno_mg_l} >= 0`),
    index("idx_agua_estanque").on(t.estanque_id, t.fecha),
  ],
);

export const alimentacion_diaria = pgTable(
  "alimentacion_diaria",
  {
    id: serial("id").primaryKey(),
    estanque_id: integer("estanque_id")
      .notNull()
      .references(() => estanques.id),
    fecha: date("fecha", { mode: "string" }).notNull(),
    dosis_calculada_kg: doublePrecision("dosis_calculada_kg").notNull(),
    dosis_aplicada_kg: doublePrecision("dosis_aplicada_kg"),
    fca_proyectado: doublePrecision("fca_proyectado"),
    explicacion_ia: text("explicacion_ia"),
    /** Generado en el cliente; hace idempotente el reenvío desde la cola offline. */
    client_id: uuid("client_id").unique(),
  },
  (t) => [index("idx_alimentacion_estanque").on(t.estanque_id, t.fecha)],
);
