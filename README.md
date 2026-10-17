# Playcove

Playcove is a static, client-playable games portal built with TanStack Start. The English and Polish catalogs, genre hubs, and individual game pages are prerendered during the build. Games run in the browser and own their local nicknames and scoreboards.

## Run it

```sh
npm install
npm run dev
```

Create the production build with `npm run build`. The build runs TypeScript checking after Vite prerendering. Deploy its static output to a CDN or static host; no application server is needed to play.

## Add a game

1. Add a directory under `src/games/` with a `Game.tsx` entry point and an `index.tsx` module descriptor.
2. Export English and Polish manifests plus a `Miniature` component from the descriptor. Each manifest provides the localized page title, description, genre, player count, and controls.
3. Add the descriptor and a lazy `loadGame` import to `src/games/registry.ts`.
4. Give the module its own local storage keys for nicknames and records. Do not send scores to the portal.

The game receives only its locale, with no router, portal state, or server API. `src/games/contract.ts` is the shared build-time module shape. Vite reads the registry to prerender each game and genre page in both languages.

## Included games

- Brick Breaker — solo arcade game
- Paddle Duel — local two-player arcade game
- Penalty Shootout — solo sports game
