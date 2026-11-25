// Utilidades de animación compartidas. Todo respeta prefers-reduced-motion.
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const fmt = (n, dec = 2) =>
    Number(n).toLocaleString("es-MX", { minimumFractionDigits: dec, maximumFractionDigits: dec });

  // Elementos con [data-reveal] aparecen al entrar en pantalla, tanto bajando como subiendo:
  // al salir se ocultan y recuerdan por qué borde salieron, para volver a entrar desde ese lado.
  // [data-reveal-group] escalona a sus hijos.
  function revelar(root = document) {
    for (const grupo of root.querySelectorAll("[data-reveal-group]")) {
      [...grupo.children].forEach((hijo, i) => {
        hijo.setAttribute("data-reveal", "");
        hijo.style.setProperty("--d", `${i * 70}ms`);
      });
    }
    const elementos = root.querySelectorAll("[data-reveal]");
    if (reduceMotion || !("IntersectionObserver" in window)) {
      elementos.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    // Histéresis: se muestra con ≥10 % visible y se oculta solo al salir del todo, para que el
    // desplazamiento de la propia animación no lo haga parpadear en el borde.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target;
          if (e.intersectionRatio >= 0.1 && !el.classList.contains("is-visible")) {
            // La dirección se decide al entrar (no al salir) para cubrir saltos con Fin/Inicio o anclas:
            // si aparece por la mitad superior de la ventana, viene de arriba. Se fija sin transición.
            const arriba = e.boundingClientRect.top < (e.rootBounds?.height ?? window.innerHeight) / 2;
            if (el.classList.contains("desde-arriba") !== arriba) {
              el.style.transition = "none";
              el.classList.toggle("desde-arriba", arriba);
              void el.offsetWidth;
              el.style.transition = "";
            }
            el.classList.add("is-visible");
            el.dispatchEvent(new CustomEvent("revelado"));
          } else if (!e.isIntersecting && el.classList.contains("is-visible")) {
            el.classList.remove("is-visible");
          }
        }
      },
      { threshold: [0, 0.1] }
    );
    elementos.forEach((el) => io.observe(el));
  }

  // Anima el texto de un elemento desde su valor actual (o `desde`) hasta `hasta`.
  const animando = new WeakMap();
  function contar(el, hasta, { dec = 2, dur = 650, desde, prefijo = "", sufijo = "" } = {}) {
    const inicio = desde ?? Number(el.dataset.valor ?? 0);
    el.dataset.valor = hasta;
    cancelAnimationFrame(animando.get(el));
    if (reduceMotion || inicio === hasta) {
      el.textContent = prefijo + fmt(hasta, dec) + sufijo;
      return;
    }
    const t0 = performance.now();
    const paso = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = prefijo + fmt(inicio + (hasta - inicio) * ease, dec) + sufijo;
      if (p < 1) animando.set(el, requestAnimationFrame(paso));
    };
    animando.set(el, requestAnimationFrame(paso));
  }

  // Reinicia una animación CSS de entrada (para tarjetas que se vuelven a pintar).
  function reanimar(el, clase = "anim-in") {
    el.classList.remove(clase);
    void el.offsetWidth;
    el.classList.add(clase);
  }

  document.documentElement.classList.add("js");
  window.anim = { reduceMotion, revelar, contar, reanimar, fmt };
})();
