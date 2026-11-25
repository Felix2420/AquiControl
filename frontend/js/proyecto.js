const { revelar, contar, reanimar, reduceMotion, fmt } = window.anim;
const { recomendar } = window.reglas;

// Estanque de ejemplo (coincide con los datos demo: 1 ha, 20 camarones/m²).
const ESTANQUE = { densidad: 20, hectareas: 1 };

// Primero: marca los elementos que aparecen al hacer scroll (los grupos asignan [data-reveal] a sus hijos).
revelar();

const ESTADO = {
  ok: { clase: "estado-ok", texto: "Normal" },
  warn: { clase: "estado-warn", texto: "Reducida" },
  danger: { clase: "estado-danger", texto: "Suspendida" },
};

function estadoDe(total) {
  if (total === 0) return ESTADO.danger;
  if (total < 1) return ESTADO.warn;
  return ESTADO.ok;
}

// Pinta un resultado de reglas.recomendar() en una tarjeta con [data-dosis], [data-barra], etc.
function pintarTarjeta(card, r) {
  const estado = estadoDe(r.total);
  card.classList.remove("estado-ok", "estado-warn", "estado-danger");
  card.classList.add(estado.clase);
  const badge = card.querySelector("[data-badge]");
  if (badge.textContent !== estado.texto) {
    badge.textContent = estado.texto;
    reanimar(badge);
  }
  contar(card.querySelector("[data-dosis]"), r.dosis);
  card.querySelector("[data-base]").textContent = `${fmt(r.base)} kg`;
  const reduccion = Math.round((1 - r.total) * 100);
  card.querySelector("[data-reduccion]").textContent = reduccion > 0 ? `−${reduccion}%` : "sin ajuste";
  card.querySelector("[data-barra]").style.setProperty("--v", r.total);
  card.querySelector("[data-just]").textContent = r.justificacion;
}

// ---------- Tarjeta del hero: recorre tres escenarios reales ----------
const ESCENARIOS = [
  { sobrante: 5, temperatura: 28, oxigeno: 5 },
  { sobrante: 20, temperatura: 28, oxigeno: 3 },
  { sobrante: 20, temperatura: 28, oxigeno: 1.5 },
];
const heroCard = document.getElementById("hero-card");
let escenario = 0;

function pintarHero() {
  const lect = ESCENARIOS[escenario];
  const r = recomendar({ ...ESTANQUE, peso: 12.5, ...lect });
  pintarTarjeta(heroCard, r);
  heroCard.querySelector('[data-lect="sobrante"]').textContent = `${lect.sobrante} %`;
  heroCard.querySelector('[data-lect="temperatura"]').textContent = `${lect.temperatura} °C`;
  heroCard.querySelector('[data-lect="oxigeno"]').textContent = fmt(lect.oxigeno, 1);
}
pintarHero();
if (!reduceMotion) {
  setInterval(() => {
    if (document.hidden) return;
    escenario = (escenario + 1) % ESCENARIOS.length;
    pintarHero();
  }, 3800);
}

// ---------- Cifras que cuentan al aparecer ----------
for (const el of document.querySelectorAll("[data-contar]")) {
  const destino = Number(el.dataset.contar);
  const dec = Number(el.dataset.dec ?? 0);
  // Vuelve a contar cada vez que la cifra reaparece (también al subir por la página).
  const iniciar = () => contar(el, destino, { dec, desde: destino === 0 ? 9 : 0, dur: 1100 });
  const contenedor = el.closest("[data-reveal]");
  if (reduceMotion || !contenedor) iniciar();
  else contenedor.addEventListener("revelado", iniciar);
}

// ---------- Simulador ----------
const CAMPOS = ["peso", "sobrante", "temperatura", "oxigeno"];
const INICIALES = { peso: 12.5, sobrante: 10, temperatura: 28, oxigeno: 5 };
const FORMATO = {
  peso: (v) => `${fmt(v, 1)} g`,
  sobrante: (v) => `${fmt(v, 0)} %`,
  temperatura: (v) => `${fmt(v, 1)} °C`,
  oxigeno: (v) => `${fmt(v, 1)} mg/L`,
};
const CHIP = {
  sobrante: { ok: "Normal", warn: "Alto", danger: "Crítico" },
  temperatura: { ok: "Óptima", warn: "Fuera de rango", danger: "Extrema" },
  oxigeno: { ok: "Normal", warn: "Bajo", danger: "Suspende" },
};
const simCard = document.getElementById("sim-card");
const entradas = Object.fromEntries(CAMPOS.map((c) => [c, document.getElementById(`sim-${c}`)]));

function pintarRango(input) {
  const p = ((input.value - input.min) / (input.max - input.min)) * 100;
  input.style.setProperty("--p", `${p}%`);
}

function simular() {
  const v = Object.fromEntries(CAMPOS.map((c) => [c, Number(entradas[c].value)]));
  const r = recomendar({ ...ESTANQUE, ...v });
  for (const c of CAMPOS) {
    document.querySelector(`[data-out="${c}"]`).textContent = FORMATO[c](v[c]);
    pintarRango(entradas[c]);
  }
  for (const [nombre, f] of Object.entries(r.factores)) {
    const chip = document.querySelector(`[data-sim-chip="${nombre}"]`);
    chip.className = `chip estado-${f.nivel}`;
    chip.textContent = CHIP[nombre][f.nivel];
    const fila = simCard.querySelector(`[data-factor="${nombre}"]`);
    fila.className = `estado-${f.nivel}`;
    fila.querySelector("[data-fval]").textContent = `×${fmt(f.factor)}`;
    fila.querySelector(".barra > span").style.setProperty("--v", f.factor);
  }
  simCard.querySelector("[data-biomasa]").textContent = `${fmt(r.biomasa, 0)} kg`;
  simCard.querySelector("[data-tasa]").textContent = `${fmt(r.tasa, 1)} % · ${fmt(r.fca, 1)}`;
  pintarTarjeta(simCard, r);
}

for (const c of CAMPOS) entradas[c].addEventListener("input", simular);
document.getElementById("sim-reset").addEventListener("click", () => {
  for (const c of CAMPOS) entradas[c].value = INICIALES[c];
  simular();
});
simular();

// ---------- Animaciones ligadas al scroll (estilo Apple) ----------
const clamp01 = (x) => Math.min(1, Math.max(0, x));

// Título del hero: cada palabra entra por separado.
for (const titulo of document.querySelectorAll("[data-palabras]")) {
  const palabras = titulo.textContent.trim().split(/\s+/);
  titulo.setAttribute("aria-label", titulo.textContent.trim());
  titulo.innerHTML = palabras
    .map((w, i) => `<span class="palabra" aria-hidden="true" style="--i: ${i}">${w}${i < palabras.length - 1 ? " " : ""}</span>`)
    .join("");
}

// Frase grande: se ilumina palabra por palabra mientras cruza la pantalla.
const frases = [...document.querySelectorAll("[data-texto-scroll]")].map((el) => {
  const palabras = el.textContent.trim().split(/\s+/);
  el.setAttribute("aria-label", el.textContent.trim());
  el.innerHTML = palabras.map((w) => `<span class="w" aria-hidden="true">${w}</span>`).join(" ");
  return { el, spans: [...el.querySelectorAll(".w")] };
});

const timeline = document.getElementById("timeline");
const relleno = timeline.querySelector(".timeline-fill");
const parallax = document.querySelector(".parallax");
const escena = document.getElementById("escena");
const marco = escena.querySelector(".escena-marco");
const pasos = [...escena.querySelectorAll(".escena-pasos li")];
const ORDEN_PASOS = pasos.map((li) => li.dataset.paso);

function alHacerScroll() {
  pendiente = false;
  const vh = window.innerHeight;

  // Línea de tiempo de "Cómo funciona"
  const rt = timeline.getBoundingClientRect();
  relleno.style.setProperty("--p", clamp01((vh * 0.6 - rt.top) / rt.height));

  // Parallax de la tarjeta del hero
  const y = window.scrollY;
  if (y < vh * 1.5) {
    parallax.style.setProperty("--py", `${y * -0.12}px`);
    parallax.style.setProperty("--ps", 1 - clamp01(y / vh) * 0.04);
  }

  // Escena fija: 0–20 % zoom de entrada, luego un paso por cada 20 %.
  const re = escena.getBoundingClientRect();
  const recorrido = re.height - vh;
  const p = clamp01(-re.top / recorrido);
  const zoomP = clamp01(p / 0.2);
  marco.style.setProperty("--zoom", 0.86 + 0.14 * zoomP);
  marco.style.setProperty("--zoom-p", zoomP);
  const indice = p < 0.2 ? -1 : Math.min(ORDEN_PASOS.length - 1, Math.floor((p - 0.2) / 0.2));
  const paso = indice < 0 ? "todo" : ORDEN_PASOS[indice];
  if (marco.dataset.paso !== paso) {
    marco.dataset.paso = paso;
    pasos.forEach((li, i) => {
      li.classList.toggle("activo", i === indice);
      li.classList.toggle("pasado", i < indice);
    });
  }

  // Frases que se iluminan: de cuando su borde superior entra al 85 % hasta que llega al 35 %.
  for (const { el, spans } of frases) {
    const r = el.getBoundingClientRect();
    const pf = clamp01((vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.5));
    const encendidas = Math.round(pf * spans.length);
    spans.forEach((sp, i) => sp.classList.toggle("on", i < encendidas));
  }
}

let pendiente = false;
const programar = () => {
  if (!pendiente) {
    pendiente = true;
    requestAnimationFrame(alHacerScroll);
  }
};
if (!reduceMotion) {
  window.addEventListener("scroll", programar, { passive: true });
  window.addEventListener("resize", programar);
  alHacerScroll();
} else {
  relleno.style.setProperty("--p", 1);
}
