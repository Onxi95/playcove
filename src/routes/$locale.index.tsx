import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../pages/HomePage'
import { normalizeLocale } from '../i18n'

export const Route = createFileRoute('/$locale/')({
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale)
    return {
      links: [
        { rel: 'alternate', hrefLang: 'en', href: '/en' },
        { rel: 'alternate', hrefLang: 'pl', href: '/pl' },
      ],
      meta: [
        { title: locale === 'pl' ? 'Playcove — Gry w przeglądarce' : 'Playcove — Browser games' },
        { name: 'description', content: locale === 'pl' ? 'Darmowe gry arcade i sportowe. Graj solo lub z drugą osobą na jednej klawiaturze.' : 'Free arcade and sports games. Play solo or with a friend on one keyboard.' },
      ],
    }
  },
  component: LocaleHomePage,
})

function LocaleHomePage() {
  const { locale } = Route.useParams()
  return <HomePage locale={normalizeLocale(locale)} />
}
