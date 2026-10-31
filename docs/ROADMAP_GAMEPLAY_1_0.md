# Daggerlight: rumbo a Gameplay 1.0
Estado: prototipo experimental (octubre de 2026).

## Decisiones de producto

1. **Primero single-player**. Multijugador y servidores online no forman parte del roadmap actual.
2. **IA con dificultad configurable** antes de ampliar modos: Fácil (Aprendiz), Normal (Estratega), Difícil (Maestro). Estas políticas necesitan tests comparativos para verificar sus niveles de competencia real; no asumir que Difícil alcanza un win rate determinado.
3. **Experiencia de videojuego**. Mantener React para navegación, selección y colección. El motor TypeScript de reglas seguirá independiente del renderizado. Introducir gradualmente animaciones, feedback, sonido y más adelante una capa 2D acelerada (evaluar PixiJS) sin rediseñar las mecánicas.
4. **Progreso de Champions (futuro)**. Experiencia, niveles y desbloqueos cosméticos: retratos, reversos, marcos y variantes de arte. No aumentar Poder, Vida ni probabilidades por subir de nivel; evitar progreso que afecte al balance de las partidas físicas.
5. **PvE de largo plazo**. Campañas de encuentros encadenados, caminos alternativos, modificadores de partida y recompensas cosméticas. Diseñar sin requerir multijugador.
6. **Juego físico en paralelo**. Asistente para jugar con cartas reales, centrado en Vida y Archivo por posición. No calcular automáticamente habilidades ni guardar la mano privada del jugador.

## Primera vertical slice (esta rama)

- Comparación de tres niveles de IA. Normal preserva la heurística ya implementada. Fácil introduce variedad y decisiones menos óptimas. Difícil mejora la valoración de jugadas futuras y busca esquivar Augurios anunciados sin consultar cartas ocultas del jugador. Pendiente evaluar estadísticas de dificultad para confirmar su orden real en partidas.
- Presentación de duelo con un efecto oro/negro, victoria/derrota/empate, marcador y opción de saltar la animación. No altera el resultado del motor.
- Primer **Modo Mesa** apto para celular: contador de Vida 0–9, Archivos de Siniestra/Trono/Diestra para dos jugadores, avance de ronda, deshacer y guardado local. No es aún una PWA instalable y no garantiza uso sin conexión.
- Se mantiene `ui-v2` como prototipo estable; esta rama publica `/gameplay-v1/`.

## Próxima iteración visual

1. Fijar la gramática visual: color de posición, transiciones, jerarquía del Poder, señal clara de habilidad activa.
2. Animar colocar/revelar cartas, resolver un duelo, actualizar Vida y mover cartas al Archivo.
3. Adoptar sonido discreto con silenciador y volumen regulable.
4. Probar un tablero de escena 2D renderizada por GPU con integración estable al motor, sin duplicar lógica de reglas. Priorizar rendimiento en celular y permitir animaciones reducidas.
5. Finalizar retratos de Champions, renombrar aquellos de nombre genérico **solo después** de aprobar los nuevos nombres. Mantener los IDs del motor para evitar roturas.
6. Integrar el arte del Priorato de Marfil y revisar cartas con baja resolución.

## Modo Mesa: plan de pruebas presenciales

- Simular partidas con cartas físicas y utilizar exclusivamente el teléfono como contador.
- Verificar facilidad de uso con el dispositivo apoyado en la mesa y ambos jugadores sentados enfrente.
- Registrar cuántas veces se necesita deshacer, corregir Vida y editar Archivos.
- Probar el caso de **No quiero**: solo se archivan las cartas efectivamente jugadas.
- Iterar luego con controles grandes, inversión de orientación para el segundo jugador, historial y exportar partida.
- Posteriormente considerar PWA instalable y funcionamiento offline verificable.

## Progresión (diseño futuro, no implementado)

`ChampionProgress { championId, xp, level, unlockedCosmetics: string[] }`

Persistencia inicialmente local y explícita. Las recompensas son **solo cosméticas**, separadas de todas las reglas competitivas. El progreso de un Champion no debe modificar la versión física de sus cartas ni convertir un cosmético en una ventaja. Si se incorpora PvE con modificadores de Poder, estos serán exclusivos de ese modo y no cambiarán el modo estándar.

## Qué no se construirá ahora

- Multijugador, matchmaking, cuentas en la nube, monetización, tiendas, temporadas, ranked.
- Alteraciones al balance del juego para que la IA parezca más fuerte.
- Campañas PvE antes de validar IA, ritmo de duelos y diseño de tablero.
