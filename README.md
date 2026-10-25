# Playcove

Playcove is a static, client-playable games portal built with TanStack Start. The English and Polish catalogs, genre hubs, and individual game pages are prerendered during the build. Games run in the browser and own their local nicknames and scoreboards.

## Run it

```sh
npm install
npm run dev
```

Run `npm test` for gameplay, restart, rendering, theme, and high-DPI checks. Create the production build with `npm run build`. The build runs TypeScript checking after Vite prerendering. Deploy its static output to a CDN or static host; no application server is needed to play.

Set `VITE_SITE_URL` to the production origin for absolute SEO URLs. See [landing and SEO behavior](docs/seo.md). Light/dark themes follow the system until the user saves a preference.

See [product requirements](docs/requirements.md) for the agreed scope, play modes, phone support, visuals, ads, and storage rules.

## Add a game

1. Read [product requirements](docs/requirements.md) and [the game design standard](docs/game-design.md), including solo/local modes and complete touch controls.
2. Add a directory under `src/games/` with a `Game.tsx` entry point and an `index.tsx` module descriptor.
3. Export English and Polish manifests plus a `Miniature` component from the descriptor. Each manifest provides the localized page title, description, genre, player count, and controls.
4. Add the descriptor and a lazy `loadGame` import to `src/games/registry.ts`.
5. Give the module its own local storage keys for nicknames and records. Do not send scores to the portal.

The game receives only its locale, with no router, portal state, or server API. `src/games/contract.ts` is the shared build-time module shape. Vite reads the registry to prerender each game and genre page in both languages.

## Game design

Design for 15–30 minute sessions with responsive controls, varied challenges, expandable mechanics, and quick rematches. Connect short matches into longer runs or series, and save ongoing progress locally. See [the game design standard](docs/game-design.md) before adding or changing a game.

## Included games

- Brick Breaker — solo arcade game
- Neon Snake — solo endless arcade game
- Paddle Duel — solo vs computer or local two-player arcade game
- Rooftop Runner — solo endless runner
- Soccer Duel — solo vs bot or local two player sports game
- Star Patrol — solo wave-based shooter
- Asteroid Drift — direct or classic flight, splitting rocks, sector upgrades
- Maze Chase — connected districts, pursuit personalities, power reversals
- Block Cascade — falling blocks, hold, wall kicks, earned rescues
- River Crossing — traffic, moving logs, turtle warnings, route choices
- Blast Arena — solo bomb ladder or local best-of-five series
- Bubble Tower — solo or cooperative capture-and-pop rooms
- Barrel Ascent — climbing, barrel jumps, bolts, hammers, moving lifts
- Formation Rescue — diving formations, captured pilots, dual fire, challenge waves
- Coastal Rush — drifting, slipstream, overtake chains, scenic route forks
- Iron Front — run-and-gun missions, weapon supplies, grenades, siege bosses, rovers
- Volley Clash — solo or local volleyball with changing courts and a three-set match
- Tank Tactics — solo or pass-and-play artillery expedition with deformable terrain
- Ricochet Rivals — solo or local arena tournament with charged throws and parries
- Circuit Clash — solo or local five-lap races across five circuits and a seven-win tour
- Twin Tethers — two-player cooperative platform rooms with shared rope physics

The [arcade roadmap](docs/arcade-roadmap.md) records the ten classic inspirations and research sources. New games share optional game-only rendering/session helpers under `src/games/kit`; each keeps its engine, stage content, artwork, controls, and persistence adapter in its own module. Existing games remain available.

All games expose touch controls on phones. Movement, held actions, charge/release, and local player pads use the same game-owned inputs as keyboard play. Fullscreen landscape mode gives the newer games a side control deck; portrait mode remains playable. Solo-capable competitive games offer relaxed, club, and expert opponents. Twin Tethers remains cooperative.
