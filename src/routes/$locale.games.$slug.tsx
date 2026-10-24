import { createFileRoute } from '@tanstack/react-router'
import { getGame } from '../games/registry'
import { GamePage } from '../pages/GamePage'
import { normalizeLocale } from '../i18n'
import { siteUrl } from '../site'

export const Route = createFileRoute('/$locale/games/$slug')({
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale)
    const manifest = getGame(params.slug)?.manifest[locale]
    return {
      links: [
        { rel: 'canonical', href: siteUrl(`/${locale}/games/${params.slug}`) },
        { rel: 'alternate', hrefLang: 'en', href: `/en/games/${params.slug}` },
        { rel: 'alternate', hrefLang: 'pl', href: `/pl/games/${params.slug}` },
      ],
      meta: [
        { title: manifest ? `${manifest.name} — Playcove` : locale === 'pl' ? 'Nie znaleziono gry — Playcove' : 'Game not found — Playcove' },
        { name: 'description', content: manifest?.description ?? (locale === 'pl' ? 'Graj w darmowe gry w przeglądarce.' : 'Play free browser games on Playcove.') },
      ],
    }
  },
  component: LocaleGamePage,
})

function LocaleGamePage() {
  const { locale, slug } = Route.useParams()
  return <GamePage slug={slug} locale={normalizeLocale(locale)} />
}
