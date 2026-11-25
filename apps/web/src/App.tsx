import { Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { authClient } from "@/lib/auth";
import { Captura } from "@/pages/Captura";
import { Configurar } from "@/pages/Configurar";
import { Login } from "@/pages/Login";
import { Proyecto } from "@/pages/Proyecto";

function Protegida({ children }: { children: React.ReactNode }) {
  const { data: sesion, isPending } = authClient.useSession();
  if (isPending) return <div className="mx-auto max-w-xl px-4 py-16"><div className="skeleton h-12 w-full" /></div>;
  if (!sesion) return <Navigate to="/entrar" replace />;
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<Login />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Proyecto />} />
        <Route path="/captura" element={<Protegida><Captura /></Protegida>} />
        <Route path="/configurar" element={<Protegida><Configurar /></Protegida>} />
        <Route path="/proyecto" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
