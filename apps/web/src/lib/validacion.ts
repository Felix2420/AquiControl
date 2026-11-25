import { z } from "zod";

/** Rangos alineados con la validación Zod de la API (y antes con Pydantic). */
export const REGLAS = {
  porcentaje_sobrante: { min: 0, max: 100, nombre: "El sobrante" },
  temperatura_c: { min: 0, max: 45, nombre: "La temperatura" },
  oxigeno_mg_l: { min: 0, max: 20, nombre: "El oxígeno" },
  dosis_aplicada_kg: { min: 0, max: undefined, nombre: "La dosis" },
} as const;

type Clave = keyof typeof REGLAS;

/** Campo numérico escrito como texto. Vacío es válido salvo que sea `requerido`. */
export const campoNumerico = (clave: Clave, requerido = false) => {
  const { min, max, nombre } = REGLAS[clave];
  return z.string().superRefine((v, ctx) => {
    const t = v.trim();
    if (t === "") {
      if (requerido) ctx.addIssue({ code: "custom", message: `${nombre} es obligatoria.` });
      return;
    }
    const n = Number(t);
    if (!Number.isFinite(n)) ctx.addIssue({ code: "custom", message: "Escribe un número válido." });
    else if (n < min) ctx.addIssue({ code: "custom", message: `${nombre} no puede ser menor que ${min}.` });
    else if (max !== undefined && n > max) {
      ctx.addIssue({ code: "custom", message: `${nombre} no puede ser mayor que ${max}.` });
    }
  });
};

/** "" → null; texto numérico → número. */
export const aNumero = (v: string): number | null => (v.trim() === "" ? null : Number(v));

export const esquemaLecturas = z.object({
  porcentaje_sobrante: campoNumerico("porcentaje_sobrante"),
  temperatura_c: campoNumerico("temperatura_c"),
  oxigeno_mg_l: campoNumerico("oxigeno_mg_l"),
});
export type FormLecturas = z.infer<typeof esquemaLecturas>;

export const esquemaConfirmar = z.object({ dosis_aplicada_kg: campoNumerico("dosis_aplicada_kg", true) });
export type FormConfirmar = z.infer<typeof esquemaConfirmar>;
