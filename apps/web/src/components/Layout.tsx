import { useEffect } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { authClient } from "@/lib/auth";
import { useUi } from "@/store/ui";

function Logo() {
  return (
    <span className="logo">
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
        <path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1" />
      </svg>
      Acuicontrol
    </span>
  );
}

const enlace = ({ isActive }: { isActive: boolean }) => "nav-link" + (isActive ? " is-active" : "");

function ToastHost() {
  const toast = useUi((s) => s.toast);
  const ocultar = useUi((s) => s.ocultarToast);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(ocultar, 4000);
    return () => clearTimeout(t);
  }, [toast, ocultar]);
  if (!toast) return <div className="sr-only" role="status" aria-live="polite" />;
  return (
    <div key={toast.id} className={`toast${toast.tipo === "error" ? " toast-error" : ""}`} role="status" aria-live="polite">
      {toast.mensaje}
    </div>
  );
}

export function Layout() {
  const { data: sesion } = authClient.useSession();
  // La página de inicio (información del proyecto) es ancha y pública; el resto es de formulario.
  const inicio = useLocation().pathname === "/";
  const ancho = inicio ? "max-w-[1200px]" : "max-w-xl";
  return (
    <>
      <a href="#contenido" className="skip-link">Saltar al contenido</a>
      <header className="topbar">
        <nav className={`mx-auto flex h-14 items-center justify-between gap-3 px-4 ${ancho}`} aria-label="Principal">
          <NavLink to="/" aria-label="Acuicontrol, inicio"><Logo /></NavLink>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={enlace}>Proyecto</NavLink>
            {sesion && (
              <>
                <NavLink to="/captura" className={enlace}>Captura</NavLink>
                <NavLink to="/configurar" className={enlace}>Granja</NavLink>
                <button className="nav-link text-muted" onClick={() => authClient.signOut().then(() => location.assign("/"))}>
                  Salir
                </button>
              </>
            )}
            {!sesion && <Link to="/entrar" className="btn btn-accent !min-h-9 !w-auto px-4">Entrar</Link>}
          </div>
        </nav>
      </header>
      <main id="contenido" className={`mx-auto px-4 ${ancho} ${inicio ? "pb-24" : "space-y-3 py-8"}`}>
        <Outlet />
      </main>
      {inicio && (
        <footer className="border-t border-line">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-8 text-[13px] text-muted">
            <span>Acuicontrol · v1</span>
            <Link to="/entrar" className="hover:text-paper">Iniciar sesión →</Link>
          </div>
        </footer>
      )}
      <ToastHost />
    </>
  );
}
