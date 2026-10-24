import { games } from '../games/registry'
import { getLocalePath, type Locale } from '../i18n'
import { siteUrl } from '../site'

export function GameCatalogSchema({ locale }: { locale: Locale }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: locale === 'pl' ? 'Darmowe gry w przeglądarce — Playcove' : 'Free browser games — Playcove',
    url: siteUrl(getLocalePath(locale)),
    inLanguage: locale,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: games.length,
      itemListElement: games.map(({ manifest }, index) => {
        const game = manifest[locale]
        return {
          '@type': 'ListItem', position: index + 1,
          item: { '@type': 'VideoGame', name: game.name, description: game.description, url: siteUrl(getLocalePath(locale, `games/${game.slug}`)), inLanguage: locale, isAccessibleForFree: true, gamePlatform: 'Web browser' },
        }
      }),
    },
  }
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
}
