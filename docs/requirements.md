# Product requirements

These are the agreed requirements for Playcove. They apply to future games and changes, not just the current catalog. Detailed gameplay rules live in [the game design standard](game-design.md); hosting and module boundaries are recorded in [the architecture decision](adr/0001-static-portal-with-local-game-modules.md).

## Audience and purpose

- Serve a broad audience aged 13+, including students looking for something to play during a break.
- Prioritize entertainment. Games do not need an IT or educational theme.
- Favor familiar arcade mechanics with responsive controls and enough depth to reward practice. Use original names, artwork, code, and levels.
- Require no accounts, sign-in, or cross-game identity.

## Static portal and independent games

- Use TanStack Start for a fully prerendered static site, suitable for inexpensive CDN hosting.
- Run gameplay, simulation, opponents, scores, and progression entirely on the client. Playing must not depend on a runtime game backend or multiplayer server.
- The owner adds games to the repository. Adding or changing a game requires rebuilding and redeploying the portal; there is no player upload flow or runtime game marketplace.
- Develop each game as an independently embeddable React component. It must not depend on portal routing, portal state, or server APIs. Optional game-only helpers may be shared.
- Keep physics, stage data, opponents, progression, controls, and persistence owned by the game. Adding content must not require changes to portal architecture.
- Supply a game thumbnail and localized build-time metadata for catalog cards, discovery, and individual game pages. Load game code lazily.

## Solo and local play

- Support solo play and local two-player play according to the game's mechanics. Local multiplayer means one device and one keyboard, with touch controls available as well.
- Offer solo opponents in competitive games where feasible. Preserve the local two-player option. Cooperative games may stay cooperative when coordination is central to their design.
- Give computer opponents the same movement, physics, health, and resources as human players. Difficulty may change reaction time, accuracy, and decisions; it must not grant hidden advantages.
- Make player assignments, computer opponents, current scores, round objectives, and series standings clear inside the game.

## Sustained play and retries

- Design for worthwhile decisions and changing challenges throughout a skilled 15–30 minute session. Connect short matches into a campaign, tour, cup, series, or endless run.
- Introduce varied layouts, opponent behavior, environmental effects, expanding mechanics, or earned tactical boosts. Repeating the opening faster or increasing health alone is insufficient.
- Make movement, aim, trajectory, collisions, and scoring understandable and controllable. Visible boundaries must match the rules. For example, Volley Clash awards the opponent a point when the last hitter sends the ball out of court.
- Keep Start, Continue, New run, and retry actions prominent, readable, and large enough for touch. Show a new-run action beside Continue or Resume rather than hiding it among mode settings. Give secondary actions an explicit contrasting surface.
- Show why a point or run was lost. Make retrying one action by touch or keyboard, without a reload or repeated setup. A held key must not accidentally restart a game.
- Save records automatically and preserve ongoing progression locally. Resume from a meaningful checkpoint and explain any round restart behavior.
- Keep stage content and progression easy to extend through game-owned data. Follow the per-game rules in [the game design standard](game-design.md), including endless Brick Breaker without a time limit.

## Phones and input

- Every game must be playable with touch; a keyboard must not be required for an essential action, menu, retry, or resume.
- Provide movement and all necessary actions, including aiming, jumping, charging and releasing, changing equipment, and using boosts. Use one pad against a computer, separate pads for local/cooperative players, or pass-and-play controls for turn-based games.
- Support simultaneous movement and actions, independent pointers, captured releases, and cancellation without stuck inputs or duplicate actions.
- Keep touch controls large enough for fingers, outside the play field, and usable in portrait and fullscreen landscape. Respect safe areas; wrap larger action sets.
- Prevent gameplay controls from scrolling the page, selecting text, or opening long-press menus. Pause on lost focus and clear held inputs.
- Match canvas resolution to displayed size and device pixel ratio. Keep physics in logical coordinates so larger screens and high DPI do not change gameplay or create blur.

## Presentation and discovery

- Use a deliberate, cohesive portal design system with light and dark themes. Give individual games recognizable scenery, detailed silhouettes, readable materials, and clear feedback.
- Keep a large game screen with optional fullscreen. Place settings, nicknames, and records inside the game rather than in portal-owned gameplay panels.
- Localize the portal, game menus, controls, feedback, and metadata in English and Polish. Keep the structure ready for additional languages.
- Make the landing encourage play and help users discover suitable games; it must provide more than a bare list. Use useful descriptions and clear actions instead of filler slogans.
- Prerender crawlable home, genre, and game pages with localized titles, descriptions, canonical links, language alternates, and structured data matching visible content. See [landing and SEO behavior](seo.md).
- Prepare advertising positions on landing and game pages while keeping ads outside active gameplay and controls. Avoid forced interstitials, play-blocking ads, and pressure loops. Provider selection is not a prerequisite for preparing the layout.

## Local records

- Each game owns its optional nicknames, device-local leaderboard, settings, and saved progression.
- Show leaderboards inside the game only. Do not introduce a portal-wide leaderboard, shared nickname system, or remote score service.
- Handle unavailable or invalid browser storage without preventing play. Respect reduced motion and keep sound optional, initially muted.

## Verification

Exercise openings, later stages, losses, one-action retries, series transitions, and restored progress. Check solo and local modes, fair bot behavior, phone-width layouts, high-DPI resizing, multi-touch, charge/release, and cancellation. Verify localized rendering and the static build.

Run appropriate automated checks before reporting completion. Automated simulations and render captures do not establish game feel or real-phone usability; report browser/device testing gaps explicitly.
