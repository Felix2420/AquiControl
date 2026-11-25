const estanqueSelect = document.getElementById("estanque-select");
const form = document.getElementById("captura-form");
const calcularBtn = document.getElementById("calcular-btn");
const resultCard = document.getElementById("resultado");
const confirmarCard = document.getElementById("confirmar");
const registrarBtn = document.getElementById("registrar-btn");
const dosisAplicadaInput = document.getElementById("dosis_aplicada_kg");
const confirmarSuspension = document.getElementById("confirmar-suspension");
const confirmarSuspensionCheck = document.getElementById("confirmar-suspension-check");
const historialList = document.getElementById("historial");
const toast = document.getElementById("toast");

const OXIGENO_SUSPENSION = 2.0;

// Rangos alineados con la validación de Pydantic en el backend.
const REGLAS = {
  porcentaje_sobrante: { min: 0, max: 100, nombre: "El sobrante" },
  temperatura_c: { min: 0, max: 45, nombre: "La temperatura" },
  oxigeno_mg_l: { min: 0, max: 20, nombre: "El oxígeno" },
  dosis_aplicada_kg: { min: 0, nombre: "La dosis", requerido: true },
};

let ultimaRecomendacion = null;
let suspendida = false;

// Fecha local (no UTC): en México toISOString() adelanta el día por la tarde/noche.
function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const fmt = (n, dec = 2) =>
  Number(n).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });

// ---------- Utilidades de UI ----------
let toastTimer = null;
function mostrarToast(mensaje, tipo = "ok") {
  toast.textContent = mensaje;
  toast.className = `toast${tipo === "error" ? " toast-error" : ""}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add("is-hiding");
    toastTimer = setTimeout(() => toast.classList.add("hidden"), 300);
  }, 4000);
}

function cargando(boton, activo) {
  boton.disabled = activo;
  boton.setAttribute("aria-busy", String(activo));
  boton.querySelector(".spinner").classList.toggle("hidden", !activo);
}

function marcarError(id, mensaje) {
  const input = document.getElementById(id);
  const ayuda = document.getElementById(`${id}-ayuda`);
  if (mensaje) {
    if (input.getAttribute("aria-invalid") !== "true") window.anim.reanimar(input, "anim-shake");
    input.setAttribute("aria-invalid", "true");
    ayuda.textContent = mensaje;
    ayuda.classList.add("is-error");
  } else {
    input.removeAttribute("aria-invalid");
    ayuda.textContent = ayuda.dataset.ayuda;
    ayuda.classList.remove("is-error");
  }
}

// Devuelve el número, null si está vacío, o undefined si es inválido (y marca el error).
function leerCampo(id) {
  const regla = REGLAS[id];
  const raw = document.getElementById(id).value.trim();
  if (raw === "") {
    if (regla.requerido) {
      marcarError(id, `${regla.nombre} es obligatoria.`);
      return undefined;
    }
    marcarError(id, null);
    return null;
  }
  const valor = Number(raw);
  if (!Number.isFinite(valor)) {
    marcarError(id, "Escribe un número válido.");
    return undefined;
  }
  if (regla.min !== undefined && valor < regla.min) {
    marcarError(id, `${regla.nombre} no puede ser menor que ${regla.min}.`);
    return undefined;
  }
  if (regla.max !== undefined && valor > regla.max) {
    marcarError(id, `${regla.nombre} no puede ser mayor que ${regla.max}.`);
    return undefined;
  }
  marcarError(id, null);
  return valor;
}

for (const id of Object.keys(REGLAS)) {
  document.getElementById(id).addEventListener("blur", () => leerCampo(id));
}

// Indicador en vivo junto a cada lectura: muestra qué factor aplicará el backend.
const FACTOR_POR_CAMPO = {
  porcentaje_sobrante: window.reglas.factorSobrante,
  temperatura_c: window.reglas.factorTemperatura,
  oxigeno_mg_l: window.reglas.factorOxigeno,
};
const TEXTO_NIVEL = {
  porcentaje_sobrante: { ok: "Normal", warn: "Alto", danger: "Crítico" },
  temperatura_c: { ok: "Óptima", warn: "Fuera de rango", danger: "Extrema" },
  oxigeno_mg_l: { ok: "Normal", warn: "Bajo", danger: "Suspende" },
};

function actualizarChip(id) {
  const chip = document.querySelector(`[data-chip="${id}"]`);
  const raw = document.getElementById(id).value.trim();
  const valor = Number(raw);
  if (raw === "" || !Number.isFinite(valor)) {
    chip.textContent = "";
    chip.className = "chip";
    return;
  }
  const { factor, nivel } = FACTOR_POR_CAMPO[id](valor);
  chip.className = `chip estado-${nivel}`;
  chip.textContent = factor === 1 ? TEXTO_NIVEL[id][nivel] : `${TEXTO_NIVEL[id][nivel]} ×${fmt(factor)}`;
}

for (const id of Object.keys(FACTOR_POR_CAMPO)) {
  document.getElementById(id).addEventListener("input", () => actualizarChip(id));
}

// ---------- Estanques e historial ----------
async function cargarEstanques() {
  const estanques = await window.api.apiGet("/estanques");
  estanqueSelect.innerHTML = "";
  if (estanques.length === 0) {
    const opt = document.createElement("option");
    opt.textContent = "No hay estanques registrados";
    estanqueSelect.appendChild(opt);
    calcularBtn.disabled = true;
    return;
  }
  for (const e of estanques) {
    const opt = document.createElement("option");
    opt.value = e.id;
    opt.textContent = `${e.identificador_estanque} (granja ${e.granja_id})`;
    estanqueSelect.appendChild(opt);
  }
  estanqueSelect.disabled = false;
  await cargarHistorial();
}

async function cargarHistorial() {
  const estanqueId = estanqueSelect.value;
  if (!estanqueId) return;
  historialList.innerHTML = Array.from(
    { length: 3 },
    () => '<li class="py-3 flex items-center justify-between gap-4"><span class="skeleton h-4 w-14"></span><span class="skeleton h-4 flex-1 max-w-[60%]"></span></li>'
  ).join("");
  try {
    const registros = (await window.api.apiGet(`/estanques/${estanqueId}/alimentacion`)).slice(0, 5);
    historialList.innerHTML = "";
    if (registros.length === 0) {
      historialList.innerHTML = '<li class="py-2 text-muted text-sm">Aún no hay dosis registradas.</li>';
      return;
    }
    const maximo = Math.max(...registros.map((r) => Math.max(r.dosis_aplicada_kg ?? 0, r.dosis_calculada_kg)), 1);
    registros.forEach((r, i) => {
      const aplicada = r.dosis_aplicada_kg ?? r.dosis_calculada_kg;
      const li = document.createElement("li");
      li.className = "py-3 grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 anim-in";
      li.style.animationDelay = `${i * 60}ms`;
      const fecha = document.createElement("span");
      fecha.className = "text-[13px] text-muted";
      fecha.textContent = new Date(`${r.fecha}T00:00:00`).toLocaleDateString("es-MX", {
        day: "numeric",
        month: "short",
      });
      // Barra = dosis aplicada; marca vertical = dosis recomendada.
      const barra = document.createElement("div");
      barra.className = "relative";
      barra.innerHTML = `<div class="barra"><span style="--v: 0"></span></div>
        <span class="absolute -top-1 h-[14px] w-px bg-[var(--muted)]" style="left: ${(r.dosis_calculada_kg / maximo) * 100}%"></span>`;
      const valores = document.createElement("span");
      valores.className = "num text-right text-[14px]";
      valores.innerHTML = `<span class="text-paper">${fmt(aplicada)}</span><span class="text-muted"> / ${fmt(r.dosis_calculada_kg)} kg</span>`;
      li.append(fecha, barra, valores);
      historialList.appendChild(li);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => barra.querySelector(".barra > span").style.setProperty("--v", aplicada / maximo))
      );
    });
  } catch (err) {
    historialList.innerHTML = "";
    const li = document.createElement("li");
    li.className = "py-2 text-sm text-danger";
    li.textContent = `No se pudo cargar el historial: ${err.message}`;
    historialList.appendChild(li);
  }
}

estanqueSelect.addEventListener("change", () => {
  // Una recomendación es válida solo para el estanque en el que se calculó.
  ultimaRecomendacion = null;
  resultCard.classList.add("hidden");
  confirmarCard.classList.add("hidden");
  registrarBtn.disabled = true;
  cargarHistorial();
});

// ---------- Recomendación ----------
function estadoPorFactor(factor) {
  if (factor === 0) return { clase: "estado-danger", texto: "Suspendida" };
  if (factor < 1) return { clase: "estado-warn", texto: "Reducida" };
  return { clase: "estado-ok", texto: "Normal" };
}

const ICONO_ESTADO = {
  "estado-ok": '<path d="M20 6 9 17l-5-5" />',
  "estado-warn": '<path d="M12 9v4M12 17h.01" /><circle cx="12" cy="12" r="10" />',
  "estado-danger": '<path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" /><path d="M12 9v4M12 17h.01" />',
};

function svgIcono(clase, tam = "w-4 h-4") {
  return `<svg class="${tam} shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONO_ESTADO[clase]}</svg>`;
}

function mostrarRecomendacion(rec, oxigeno) {
  const estado = estadoPorFactor(rec.factor_ajuste_total);
  const dosisBase = (rec.biomasa_estimada_kg * rec.tasa_base_pct) / 100;
  const reduccion = Math.round((1 - rec.factor_ajuste_total) * 100);
  suspendida = rec.factor_ajuste_total === 0 || (oxigeno !== null && oxigeno < OXIGENO_SUSPENSION);

  resultCard.className = `card result-card ${estado.clase}`;
  resultCard.innerHTML = `
    <div class="flex items-center justify-between gap-3 mb-2">
      <h2 id="paso-3" class="card-title !mb-0"><span class="step">03</span>Recomendación</h2>
      <span class="badge">${svgIcono(estado.clase)}${estado.texto}</span>
    </div>
    ${
      suspendida
        ? `<div class="alerta mb-3" role="alert">${svgIcono("estado-danger", "w-5 h-5 mt-0.5")}
             <span>Alimentación suspendida: oxígeno disuelto por debajo de ${OXIGENO_SUSPENSION.toFixed(1)} mg/L.</span></div>`
        : ""
    }
    <p class="dosis-valor"><span data-dosis>${fmt(dosisBase)}</span> <span class="text-lg text-muted">kg/día</span></p>
    <div class="mt-4">
      <div class="flex justify-between text-[12px] text-muted mb-1.5">
        <span>Dosis base <span class="num">${fmt(dosisBase)} kg</span></span>
        <span>${reduccion > 0 ? `−${reduccion}%` : "sin ajuste"}</span>
      </div>
      <div class="barra"><span data-barra style="--v: 1"></span></div>
    </div>
    <dl class="metricas mt-3">
      <div class="metrica"><dt>Biomasa estimada</dt><dd>${fmt(rec.biomasa_estimada_kg, 0)} kg</dd></div>
      <div class="metrica"><dt>Tasa base</dt><dd>${fmt(rec.tasa_base_pct)} %</dd></div>
      <div class="metrica"><dt>Factor de ajuste</dt><dd>×${fmt(rec.factor_ajuste_total)}</dd></div>
      <div class="metrica"><dt>FCA estimado</dt><dd>${fmt(rec.fca_estimado)}</dd></div>
    </dl>
    <p class="mt-3 leading-relaxed" data-justificacion></p>
  `;
  // La justificación viene del backend: se inserta como texto, no como HTML.
  resultCard.querySelector("[data-justificacion]").textContent = rec.justificacion;
  window.anim.reanimar(resultCard);
  window.anim.contar(resultCard.querySelector("[data-dosis]"), rec.dosis_recomendada_kg, { desde: dosisBase, dur: 900 });
  // La barra arranca llena (dosis base) y se encoge hasta el factor aplicado.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => resultCard.querySelector("[data-barra]").style.setProperty("--v", rec.factor_ajuste_total))
  );

  dosisAplicadaInput.value = rec.dosis_recomendada_kg;
  marcarError("dosis_aplicada_kg", null);
  confirmarSuspensionCheck.checked = false;
  confirmarSuspension.classList.toggle("hidden", !suspendida);
  if (confirmarCard.classList.contains("hidden")) {
    confirmarCard.classList.remove("hidden");
    confirmarCard.style.animationDelay = "120ms";
    window.anim.reanimar(confirmarCard);
  }
  actualizarRegistrarBtn();
}

function actualizarRegistrarBtn() {
  registrarBtn.disabled = !ultimaRecomendacion || (suspendida && !confirmarSuspensionCheck.checked);
}
confirmarSuspensionCheck.addEventListener("change", actualizarRegistrarBtn);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const estanqueId = estanqueSelect.value;
  if (!estanqueId) return;

  const sobrante = leerCampo("porcentaje_sobrante");
  const temperatura = leerCampo("temperatura_c");
  const oxigeno = leerCampo("oxigeno_mg_l");
  if ([sobrante, temperatura, oxigeno].includes(undefined)) {
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  cargando(calcularBtn, true);
  try {
    const recomendacion = await window.api.apiPost(`/estanques/${estanqueId}/dosis/recomendacion`, {
      porcentaje_sobrante_charola: sobrante,
      temperatura_c: temperatura,
      oxigeno_mg_l: oxigeno,
    });
    ultimaRecomendacion = recomendacion;
    mostrarRecomendacion(recomendacion, oxigeno);
    resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (err) {
    ultimaRecomendacion = null;
    resultCard.className = "card result-card estado-danger";
    resultCard.innerHTML = `<div class="alerta" role="alert">${svgIcono("estado-danger", "w-5 h-5 mt-0.5")}<span data-msg></span></div>`;
    resultCard.querySelector("[data-msg]").textContent = `No se pudo calcular la recomendación: ${err.message}`;
    window.anim.reanimar(resultCard);
    confirmarCard.classList.add("hidden");
  } finally {
    cargando(calcularBtn, false);
  }
});

// ---------- Registro ----------
registrarBtn.addEventListener("click", async () => {
  const estanqueId = estanqueSelect.value;
  if (!estanqueId || !ultimaRecomendacion) return;

  const aplicada = leerCampo("dosis_aplicada_kg");
  if (aplicada === undefined) {
    dosisAplicadaInput.focus();
    return;
  }

  cargando(registrarBtn, true);
  try {
    await window.api.apiPost(`/estanques/${estanqueId}/alimentacion`, {
      fecha: hoyISO(),
      dosis_calculada_kg: ultimaRecomendacion.dosis_recomendada_kg,
      dosis_aplicada_kg: aplicada,
      fca_proyectado: ultimaRecomendacion.fca_estimado,
      explicacion_ia: ultimaRecomendacion.justificacion,
    });
    mostrarToast(`Dosis de ${fmt(aplicada)} kg registrada correctamente.`);
    await cargarHistorial();
  } catch (err) {
    mostrarToast(`Error al registrar: ${err.message}`, "error");
  } finally {
    cargando(registrarBtn, false);
    actualizarRegistrarBtn();
  }
});

document.getElementById("fecha-hoy").textContent = new Date()
  .toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" })
  .toUpperCase();
window.anim.revelar();

cargarEstanques().catch((err) => {
  estanqueSelect.innerHTML = "<option>Sin conexión con el servidor</option>";
  calcularBtn.disabled = true;
  mostrarToast(`No se pudieron cargar los estanques: ${err.message}`, "error");
});
