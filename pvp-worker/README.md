# Daggerlight PvP — activar salas privadas desde GitHub

El front-end sigue en **GitHub Pages**. Este Worker administra partidas
privadas de dos personas con validación de cada acción y manos ocultas.

## Activación sin instalar herramientas

1. Creá una cuenta gratuita en [Cloudflare](https://dash.cloudflare.com/) y
   buscá tu **Account ID** en la pantalla principal de Workers & Pages.
2. En Cloudflare, abrí **Account API Tokens** y creá un token limitado a esa
   cuenta con permisos para crear/publicar Workers. La documentación oficial
   indica usar **Edit Cloudflare Workers**. Copialo a un lugar seguro.
3. En el repositorio GitHub entrá a:
   **Settings → Secrets and variables → Actions → Secrets**.
   Creá dos *repository secrets*: `CLOUDFLARE_ACCOUNT_ID` y
   `CLOUDFLARE_API_TOKEN` con los valores de Cloudflare.
   Nunca pegues el token en el chat ni lo publiques.
4. En GitHub → **Actions**, ejecutá manualmente el workflow
   **Deploy Daggerlight PvP API**. La URL final será similar a
   `https://daggerlight-pvp.<tu-subdominio>.workers.dev` y aparecerá
   en los logs del último paso.
5. En el mismo repositorio, en **Settings → Secrets and variables →
   Actions → Variables**, creá `PVP_API_URL` con esa URL HTTPS, sin barra final.
   Esta dirección de API es pública y **no** es una clave privada.
6. Ejecutá manualmente **Publish gameplay v1 prototype** para incorporar
   la dirección pública a la interfaz. Entonces quedarán habilitadas las
   salas por código/enlace.

## Qué valida el servidor

- El juego empieza cuando se unen el anfitrión y el invitado.
- Cada uno elige un Campeón. La sala baraja los mazos monofacción.
- Las cartas ocultas y el mazo rival no se envían al navegador.
- El servidor valida turno, capacidad, jugada, duelo y Quiero/No quiero.
- Las partidas se pueden recuperar en ese navegador mediante el token local.
- La sala caduca siete días después de su última acción.
- Un jugador puede exportar el resumen y enviar feedback al terminar.

## Alcance de la beta

Sin cuentas, sin ranking, sin chat y sin matchmaking público. La conexión se
actualiza periódicamente (aproximadamente cada 1,6 segundos), no utiliza
WebSockets. Antes de abrir salas al público hay que añadir controles de
abuso, protección contra creación masiva de salas, límites y monitoreo.
La parte de juego contra IA no depende de Cloudflare y seguirá funcionando.

## Desarrollo local opcional

Desde la raíz del repositorio:
`cd pvp-worker && npm install && npx wrangler dev`.
El modo local del juego web puede apuntar al Worker con
`VITE_PVP_API_URL=http://localhost:8787` durante el desarrollo.
