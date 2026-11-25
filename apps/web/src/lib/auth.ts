import { createAuthClient } from "better-auth/react";

// Mismo origen: en dev Vite hace proxy de /api hacia la API (puerto 8000).
export const authClient = createAuthClient({ baseURL: window.location.origin });
