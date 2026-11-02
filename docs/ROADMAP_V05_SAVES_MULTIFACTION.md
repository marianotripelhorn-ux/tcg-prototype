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

## 3. Laboratorio multifacción — formato corregido

Acceso: menú inicial → **Mazos multifacción · Lab**.

**Los mazos monofacción vuelven a su formato original y no se modifican: 12 cartas diferentes × 2 copias = 24 cartas.**

Para el laboratorio multifacción se utiliza exactamente el mismo tamaño: **12 cartas diferentes, con 2 copias obligatorias de cada una, para un total de 24 cartas**.

- La selección empieza vacía (0 de 12).
- Pulsar `+` agrega automáticamente dos copias de esa carta. Pulsar `−` quita ambas.
- No se admite una sola copia, ni tres copias, ni más de 12 cartas distintas.
- El borrador se reinicia al cambiar Champion o segunda facción.
- Continúan vigentes las restricciones experimentales de hasta dos facciones y al menos una carta de la facción del Champion.
- No hay proporción fija entre las dos facciones: por ejemplo, 8 cartas diferentes de una y 4 de la otra.
- Las partidas nuevas monofacción y multifacción contienen 24 cartas. Las partidas guardadas que comenzaron durante el cambio temporal a 36 pueden finalizarse con esa receta anterior; no se borra el historial.

El juego mezcla las 24 cartas en una sola baraja y conserva la receta del mazo cuando se recicla, guarda o retoma la partida.

La construcción multifacción sigue siendo experimental y todavía no forma parte de las reglas definitivas de la Biblia. Este laboratorio no guarda una biblioteca de mazos personalizados.

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
