# Nombres canónicos de Champions — 2 de noviembre de 2026

Estado: **vigente** en la versión de juego `prototype/gameplay-v1`.

Se actualizaron los nombres de cuatro de los nueve Champions iniciales para diferenciarlos de los nombres de sus facciones. El cambio es exclusivamente de nomenclatura.

| ID inmutable del motor | Nombre anterior | Nombre vigente | Facción (sin cambios) |
|---|---|---|---|
| `dextral` | Majestad Dextral | **Majestad Carmesi, Rey de Latalia** | Guardia Dextral |
| `sinistral` | Corte Sinistral | **Vor Calasta, Usurpador Ígneo** | Corte Sinistral |
| `empireos` | Señor de los Archivos | **Lenares, Forjador de Reyes** | Empíreos |
| `santo_simetrico` | Santo Simétrico | **Tellet, Primer Santo del Orden** | Santos |

## Compatibilidad

- **No cambian** las habilidades, las facciones, la Vida, los Poderes, las cartas ni las reglas.
- Los IDs internos se mantienen para que sigan funcionando las partidas guardadas, el historial, los tests y las simulaciones anteriores.
- Las partidas que ya estaban guardadas pueden contener los nombres antiguos incrustados: al restaurarse, el cliente recupera el nombre canónico actual del registro de Champions.
- Los informes antiguos de gauntlets conservan los nombres con los que se realizaron; las victorias y derrotas continúan asociadas a los mismos IDs.
- La facción Corte Sinistral no se renombra: **Vor Calasta** es su Champion, no el nombre de la facción.
- El archivo histórico `docs/BIBLIA_DE_JUEGO.txt` preserva el texto v0.2, con nota de nomenclatura vigente al comienzo.

Fuente: `src/engine/champions.ts` en la rama `prototype/gameplay-v1`.
