// Validación de entrada (equivalente a backend/app/schemas/*.py, mismos rangos).
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { z } from "zod";

const fecha = z.iso.date();
const opt = <T extends z.ZodType>(s: T) => s.nullish().transform((v) => v ?? null);

export const GranjaCreate = z.object({
  nombre: z.string().min(1),
  ubicacion: opt(z.string()),
  hectareas_totales: z.number().gt(0),
});

export const EstanqueCreate = z.object({
  granja_id: z.number().int(),
  identificador_estanque: z.string().min(1),
  hectareas: z.number().gt(0),
  densidad_siembra: z.number().gt(0),
  fecha_siembra: fecha,
});

export const BiometriaCreate = z.object({
  fecha,
  peso_promedio_g: z.number().gt(0),
  ganancia_semanal_g: opt(z.number()),
});

export const CharolaCreate = z.object({
  fecha,
  hora_toma: z.enum(["mañana", "tarde"]),
  porcentaje_sobrante: z.number().min(0).max(100),
  ajuste_realizado_kg: opt(z.number()),
});

export const AguaCreate = z.object({
  fecha,
  temperatura_c: opt(z.number()),
  oxigeno_mg_l: opt(z.number().min(0)),
  salinidad_ppm: opt(z.number()),
  ph: opt(z.number()),
  amonio_ppm: opt(z.number()),
});

/** Todos opcionales: si se omiten se usa la última lectura registrada de cada tipo. */
export const DosisRecomendacionRequest = z.object({
  supervivencia_estimada: opt(z.number().gt(0).max(1)),
  porcentaje_sobrante_charola: opt(z.number().min(0).max(100)),
  temperatura_c: opt(z.number()),
  oxigeno_mg_l: opt(z.number().min(0)),
});

export const AlimentacionCreate = z.object({
  fecha,
  dosis_calculada_kg: z.number().min(0),
  dosis_aplicada_kg: opt(z.number().min(0)),
  fca_proyectado: opt(z.number()),
  explicacion_ia: opt(z.string()),
  client_id: z.uuid().nullish().transform((v) => v ?? null),
});

export const MiembroUpsert = z.object({
  email: z.email(),
  rol: z.enum(["admin", "biologo", "tecnico"]),
});

/** Validador JSON que responde 422 { detail } como FastAPI. */
export const json = <T extends z.ZodType>(schema: T) =>
  validator("json", (valor, c) => {
    const r = schema.safeParse(valor);
    if (!r.success) return c.json({ detail: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, 422);
    return r.data as z.output<T>;
  });

/** Cuerpo opcional: un body vacío equivale a {}. Lanza 422 si el JSON es inválido. */
export async function leerJsonOpcional<T extends z.ZodType>(req: Request, schema: T): Promise<z.output<T>> {
  const texto = await req.text();
  let crudo: unknown = {};
  if (texto.trim() !== "") {
    try {
      crudo = JSON.parse(texto);
    } catch {
      throw new HTTPException(422, { message: "El cuerpo no es JSON válido" });
    }
  }
  const r = schema.safeParse(crudo);
  if (!r.success) {
    throw new HTTPException(422, { message: r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") });
  }
  return r.data;
}
