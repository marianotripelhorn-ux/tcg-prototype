# Versiones de Daggerlight

## Versión clásica (pública y estable)

**URL:** https://marianotripelhorn-ux.github.io/tcg-prototype/gameplay-v1/

Esta carpeta es una copia congelada de la última versión publicada antes de
introducir las manifestaciones (build del 6 de noviembre de 2026). Incluye
el juego contra IA, selección de Campeones, colección y las pantallas de
playtesting de aquella versión. No incluye la creación de Dagas, Escudos,
Reliquias ni Simetría Perfecta.

La carpeta `gameplay-v1/` reside en la rama `main`.
**El workflow del laboratorio nunca la modifica.**

## Laboratorio de manifestaciones (experimental)

**URL:** https://marianotripelhorn-ux.github.io/tcg-prototype/gameplay-v1-lab/

Se genera desde la rama `prototype/gameplay-v1` y se publica
exclusivamente en `main:gameplay-v1-lab/` a través del workflow
`Publish Daggerlight Laboratory`.

Permite probar Manifestaciones v0.1/v0.2 y cualquier mecánica futura
sin cambiar la experiencia que se comparte con testers del modo clásico.

## Flujo para futuras actualizaciones

- Un push a `prototype/gameplay-v1` actualiza solamente el laboratorio.
- El juego clásico conserva su build congelado hasta decidir explícitamente
  una promoción después de playtesting.
- Una promoción deberá actualizar `gameplay-v1/` por separado,
  idealmente con un commit etiquetado y pruebas de regresión.
- Ambos enlaces funcionan en GitHub Pages y comparten dominio, por lo que
  los juegos almacenan partidas e historiales en claves diferentes de
  `localStorage`. El laboratorio migra únicamente partidas anteriores
  que tengan el ruleset experimental.
- El multijugador sigue requiriendo un servicio externo Cloudflare.
  La separación de carpetas no configura ni habilita ese servicio.
