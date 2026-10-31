# Augurio — rediseño desde cero (propuesta, NO implementada)
Fecha: 31/10/2026

## Diagnóstico
La mecánica actual combina demasiados momentos que deben recordarse:
1. Cada carta anuncia una condición diferente sobre una carta futura del rival.
2. Esa condición se resuelve cuando aparece la siguiente carta observada, incluso en otra ronda.
3. Acertar concede +3 Poder a una carta propia futura; fallar concede +1.
4. Los bonos pueden quedar activos, pendientes o acumularse.
5. El último acierto o fallo activa otras cartas.
6. La Prioresa cuenta tres aciertos para curar 1 Vida (dos veces por partida).

Este conjunto es difícil de explicar en una interfaz, y aún más difícil de administrar con cartas físicas. La IA además puede esquivar algunas predicciones observables; otras son imposibles dependiendo de la configuración del rival.

## Criterios obligatorios para la nueva mecánica
- Una sola explicación de menos de 30 segundos.
- La misma regla en físico y digital, sin ayuda de una app.
- Como máximo **un marcador visible de estado** y, opcionalmente, un contador de 0 a 2 para la habilidad de Champion.
- No existen bonificaciones pendientes entre rondas, predicciones superpuestas ni historial de «último acierto/fallo».
- La predicción debe crear una decisión táctica propia y ajena, no depender de reglas de capacidad incompatibles.
- Los resultados se muestran en el mismo duelo, no en una carta que se juega dos rondas después.

## Propuesta A: Señal de la Luna (para prototipar)
Al inicio de cada ronda, el jugador del Priorato marca UNA de las tres posiciones (Siniestra, Trono o Diestra).
La primera vez durante esa ronda que el rival juegue en la posición anunciada, la carta propia de ese duelo recibe +2 Poder. Se retira entonces el marcador. Si no sucede, no hay bonificación. Al fin de ronda se retira el marcador en cualquier caso.
La Prioresa cuenta las rondas en las que acertó (0–2) y, tras el tercer acierto, cura 1 Vida (hasta dos veces por partida).

Pros: un token físico en el tablero, mismo duelo, decisiones del rival alrededor de la posición marcada, sencillo de animar. Contras: pierde la predicción individual por carta; seis cartas del Priorato necesitarían habilidades nuevas, y hay que probar el equilibrio con los Champions que repiten posiciones.

## Propuesta B: Fases lunares (alternativa simple)
El Priorato dispone de un contador de 0 a 2. Ciertas cartas avanzan su fase; otras consumen su estado para activar una bonificación inmediata. No hay predicciones del rival. La Prioresa se cura cuando el contador completa un ciclo.
Pros: físicamente sencillo y consistente. Contras: se aleja más de la fantasía de anticipar las decisiones ajenas y se parece a otras mecánicas de acumulación.

## Propuesta C: Dos caminos (alternativa con decisiones)
Las cartas de «Augurio» ofrecen dos efectos alternativos al jugarse. El jugador elige uno y se resuelve en ese duelo según condiciones visibles de posiciones, Poder o marcador.
Pros: cero recursos persistentes y elección táctica. Contras: aumenta el texto individual de cartas y el aprendizaje.

## Estado
Ninguna propuesta es regla oficial. **NO modificar el motor, las 12 cartas ni la habilidad de Prioresa** antes de elegir y probar un modelo con juego físico. La versión actual conserva Augurio para permitir partidas existentes.

## Experimento recomendado
Imprimir tarjetas con tres prototipos de Augurio, simular diez rondas con marcadores físicos, anotar dudas de timing, acciones olvidadas, cuándo el rival evita jugar una posición y sensaciones del jugador. Luego contrastar por gauntlet y balancear Poder.
