// Datos de demostración: una granja con 3 estanques en distinta etapa, ~14 días de historial
// (charolas, agua, alimentación calculada vs aplicada) y tres usuarios con roles distintos.
// Las dosis se calculan con las mismas reglas que usa la app (@acuicontrol/reglas), así el historial cuadra.
// Uso: pnpm seed            (idempotente: no hace nada si la granja demo ya existe)
//      pnpm seed -- --reset (borra la granja demo y la vuelve a crear)
import "../env";
import { recomendarDosis } from "@acuicontrol/reglas";
import { and, eq, inArray } from "drizzle-orm";
import { crearAuth } from "../auth";
import { conectar, type Db } from "./client";
import {
  alimentacion_diaria,
  estanques,
  granja_miembros,
  granjas,
  lecturas_charolas,
  muestreos_biometria,
  parametros_agua,
  user,
} from "./schema";

const PASSWORD = "demo12345";
export const DEMO = { email: "demo@acuicontrol.test", password: PASSWORD, nombre: "Técnico Demo" };
export const USUARIOS_DEMO = [
  { email: DEMO.email, nombre: "Ana Demo (admin)", rol: "admin" as const },
  { email: "biologo@acuicontrol.test", nombre: "Bruno Biólogo", rol: "biologo" as const },
  { email: "tecnico@acuicontrol.test", nombre: "Tania Técnica", rol: "tecnico" as const },
];

const DIAS_HISTORIAL = 14;

/** Fecha local YYYY-MM-DD, `dias` días antes de hoy. */
function fechaHace(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Pseudoaleatorio determinista (mulberry32): el seed siempre produce los mismos datos. */
function azar(semilla: number) {
  let a = semilla;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface PlanEstanque {
  id: string;
  hectareas: number;
  densidad: number;
  diasDesdeSiembra: number;
  /** Peso promedio (g) en las biometrías semanales: hace 28, 21, 14, 7 y 1 días. */
  pesos: number[];
  /** Día (hace N días) con sobrante alto y día con oxígeno bajo, para que el historial tenga estados distintos. */
  sobranteAltoHace?: number;
  oxigenoBajoHace?: number;
  /** Posición del estanque en el mapa. */
  lat: number;
  lng: number;
  /** Sobrante de la última lectura (el que ve la recomendación de hoy). */
  sobranteHoy: number;
}

const PLAN: PlanEstanque[] = [
  { id: "E1", lat: 24.8102, lng: -107.3961, hectareas: 1.0, densidad: 20, diasDesdeSiembra: 120, pesos: [8.0, 9.4, 10.7, 11.7, 12.5], sobranteAltoHace: 9, sobranteHoy: 6 },
  { id: "E2", lat: 24.8086, lng: -107.3922, hectareas: 0.8, densidad: 28, diasDesdeSiembra: 50, pesos: [1.8, 2.6, 3.3, 3.9, 4.5], sobranteHoy: 4 },
  { id: "E3", lat: 24.8071, lng: -107.3957, hectareas: 1.5, densidad: 15, diasDesdeSiembra: 150, pesos: [16.5, 18.2, 19.9, 21.1, 22.4], oxigenoBajoHace: 5, sobranteHoy: 18 },
];
const DIAS_BIOMETRIA = [28, 21, 14, 7, 1];

/** Borra la granja demo y cualquier granja que el usuario demo administre (p. ej. las creadas al ensayar la demo). */
async function borrarDemo(db: Db) {
  const [admin] = await db.select().from(user).where(eq(user.email, DEMO.email));
  const propias = admin
    ? await db
        .select({ id: granja_miembros.granja_id })
        .from(granja_miembros)
        .where(and(eq(granja_miembros.user_id, admin.id), eq(granja_miembros.rol, "admin")))
    : [];
  const [demo] = await db.select({ id: granjas.id }).from(granjas).where(eq(granjas.nombre, "Granja Demo"));
  const granjaIds = [...new Set([...propias.map((p) => p.id), ...(demo ? [demo.id] : [])])];
  if (granjaIds.length === 0) return;
  const ests = await db.select({ id: estanques.id }).from(estanques).where(inArray(estanques.granja_id, granjaIds));
  const ids = ests.map((e) => e.id);
  if (ids.length > 0) {
    await db.delete(alimentacion_diaria).where(inArray(alimentacion_diaria.estanque_id, ids));
    await db.delete(parametros_agua).where(inArray(parametros_agua.estanque_id, ids));
    await db.delete(lecturas_charolas).where(inArray(lecturas_charolas.estanque_id, ids));
    await db.delete(muestreos_biometria).where(inArray(muestreos_biometria.estanque_id, ids));
    await db.delete(estanques).where(inArray(estanques.granja_id, granjaIds));
  }
  await db.delete(granja_miembros).where(inArray(granja_miembros.granja_id, granjaIds));
  await db.delete(granjas).where(inArray(granjas.id, granjaIds));
  console.log(`Granjas eliminadas: ${granjaIds.length} (la demo y las que creó el usuario demo).`);
}

export async function sembrar(db: Db, opciones: { reset?: boolean } = {}): Promise<void> {
  const auth = crearAuth(db);
  if (opciones.reset) await borrarDemo(db);

  // Usuarios (Better Auth hashea la contraseña).
  const idPorEmail = new Map<string, string>();
  for (const u of USUARIOS_DEMO) {
    let [fila] = await db.select().from(user).where(eq(user.email, u.email));
    if (!fila) {
      await auth.api.signUpEmail({ body: { email: u.email, password: PASSWORD, name: u.nombre } });
      [fila] = await db.select().from(user).where(eq(user.email, u.email));
    }
    idPorEmail.set(u.email, fila!.id);
  }

  const [existente] = await db.select().from(granjas).where(eq(granjas.nombre, "Granja Demo"));
  if (existente) {
    console.log("El seed ya estaba aplicado (usa `pnpm seed -- --reset` para regenerarlo).");
    return;
  }

  const [granja] = await db
    .insert(granjas)
    .values({ nombre: "Granja Demo", ubicacion: "Sinaloa", latitud: 24.8091, longitud: -107.394, hectareas_totales: 20 })
    .returning();
  await db
    .insert(granja_miembros)
    .values(USUARIOS_DEMO.map((u) => ({ user_id: idPorEmail.get(u.email)!, granja_id: granja!.id, rol: u.rol })));

  let registros = 0;
  for (const [n, plan] of PLAN.entries()) {
    const rnd = azar(1000 + n);
    const [estanque] = await db
      .insert(estanques)
      .values({
        granja_id: granja!.id,
        identificador_estanque: plan.id,
        hectareas: plan.hectareas,
        densidad_siembra: plan.densidad,
        fecha_siembra: fechaHace(plan.diasDesdeSiembra),
        latitud: plan.lat,
        longitud: plan.lng,
      })
      .returning();
    const estanqueId = estanque!.id;

    await db.insert(muestreos_biometria).values(
      DIAS_BIOMETRIA.map((dias, i) => ({
        estanque_id: estanqueId,
        fecha: fechaHace(dias),
        peso_promedio_g: plan.pesos[i]!,
        ganancia_semanal_g: i === 0 ? null : Math.round((plan.pesos[i]! - plan.pesos[i - 1]!) * 10) / 10,
      })),
    );

    // Peso vigente un día dado = la última biometría anterior o del mismo día.
    const pesoEn = (haceDias: number) => {
      let peso = plan.pesos[0]!;
      DIAS_BIOMETRIA.forEach((d, i) => {
        if (d >= haceDias) peso = plan.pesos[i]!;
      });
      return peso;
    };

    const charolas: (typeof lecturas_charolas.$inferInsert)[] = [];
    const aguas: (typeof parametros_agua.$inferInsert)[] = [];
    const comidas: (typeof alimentacion_diaria.$inferInsert)[] = [];

    for (let dias = DIAS_HISTORIAL - 1; dias >= 0; dias--) {
      const fecha = fechaHace(dias);
      const sobranteBase = dias === 0 ? plan.sobranteHoy : dias === plan.sobranteAltoHace ? 24 : 4 + Math.round(rnd() * 8);
      const sobranteTarde = dias === 0 ? plan.sobranteHoy : dias === plan.sobranteAltoHace ? 22 : Math.max(2, sobranteBase + Math.round((rnd() - 0.5) * 4));
      const temperatura = Math.round((27 + rnd() * 3) * 10) / 10;
      const oxigeno = dias === plan.oxigenoBajoHace ? 1.6 : Math.round((4.6 + rnd() * 1.6) * 10) / 10;

      charolas.push(
        { estanque_id: estanqueId, fecha, hora_toma: "mañana", porcentaje_sobrante: sobranteBase },
        { estanque_id: estanqueId, fecha, hora_toma: "tarde", porcentaje_sobrante: sobranteTarde },
      );
      aguas.push({
        estanque_id: estanqueId,
        fecha,
        temperatura_c: temperatura,
        oxigeno_mg_l: oxigeno,
        salinidad_ppm: 28 + Math.round(rnd() * 4),
        ph: Math.round((7.8 + rnd() * 0.5) * 10) / 10,
        amonio_ppm: Math.round(rnd() * 20) / 100,
      });

      // El registro de hoy se deja sin hacer: es lo que se captura en vivo durante la demo.
      if (dias === 0) continue;
      const r = recomendarDosis({
        densidadSiembra: plan.densidad,
        hectareas: plan.hectareas,
        pesoPromedioG: pesoEn(dias),
        porcentajeSobranteCharola: sobranteTarde,
        temperaturaC: temperatura,
        oxigenoMgL: oxigeno,
      });
      const aplicada =
        r.dosisRecomendadaKg === 0 ? 0 : Math.round(r.dosisRecomendadaKg * (0.97 + rnd() * 0.06) * 10) / 10;
      comidas.push({
        estanque_id: estanqueId,
        fecha,
        dosis_calculada_kg: r.dosisRecomendadaKg,
        dosis_aplicada_kg: aplicada,
        fca_proyectado: r.fcaEstimado,
        explicacion_ia: r.justificacion,
      });
    }

    await db.insert(lecturas_charolas).values(charolas);
    await db.insert(parametros_agua).values(aguas);
    await db.insert(alimentacion_diaria).values(comidas);
    registros += comidas.length;
  }

  console.log(`Granja demo creada: ${PLAN.length} estanques, ${registros} registros de alimentación.`);
  console.log("Usuarios (contraseña " + PASSWORD + "):");
  for (const u of USUARIOS_DEMO) console.log(`  ${u.rol.padEnd(8)} ${u.email}`);
}

// Solo corre al ejecutarse directamente, no al importarse desde los tests.
if (process.argv[1]?.endsWith("seed.ts")) {
  const { db, cerrar } = await conectar();
  await sembrar(db, { reset: process.argv.includes("--reset") });
  await cerrar();
}
