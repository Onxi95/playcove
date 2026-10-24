import { createFileRoute } from '@tanstack/react-router'
import { HomePage } from '../pages/HomePage'
import { normalizeLocale } from '../i18n'
import { siteUrl } from '../site'

export const Route = createFileRoute('/$locale/')({
  head: ({ params }) => {
    const locale = normalizeLocale(params.locale)
    return {
      links: [
        { rel: 'canonical', href: siteUrl(`/${locale}`) },
        { rel: 'alternate', hrefLang: 'en', href: '/en' },
        { rel: 'alternate', hrefLang: 'pl', href: '/pl' },
        { rel: 'alternate', hrefLang: 'x-default', href: '/en' },
      ],
      meta: [
        { title: locale === 'pl' ? 'Darmowe gry w przeglądarce — solo i dla 2 graczy | Playcove' : 'Free Browser Games — Solo & 2 Players | Playcove' },
        { name: 'description', content: locale === 'pl' ? 'Zagraj od razu w Brick Breaker, Snake, Soccer Duel i inne darmowe gry. Długie biegi solo i pojedynki na jednej klawiaturze. Bez konta i instalacji.' : 'Play Brick Breaker, Snake, Soccer Duel and more free browser games. Long solo runs and local two-player matches. No account or install.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'Playcove' },
        { property: 'og:locale', content: locale === 'pl' ? 'pl_PL' : 'en_US' },
        { property: 'og:title', content: locale === 'pl' ? 'Darmowe gry w przeglądarce — Playcove' : 'Free Browser Games — Playcove' },
        { property: 'og:description', content: locale === 'pl' ? 'Długie biegi solo i lokalne pojedynki. Zagraj bez konta.' : 'Long solo runs and local duels. Start playing without an account.' },
        { property: 'og:url', content: siteUrl(`/${locale}`) },
      ],
    }
  },
  component: LocaleHomePage,
})

function LocaleHomePage() {
  const { locale } = Route.useParams()
  return <HomePage locale={normalizeLocale(locale)} />
}
