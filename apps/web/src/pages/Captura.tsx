import { zodResolver } from "@hookform/resolvers/zod";
import {
  estadoDosis,
  factorPorOxigeno,
  factorPorSobrante,
  factorPorTemperatura,
  O2_SUSPENSION_MG_L,
  type Nivel,
} from "@acuicontrol/reglas";
import { AlertCircle, Check, TriangleAlert } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { Campo } from "@/components/Campo";
import { GraficaDosis } from "@/components/GraficaDosis";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, Select } from "@/components/ui/input";
import type { Recomendacion } from "@/lib/api";
import { useContar, useMontado } from "@/lib/hooks";
import { useEstanques, useGranjas, useHistorial, useRecomendacion, useRegistrarAlimentacion } from "@/lib/queries";
import { aNumero, esquemaConfirmar, esquemaLecturas, type FormConfirmar, type FormLecturas } from "@/lib/validacion";
import { descargarCsv, fmt, hoyISO } from "@/lib/utils";
import { useUi } from "@/store/ui";

// ───────── Indicadores en vivo (mismas reglas que el backend, vía packages/reglas) ─────────
const FACTOR = {
  porcentaje_sobrante: factorPorSobrante,
  temperatura_c: factorPorTemperatura,
  oxigeno_mg_l: factorPorOxigeno,
} as const;
const TEXTO_NIVEL: Record<keyof typeof FACTOR, Record<Nivel, string>> = {
  porcentaje_sobrante: { ok: "Normal", warn: "Alto", danger: "Crítico" },
  temperatura_c: { ok: "Óptima", warn: "Fuera de rango", danger: "Extrema" },
  oxigeno_mg_l: { ok: "Normal", warn: "Bajo", danger: "Suspende" },
};

function chipDe(campo: keyof typeof FACTOR, valor: string) {
  const n = Number(valor);
  if (valor.trim() === "" || !Number.isFinite(n)) return null;
  const { factor, nivel } = FACTOR[campo](n);
  return { nivel, texto: factor === 1 ? TEXTO_NIVEL[campo][nivel] : `${TEXTO_NIVEL[campo][nivel]} ×${fmt(factor)}` };
}

const ESTADO = {
  normal: { clase: "estado-ok", texto: "Normal", Icono: Check },
  reducida: { clase: "estado-warn", texto: "Reducida", Icono: AlertCircle },
  suspendida: { clase: "estado-danger", texto: "Suspendida", Icono: TriangleAlert },
} as const;

// ───────── Página ─────────
export function Captura() {
  const { data: estanques, isLoading, error } = useEstanques();
  const { data: granjas } = useGranjas();
  const nombreGranja = (id: number) => granjas?.find((g) => g.id === id)?.nombre ?? `granja ${id}`;
  const guardado = useUi((s) => s.estanqueId);
  const setEstanqueId = useUi((s) => s.setEstanqueId);

  const estanqueId = estanques?.find((e) => e.id === guardado)?.id ?? estanques?.[0]?.id ?? null;
  const [resultado, setResultado] = useState<{ rec: Recomendacion; oxigeno: number | null; n: number } | null>(null);
  const [errorCalculo, setErrorCalculo] = useState<string | null>(null);

  // Una recomendación solo es válida para el estanque en el que se calculó.
  useEffect(() => {
    setResultado(null);
    setErrorCalculo(null);
  }, [estanqueId]);

  const hoy = useMemo(
    () => new Date().toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" }).toUpperCase(),
    [],
  );

  return (
    <>
      <div className="pb-3">
        <p className="eyebrow mb-3">{hoy}</p>
        <h1 className="text-[32px] leading-[1.13] tracking-[-0.022em]">Dosis del día</h1>
        <p className="mt-2 text-muted">Captura las lecturas de campo y obtén la dosis de alimento recomendada.</p>
        <svg className="ola mt-5" viewBox="0 0 400 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 7 Q10 1 20 7 T40 7 T60 7 T80 7 T100 7 T120 7 T140 7 T160 7 T180 7 T200 7 T220 7 T240 7 T260 7 T280 7 T300 7 T320 7 T340 7 T360 7 T380 7 T400 7 T420 7 T440 7" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </div>

      {/* 1. Estanque */}
      <section className="card card-hover" aria-labelledby="paso-1">
        <h2 id="paso-1" className="card-title"><span className="step">01</span>Estanque</h2>
        <label htmlFor="estanque-select" className="sr-only">Estanque</label>
        {isLoading ? (
          <div className="skeleton h-12 w-full" />
        ) : error ? (
          <p className="text-sm text-danger">No se pudieron cargar los estanques: {(error as Error).message}</p>
        ) : estanques && estanques.length > 0 ? (
          <Select id="estanque-select" value={estanqueId ?? ""} onChange={(e) => setEstanqueId(Number(e.target.value))}>
            {estanques.map((e) => (
              <option key={e.id} value={e.id}>
                {e.identificador_estanque} · {nombreGranja(e.granja_id)}
              </option>
            ))}
          </Select>
        ) : (
          <p className="text-muted">
            Aún no hay estanques. <Link to="/configurar" className="text-paper underline underline-offset-4">Crea tu granja y un estanque</Link> para empezar.
          </p>
        )}
      </section>

      {estanqueId !== null && (
        <>
          <Lecturas
            estanqueId={estanqueId}
            onResultado={(rec, oxigeno) => {
              setErrorCalculo(null);
              setResultado((r) => ({ rec, oxigeno, n: (r?.n ?? 0) + 1 }));
            }}
            onError={(msg) => {
              setResultado(null);
              setErrorCalculo(msg);
            }}
          />
          {errorCalculo && (
            <section className="card result-card estado-danger anim-in">
              <div className="alerta" role="alert">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
                <span>No se pudo calcular la recomendación: {errorCalculo}</span>
              </div>
            </section>
          )}
          {resultado && <Resultado key={resultado.n} rec={resultado.rec} suspendida={esSuspendida(resultado)} />}
          {resultado && <Confirmar key={`c${resultado.n}`} estanqueId={estanqueId} resultado={resultado} />}
          <Historial estanqueId={estanqueId} />
        </>
      )}
    </>
  );
}

const esSuspendida = (r: { rec: Recomendacion; oxigeno: number | null }) =>
  r.rec.factor_ajuste_total === 0 || (r.oxigeno !== null && r.oxigeno < O2_SUSPENSION_MG_L);

// ───────── 2. Lecturas ─────────
function Lecturas({
  estanqueId,
  onResultado,
  onError,
}: {
  estanqueId: number;
  onResultado: (rec: Recomendacion, oxigeno: number | null) => void;
  onError: (mensaje: string) => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormLecturas>({
    resolver: zodResolver(esquemaLecturas),
    mode: "onBlur",
    defaultValues: { porcentaje_sobrante: "", temperatura_c: "", oxigeno_mg_l: "" },
  });
  const valores = watch();
  const calcular = useRecomendacion(estanqueId);

  const enviar = handleSubmit(async (v) => {
    const oxigeno = aNumero(v.oxigeno_mg_l);
    try {
      const rec = await calcular.mutateAsync({
        porcentaje_sobrante_charola: aNumero(v.porcentaje_sobrante),
        temperatura_c: aNumero(v.temperatura_c),
        oxigeno_mg_l: oxigeno,
      });
      onResultado(rec, oxigeno);
      requestAnimationFrame(() => document.getElementById("resultado")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (e) {
      onError((e as Error).message);
    }
  });

  return (
    <section className="card card-hover" aria-labelledby="paso-2">
      <h2 id="paso-2" className="card-title"><span className="step">02</span>Lecturas de campo</h2>
      <form onSubmit={enviar} className="space-y-5" noValidate>
        <Campo id="porcentaje_sobrante" etiqueta="Sobrante en charola" unidad="%" chip={chipDe("porcentaje_sobrante", valores.porcentaje_sobrante)} ayuda="Entre 0 y 100." error={errors.porcentaje_sobrante?.message}>
          <Input id="porcentaje_sobrante" type="number" inputMode="decimal" step="0.1" aria-describedby="porcentaje_sobrante-ayuda" aria-invalid={!!errors.porcentaje_sobrante} {...register("porcentaje_sobrante")} />
        </Campo>
        <Campo id="temperatura_c" etiqueta="Temperatura" unidad="°C" chip={chipDe("temperatura_c", valores.temperatura_c)} ayuda="Rango óptimo: 24 a 33 °C." error={errors.temperatura_c?.message}>
          <Input id="temperatura_c" type="number" inputMode="decimal" step="0.1" aria-describedby="temperatura_c-ayuda" aria-invalid={!!errors.temperatura_c} {...register("temperatura_c")} />
        </Campo>
        <Campo id="oxigeno_mg_l" etiqueta="Oxígeno disuelto" unidad="mg/L" chip={chipDe("oxigeno_mg_l", valores.oxigeno_mg_l)} ayuda="Menos de 2.0 mg/L suspende la alimentación." error={errors.oxigeno_mg_l?.message}>
          <Input id="oxigeno_mg_l" type="number" inputMode="decimal" step="0.1" aria-describedby="oxigeno_mg_l-ayuda" aria-invalid={!!errors.oxigeno_mg_l} {...register("oxigeno_mg_l")} />
        </Campo>
        <p className="text-[13px] text-muted">Deja un campo vacío para usar la última lectura registrada del estanque.</p>
        <Button type="submit" variant="accent" cargando={calcular.isPending}>Calcular recomendación</Button>
      </form>
    </section>
  );
}

// ───────── 3. Recomendación ─────────
function Resultado({ rec, suspendida }: { rec: Recomendacion; suspendida: boolean }) {
  const estado = ESTADO[estadoDosis(rec.factor_ajuste_total)];
  const dosisBase = (rec.biomasa_estimada_kg * rec.tasa_base_pct) / 100;
  const reduccion = Math.round((1 - rec.factor_ajuste_total) * 100);
  const dosis = useContar(rec.dosis_recomendada_kg, dosisBase);
  const montado = useMontado();

  return (
    <section id="resultado" className={`card result-card ${estado.clase} anim-in`} aria-labelledby="paso-3" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="paso-3" className="card-title !mb-0"><span className="step">03</span>Recomendación</h2>
        <span className="badge"><estado.Icono className="h-4 w-4" strokeWidth={2.5} />{estado.texto}</span>
      </div>
      {suspendida && (
        <div className="alerta mb-3" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.5} />
          <span>Alimentación suspendida: oxígeno disuelto por debajo de {O2_SUSPENSION_MG_L.toFixed(1)} mg/L.</span>
        </div>
      )}
      <p className="dosis-valor">
        <span>{fmt(dosis)}</span> <span className="text-lg text-muted">kg/día</span>
      </p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[12px] text-muted">
          <span>Dosis base <span className="num">{fmt(dosisBase)} kg</span></span>
          <span>{reduccion > 0 ? `−${reduccion}%` : "sin ajuste"}</span>
        </div>
        {/* La barra arranca llena (dosis base) y se encoge hasta el factor aplicado. */}
        <div className="barra"><span style={{ "--v": montado ? rec.factor_ajuste_total : 1 } as React.CSSProperties} /></div>
      </div>
      <dl className="metricas mt-3">
        <div className="metrica"><dt>Biomasa estimada</dt><dd>{fmt(rec.biomasa_estimada_kg, 0)} kg</dd></div>
        <div className="metrica"><dt>Tasa base</dt><dd>{fmt(rec.tasa_base_pct)} %</dd></div>
        <div className="metrica"><dt>Factor de ajuste</dt><dd>×{fmt(rec.factor_ajuste_total)}</dd></div>
        <div className="metrica"><dt>FCA estimado</dt><dd>{fmt(rec.fca_estimado)}</dd></div>
      </dl>
      <p className="mt-3 leading-relaxed">{rec.justificacion}</p>
    </section>
  );
}

// ───────── 4. Confirmar ─────────
function Confirmar({ estanqueId, resultado }: { estanqueId: number; resultado: { rec: Recomendacion; oxigeno: number | null } }) {
  const { rec } = resultado;
  const suspendida = esSuspendida(resultado);
  const [entiendo, setEntiendo] = useState(false);
  const mostrarToast = useUi((s) => s.mostrarToast);
  const registrar = useRegistrarAlimentacion(estanqueId);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormConfirmar>({
    resolver: zodResolver(esquemaConfirmar),
    mode: "onBlur",
    defaultValues: { dosis_aplicada_kg: String(rec.dosis_recomendada_kg) },
  });

  const enviar = handleSubmit(async (v) => {
    const aplicada = Number(v.dosis_aplicada_kg);
    try {
      await registrar.mutateAsync({
        fecha: hoyISO(),
        dosis_calculada_kg: rec.dosis_recomendada_kg,
        dosis_aplicada_kg: aplicada,
        fca_proyectado: rec.fca_estimado,
        explicacion_ia: rec.justificacion,
        client_id: crypto.randomUUID(),
      });
      mostrarToast(`Dosis de ${fmt(aplicada)} kg registrada correctamente.`);
    } catch (e) {
      mostrarToast(`Error al registrar: ${(e as Error).message}`, "error");
    }
  });

  return (
    <section className="card anim-in" style={{ animationDelay: "120ms" }} aria-labelledby="paso-4">
      <h2 id="paso-4" className="card-title"><span className="step">04</span>Confirmar dosis</h2>
      <form onSubmit={enviar} noValidate>
        <Campo id="dosis_aplicada_kg" etiqueta="Dosis aplicada" unidad="kg" ayuda="Ajusta si aplicaste una cantidad distinta a la recomendada." error={errors.dosis_aplicada_kg?.message}>
          <Input id="dosis_aplicada_kg" type="number" inputMode="decimal" step="0.01" aria-describedby="dosis_aplicada_kg-ayuda" aria-invalid={!!errors.dosis_aplicada_kg} {...register("dosis_aplicada_kg")} />
        </Campo>
        {suspendida && (
          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[15px]">
            <Checkbox checked={entiendo} onCheckedChange={(c) => setEntiendo(c === true)} />
            <span>Entiendo que el oxígeno está por debajo de {O2_SUSPENSION_MG_L.toFixed(1)} mg/L y aun así quiero registrar esta dosis.</span>
          </label>
        )}
        <Button type="submit" variant="bone" className="mt-5" cargando={registrar.isPending} disabled={suspendida && !entiendo}>
          Registrar dosis aplicada
        </Button>
      </form>
    </section>
  );
}

// ───────── Historial ─────────
function Historial({ estanqueId }: { estanqueId: number }) {
  const { data, isLoading, error } = useHistorial(estanqueId);
  const registros = data?.slice(0, 5) ?? [];
  const montado = useMontado();
  const maximo = Math.max(...registros.map((r) => Math.max(r.dosis_aplicada_kg ?? 0, r.dosis_calculada_kg)), 1);

  return (
    <section className="card card-hover" aria-labelledby="historial-titulo">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="historial-titulo" className="card-title !mb-0">Historial de dosis</h2>
        {data && data.length > 0 && (
          <button
            type="button"
            className="nav-link !min-h-0 text-[13px]"
            onClick={() =>
              descargarCsv(`dosis-estanque-${estanqueId}.csv`, [
                ["fecha", "dosis_calculada_kg", "dosis_aplicada_kg", "fca_proyectado"],
                ...[...data].reverse().map((r) => [r.fecha, r.dosis_calculada_kg, r.dosis_aplicada_kg, r.fca_proyectado]),
              ])
            }
          >
            Descargar CSV
          </button>
        )}
      </div>
      {data && <GraficaDosis registros={data.slice(0, 14)} />}
      <p className="mb-1 text-[12px] text-muted">Últimos 5 · aplicada / recomendada</p>
      <ul className="divide-y divide-line">
        {isLoading &&
          [0, 1, 2].map((i) => (
            <li key={i} className="flex items-center justify-between gap-4 py-3">
              <span className="skeleton h-4 w-14" />
              <span className="skeleton h-4 max-w-[60%] flex-1" />
            </li>
          ))}
        {error && <li className="py-2 text-sm text-danger">No se pudo cargar el historial: {(error as Error).message}</li>}
        {!isLoading && !error && registros.length === 0 && <li className="py-2 text-sm text-muted">Aún no hay dosis registradas.</li>}
        {registros.map((r, i) => {
          const aplicada = r.dosis_aplicada_kg ?? r.dosis_calculada_kg;
          return (
            <li key={r.id} className="anim-in grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 py-3" style={{ animationDelay: `${i * 60}ms` }}>
              <span className="text-[13px] text-muted">
                {new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
              </span>
              {/* Barra = dosis aplicada; marca vertical = dosis recomendada. */}
              <div className="relative">
                <div className="barra"><span style={{ "--v": montado ? aplicada / maximo : 0 } as React.CSSProperties} /></div>
                <span className="absolute -top-1 h-[14px] w-px bg-muted" style={{ left: `${(r.dosis_calculada_kg / maximo) * 100}%` }} />
              </div>
              <span className="num text-right text-[14px]">
                <span className="text-paper">{fmt(aplicada)}</span>
                <span className="text-muted"> / {fmt(r.dosis_calculada_kg)} kg</span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
