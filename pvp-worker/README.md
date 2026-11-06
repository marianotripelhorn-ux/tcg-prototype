# Daggerlight PvP — backend para salas privadas

El sitio estático sigue en GitHub Pages. Este Worker administra partidas
privadas de dos personas y valida cada jugada en el servidor.

## Publicar en Cloudflare

1. Creá una cuenta de Cloudflare, habilitá Workers.
2. Instalá Node.js 20+ en tu equipo.
3. Desde la raíz del repositorio: `cd pvp-worker && npm install && npx wrangler login`.
4. Ejecutá `npm run deploy`. Cloudflare asignará una URL `https://daggerlight-pvp.<subdomain>.workers.dev`.
5. En GitHub > Settings > Secrets and variables > Actions > **Variables**, agregá
   `PVP_API_URL` con esa URL HTTPS (sin barra al final).
6. Volvé a ejecutar **Publish gameplay v1 prototype** en GitHub Actions.
   No guardes claves privadas en el código ni en variables VITE_.

Con eso el botón **MULTIJUGADOR · BETA** permitirá crear una sala y compartir un enlace.
Los participantes juegan sin registro. El token privado de cada asiento queda
únicamente en ese navegador. No se incluye en el enlace compartido.

## Reglas y privacidad

- El servidor conserva todo el GameState y valida turnos, capacidad y Quiero.
- Cada navegador recibe solamente sus tres cartas; nunca la mano rival ni el
  orden de los mazos.
- El historial y el feedback se consultan desde la sala, con el token del jugador.
- Las salas se eliminan tras siete días de inactividad.
- No hay ranking, chat público ni matchmaking.

## Notas

Para una beta entre amigos es una arquitectura deliberadamente simple. Antes de
abrir salas públicas será necesario agregar límites de creación, monitoreo,
abandonos, controles de abuso y una política de retención formal.
