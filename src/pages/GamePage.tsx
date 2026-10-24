import { Suspense } from 'react'
import { AdSlot } from '../components/AdSlot'
import { GameCard } from '../components/GameCard'
import { getGame, getGameComponent, games } from '../games/registry'
import { getGenre } from '../genres'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function GamePage({ slug, locale }: { slug: string; locale: Locale }) {
  const copy = getMessages(locale)
  const game = getGame(slug)

  if (!game) {
    return <main className="not-found page-wrap"><span className="eyebrow">PLAYCOVE</span><h1>{copy.gameNotFound}</h1><a className="button button-primary" href={getLocalePath(locale)}>{copy.backToGames}<span aria-hidden="true">→</span></a></main>
  }

  const manifest = game.manifest[locale]
  const genre = getGenre(manifest.genreSlug, locale)
  const GameComponent = getGameComponent(game)
  const otherGames = games.filter((item) => item.manifest.en.slug !== manifest.slug).slice(0, 2)

  return (
    <main className={`game-page page-wrap tone-${manifest.accent}`}>
      <nav className="breadcrumbs" aria-label={copy.breadcrumbsGames}>
        <a href={getLocalePath(locale)}>{copy.breadcrumbsGames}</a><span>/</span>
        <a href={getLocalePath(locale, `genres/${manifest.genreSlug}`)}>{genre?.title}</a><span>/</span>
        <span>{manifest.name}</span>
      </nav>

      <section className="game-intro">
        <div><span className="eyebrow">{genre?.title}</span><h1>{manifest.name}</h1><p>{manifest.description}</p></div>
        <div className="game-facts">
          <div><span>{copy.players}</span><strong>{manifest.players}</strong></div>
          <div><span>{copy.round}</span><strong>{manifest.playTime}</strong></div>
        </div>
      </section>

      <AdSlot placement={`game-${manifest.slug}-above-play-${locale}`} />

      <section className="play-shell" aria-label={`${manifest.name} ${copy.playLabel}`}>
        <div className="play-shell-top"><span>{copy.playLabel}</span><span>{copy.localScores}</span></div>
        <div className="game-mount">
          <Suspense fallback={<div className="game-loading"><strong>{locale === 'pl' ? 'Ładowanie gry…' : 'Loading game…'}</strong></div>}>
            <GameComponent locale={locale} />
          </Suspense>
        </div>
      </section>

      <div className="game-details-row">
        <details className="control-note"><summary>{copy.controls}<span aria-hidden="true">+</span></summary><p>{manifest.controls}</p></details>
        <AdSlot placement={`game-${manifest.slug}-below-play-${locale}`} />
      </div>

      <section className="more-games">
        <div className="more-games-heading"><h2>{copy.moreGames}</h2><a className="text-button" href={getLocalePath(locale)}>{copy.viewAll}<span aria-hidden="true">→</span></a></div>
        <div className="game-grid more-game-grid">{otherGames.map((item) => <GameCard game={item} locale={locale} key={item.manifest.en.slug} />)}</div>
      </section>
    </main>
  )
}
