# Guion de demo (5–7 minutos)

## Antes de presentar (checklist)
1. PostgreSQL corriendo (servicio `postgresql-x64-18`).
2. `.env` en la raíz con `DATABASE_URL=postgresql://postgres:<pwd>@localhost:5432/acuicontrol_app`.
3. `pnpm seed -- --reset` (regenera 3 estanques con 14 días de historial **hasta ayer**; hoy queda vacío para capturarlo en vivo).
4. `pnpm dev` y abrir http://localhost:5173. La consola debe decir `base de datos: Postgres (DATABASE_URL)`.
5. Cerrar sesión para empezar en la página de inicio. No requiere internet (las fuentes caen a la del sistema).

Usuarios (contraseña `demo12345`): `demo@acuicontrol.test` (admin), `biologo@acuicontrol.test`, `tecnico@acuicontrol.test`.

## Recorrido
1. **Inicio (`/`) · 1 min.** El problema: el alimento es el mayor costo y se reparte "a ojo". Bajar por la escena del estanque (alimento, charola, oxígeno, temperatura) y la tarjeta animada del hero: tres escenarios reales (Normal → Reducida → Suspendida).
2. **Simulador · 1 min.** Mover sobrante, temperatura y oxígeno y ver cómo cambian los factores y la dosis. Bajar el oxígeno a < 2.0: se suspende la alimentación.
3. **Entrar · 30 s.** Iniciar sesión con el admin demo. Mencionar cuentas con Better Auth y roles por granja.
4. **Captura (`/captura`) · 2 min.** Estanque **E3** (el que tiene 18 % de sobrante hoy): *Calcular recomendación* sin escribir nada → usa las últimas lecturas guardadas → **134.95 kg · Reducida (−10 %)** con la justificación en español. Cambiar el oxígeno a 1.5 → **Suspendida**, pide confirmar. Volver a un valor normal y **Registrar dosis aplicada** (se guarda calculada vs aplicada).
5. **Historial · 1 min.** Gráfica de dosis recomendada vs aplicada de 14 días (los puntos rojos son días de alimentación suspendida), lista de los últimos 5 y **Descargar CSV** (abrir en Excel).
6. **Granja (`/configurar`) · 1 min.** Alta de granja/estanques/biometría y equipo. Entrar como **técnico** y mostrar que no puede crear estanques ni biometría (permisos por rol).
7. **Cierre.** Qué sigue: registrar mortalidad real (hoy la supervivencia es 85 %), modelo de FCA entrenado con datos históricos, modo offline/PWA.

## Preguntas probables
- **¿Por qué reglas y no machine learning?** Es determinista, explicable ("−10 % por 18 % de sobrante") y no necesita datos históricos para empezar. Con el historial que ya se guarda (calculada vs aplicada) se puede entrenar un modelo después.
- **¿De dónde salen los porcentajes y umbrales?** Tablas de referencia zootécnicas (tasa base por peso, temperatura óptima 24–33 °C, oxígeno mínimo). Están separadas del algoritmo (`packages/reglas`) para ajustarlas sin tocar la lógica.
- **¿Cómo sabemos que el cálculo es correcto?** La versión TypeScript se verifica contra la original en Python con cientos de combinaciones (`paridad.test.ts`), y hay pruebas de la API.
- **¿Y la supervivencia?** Constante de 85 %, limitación conocida: aún no hay registro de mortalidad.
- **¿Necesita sensores?** No: solo un celular para capturar sobrante, temperatura y oxígeno que el técnico ya toma.
- **¿Es seguro?** Sesiones con cookie, contraseñas con hash, y cada usuario solo ve las granjas donde es miembro (404 en vez de 403 para no revelar su existencia).
- **¿Funciona sin internet?** Todavía no; la API ya es idempotente por `client_id` para soportar una cola offline.
