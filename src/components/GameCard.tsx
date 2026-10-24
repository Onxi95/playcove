import type { GameModule } from '../games/contract'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function GameCard({ game, locale }: { game: GameModule; locale: Locale }) {
  const gameInfo = game.manifest[locale]
  const copy = getMessages(locale)
  const Miniature = game.Miniature

  return (
    <article data-game={gameInfo.slug} className={`game-card tone-${gameInfo.accent}`}>
      <a
        href={getLocalePath(locale, `games/${gameInfo.slug}`)}
        className="game-card-link"
        aria-label={`${copy.play}: ${gameInfo.name}`}
      >
        <div className="game-card-art">
          <div aria-hidden="true"><Miniature /></div>
          <span className="art-open" aria-hidden="true">▶</span>
        </div>
        <div className="game-card-copy">
          <h3>{gameInfo.name}</h3>
          <span>{gameInfo.players}<i aria-hidden="true"> · </i>{gameInfo.genreSlug === 'two-player' ? copy.navTwoPlayer : gameInfo.genreSlug === 'sports' ? copy.navSports : copy.navArcade}</span>
          <p>{gameInfo.description}</p>
        </div>
      </a>
    </article>
  )
}
