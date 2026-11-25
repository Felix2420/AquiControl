// Mapea los tokens de css/app.css a utilidades de Tailwind (bg-bg, text-muted, border-line…).
// Compartido por index.html y proyecto.html; se carga justo después del CDN de Tailwind.
tailwind.config = {
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        line: "var(--border)",
        "line-strong": "var(--border-strong)",
        paper: "var(--paper)",
        fg: "var(--text)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        danger: "var(--danger)",
        teal: "var(--teal)",
      },
      fontFamily: {
        sans: ['"Inter"', "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      fontWeight: { medium: "510", semibold: "590" },
    },
  },
};
