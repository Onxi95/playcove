import { GameCard } from '../components/GameCard'
import { games } from '../games/registry'
import { getGenre, matchesGenre } from '../genres'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function GenrePage({ slug, locale }: { slug: string; locale: Locale }) {
  const copy = getMessages(locale)
  const genre = getGenre(slug, locale)
  const genreGames = games.filter(({ manifest }) => matchesGenre(manifest[locale], slug))

  if (!genre) {
    return <main className="not-found page-wrap"><span className="eyebrow">PLAYCOVE</span><h1>{copy.genreNotFound}</h1><a className="button button-primary" href={getLocalePath(locale)}>{copy.backToGames}<span aria-hidden="true">→</span></a></main>
  }

  return (
    <main className="genre-page page-wrap">
      <nav className="breadcrumbs" aria-label={copy.breadcrumbsGames}><a href={getLocalePath(locale)}>{copy.breadcrumbsGames}</a><span>/</span><span>{genre.title}</span></nav>
      <header className="genre-heading"><span className="genre-icon" aria-hidden="true">{genre.icon}</span><span className="eyebrow">{copy.categories}</span><h1>{genre.title}</h1><span className="catalog-count">{copy.gameCount(genreGames.length)}</span></header>
      {genreGames.length ? <div className="game-grid">{genreGames.map((game) => <GameCard key={game.manifest.en.slug} game={game} locale={locale} />)}</div> : <p className="empty-games">{copy.noGamesInGenre}</p>}
      <a className="genre-back text-button" href={getLocalePath(locale)}>← {copy.backToGames}</a>
    </main>
  )
}
