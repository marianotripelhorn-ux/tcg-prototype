# Daggerlight — Manifestaciones v0.1 (experimental)
 
**Estado:** jugable en el prototipo digital, no adoptado definitivamente por la Biblia v0.3.
**Alcance:** se suman efectos de generación a las 16 cartas indicadas sin eliminar sus habilidades existentes.

## Generadores

| Keyword | Cartas | Especial creada |
| --- | --- | --- |
| Portaanillos · Dextral | Caballero Tigre, Invocadagas, Guardia Dextral, Caballero Luciérnaga, Caballero de Marfil | Daga Etérea |
| Portaanillos · Sinistral | Protector, Invocador, Desencantador | Escudo Etéreo |
| Objeto mágico | Libro de Amaram, Huevo sin Eclosionar, Daga Lunar, Memoria Petrificada | Reliquia |
| Ambidiestro | Santo Bifronte, Segundo Santo del Eje, Santo Prismático, Santidad Espejada | Simetría Perfecta |

*Capitán* no figura como carta jugable del catálogo actual; **Athos es un Campeón**. No se le añadió generación al Campeón por sí mismo.

## Interpretaciones concretas para hacer jugable esta primera prueba

**Daga Etérea.** Entra a la mano especial al terminar el duelo donde jugaste su creador. Se equipa al jugar cualquier carta normal en otro duelo, sin gastar una jugada. Cada Daga equipada da +1 Poder. Se pueden combinar varias; después de resolver, cada Daga se añade al Archivo de la posición jugada. No consume posición.

**Escudo Etéreo.** Después de resolver el duelo del creador se coloca en la posición propia en la que lo jugaste. La **próxima carta rival jugada en esa posición** recibe −2 Poder, sin importar dónde juegues tu propia carta. Después se retira el Escudo. Por tanto, no sirve contra la carta que respondió al creador. Puede permanecer entre rondas y varios Escudos pueden coexistir en la misma posición.

**Reliquia.** Entra en la mano especial. Durante un turno propio se puede colocar en cualquier posición donde **no hayas jugado una carta normal esa ronda**. Colocarla no gasta jugada ni capacidad. Al finalizar cada duelo posterior a su colocación, si la posición sigue sin cartas normales propias, se suman **dos cartas de Reliquia** a ese Archivo permanentemente. La Reliquia colocada expira al terminar esa ronda. Las Reliquias que permanecen en la mano se conservan para rondas futuras.

**Simetría Perfecta.** Entra a la mano especial, pero si ya tenés una no se crea otra. Puede utilizarse durante tu acción para copiar una carta especial **visible del rival**, sin gastar una jugada. Un Escudo/Reliquia colocado se copia a la misma posición de tu lado. Una Daga Etérea usada y visible en un Archivo rival se copia a tu mano, no se roba la Daga original. No puede mirar ni copiar especiales ocultas en la mano contraria.

## Timing y efectos cruzados

1. Se eligen especiales y bonificadores al jugar una carta; no hay ventana reactiva añadida después de ver la respuesta rival.
2. Se resuelve Poder incluyendo Dagas y Escudos previamente colocados.
3. Escudos activados se retiran.
4. Dagas usadas se suman al Archivo.
5. Reliquias válidas agregan +2 cada una a su Archivo.
6. Se registra el resultado del duelo y se generan las especiales de las cartas recién jugadas.
7. Al terminar la ronda, las cartas normales jugadas pasan al Archivo y las Reliquias colocadas expiran.

Los marcadores de Archivo generados son permanentes y cuentan para condiciones de «exactamente dos», comparaciones y habilidades de Archivo. Libro de Amaram puede eliminarlos. **No hay límite global de especiales**, salvo una Simetría Perfecta en la mano.

## Objetivo del playtest

Medir decisiones de preparación, combinaciones multifacción, presión sobre posiciones, explosiones de Archivo y si las herramientas de counterplay generan partidas interesantes. Vigilar especialmente el crecimiento acumulativo de las Reliquias (+2 por duelo) y las combinaciones de varias Dagas.

La keyword se muestra por ahora como una capa informativa del juego web. Los archivos de cartas exportados desde Card Studio todavía conservan su diseño impreso anterior; antes de imprimir una versión definitiva hay que agregar la keyword al template de Card Studio.
