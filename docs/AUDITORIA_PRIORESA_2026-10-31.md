# Daggerlight — Auditoría de la Prioresa / Priorato de Marfil
Fecha: 2026-10-31
Rama: `prototype/gameplay-v1`

## Alcance
Se contrastaron los datos vigentes de las doce cartas `PRI-001`–`PRI-012` con los cálculos de `src/engine/rules.ts`, el orden de eventos de `src/engine/game.ts` y las decisiones de IA de `src/engine/ai.ts`. Se agregaron pruebas automáticas en `src/engine/prioresa-comprehensive-audit.test.ts` que cubren las doce condiciones y la curación al tercer acierto, complementando las pruebas de regresión de `src/engine/augury-audit.test.ts`. El objetivo es verificar la implementación; no reequilibrar cartas.

## Resultado por carta

| Código | Carta | Condición comprobada | Observación |
|---|---|---|---|
| PRI-001 | Caballero de Marfil | Último Augurio acertado → +2 Poder | Se consulta el último resultado registrado, aunque el Augurio fuera de una ronda anterior. |
| PRI-002 | Sanadora | Menos Vida que rival → +2 Poder | No depende del marcador de la ronda. |
| PRI-003 | Luna Creciente | Próxima posición rival coincide con la posición propia de origen | Se evalúa cuando el oponente juega la siguiente carta observada. |
| PRI-004 | Reveladora | Próxima carta rival tiene Poder **impreso** 6+ | El Poder modificado no cuenta. |
| PRI-005 | Iniciada | Próxima carta rival se juega en Trono | No depende del tipo de carta. |
| PRI-006 | Luna Nueva | Próxima carta rival en lateral opuesta a la carta que anunció | **Imposible de acertar si Luna Nueva se juega en Trono.** |
| PRI-007 | Guardia Constelada | Rival repite una posición ocupada esta ronda → +2 | Solo puede activarse si las reglas de capacidad del Champion rival permiten la repetición. |
| PRI-008 | Lucero | Augurio: rival juega en una posición repetida | No se puede acertar contra Champions sin capacidad extra de una posición. |
| PRI-009 | Visión Revelada | Se observa carta rival con `affinity != null` | **Actualmente NO exige jugarla en su posición de afinidad**. Es una ambigüedad a resolver: «habilidad de posición» puede referirse a que la carta la posee, o a que se activa. |
| PRI-010 | Curación Fallida | Último Augurio fallido → +3 Poder | El resultado fallido permanece hasta que se resuelve otro Augurio. |
| PRI-011 | Exiliada | Rival cambia de posición respecto de la última carta jugada esta ronda → +2 | Es distinta de Luna Creciente: compara las dos posiciones del rival, no la posición de Exiliada. |
| PRI-012 | Daga Lunar | Tercer duelo → +2 Poder | Independiente de la ronda y el resultado previo. |

## Timing y efecto de la Prioresa

- Las seis cartas con `augury_*` anuncian una predicción sobre la siguiente carta del rival.
- Al acertar se concede **+3 Poder**, al fallar **+1 Poder**. Solo los aciertos aumentan el contador de curación.
- Si la carta propia ya está comprometida en el duelo cuando se observa la respuesta rival, el bono no se aplica retrospectivamente: se guarda para la próxima carta propia.
- **Distinción importante:** el estado de «último Augurio» sí se actualiza al observar esa respuesta. Por lo tanto **Caballero de Marfil** y **Curación Fallida** pueden activar su +2/+3 en el duelo que se está resolviendo, aunque la carta propia ya estuviera comprometida. El +3/+1 de Augurio, en cambio, sigue reservado para la siguiente carta. Es el comportamiento vigente, pero conviene validar explícitamente si esta interpretación del timing es la deseada.
- Los bonos de Augurio pueden persistir entre rondas. La implementación existente conserva `auguryBuff` y `auguryQueuedBuff` durante el reinicio de ronda.
- Cada tercer acierto cura **1 Vida** a la Prioresa, máximo dos curaciones por partida, sin superar su Vida máxima.
- Si se completa el tercer acierto estando a Vida máxima, el contador queda almacenado; la curación puede ocurrir al recibir daño posteriormente. Este es un comportamiento del código actual, **no una decisión de diseño nueva**. Conviene confirmarlo en la Biblia si se desea otra interpretación.

## Problemas de diseño / especificación para discutir

1. **Lucero y Guardia Constelada** dependen fuertemente de la capacidad para repetir posiciones del rival. Contra Champions con una posición por ronda no pueden activarse.
2. **Luna Nueva en Trono** es una predicción sin posibilidad de éxito. Podríamos restringir dónde se anuncia o definir una opción alternativa de predicción. No se cambió la regla.
3. **Visión Revelada** identifica que la carta tiene afinidad posicional aunque no esté activada en la posición elegida. Confirmar la semántica prevista antes de cambiar el motor.
4. **Curación diferida a Vida máxima**: decidir si un tercer acierto debe consumirse sin curación o permanecer disponible.
5. La IA difícil puede evitar las predicciones publicadas. Esto no demuestra un bug, pero justifica volver a evaluar el equilibrio frente a distintos rivales.

## Cambios de visibilidad en Gameplay v1

- Barra discreta con Augurios pendientes, predicción anunciada, aciertos hacia la siguiente curación y Poder en espera.
- Animación del duelo muestra +/− Poder final respecto al impreso y estado de habilidades condicionales de Poder, distinguiendo también las cartas que anuncian Augurio.
- Los eventos de acierto/fallo y las curaciones se muestran brevemente al resolver el duelo.
- No se alteraron Poderes, efectos, frecuencia de cartas, bonificaciones ni la IA para corregir hipotéticas diferencias de balance.

## Otro problema de datos corregido

Se actualizaron las menciones antiguas a «Mártir del Espejo» y «Procesión Perfecta» dentro de las notas de Poder del motor de Santos, conservando sus nuevas denominaciones «Mártir» y «Rey sin corona». Es solo un ajuste de presentación y no afecta la mecánica.

## Validación y próximos pasos

Las pruebas de regresión originales de Augurio y las pruebas ampliadas son parte de la suite `npm test` que ejecuta el flujo de compilación de Gameplay v1. Para una auditoría de la experiencia humana, todavía necesitamos registros de situaciones que el jugador considere incorrectas, indicando carta, posición, turno y resultado esperado. El código y las pruebas comprueban la interpretación actual, pero no pueden decidir por sí solos qué texto de carta debería cambiar.
