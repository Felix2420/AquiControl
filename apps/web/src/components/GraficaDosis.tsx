import type { Alimentacion } from "@/lib/api";
import { fmt } from "@/lib/utils";

const W = 640;
const H = 200;
const M = { t: 12, r: 12, b: 28, l: 44 };

const corta = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-MX", { day: "numeric", month: "short" });

/** Dosis recomendada vs aplicada por día (SVG propio, sin librerías). `registros` va de más reciente a más antiguo. */
export function GraficaDosis({ registros }: { registros: Alimentacion[] }) {
  const datos = [...registros].reverse();
  if (datos.length < 2) return null;

  const aplicadas = datos.map((r) => r.dosis_aplicada_kg ?? r.dosis_calculada_kg);
  const tope = Math.max(...datos.map((r) => r.dosis_calculada_kg), ...aplicadas, 1);
  const max = Math.ceil(tope / 10) * 10;
  const x = (i: number) => M.l + (i / (datos.length - 1)) * (W - M.l - M.r);
  const y = (v: number) => M.t + (1 - v / max) * (H - M.t - M.b);
  const linea = (vals: number[]) => vals.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const guias = [0, 0.5, 1].map((f) => f * max);

  return (
    <figure className="mb-5">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-labelledby="graf-desc">
        <desc id="graf-desc">
          Dosis recomendada y dosis aplicada de los últimos {datos.length} registros, en kilogramos por día.
        </desc>
        {guias.map((g) => (
          <g key={g}>
            <line x1={M.l} x2={W - M.r} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray={g === 0 ? undefined : "3 5"} />
            <text x={M.l - 8} y={y(g) + 4} textAnchor="end" className="etiqueta">{fmt(g, 0)}</text>
          </g>
        ))}
        <text x={M.l} y={H - 8} className="etiqueta">{corta(datos[0]!.fecha)}</text>
        <text x={W - M.r} y={H - 8} textAnchor="end" className="etiqueta">{corta(datos.at(-1)!.fecha)}</text>

        {/* Recomendada: línea punteada teal. Aplicada: línea sólida. */}
        <path d={linea(datos.map((r) => r.dosis_calculada_kg))} fill="none" stroke="var(--teal)" strokeWidth="1.5" strokeDasharray="5 4" />
        <path d={linea(aplicadas)} fill="none" stroke="var(--paper)" strokeWidth="2" strokeLinejoin="round" />
        {datos.map((r, i) => (
          <circle
            key={r.id}
            cx={x(i)}
            cy={y(aplicadas[i]!)}
            r={r.dosis_calculada_kg === 0 ? 4.5 : 3}
            fill={r.dosis_calculada_kg === 0 ? "var(--danger)" : "var(--paper)"}
          >
            <title>{`${corta(r.fecha)}: aplicada ${fmt(aplicadas[i]!)} kg · recomendada ${fmt(r.dosis_calculada_kg)} kg${r.dosis_calculada_kg === 0 ? " (suspendida)" : ""}`}</title>
          </circle>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[12px] text-muted">
        <span><span className="mr-1.5 inline-block h-[2px] w-4 bg-paper align-middle" />aplicada</span>
        <span><span className="mr-1.5 inline-block h-[2px] w-4 align-middle" style={{ background: "var(--teal)" }} />recomendada</span>
        <span><span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ background: "var(--danger)" }} />alimentación suspendida</span>
      </figcaption>
    </figure>
  );
}
