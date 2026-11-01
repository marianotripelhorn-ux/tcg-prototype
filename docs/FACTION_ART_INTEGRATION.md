# Daggerlight — Arte de facciones v1
Rama: `prototype/gameplay-v1` · La versión estable `ui-v2` permanece sin cambios.

## Archivos

Se entregaron 5 fondos originales verticales en FACTION ART.zip (1060×1484 PNG)
y 4 recortes horizontalizados «CUT» (aprox. 647×552 PNG).
El quinto recorte para el Priorato se genera desde la imagen PRI.png.

Se optimizaron y mapearon a:

| Facción | Selección vertical | Banner en duelo |
|---|---|---|
| Guardia Dextral | red-portrait.webp | red-banner.webp |
| Corte Sinistral | blue-portrait.webp | blue-banner.webp |
| Empíreos | white-portrait.webp | white-banner.webp |
| Santos | saints-portrait.webp | saints-banner.webp |
| Priorato de Marfil | ivory-portrait.webp | ivory-banner.webp |

Los diez WebP deben estar dentro de `public/factions/` en la rama experimental.
No se incrustan imágenes binarias en los componentes. Se leen en tiempo de ejecución
desde `<BASE_URL>/factions/`, lo que mantiene las rutas compatibles con GitHub Pages.
Si falta un WebP vertical, la selección vuelve al símbolo y al fondo de color de facción.
El banner de combate tiene fondo neutro legible hasta que llega su imagen.

## Medidas de exportación definitivas recomendadas

- **Selección de facción: 900×1200 píxeles (3:4)**.
  Área visible actual en escritorio: aprox. 237×205–280 px por facción, según la ventana.
  En celular (hasta 580 px de ancho): dos columnas de aprox. 140–260 px de ancho × **176 px de alto**.
  La aplicación hace `object-fit:cover`, por lo que el área puede recortarse a los lados o arriba/abajo.
  Mantener el motivo principal en el 60% central y no escribir texto dentro del arte.
- **Banner del Champion: 1600×320 píxeles (5:1)**.
  Área visible del tablero: hasta **900 px de ancho y mínimo 74 px de alto**, con altura adaptable al texto y los dispositivos.
  El programa utiliza `object-fit:cover`; en pantalla grande la imagen sufrirá un recorte vertical.
  Reservar espacio tranquilo **a la izquierda para el medallón y nombre** y **a la derecha para la Vida**.
  Concentrar el símbolo o motivo más llamativo en la banda central para que sobreviva a los recortes.
  En celular la franja puede ser proporcionalmente más alta: no colocar texto incrustado ni detalles vitales en bordes.

**Importante:** estas son medidas de exportación fijas, pero no dimensiones fijas del contenedor en CSS.
Es una interfaz responsive; si se produjeran ilustraciones con ubicaciones críticas, preparar un
recorte adaptado para móvil en una etapa posterior.

## Tratamiento visual

- Los fondos verticales llevan un oscurecimiento gradual junto a sus títulos,
  de manera que incluso Empíreos y Santos tengan texto legible.
- Los horizontales llevan una capa oscura translúcida, sobre la cual
  permanecen el nombre, la habilidad y la Vida (sin cambiar ninguna regla).
- Los colores del arte pertenecen a cada facción; los elementos globales de
  la interfaz siguen marfil, negro y dorado.
- Respeta el modo claro, oscuro y la preferencia de reducir movimiento.

## Integración técnica

- `src/factionArtwork.ts`: URLs y nombres de las imágenes.
- `src/FrontOffice.tsx`: selector ilustrado, cinco facciones.
- `src/App.tsx`: barras del Champion ilustradas por facción.
- `src/faction-art.css`: adaptación visual responsiva y contraste.
- `src/factionArtwork.test.ts`: prueba de integridad de las 10 rutas.

## Subida manual

1. Descargar `Daggerlight_Faction_Art_GitHub.zip`, extraer los diez archivos `.webp`.
2. Abrir `https://github.com/marianotripelhorn-ux/tcg-prototype/tree/prototype/gameplay-v1/public/factions`.
3. Seleccionar **Add file → Upload files**, subir solamente los diez WebP y confirmar en **Commit changes** en la rama `prototype/gameplay-v1`.
4. El workflow publica automáticamente los archivos en `https://marianotripelhorn-ux.github.io/tcg-prototype/gameplay-v1/`.

La carpeta está creada; no hace falta subir los PNG originales de 15 MB.
