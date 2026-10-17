import { useMemo, useRef, useState } from 'react'
import { AdSlot } from '../components/AdSlot'
import { GameCard } from '../components/GameCard'
import { games } from '../games/registry'
import { getGenres } from '../genres'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function HomePage({ locale }: { locale: Locale }) {
  const copy = getMessages(locale)
  const genres = getGenres(locale)
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const searchRef = useRef<HTMLInputElement>(null)
  const featured = games.find(({ manifest }) => manifest.en.slug === 'brick-breaker') ?? games[0]
  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale)

    return games.filter(({ manifest }) => {
      const game = manifest[locale]
      const genre = genres.find((item) => item.slug === game.genreSlug)
      const matchesGenre = selectedGenre === 'all' || game.genreSlug === selectedGenre
      const matchesQuery = !normalizedQuery || `${game.name} ${genre?.title ?? ''} ${game.description}`.toLocaleLowerCase(locale).includes(normalizedQuery)
      return matchesGenre && matchesQuery
    })
  }, [query, selectedGenre, locale, genres])

  return (
    <main className="home-page">
      <section className="home-hero page-wrap">
        <div className="home-hero-copy">
          <span className="eyebrow">PLAYCOVE <i /> {locale === 'pl' ? 'GRY W PRZEGLĄDARCE' : 'BROWSER GAMES'}</span>
          <h1>{copy.homeTitle.split('\n').map((line, index) => <span key={line} className={index === 1 ? 'hero-title-accent' : undefined}>{line}</span>)}</h1>
          <p>{copy.homeDescription}</p>
          <a className="button button-primary" href="#games">{copy.homeAction}<span aria-hidden="true">↓</span></a>
        </div>
        <div className="featured-game-wrap">
          <div className="featured-label"><span className="featured-mark">✳</span>{copy.featured}</div>
          <GameCard game={featured} locale={locale} featured />
        </div>
        <div className="hero-grid-mark" aria-hidden="true" />
      </section>

      <section className="catalog page-wrap" id="games">
        <div className="catalog-heading">
          <div><span className="eyebrow">{copy.gameShelf}</span><h2>{copy.allGames}<span className="heading-count">{String(games.length).padStart(2, '0')}</span></h2></div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <span className="visually-hidden">{copy.searchLabel}</span>
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
            <kbd>/</kbd>
          </label>
        </div>

        <div className="catalog-tools">
          <nav className="genre-filters" aria-label={copy.categories}>
            <button className={selectedGenre === 'all' ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setSelectedGenre('all')}>{copy.allGames}<span>{games.length}</span></button>
            {genres.map((genre) => (
              <button className={selectedGenre === genre.slug ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setSelectedGenre(genre.slug)} key={genre.slug}>
                <span className="filter-icon" aria-hidden="true">{genre.icon}</span>{genre.title}
              </button>
            ))}
          </nav>
          <span className="catalog-count">{copy.gameCount(filteredGames.length)}</span>
        </div>

        {filteredGames.length ? (
          <div className="game-grid">{filteredGames.map((game) => <GameCard key={game.manifest.en.slug} game={game} locale={locale} />)}</div>
        ) : (
          <div className="empty-games"><strong>{copy.noGames}</strong><button className="text-button" onClick={() => { setQuery(''); setSelectedGenre('all') }}>{copy.clearSearch}</button></div>
        )}
        <AdSlot placement={`home-after-games-${locale}`} />
        <div className="category-links" aria-label={copy.categories}>
          {genres.map((genre) => <a key={genre.slug} href={getLocalePath(locale, `genres/${genre.slug}`)}><span>{genre.icon}</span>{genre.title}<b aria-hidden="true">↗</b></a>)}
        </div>
      </section>
    </main>
  )
}
