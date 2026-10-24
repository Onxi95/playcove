import { createFileRoute } from '@tanstack/react-router'
import { getGenre } from '../genres'
import { GenrePage } from '../pages/GenrePage'
import { normalizeLocale } from '../i18n'
import { siteUrl } from '../site'

export const Route = createFileRoute('/$locale/genres/$slug')({
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale)
    const genre = getGenre(params.slug, locale)
    return {
      links: [
        { rel: 'canonical', href: siteUrl(`/${locale}/genres/${params.slug}`) },
        { rel: 'alternate', hrefLang: 'en', href: `/en/genres/${params.slug}` },
        { rel: 'alternate', hrefLang: 'pl', href: `/pl/genres/${params.slug}` },
      ],
      meta: [
        { title: genre ? `${genre.title} — Playcove` : locale === 'pl' ? 'Kategoria — Playcove' : 'Game category — Playcove' },
        { name: 'description', content: genre ? (locale === 'pl' ? `Gry z kategorii: ${genre.title}.` : `Browse ${genre.title.toLowerCase()} games on Playcove.`) : locale === 'pl' ? 'Przeglądaj darmowe gry.' : 'Browse free games on Playcove.' },
      ],
    }
  },
  component: LocaleGenrePage,
})

function LocaleGenrePage() {
  const { locale, slug } = Route.useParams()
  return <GenrePage slug={slug} locale={normalizeLocale(locale)} />
}
