# Landing and discovery

The landing combines a playable Brick Breaker, recommendations for different modes, the full catalog, category links, and answers about accounts, local multiplayer, and device-local records. Keep game descriptions visible and useful when adding games.

Headings, page titles, descriptions, and internal links describe the actual games. This follows Google's guidance on [helpful content and crawlable links](https://developers.google.com/search/docs/essentials) and [descriptive titles](https://developers.google.com/search/docs/appearance/title-link).

English and Polish home, game, and category routes remain prerendered. Each has a canonical link and language alternates. Home metadata includes Open Graph fields. Its `CollectionPage` / `ItemList` JSON-LD is generated from the same registry as the visible catalog.

Set `VITE_SITE_URL` to the production origin before building to emit absolute canonical and structured-data URLs. Without it, paths remain relative to the deployment host. Configure the origin without a language prefix or game path.

Game assets load lazily, while names, descriptions, links, and metadata render on the server. The featured game uses the same standalone component as its game page. Keep advertising outside active gameplay.

Run `npm test` for gameplay simulations, actual React server rendering, catalog/schema consistency, local multiplayer discovery, theme initialization, high-DPI resizing, and stylesheet parsing. A browser play session remains useful for assessing feel and appearance; these checks do not replace it.
