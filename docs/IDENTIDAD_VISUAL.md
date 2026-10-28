# Daggerlight · Identidad visual (laboratorio ui-v2)

Actualizada: 28 de octubre de 2026.

## Colores globales

- Marfil / blanco cálido: `#eae2d5` (fondo y superficies base)
- Negro: `#191919` (tipografía principal y controles principales)
- Dorado: `#d3b787` (marcos, detalles, acentos neutros)

No usar degradés rojos, azules ni otros tonos de facción en el fondo del sitio, la landing, las barras de navegación ni el tutorial. Los colores particulares quedan reservados a las propias facciones y al arte de sus cartas.

## Pantallas

1. Landing: tres acciones — **Empezar partida**, **Aprender a jugar**, **Ver cartas**. Nombre DAGGERLIGHT en sans serif, como el wordmark superior. El emblema es independiente del nombre.
2. Selección de Champions: mostrar las **cinco facciones verticales** desde el principio y sin facción preseleccionada. Cada banner usa por completo el color de la facción. Al elegir una, mostrar **cards verticales para los Champions** de esa facción. Al elegir un Champion, explicar su habilidad y habilitar jugar.
3. Galería: mantener las cartas y su arte como foco visual; filtros por facción. Preparar la estructura para futura edición de mazos multifacción, sin implementarla aún.
4. Juego: la UI estructural es marfil-negro-dorado. Los frentes impresos y los colores de las cartas conservan la identidad de cada facción.

## Recursos visuales

- `public/branding/logo.svg`: trazo vectorial simplificado del emblema enviado, utilizado como respaldo.
- `public/branding/logo.png`: PNG original (se mostrará automáticamente cuando sea cargado al repositorio).
- `public/cards/empyrean/empyrean-cards-1.webp` y `empyrean-cards-2.webp`: sprites de los 12 diseños Empíreos, 3 columnas × 2 filas por hoja.
- `public/cards/blue/blue-cards-1-hq.webp` y `blue-cards-2-hq.webp`: hojas de alta resolución de Corte Sinistral. Los viejos sprites permanecen como respaldo.

Las cinco imágenes binarias se entregan empaquetadas por separado para su carga en GitHub, ya que el conector de edición textual no transfiere binarios. Hasta que estén subidas, el prototipo muestra los frentes provisionales y las imágenes azules antiguas. Los estilos y las reglas de juego no dependen de su presencia.
