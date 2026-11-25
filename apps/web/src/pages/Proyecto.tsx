import { estadoDosis, recomendarDosis, type DosisRecomendada } from "@acuicontrol/reglas";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth";
import { prefiereMenosMovimiento, useContar } from "@/lib/hooks";
import { cn, fmt } from "@/lib/utils";

// Estanque de ejemplo (coincide con los datos demo: 1 ha, 20 camarones/m²).
const ESTANQUE = { densidadSiembra: 20, hectareas: 1 };
const css = (v: Record<string, string | number>) => v as CSSProperties;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

// ───────── Animaciones de entrada ([data-reveal]) ─────────
// Aparecen al entrar en pantalla, bajando o subiendo; [data-reveal-group] escalona a sus hijos.
function useRevelar(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = raiz.current;
    if (!root) return;
    document.documentElement.classList.add("js");
    for (const grupo of root.querySelectorAll("[data-reveal-group]")) {
      [...grupo.children].forEach((hijo, i) => {
        hijo.setAttribute("data-reveal", "");
        (hijo as HTMLElement).style.setProperty("--d", `${i * 70}ms`);
      });
    }
    const elementos = root.querySelectorAll<HTMLElement>("[data-reveal]");
    if (prefiereMenosMovimiento() || !("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    // Histéresis: se muestra con ≥10 % visible y se oculta solo al salir del todo.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.intersectionRatio >= 0.1 && !el.classList.contains("is-visible")) {
            const arriba = e.boundingClientRect.top < (e.rootBounds?.height ?? window.innerHeight) / 2;
            if (el.classList.contains("desde-arriba") !== arriba) {
              el.style.transition = "none";
              el.classList.toggle("desde-arriba", arriba);
              void el.offsetWidth;
              el.style.transition = "";
            }
            el.classList.add("is-visible");
          } else if (!e.isIntersecting && el.classList.contains("is-visible")) {
            el.classList.remove("is-visible");
          }
        }
      },
      { threshold: [0, 0.1] },
    );
    elementos.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [raiz]);
}

// ───────── Animaciones ligadas al scroll ─────────
function useScroll(raiz: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = raiz.current;
    if (!root) return;
    const timeline = root.querySelector<HTMLElement>("#timeline")!;
    const relleno = timeline.querySelector<HTMLElement>(".timeline-fill")!;
    if (prefiereMenosMovimiento()) {
      relleno.style.setProperty("--p", "1");
      return;
    }
    const parallax = root.querySelector<HTMLElement>(".parallax")!;
    const escena = root.querySelector<HTMLElement>("#escena")!;
    const marco = escena.querySelector<HTMLElement>(".escena-marco")!;
    const pasos = [...escena.querySelectorAll<HTMLElement>(".escena-pasos li")];
    const orden = pasos.map((li) => li.dataset.paso);
    const frases = [...root.querySelectorAll<HTMLElement>("[data-texto-scroll]")].map((el) => ({
      el,
      spans: [...el.querySelectorAll<HTMLElement>(".w")],
    }));

    let pendiente = false;
    const actualizar = () => {
      pendiente = false;
      const vh = window.innerHeight;

      const rt = timeline.getBoundingClientRect();
      relleno.style.setProperty("--p", String(clamp01((vh * 0.6 - rt.top) / rt.height)));

      const y = window.scrollY;
      if (y < vh * 1.5) {
        parallax.style.setProperty("--py", `${y * -0.12}px`);
        parallax.style.setProperty("--ps", String(1 - clamp01(y / vh) * 0.04));
      }

      // Escena fija: 0–20 % zoom de entrada, luego un paso por cada 20 %.
      const re = escena.getBoundingClientRect();
      const p = clamp01(-re.top / (re.height - vh));
      const zoomP = clamp01(p / 0.2);
      marco.style.setProperty("--zoom", String(0.86 + 0.14 * zoomP));
      marco.style.setProperty("--zoom-p", String(zoomP));
      const indice = p < 0.2 ? -1 : Math.min(orden.length - 1, Math.floor((p - 0.2) / 0.2));
      const paso = indice < 0 ? "todo" : orden[indice]!;
      if (marco.dataset.paso !== paso) {
        marco.dataset.paso = paso;
        pasos.forEach((li, i) => {
          li.classList.toggle("activo", i === indice);
          li.classList.toggle("pasado", i < indice);
        });
      }

      // Frases que se iluminan palabra por palabra mientras cruzan la pantalla.
      for (const { el, spans } of frases) {
        const r = el.getBoundingClientRect();
        const pf = clamp01((vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.5));
        const encendidas = Math.round(pf * spans.length);
        spans.forEach((sp, i) => sp.classList.toggle("on", i < encendidas));
      }
    };
    const programar = () => {
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(actualizar);
      }
    };
    window.addEventListener("scroll", programar, { passive: true });
    window.addEventListener("resize", programar);
    actualizar();
    return () => {
      window.removeEventListener("scroll", programar);
      window.removeEventListener("resize", programar);
    };
  }, [raiz]);
}

/** Cifra que se anima desde su valor actual hasta `objetivo`. */
function useAnimado(objetivo: number, dur = 650): number {
  const [v, setV] = useState(objetivo);
  const actual = useRef(objetivo);
  useEffect(() => {
    if (prefiereMenosMovimiento()) {
      actual.current = objetivo;
      setV(objetivo);
      return;
    }
    const inicio = actual.current;
    const t0 = performance.now();
    let raf = 0;
    const paso = (t: number) => {
      const p = Math.min(1, (t - t0) / dur);
      actual.current = inicio + (objetivo - inicio) * (1 - Math.pow(1 - p, 3));
      setV(actual.current);
      if (p < 1) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [objetivo, dur]);
  return v;
}

// ───────── Piezas ─────────
const ESTADO = {
  normal: { nivel: "ok", texto: "Normal" },
  reducida: { nivel: "warn", texto: "Reducida" },
  suspendida: { nivel: "danger", texto: "Suspendida" },
} as const;

function TarjetaResultado({ r, id, titulo, children }: { r: DosisRecomendada; id?: string; titulo: ReactNode; children: ReactNode }) {
  const estado = ESTADO[estadoDosis(r.factorAjusteTotal)];
  const base = (r.biomasaEstimadaKg * r.tasaBasePct) / 100;
  const reduccion = Math.round((1 - r.factorAjusteTotal) * 100);
  const dosis = useAnimado(r.dosisRecomendadaKg);
  return (
    <div id={id} className={`card result-card estado-${estado.nivel}`} aria-live={id ? undefined : "polite"} aria-hidden={id ? true : undefined}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="card-title !mb-0">{titulo}</p>
        <span key={estado.texto} className="badge anim-in">{estado.texto}</span>
      </div>
      <p className="dosis-valor">{fmt(dosis)} <span className="text-lg text-muted">kg/día</span></p>
      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-[12px] text-muted">
          <span>Dosis base <span className="num">{fmt(base)} kg</span></span>
          <span>{reduccion > 0 ? `−${reduccion}%` : "sin ajuste"}</span>
        </div>
        <div className="barra"><span style={css({ "--v": r.factorAjusteTotal })} /></div>
      </div>
      {children}
    </div>
  );
}

const ESCENARIOS = [
  { sobrante: 5, temperatura: 28, oxigeno: 5 },
  { sobrante: 20, temperatura: 28, oxigeno: 3 },
  { sobrante: 20, temperatura: 28, oxigeno: 1.5 },
];

/** Tarjeta del hero: recorre tres escenarios reales. */
function TarjetaHero() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (prefiereMenosMovimiento()) return;
    const t = setInterval(() => {
      if (!document.hidden) setI((n) => (n + 1) % ESCENARIOS.length);
    }, 3800);
    return () => clearInterval(t);
  }, []);
  const lect = ESCENARIOS[i]!;
  const r = recomendarDosis({
    ...ESTANQUE,
    pesoPromedioG: 12.5,
    porcentajeSobranteCharola: lect.sobrante,
    temperaturaC: lect.temperatura,
    oxigenoMgL: lect.oxigeno,
  });
  return (
    <TarjetaResultado r={r} id="hero-card" titulo={<><span className="step">03</span>Recomendación</>}>
      <dl className="mt-4 grid grid-cols-3 gap-2 text-[12px]">
        <div className="metrica"><dt>Sobrante</dt><dd>{lect.sobrante} %</dd></div>
        <div className="metrica"><dt>Temp.</dt><dd>{lect.temperatura} °C</dd></div>
        <div className="metrica"><dt>O₂ mg/L</dt><dd>{fmt(lect.oxigeno, 1)}</dd></div>
      </dl>
      <p className="mt-4 min-h-[3em] text-[15px]">{r.justificacion}</p>
    </TarjetaResultado>
  );
}

function Cifra({ valor, etiqueta }: { valor: number; etiqueta: string }) {
  const ref = useRef<HTMLElement>(null);
  const desde = valor === 0 ? 9 : 0;
  const [activa, setActiva] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefiereMenosMovimiento() || !("IntersectionObserver" in window)) {
      setActiva(true);
      return;
    }
    // Vuelve a contar cada vez que la cifra reaparece.
    const io = new IntersectionObserver(([e]) => setActiva(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const n = useContar(activa ? valor : desde, desde, 1100);
  return (
    <div className="flex flex-col-reverse py-8 md:px-6">
      <dt className="mt-2 text-[13px] text-muted">{etiqueta}</dt>
      <dd ref={ref} className="num text-[40px] leading-none tracking-[-0.022em] text-paper">{fmt(n, 0)}</dd>
    </div>
  );
}

/** Texto que entra palabra por palabra (título del hero). */
function TituloPalabras({ texto }: { texto: string }) {
  const palabras = texto.split(/\s+/);
  return (
    <h1 className="hero-title" data-palabras aria-label={texto}>
      {palabras.map((w, i) => (
        <span key={i} className="palabra" aria-hidden="true" style={css({ "--i": i })}>{w}{i < palabras.length - 1 ? " " : ""}</span>
      ))}
    </h1>
  );
}

/** Frase grande que se ilumina palabra por palabra con el scroll (useScroll alterna .on). */
function TextoScroll({ id, texto }: { id: string; texto: string }) {
  return (
    <h2 id={id} className="texto-scroll" data-texto-scroll aria-label={texto}>
      {texto.split(/\s+/).map((w, i, a) => (
        <span key={i}>
          <span className="w" aria-hidden="true">{w}</span>
          {i < a.length - 1 ? " " : ""}
        </span>
      ))}
    </h2>
  );
}

const ola = (y: number) => `M0 ${y} Q20 ${y - 6} 40 ${y}` + Array.from({ length: 30 }, (_, i) => ` T${80 + i * 40} ${y}`).join("");

function Escena() {
  return (
    <section id="escena" className="escena-pin section" aria-labelledby="escena-titulo">
      <div className="escena-sticky">
        <div className="escena-cabecera">
          <p className="eyebrow mb-4">01 · EL ESTANQUE</p>
          <h2 id="escena-titulo" className="section-title max-w-[44rem]">Lo que el técnico observa, en una sola imagen.</h2>
        </div>
        <figure className="escena-marco card !p-0 overflow-hidden" data-paso="todo">
          <svg className="escena" viewBox="0 0 1200 380" role="img" aria-labelledby="escena-desc">
            <desc id="escena-desc">Corte de un estanque: alimento cayendo al agua y a una charola de muestreo, burbujas de oxígeno subiendo desde un aireador, un termómetro en el agua y camarones nadando.</desc>
            <defs>
              <linearGradient id="agua" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#02b8cc" stopOpacity="0.16" />
                <stop offset="1" stopColor="#02b8cc" stopOpacity="0.02" />
              </linearGradient>
              <g id="camaron" fill="none" stroke="#d0d6e0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M0 8 C6 0 22 -2 34 2 C42 5 46 10 44 16" />
                <path d="M2 10 C10 14 26 14 38 12" />
                <path d="M12 2 L13 12 M20 0.5 L21 13 M28 1 L28 12.5" strokeOpacity="0.5" />
                <path d="M44 16 l7 1 M44 16 l5 6 M44 16 l0 8" />
                <path d="M2 7 C-10 2 -22 4 -32 10 M2 9 C-8 11 -16 16 -20 24" strokeOpacity="0.7" />
                <path d="M10 12 l-2 6 M16 13 l-2 6 M22 13 l-1 6 M28 12 l0 6" strokeOpacity="0.6" />
                <circle cx="5" cy="4.5" r="1.4" fill="#d0d6e0" stroke="none" />
              </g>
            </defs>

            <rect x="0" y="100" width="1200" height="250" fill="url(#agua)" />
            <path className="agua-sup lenta" d={ola(104)} fill="none" stroke="#02b8cc" strokeOpacity="0.25" strokeWidth="1.5" />
            <path className="agua-sup" d={ola(100)} fill="none" stroke="#02b8cc" strokeOpacity="0.6" strokeWidth="1.5" />
            <path d="M0 350 C200 338 400 356 600 346 S1000 338 1200 348 V380 H0 Z" fill="#161718" />
            <path d="M0 350 C200 338 400 356 600 346 S1000 338 1200 348" fill="none" stroke="#383b3f" />

            <g data-parte="alimento">
              <g fill="#e5e5e6">
                <circle className="pellet" cx="520" cy="60" r="3" style={css({ "--d": "0s", "--y": "200px" })} />
                <circle className="pellet" cx="545" cy="50" r="2.5" style={css({ "--d": ".6s", "--y": "230px" })} />
                <circle className="pellet" cx="570" cy="62" r="3" style={css({ "--d": "1.2s", "--y": "210px" })} />
                <circle className="pellet" cx="595" cy="55" r="2.5" style={css({ "--d": "1.8s", "--y": "240px" })} />
                <circle className="pellet" cx="620" cy="58" r="3" style={css({ "--d": "2.4s", "--y": "220px" })} />
              </g>
              <line x1="570" y1="30" x2="570" y2="18" stroke="#383b3f" />
              <text className="etiqueta" x="570" y="12" textAnchor="middle">alimento</text>
            </g>

            <g data-parte="charola">
              <line x1="260" y1="20" x2="260" y2="110" stroke="#62666d" strokeWidth="3" />
              <g className="charola">
                <line x1="260" y1="40" x2="260" y2="236" stroke="#8a8f98" strokeDasharray="3 4" />
                <path d="M200 236 H320 L308 258 H212 Z" fill="#0f1011" stroke="#d0d6e0" strokeWidth="1.5" />
                <g fill="#e5e5e6">
                  <circle className="pellet" cx="240" cy="120" r="2.5" style={css({ "--d": ".3s", "--y": "128px" })} />
                  <circle className="pellet" cx="262" cy="118" r="2.5" style={css({ "--d": "1.4s", "--y": "130px" })} />
                  <circle className="pellet" cx="284" cy="122" r="2.5" style={css({ "--d": "2.2s", "--y": "126px" })} />
                </g>
                <circle cx="232" cy="246" r="2.5" fill="#e5e5e6" />
                <circle cx="246" cy="248" r="2.5" fill="#e5e5e6" />
                <circle cx="290" cy="247" r="2.5" fill="#e5e5e6" />
              </g>
              <line x1="200" y1="270" x2="160" y2="300" stroke="#383b3f" />
              <text className="etiqueta" x="156" y="314" textAnchor="end">charola: % de sobrante</text>
            </g>

            <g data-parte="oxigeno">
              <rect x="880" y="336" width="60" height="10" rx="3" fill="#23252a" stroke="#383b3f" />
              <g fill="none" stroke="#02b8cc" strokeOpacity="0.8">
                <circle className="burbuja" cx="890" cy="330" r="3" style={css({ "--d": "0s", "--t": "4.2s", "--x": "-8px" })} />
                <circle className="burbuja" cx="900" cy="330" r="4" style={css({ "--d": ".7s", "--t": "5s", "--x": "10px" })} />
                <circle className="burbuja" cx="910" cy="330" r="2.5" style={css({ "--d": "1.3s", "--t": "3.8s", "--x": "-4px" })} />
                <circle className="burbuja" cx="920" cy="330" r="3.5" style={css({ "--d": "2s", "--t": "4.6s", "--x": "12px" })} />
                <circle className="burbuja" cx="930" cy="330" r="2.5" style={css({ "--d": "2.8s", "--t": "4s", "--x": "-10px" })} />
                <circle className="burbuja" cx="905" cy="330" r="2" style={css({ "--d": "3.4s", "--t": "3.6s", "--x": "6px" })} />
              </g>
              <line x1="878" y1="300" x2="830" y2="270" stroke="#383b3f" />
              <text className="etiqueta" x="826" y="266" textAnchor="end">oxígeno disuelto (mg/L)</text>
            </g>

            <g data-parte="temperatura">
              <g transform="translate(1090 40)">
                <rect x="-5" y="0" width="10" height="120" rx="5" fill="#0f1011" stroke="#d0d6e0" strokeWidth="1.5" />
                <circle cx="0" cy="128" r="10" fill="#0f1011" stroke="#d0d6e0" strokeWidth="1.5" />
                <rect x="-2" y="50" width="4" height="78" rx="2" fill="#e2a336" />
                <circle cx="0" cy="128" r="6" fill="#e2a336" />
              </g>
              <line x1="1082" y1="56" x2="1040" y2="40" stroke="#383b3f" />
              <text className="etiqueta" x="1036" y="38" textAnchor="end">temperatura (°C)</text>
            </g>

            <g className="camaron" style={css({ "--t": "16s", "--dx": "160px" })}><use href="#camaron" transform="translate(380 290)" /></g>
            <g className="camaron" style={css({ "--t": "12s", "--dx": "-140px", "--d": "-4s" })}><use href="#camaron" transform="translate(760 240) scale(0.8)" /></g>
            <g className="camaron" style={css({ "--t": "19s", "--dx": "120px", "--d": "-9s" })}><use href="#camaron" transform="translate(600 315) scale(0.9)" /></g>
            <g className="camaron" style={css({ "--t": "14s", "--dx": "-100px", "--d": "-2s" })}><use href="#camaron" transform="translate(1000 300) scale(0.7)" /></g>
          </svg>
        </figure>
        <ol className="escena-pasos" aria-label="Partes del estanque">
          <li data-paso="alimento"><span className="step">01</span><p><strong>Alimento.</strong> Se reparte en el estanque según la dosis del día.</p></li>
          <li data-paso="charola"><span className="step">02</span><p><strong>Charola de muestreo.</strong> Lo que sobra en ella dice si el camarón comió menos de lo que se le dio.</p></li>
          <li data-paso="oxigeno"><span className="step">03</span><p><strong>Oxígeno disuelto.</strong> Con menos de 2.0 mg/L se suspende la alimentación.</p></li>
          <li data-paso="temperatura"><span className="step">04</span><p><strong>Temperatura.</strong> Fuera de 24–33 °C el camarón come menos.</p></li>
        </ol>
      </div>
    </section>
  );
}

// ───────── Simulador ─────────
type Campo = "peso" | "sobrante" | "temperatura" | "oxigeno";
const INICIALES: Record<Campo, number> = { peso: 12.5, sobrante: 10, temperatura: 28, oxigeno: 5 };
const RANGOS: Record<Campo, { min: number; max: number; step: number; etiqueta: string; formato: (v: number) => string }> = {
  peso: { min: 0.5, max: 35, step: 0.5, etiqueta: "Peso promedio", formato: (v) => `${fmt(v, 1)} g` },
  sobrante: { min: 0, max: 60, step: 1, etiqueta: "Sobrante en charola", formato: (v) => `${fmt(v, 0)} %` },
  temperatura: { min: 15, max: 38, step: 0.5, etiqueta: "Temperatura", formato: (v) => `${fmt(v, 1)} °C` },
  oxigeno: { min: 0, max: 8, step: 0.1, etiqueta: "Oxígeno disuelto", formato: (v) => `${fmt(v, 1)} mg/L` },
};
const CHIP = {
  sobrante: { ok: "Normal", warn: "Alto", danger: "Crítico" },
  temperatura: { ok: "Óptima", warn: "Fuera de rango", danger: "Extrema" },
  oxigeno: { ok: "Normal", warn: "Bajo", danger: "Suspende" },
} as const;
const FACTORES = [
  ["sobrante", "Factor sobrante"],
  ["temperatura", "Factor temperatura"],
  ["oxigeno", "Factor oxígeno"],
] as const;

function Simulador() {
  const [v, setV] = useState(INICIALES);
  const r = recomendarDosis({
    ...ESTANQUE,
    pesoPromedioG: v.peso,
    porcentajeSobranteCharola: v.sobrante,
    temperaturaC: v.temperatura,
    oxigenoMgL: v.oxigeno,
  });
  return (
    <div className="mt-10 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <form className="card space-y-6" data-reveal onSubmit={(e) => e.preventDefault()}>
        <p className="text-[13px] text-muted">Estanque de ejemplo: <span className="mono text-fg">1 ha · 20 camarones/m² · supervivencia 85 %</span></p>
        {(Object.keys(RANGOS) as Campo[]).map((c) => {
          const g = RANGOS[c];
          const f = c === "peso" ? null : r.factores[c];
          return (
            <div key={c}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={`sim-${c}`} className="label !mb-0">
                  {g.etiqueta}
                  {f && <span className={`chip estado-${f.nivel}`}>{CHIP[c as keyof typeof CHIP][f.nivel]}</span>}
                </label>
                <output htmlFor={`sim-${c}`} className="num text-paper">{g.formato(v[c])}</output>
              </div>
              <input
                id={`sim-${c}`}
                className="rango"
                type="range"
                min={g.min}
                max={g.max}
                step={g.step}
                value={v[c]}
                style={css({ "--p": `${((v[c] - g.min) / (g.max - g.min)) * 100}%` })}
                onChange={(e) => setV((s) => ({ ...s, [c]: Number(e.target.value) }))}
              />
            </div>
          );
        })}
        <Button type="button" variant="ghost" onClick={() => setV(INICIALES)}>Restablecer</Button>
      </form>

      <div data-reveal style={css({ "--d": "100ms" })}>
        <TarjetaResultado r={r} titulo="Dosis recomendada">
          <dl className="mt-6 space-y-3 text-[14px]">
            {FACTORES.map(([n, titulo]) => {
              const f = r.factores[n];
              return (
                <div key={n} className={`estado-${f.nivel}`}>
                  <div className="mb-1 flex justify-between"><dt>{titulo}</dt><dd className="num">×{fmt(f.factor)}</dd></div>
                  <div className="barra"><span style={css({ "--v": f.factor })} /></div>
                </div>
              );
            })}
          </dl>
          <dl className="metricas mt-6">
            <div className="metrica"><dt>Biomasa estimada</dt><dd>{fmt(r.biomasaEstimadaKg, 0)} kg</dd></div>
            <div className="metrica"><dt>Tasa base · FCA ref.</dt><dd>{fmt(r.tasaBasePct, 1)} % · {fmt(r.fcaEstimado, 1)}</dd></div>
          </dl>
          <p className="mt-4 text-[15px] leading-relaxed">{r.justificacion}</p>
        </TarjetaResultado>
      </div>
    </div>
  );
}

function BotonesHero() {
  const { data: sesion } = authClient.useSession();
  return (
    <div className="mt-8 flex flex-wrap items-center gap-3">
      <Button asChild className="!w-auto px-5">
        <Link to={sesion ? "/captura" : "/entrar"}>{sesion ? "Ir a la captura" : "Iniciar sesión"}</Link>
      </Button>
      <a href="#simulador" className="nav-link">Probar el simulador →</a>
    </div>
  );
}

const PASOS = [
  ["Elegir el estanque", "Cada estanque tiene su superficie, densidad de siembra y última biometría registrada."],
  ["Capturar lecturas de campo", "Porcentaje de sobrante en las charolas, temperatura del agua y oxígeno disuelto. Mientras escribes, cada campo indica si va a reducir la dosis. Si un campo queda vacío se usa la última lectura guardada."],
  ["Recibir la recomendación", "El sistema calcula la dosis en kg/día y explica en español por qué la ajustó. Es solo una vista previa: todavía no se guarda nada."],
  ["Confirmar lo aplicado", "El técnico registra la dosis que realmente aplicó. Se guardan ambas, la calculada y la aplicada, para comparar después."],
] as const;

const GLOSARIO = [
  ["Estanque", "Unidad de cultivo donde se siembra y engorda el camarón."],
  ["Charola de muestreo", "Bandeja sumergida con una porción del alimento; el sobrante indica si el camarón está comiendo menos de lo que se le da."],
  ["Biometría", "Muestreo periódico del peso promedio del camarón."],
  ["Biomasa", "Peso total estimado de camarón vivo en el estanque."],
  ["FCA", "Factor de Conversión Alimenticia: kg de alimento ÷ kg de biomasa ganada."],
  ["Oxígeno disuelto", "mg/L de oxígeno en el agua. Por debajo de 2.0 mg/L el camarón no asimila el alimento y alimentar empeora la calidad del agua."],
] as const;

const EQUIPO = [
  ["AF", "Aguilar Félix Jesús Antonio"],
  ["JL", "José Luiz López Bojórquez"],
  ["KC", "Kevin Jesús Cázarez Lara"],
  ["MO", "Manjarrez Oliva Mariana"],
] as const;

const TECNOLOGIA = [
  ["API", "Hono (TypeScript) con validación Zod y sesiones con Better Auth."],
  ["Datos", "PostgreSQL con Drizzle ORM y migraciones versionadas."],
  ["Web", "React, Vite y Tailwind, pensada para usarse desde el celular en campo."],
  ["Lógica", "Recomendador como función pura compartida entre API y web, con pruebas de paridad contra la versión original en Python."],
] as const;

export function Proyecto() {
  const raiz = useRef<HTMLDivElement>(null);
  useRevelar(raiz);
  useScroll(raiz);

  return (
    <div ref={raiz}>
      {/* Hero */}
      <section className="grid grid-cols-1 gap-12 pt-16 md:pt-24 lg:grid-cols-[1.1fr_1fr] lg:items-end">
        <div data-reveal-group>
          <p className="eyebrow mb-5">PROYECTO ESCOLAR · v1</p>
          <TituloPalabras texto="Alimentar al camarón con datos, no a ojo." />
          <p className="lead mt-6 max-w-[34rem]">
            Acuicontrol es una aplicación web que recomienda la dosis diaria de alimento para cada estanque de una granja
            camaronícola, a partir de lecturas que el técnico ya toma en campo. Sin sensores ni hardware IoT: solo un celular.
          </p>
          <BotonesHero />
        </div>
        <div className="hero-floor parallax" data-reveal style={css({ "--d": "350ms" })}>
          <TarjetaHero />
        </div>
      </section>

      {/* Cifras */}
      <section className="mt-20 border-y border-line" aria-label="El proyecto en cifras">
        <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
          <Cifra valor={3} etiqueta="lecturas de campo por día" />
          <Cifra valor={0} etiqueta="sensores IoT necesarios" />
          <Cifra valor={3} etiqueta="factores de corrección" />
          <Cifra valor={6} etiqueta="rangos de peso con tasa propia" />
        </dl>
      </section>

      <Escena />

      {/* Problema */}
      <section className="section" aria-labelledby="problema">
        <p className="eyebrow mb-6" data-reveal>02 · EL PROBLEMA</p>
        <TextoScroll
          id="problema"
          texto="El alimento es uno de los mayores costos de una granja. Si se da de más, se pierde y ensucia el agua. Si se da de menos, el camarón crece lento. Acuicontrol ajusta la dosis cada día con lo que de verdad pasa en el estanque."
        />
        <div className="mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2" data-reveal-group>
          <p className="text-[17px] leading-relaxed text-muted">
            En muchas granjas la ración diaria se decide con tablas fijas o por experiencia, sin medir cuánto alimento queda sin comer.
          </p>
          <p className="text-[17px] leading-relaxed text-muted">
            El indicador que lo mide es el <strong className="font-medium text-paper">FCA</strong> (Factor de Conversión Alimenticia): kilos de
            alimento por cada kilo de biomasa ganada. Mientras más bajo, más eficiente es la granja.
          </p>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="como-funciona" className="section grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.2fr]" aria-labelledby="flujo">
        <div data-reveal className="lg:sticky lg:top-24 lg:self-start">
          <p className="eyebrow mb-4">03 · CÓMO FUNCIONA</p>
          <h2 id="flujo" className="section-title">Cuatro pasos, desde la orilla del estanque.</h2>
          <Link to="/captura" className="nav-link -ml-3 mt-4">Abrir la captura →</Link>
        </div>
        <div className="timeline" id="timeline">
          <span className="timeline-fill" aria-hidden="true" />
          <ol className="space-y-10">
            {PASOS.map(([t, d], i) => (
              <li key={t} className="relative pl-12" data-reveal>
                <span className="nodo" aria-hidden="true">{i + 1}</span>
                <h3 className="text-[20px] tracking-[-0.012em]">{t}</h3>
                <p className="mt-2 text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Algoritmo */}
      <section className="section grid grid-cols-1 gap-10 lg:grid-cols-2" aria-labelledby="algoritmo">
        <div data-reveal>
          <p className="eyebrow mb-4">04 · EL CÁLCULO</p>
          <h2 id="algoritmo" className="section-title">Reglas zootécnicas explícitas, no una caja negra.</h2>
          <p className="lead mt-6">
            Cada recomendación se puede explicar paso a paso. Los factores de corrección se multiplican, así que la dosis nunca supera la base ni baja de cero.
          </p>
          <div className="mt-8 space-y-3" data-reveal-group>
            <p className="label !mb-0">1 · Biomasa</p>
            <div className="formula">{"biomasa_kg = densidad × hectáreas × 10 000\n           × supervivencia (0.85) × peso_g / 1000"}</div>
            <p className="label !mb-0 pt-2">2 · Dosis base</p>
            <div className="formula">dosis_base = biomasa_kg × tasa_base(peso) / 100</div>
            <p className="label !mb-0 pt-2">3 · Ajuste</p>
            <div className="formula">dosis = dosis_base × f_sobrante × f_temperatura × f_oxígeno</div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card card-hover overflow-x-auto !p-0" data-reveal>
            <table className="tabla">
              <caption className="px-3 pb-2 pt-4 text-left font-medium text-paper">Factores de corrección</caption>
              <thead><tr><th scope="col">Condición</th><th scope="col">Factor</th></tr></thead>
              <tbody>
                {([
                  ["warn", "Sobrante en charola > 15 %", "×0.90 – ×0.85"],
                  ["warn", "Sobrante > 30 % (crítico)", "×0.70"],
                  ["warn", "Temperatura fuera de 24–33 °C", "×0.85"],
                  ["warn", "Temperatura < 20 °C o > 35 °C", "×0.60"],
                  ["warn", "Oxígeno < 3.5 mg/L", "×0.50"],
                  ["danger", "Oxígeno < 2.0 mg/L: se suspende", "×0"],
                ] as const).map(([n, c, f]) => (
                  <tr key={c} className={`estado-${n}`}><td><span className="dot" />{c}</td><td className="mono">{f}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card card-hover overflow-x-auto !p-0" data-reveal style={css({ "--d": "100ms" })}>
            <table className="tabla">
              <caption className="px-3 pb-2 pt-4 text-left font-medium text-paper">Tasa base y FCA de referencia por peso</caption>
              <thead><tr><th scope="col">Peso promedio</th><th scope="col">Tasa base</th><th scope="col">FCA ref.</th></tr></thead>
              <tbody className="mono">
                {[["< 1 g", "15 %", "1.0"], ["1 – 3 g", "8 %", "1.2"], ["3 – 8 g", "6 %", "1.4"], ["8 – 15 g", "4.5 %", "1.6"], ["15 – 25 g", "3.5 %", "1.8"], ["≥ 25 g", "2.5 %", "2.0"]].map(([p, t, f]) => (
                  <tr key={p}><td>{p}</td><td>{t}</td><td>{f}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Simulador */}
      <section id="simulador" className="section" aria-labelledby="sim-titulo">
        <div data-reveal>
          <p className="eyebrow mb-4">05 · PRUÉBALO</p>
          <h2 id="sim-titulo" className="section-title max-w-[44rem]">Mueve las lecturas y mira cómo cambia la dosis.</h2>
          <p className="lead mt-6 max-w-[44rem]">Mismas reglas que el servidor, calculadas en tu navegador. No se guarda nada.</p>
        </div>
        <Simulador />
      </section>

      {/* Glosario */}
      <section className="section" aria-labelledby="glosario">
        <div data-reveal>
          <p className="eyebrow mb-4">06 · GLOSARIO</p>
          <h2 id="glosario" className="section-title">Términos del dominio.</h2>
        </div>
        <dl className="card mt-10 divide-y divide-line !p-0" data-reveal-group>
          {GLOSARIO.map(([t, d]) => (
            <div key={t} className="grid grid-cols-1 gap-1 p-5 md:grid-cols-[200px_1fr]"><dt className="text-paper">{t}</dt><dd className="text-muted">{d}</dd></div>
          ))}
        </dl>
      </section>

      {/* Tecnología y alcance */}
      <section className="section grid grid-cols-1 gap-10 lg:grid-cols-2" aria-labelledby="tecnologia">
        <div data-reveal>
          <p className="eyebrow mb-4">07 · TECNOLOGÍA</p>
          <h2 id="tecnologia" className="section-title">Simple de instalar, fácil de auditar.</h2>
          <ul className="mt-8 space-y-4" data-reveal-group>
            {TECNOLOGIA.map(([t, d]) => (
              <li key={t}><span className="tag">{t}</span><p className="mt-1">{d}</p></li>
            ))}
          </ul>
        </div>
        <div data-reveal style={css({ "--d": "100ms" })}>
          <p className="eyebrow mb-4">08 · ALCANCE DE LA v1</p>
          <h2 className="section-title">Lo que falta.</h2>
          <ul className="card mt-8 divide-y divide-line !p-0 text-[15px]">
            <li className="p-4">La supervivencia es una constante (85 %); todavía no se registra la mortalidad.</li>
            <li className="p-4">El FCA es una heurística por peso, no un modelo entrenado con datos históricos.</li>
            <li className="p-4">Aún no se instala como app ni funciona sin conexión.</li>
          </ul>
        </div>
      </section>

      {/* Equipo */}
      <section className="section" aria-labelledby="equipo">
        <div data-reveal>
          <p className="eyebrow mb-4">09 · EQUIPO</p>
          <h2 id="equipo" className="section-title">Quiénes lo hicimos.</h2>
        </div>
        <ul className="card mt-10 divide-y divide-line !p-0" data-reveal-group>
          {EQUIPO.map(([i, n]) => (
            <li key={i} className="flex items-center gap-4 p-5"><span className="iniciales">{i}</span><span className={cn("text-paper")}>{n}</span></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
