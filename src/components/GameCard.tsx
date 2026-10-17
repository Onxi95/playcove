import type { GameModule } from '../games/contract'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function GameCard({ game, locale, featured = false }: { game: GameModule; locale: Locale; featured?: boolean }) {
  const gameInfo = game.manifest[locale]
  const copy = getMessages(locale)
  const Miniature = game.Miniature

  return (
    <article className={`game-card tone-${gameInfo.accent}${featured ? ' game-card-featured' : ''}`}>
      <a
        href={getLocalePath(locale, `games/${gameInfo.slug}`)}
        className="game-card-link"
        aria-label={`${copy.play}: ${gameInfo.name}`}
      >
        <div className="game-card-art">
          <div aria-hidden="true"><Miniature /></div>
          <span className="art-badge">{gameInfo.players}</span>
          <span className="art-open" aria-hidden="true">↗</span>
        </div>
        <div className="game-card-copy">
          <div className="game-card-eyebrow">
            <span>{gameInfo.genreSlug === 'two-player' ? copy.navTwoPlayer : gameInfo.genreSlug === 'sports' ? copy.navSports : copy.navArcade}</span>
            <span className="eyebrow-dot" />
            <span>{gameInfo.playTime}</span>
          </div>
          <h3>{gameInfo.name}</h3>
          <p>{gameInfo.description}</p>
          <span className="game-card-cta">{copy.play}<span aria-hidden="true">→</span></span>
        </div>
      </a>
    </article>
  )
}
