# Daggerlight v0.5 — Guardado, estadísticas y primeros mazos multifacción
Estado: IMPLEMENTADO EN RAMA EXPERIMENTAL. No altera los Poderes ni la mecánica vigente.

## 1. Guardado automático local

Cada partida nueva obtiene un ID y se guarda inmediatamente en el navegador.
El estado del motor, incluidas las cartas restantes del mazo, la mano,
los Archivos, el rival y las decisiones pendientes de Quiero, se guarda
después de cada acción propia. La interfaz visual muestra **Continuar partida**
en el menú inicial cuando encuentra una partida válida.

Si abandonás la partida con el botón X, el guardado permanece.
Si comenzás una nueva partida, reemplaza al guardado anterior. Solo hay
**una partida activa guardada** a la vez; esto es intencional para esta etapa.

Al finalizar, el guardado activo se elimina y el resultado se registra
una sola vez en el historial (hasta 250 resultados) para evitar duplicados.
Un cambio incompatible en la versión de reglas descarta la opción de
reanudar un estado obsoleto, sin borrar el historial.

**Persistencia:** `window.localStorage` del navegador/dispositivo actual.
No es sincronización en la nube ni una cuenta; borrar los datos del
navegador o usar otro dispositivo elimina el acceso a ese guardado.
El Modo Mesa mantiene su propio guardado independiente.

## 2. Historial para balance con jugadores reales

Cada partida completada registra: fecha, Champion propio y rival, dificultad,
resultado, Vida final, rondas, duelos, Augurios acertados, curaciones, decisiones
No quiero, y si se utilizó un mazo multifacción y qué facciones contenía.

El menú inicial muestra totales de victorias, derrotas y empates.
Estos registros, por defecto, **solo están en el dispositivo**.

### Análisis automático sin exportar

El sitio está alojado como GitHub Pages estático: **no dispone de base de datos
ni puede leer automáticamente el `localStorage` de los visitantes**. ChatGPT
tampoco tiene acceso al navegador o almacenamiento privado del usuario.

Dejamos instrumentada una integración opcional con **PostHog**:

1. Crear o elegir un proyecto en PostHog.
2. En el repositorio GitHub entrar a **Settings → Secrets and variables →
   Actions → Variables** y crear:
   - `POSTHOG_PROJECT_KEY`: llave pública de proyecto para captura de eventos.
   - `POSTHOG_HOST`: URL HTTPS del host de ingesta de eventos de PostHog
     (por ejemplo `https://us.i.posthog.com`).
3. Volver a publicar `prototype/gameplay-v1` con GitHub Actions.
4. En el menú principal de Daggerlight aparece la casilla
   **Compartir estadísticas anónimas de partidas completas**.
   Cada jugador decide si desea habilitarla, y puede deshabilitarla.
5. Conectar PostHog a ChatGPT para consultar directamente los eventos
   `daggerlight_match_completed` sin transferir manualmente archivos.

**Por defecto no se transmite ningún evento.** No basta con conectar el
plugin a ChatGPT: también hace falta configurar proyecto y consentimiento.

Se transmite un resumen limitado al finalizar cada partida, no la mano
oculta, la composición completa del mazo, el estado del motor, nombre,
correo electrónico ni otra información de cuenta. Se usa un identificador
aleatorio local para separar instalaciones. No hay garantía de reintentos
cuando se pierde la conexión antes de enviar el evento. PostHog es externo
y su política de privacidad/retención debe considerarse antes de invitar
a playtesters públicos.

## 3. Primer laboratorio multifacción

Acceso: menú inicial → **Mazos multifacción · Lab**.

Reglas **provisionales y configurables** en `src/engine/decks.ts`:
- Tamaño: **36 cartas = 12 cartas distintas × 3 copias**.
- Hasta 2 facciones.
- **Exactamente 3 copias de cada una de las 12 cartas seleccionadas**.
- Debe incluir al menos 1 carta de la facción del Champion elegido.

Estas restricciones **todavía no se incorporan a la Biblia como reglas
oficiales**. Son el punto de partida de los playtests.

Podés elegir un Champion y una segunda facción. El laboratorio **abre vacío** y el cambio de Champion o de segunda facción reinicia el borrador. Cada selección agrega automáticamente las 3 copias de una carta; un clic para quitarla retira las 3. Al llegar a 12 cartas distintas (36 cartas físicas), podés probar el mazo contra la IA. El mazo mixto
se integra al motor real de combate. Al acabarse el mazo para una nueva
ronda, se recicla la receta original (misma lógica que los mazos monofacción).
Si guardás y retomás la partida, esa receta sigue intacta. La revancha
utiliza el mismo mazo.

Este primer laboratorio **todavía no guarda mazos con nombre como colección
de decklists**. La partida guardada sí conserva la composición exacta.
La siguiente etapa será decidir las reglas oficiales y añadir un gestor
de mazos persistente, con múltiples diseños y selección previa a la partida.


### Alineación de tamaños — noviembre de 2026

El formato confirmado para esta etapa es **12 cartas distintas × 3 copias = 36 cartas en total**, tanto en mazos monofacción como mixtos. Se corrigió también la construcción automática de mazos de una sola facción, que hasta ahora armaba 12 × 2 (24 cartas). Esta corrección no cambia Poderes ni efectos, pero **puede afectar las frecuencias de robo y, por lo tanto, las estadísticas anteriores de balance**. Los gauntlets anteriores (24 cartas) son válidos como historial de pruebas, pero para conocer el balance actual hay que ejecutarlos otra vez con 36 cartas.

Las partidas guardadas antiguas se pueden terminar con el mazo con el que empezaron; las partidas nuevas usan la regla de 36. El historial de resultados anteriores sigue conservándose.

### Preguntas de playtest importantes
- ¿Debe ser obligatorio combinar dos facciones o permitirse una sola?
- ¿Se exige cierta cantidad mínima de cartas de cada facción (p. ej. 8/8)?
- ¿Puede un Champion usar toda carta de las facciones elegidas?
- El formato actual selecciona 12 nombres distintos con exactamente tres copias cada uno, sin duplicar nombres dentro de una combinación de facciones.
- ¿Qué interacciones son ambiguas cuando la carta pertenece a una facción
  diferente del Champion (por ejemplo bonificaciones propias de posición)?

No modificar el balance básico hasta comparar varios mazos mixtos en el
motor y en partidas manuales.

## 4. IA

Se agregó un gauntlet nuevo en `scripts/calibrate-ai-difficulty.ts`
que enfrenta versiones de IA con el **mismo Champion y el mismo mazo**,
alternando asiento e iniciativa. Esta prueba evita confundir la fuerza
de un Champion con la dificultad de su IA.

Resultado inicial de 10.800 partidas:
- Normal contra Fácil: Normal gana 92,75%.
- Difícil contra Normal: Difícil gana 49,97%.
- Difícil contra Fácil: Difícil gana 92,78%.

Interpretación inicial: Fácil era excesivamente débil y Difícil
no era significativamente mejor que Normal. Se probó y promovió
una segunda versión con decisiones más cuidadosas:

- Fácil elige jugadas aleatorias legales en 40% de sus oportunidades,
  frente al 78% anterior.
- Difícil estima los posibles contraataques usando el catálogo PÚBLICO
  de la facción principal del rival, sin acceder a su mano ni a su mazo oculto.
- El balance de cartas y las reglas permanecen idénticos.

Nueva calibración con las mismas 10.800 simulaciones y semillas:
- Normal contra Fácil: Normal gana **80,28%**.
- Difícil contra Normal: Difícil gana **54,22%**.
- Difícil contra Fácil: Difícil gana **83,53%**.

La mejora de Difícil es modesta pero medible en esta muestra.
En mazos multifacción la heurística inicial considera solo la facción
principal; requiere futura ampliación cuando formalicemos la
visibilidad pública de la composición del mazo.

Archivos comparables:
`reports/ai-difficulty-calibration-v1/summary.md` (antes) y
`experiment/ai-calibration-v2/reports/ai-difficulty-experiment-v2/summary.md` (después).

## 5. Archivos principales

- `src/persistence.ts`: guardado y validación de versiones.
- `src/persistence.test.ts`: pruebas de restauración e historial.
- `src/telemetry.ts`: envío anonimizado únicamente con consentimiento.
- `src/DeckLab.tsx` y `src/deck-lab.css`: laboratorio inicial.
- `src/engine/decks.ts` y `src/engine/decks.test.ts`: prototipo de validador.
- `src/engine/state.ts`: receta multifacción y reposición del mazo.
- `src/App.tsx`: conexión con el juego y el menú.
