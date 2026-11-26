# Guion: presentación (PowerPoint) + demo en vivo

Base: `docs/Plan de Negocios Acuicontrol.pptx` (18 diapositivas) + la app v0.2 corriendo en `http://localhost:5173`.
Duración propuesta: **~16 min** (12 de láminas + 4 de demo) (ajusta quitando tiempo de finanzas si te dan menos).

## Antes de presentar (checklist)

- [ ] Completar en la lámina 1: `[Nombres del equipo] · [Materia] · [Fecha]`.
- [ ] Lámina 6: el tamaño de mercado sigue entre corchetes. Pon una cifra con fuente o dilo en voz alta: "lo validaremos con la granja piloto". No inventes números.
- [ ] `pnpm seed -- --reset` y luego `pnpm dev`. La API debe decir `base de datos: Postgres (DATABASE_URL)`.
- [ ] Ya iniciada la sesión como **admin** (`demo@acuicontrol.test` / `demo12345`) en una pestaña, y la página de inicio `/` en otra.
- [ ] PowerPoint y el navegador abiertos; cambiar con **Alt + Tab**. Zoom del navegador al 110–125 % para que se lea.
- [ ] Respaldo si falla la app: la página `/` (Proyecto) tiene un simulador que no necesita sesión.

## Flujo y tiempos

| Min | Lámina / pantalla | Qué decir |
|---|---|---|
| 0:00 | **1 Portada** | Nombre del proyecto y equipo. Una frase: "Acuicontrol dice cuánto alimento dar cada día, sin sensores." |
| 0:30 | **2 Agenda** | Cinco bloques; no leas la lista. Avisa: "al final se lo enseño funcionando". |
| 0:45 | **3 Resumen** | Qué es / para quién / qué logra. Define FCA en una frase: kg de alimento por kg de camarón ganado. |
| 1:30 | **4 Problema** | Sobrealimentar, subalimentar, sin datos. Cierra con: "un FCA alto es dinero perdido". |
| 2:30 | **5 Solución** | Captura → Recomienda → Registra. |
| 3:15 | **6 Clientes** | Granjas pequeñas y medianas, técnicos y biólogos, asesores. Aclara que la cifra de mercado se validará. |
| 4:00 | **7 Competencia** | iQShrimp, XpertSea, aquaManager, Umitron. Frase clave: "el rival más fuerte es seguir dosificando como siempre". |
| 5:00 | **8 Mapa** | Poco equipo + mucho enfoque en la dosis = el espacio libre. Es cualitativo, dilo. |
| 5:45 | **9 Cómo se usa** | Los cuatro pasos. Son los mismos que seguirás en la demo, así que cuéntalos con calma. |
| 6:45 | **10 Cómo se calcula** | Tres preguntas: cuánto camarón hay, cuánto debe comer, qué se ajusta hoy. Anuncia que verán esa fórmula en la demo. |
| 7:45 | **11 Qué funciona / qué falta** | Honestidad: supervivencia fija 85 %, FCA heurístico, sin modo offline. Da credibilidad. |
| 8:45 | **12–14 Supuestos, inversión, costos** | Solo cifras gordas: granja tipo 10 ha, inversión **$350 000**, costos fijos **$16 800/mes**. |
| 9:45 | **15 Beneficio al cliente** | Ahorro 5 % → $90 000/año contra $18 000 de suscripción = **$72 000 netos**. Es un supuesto a medir en el piloto. |
| 10:30 | **16 Equilibrio** | **14 granjas**. |
| 11:00 | **17 Proyección** | Utilidad positiva desde el año 2; inversión recuperada en el año 4. "Escenario, no garantía." |
| 11:30 | **18 Conclusiones** | Mercado, técnica, finanzas. Siguiente paso: **prueba piloto**. Termina con: "y ahora, lo vemos funcionando". |
| 12:00 | **DEMO en vivo** | Alt + Tab al navegador. Ver "Demo" abajo (≈4 min). |
| 16:00 | **Cierre** | Vuelve a la lámina 18 (o quédate en la app) y di la frase final: "con una prueba piloto medimos cuánto FCA baja". Preguntas. |

> Si te dan menos tiempo: resume 12–14 en una sola frase y ve directo a 15–16.

## Demo en vivo (≈4 min, al final, después de la lámina 18)

Sigue los cuatro pasos de la lámina 9 para que lámina y pantalla coincidan; el público ya los vio explicados.

1. **Inicio (`/`)** — 20 s. Muestra la página del proyecto y baja hasta el **simulador**: mueve el peso o el oxígeno y que se vea cómo cambia la dosis. Es la prueba de que "las reglas son explicables".
2. **Entrar** — 15 s. Ya con sesión como admin, ve a **Captura**.
3. **Paso 1, elegir estanque: E3** (22.4 g, 1.5 ha, la más grande).
   Hoy no tiene registro de alimentación: lo capturas en vivo.
4. **Paso 2, lecturas.** El sobrante de hoy ya está en 18 %. Escribe temperatura y oxígeno normales (por ejemplo 28 °C y 5 mg/L).
5. **Paso 3, recomendación.** Enseña los kg y la **justificación en español**. Di que es solo una vista previa; aún no se guarda.
6. **Cambio dramático (opcional, 30 s):** baja el oxígeno a **1.5 mg/L** → estado **Suspendida**, dosis 0. Muestra que pide una casilla de confirmación para registrar. Luego vuelve a un valor normal.
7. **Paso 4, confirmar y registrar** con una dosis aplicada ligeramente distinta de la calculada. Se guardan las dos por separado (lámina 9, paso 4).
8. **Historial:** baja a la gráfica (recomendada vs aplicada, 14 días). Señala el día de sobrante alto (E1) y el de oxígeno bajo (E3, hace 5 días). Pulsa **Descargar CSV**.
9. **Roles — 30 s (opcional):** cierra sesión, entra como `tecnico@acuicontrol.test` y ve a **Granja**: ya no puede crear estanques ni gestionar miembros.

## Preguntas probables y respuestas cortas

| Pregunta | Respuesta |
|---|---|
| ¿Por qué reglas y no machine learning? | Las reglas son explicables y el técnico puede confiar en ellas; además no hay aún datos históricos para entrenar. Con el piloto se reemplaza el FCA heurístico por un modelo. |
| ¿De dónde sale el 85 % de supervivencia? | Es una constante configurable; hoy no medimos mortalidad. Se medirá en la granja piloto (lámina 11). |
| ¿Y sin internet en el estanque? | Hoy no hay modo offline; la API ya es idempotente para soportar una cola offline (lo siguiente a construir). |
| ¿Cómo sabes que ahorra 5 %? | Es un supuesto; la prueba piloto mide el FCA antes y después. |
| ¿Qué lo diferencia de iQShrimp? | Ellos necesitan sensores y alimentadores; nosotros solo un celular y los datos que el técnico ya toma. |
| ¿Qué pasa con los datos de una granja? | Cada usuario solo ve las granjas donde es miembro; un ajeno recibe 404. |
| ¿Por qué hay una v1 y una v0.2? | La v1 fue el prototipo en Python sin login; la v0.2 la reescribió en TypeScript con cuentas, roles y varias granjas. Las reglas dan el mismo resultado (tests de paridad). |
| ¿Cuánto cuesta? | Suscripción de $1 500/mes por granja; equilibrio con 14 granjas. |

## Después de practicar

Deja los datos limpios: `pnpm seed -- --reset`.
