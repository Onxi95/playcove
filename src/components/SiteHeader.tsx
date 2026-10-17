import { useRouterState } from '@tanstack/react-router'
import { getLocalePath, getMessages, normalizeLocale } from '../i18n'

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = normalizeLocale(pathname.split('/')[1] ?? 'en')
  const pagePath = pathname.replace(/^\/(en|pl)\/?/, '')
  const copy = getMessages(locale)

  return (
    <header className="site-header">
      <div className="header-inner">
        <a href={getLocalePath(locale)} className="brand" aria-label="Playcove">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
          <span>playcove</span>
        </a>
        <nav className="header-nav" aria-label="Main navigation">
          <a href={`${getLocalePath(locale)}#games`} className="header-link">{copy.navGames}</a>
          <a href={getLocalePath(locale, 'genres/arcade')} className="header-link">{copy.navArcade}</a>
          <a href={getLocalePath(locale, 'genres/sports')} className="header-link">{copy.navSports}</a>
          <a href={getLocalePath(locale, 'genres/two-player')} className="header-link">{copy.navTwoPlayer}</a>
        </nav>
        <nav className="language-switch" aria-label={copy.language}>
          <a href={getLocalePath('en', pagePath)} aria-label={copy.languageNames.en} aria-current={locale === 'en' ? 'page' : undefined}>EN</a>
          <a href={getLocalePath('pl', pagePath)} aria-label={copy.languageNames.pl} aria-current={locale === 'pl' ? 'page' : undefined}>PL</a>
        </nav>
      </div>
    </header>
  )
}
