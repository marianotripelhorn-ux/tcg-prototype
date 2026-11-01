# Daggerlight — Comparación del boost de Champions azules

**Experimento:** Corte Sinistral reduce la próxima carta rival en −2 Poder (antes −1), una vez por ronda después de perder un duelo; Vinira gana +2 Poder (antes +1) en su primera carta fuera de afinidad, activando igualmente la habilidad posicional.

**Control:** rama `prototype/gameplay-v1` (Augurio v2), sin cambios de Poder.
**Variante:** rama `experiment/blue-champion-buff-v1`, exactamente dos bonificaciones de Champion y el estimador interno de IA de Vinira actualizado para valorar +2.
**Método:** 144.000 partidas por variante, 36 parejas de Champions, 2.000 por pareja y dificultad, misma secuencia de semillas, asiento e iniciativa balanceados. IA vs IA, motor original; las partidas no equivalen a playtests humanos.

## Balance por facción

### Dificultad Normal

| Facción | Antes | Después | Cambio |
|---|---:|---:|---:|
| Guardia Dextral | 68.54% | 63.23% | -5.31 pp |
| Corte Sinistral | 30.81% | 48.75% | +17.94 pp |
| Empíreos | 43.93% | 38.92% | -5.01 pp |
| Santos | 55.26% | 50.40% | -4.86 pp |
| Priorato de Marfil | 52.91% | 47.39% | -5.52 pp |

## Champions — Normal

| Champion | Antes | Después | Cambio |
|---|---:|---:|---:|
| Majestad Dextral | 75.16% | 70.35% | -4.81 pp |
| Athos, Capitán de la Guardia Dextral | 61.92% | 56.11% | -5.81 pp |
| Santo Simétrico | 57.81% | 53.43% | -4.38 pp |
| Corte Sinistral | 32.55% | 50.24% | +17.69 pp |
| Prioresa de la Luna Llena | 52.91% | 47.39% | -5.52 pp |
| Samas, Quinto Santo de la Quiralidad | 52.71% | 47.36% | -5.35 pp |
| Vinira, Royal de Ingris | 29.06% | 47.26% | +18.20 pp |
| Desartes, El Empíreo Perdido | 47.49% | 42.02% | -5.47 pp |
| Señor de los Archivos | 40.38% | 35.83% | -4.55 pp |

### Dificultad Difícil

| Facción | Antes | Después | Cambio |
|---|---:|---:|---:|
| Guardia Dextral | 68.34% | 63.32% | -5.02 pp |
| Corte Sinistral | 32.19% | 50.72% | +18.53 pp |
| Empíreos | 43.62% | 38.70% | -4.92 pp |
| Santos | 55.42% | 50.05% | -5.37 pp |
| Priorato de Marfil | 50.88% | 44.41% | -6.47 pp |

## Champions — Difícil

| Champion | Antes | Después | Cambio |
|---|---:|---:|---:|
| Majestad Dextral | 75.11% | 70.38% | -4.73 pp |
| Athos, Capitán de la Guardia Dextral | 61.58% | 56.27% | -5.31 pp |
| Corte Sinistral | 34.32% | 51.86% | +17.54 pp |
| Santo Simétrico | 56.41% | 51.46% | -4.95 pp |
| Vinira, Royal de Ingris | 30.06% | 49.58% | +19.52 pp |
| Samas, Quinto Santo de la Quiralidad | 54.43% | 48.64% | -5.79 pp |
| Prioresa de la Luna Llena | 50.88% | 44.41% | -6.47 pp |
| Desartes, El Empíreo Perdido | 46.62% | 41.50% | -5.12 pp |
| Señor de los Archivos | 40.61% | 35.90% | -4.71 pp |

## Enfrentamientos azules — Normal

| Champion azul | Rival | Antes | Después | Cambio |
|---|---|---:|---:|---:|
| Corte Sinistral | Majestad Dextral | 13.30% | 30.90% | +17.60 pp |
| Vinira | Majestad Dextral | 12.40% | 33.30% | +20.90 pp |
| Corte Sinistral | Athos, Capitán de la Guardia Dextral | 16.10% | 34.80% | +18.70 pp |
| Vinira | Athos, Capitán de la Guardia Dextral | 18.70% | 46.50% | +27.80 pp |
| Corte Sinistral | Vinira, Royal de Ingris | 54.90% | 59.70% | +4.80 pp |
| Corte Sinistral | Señor de los Archivos | 54.90% | 75.35% | +20.45 pp |
| Corte Sinistral | Desartes, El Empíreo Perdido | 38.10% | 60.45% | +22.35 pp |
| Corte Sinistral | Santo Simétrico | 17.15% | 32.45% | +15.30 pp |
| Corte Sinistral | Samas, Quinto Santo de la Quiralidad | 43.00% | 65.70% | +22.70 pp |
| Corte Sinistral | Prioresa de la Luna Llena | 22.95% | 42.60% | +19.65 pp |
| Vinira | Señor de los Archivos | 44.60% | 60.50% | +15.90 pp |
| Vinira | Desartes, El Empíreo Perdido | 35.65% | 57.05% | +21.40 pp |
| Vinira | Santo Simétrico | 23.25% | 43.00% | +19.75 pp |
| Vinira | Samas, Quinto Santo de la Quiralidad | 41.55% | 61.65% | +20.10 pp |
| Vinira | Prioresa de la Luna Llena | 11.25% | 35.80% | +24.55 pp |

## Enfrentamientos azules — Difícil

| Champion azul | Rival | Antes | Después | Cambio |
|---|---|---:|---:|---:|
| Corte Sinistral | Majestad Dextral | 15.10% | 34.45% | +19.35 pp |
| Vinira | Majestad Dextral | 12.65% | 31.10% | +18.45 pp |
| Corte Sinistral | Athos, Capitán de la Guardia Dextral | 17.60% | 36.20% | +18.60 pp |
| Vinira | Athos, Capitán de la Guardia Dextral | 22.00% | 45.90% | +23.90 pp |
| Corte Sinistral | Vinira, Royal de Ingris | 55.80% | 59.70% | +3.90 pp |
| Corte Sinistral | Señor de los Archivos | 56.30% | 74.85% | +18.55 pp |
| Corte Sinistral | Desartes, El Empíreo Perdido | 40.90% | 60.00% | +19.10 pp |
| Corte Sinistral | Santo Simétrico | 18.60% | 35.50% | +16.90 pp |
| Corte Sinistral | Samas, Quinto Santo de la Quiralidad | 42.05% | 65.90% | +23.85 pp |
| Corte Sinistral | Prioresa de la Luna Llena | 28.20% | 48.30% | +20.10 pp |
| Vinira | Señor de los Archivos | 46.30% | 65.45% | +19.15 pp |
| Vinira | Desartes, El Empíreo Perdido | 39.35% | 61.20% | +21.85 pp |
| Vinira | Santo Simétrico | 22.10% | 44.80% | +22.70 pp |
| Vinira | Samas, Quinto Santo de la Quiralidad | 38.70% | 61.10% | +22.40 pp |
| Vinira | Prioresa de la Luna Llena | 15.15% | 46.80% | +31.65 pp |

## Interpretación

1. Ambos Champions azules alcanzan aproximadamente el 50% global; esto no significa que todos sus enfrentamientos estén equilibrados.
2. Majestad Dextral permanece demasiado fuerte; el Señor de los Archivos queda rezagado. Cualquier ajuste posterior debe tomar en cuenta el cambio de contexto competitivo.
3. Las otras facciones bajan su porcentaje global sin que sus reglas hayan cambiado: ahora enfrentan a dos rivales azules más fuertes.
4. Las semillas son idénticas, pero las decisiones y el consumo de aleatoriedad pueden divergir después de que un resultado cambia. Esta comparación mide el sistema resultante, no el efecto causal aislado de cada Champion por separado.
5. Como ambos buffs se aplicaron a la vez, para atribuir exactamente qué efecto aporta cada uno se necesitan pruebas individuales.
6. Ningún cambio de este experimento fue incorporado a la rama de juego estable ni a la rama experimental jugable.

**Recomendación:** mantener los dos buffs como candidatos para pruebas manuales; analizar antes de retocar rojo o Empíreos.
