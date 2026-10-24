import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AdSlot } from '../components/AdSlot'
import { GameCard } from '../components/GameCard'
import { GameCatalogSchema } from '../components/GameCatalogSchema'
import { games, getGameComponent } from '../games/registry'
import { getGenres, matchesGenre } from '../genres'
import { getLocalePath, getMessages, type Locale } from '../i18n'

export function HomePage({ locale }: { locale: Locale }) {
  const copy = getMessages(locale)
  const genres = getGenres(locale)
  const [query, setQuery] = useState('')
  const [selectedGenre, setSelectedGenre] = useState('all')
  const searchRef = useRef<HTMLInputElement>(null)
  const featured = games.find(({ manifest }) => manifest.en.slug === 'brick-breaker') ?? games[0]
  const FeaturedGame = getGameComponent(featured)
  const filteredGames = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale)

    return games.filter(({ manifest }) => {
      const game = manifest[locale]
      const genre = genres.find((item) => item.slug === game.genreSlug)
      const genreMatches = matchesGenre(game, selectedGenre)
      const matchesQuery = !normalizedQuery || `${game.name} ${genre?.title ?? ''} ${game.description}`.toLocaleLowerCase(locale).includes(normalizedQuery)
      return genreMatches && matchesQuery
    })
  }, [query, selectedGenre, locale, genres])

  useEffect(() => {
    function search(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      event.preventDefault()
      searchRef.current?.focus()
    }
    window.addEventListener('keydown', search)
    return () => window.removeEventListener('keydown', search)
  }, [])

  return (
    <main className="home-page page-wrap">
      <GameCatalogSchema locale={locale} />
      <header className="home-intro">
        <div><h1>{locale === 'pl' ? 'Darmowe gry w przeglądarce' : 'Free browser games'}</h1><p>{locale === 'pl' ? 'Zacznij od Brick Breakera albo wybierz grę solo, pojedynek na jednej klawiaturze lub piłkę nożną. Bez konta i pobierania.' : 'Start with Brick Breaker, or choose a solo run, a one-keyboard duel, or football. No account or download.'}</p></div>
        <a href="#games">{copy.allGames}<span aria-hidden="true">↓</span></a>
      </header>
      <section className="home-play-now" aria-label={locale === 'pl' ? 'Zagraj w Brick Breaker' : 'Play Brick Breaker'}>
        <div className="home-feature-intro"><span>{locale === 'pl' ? 'ZAGRAJ TUTAJ' : 'PLAY RIGHT HERE'}</span><h2>Brick Breaker</h2><p>{locale === 'pl' ? 'Rozbij ścianę. Złap bonus. Sprawdź, ile fal zdołasz przejść.' : 'Clear a wall. Catch a boost. See how many waves you can clear.'}</p><ul><li>{locale === 'pl' ? 'Odbicia kierowane krawędzią pałki' : 'Aim returns with the paddle edges'}</li><li>{locale === 'pl' ? 'Nowe układy i ładowany laser' : 'New layouts and a charged laser'}</li><li>{locale === 'pl' ? 'Rekord zapisuje się na urządzeniu' : 'Your best stays on this device'}</li></ul><a href={getLocalePath(locale, `games/${featured.manifest.en.slug}`)}>{locale === 'pl' ? 'Strona gry i sterowanie' : 'Game page and controls'} ↗</a></div>
        <div className="home-feature-stage"><Suspense fallback={<div className="game-loading">{locale === 'pl' ? 'Ładowanie Brick Breakera…' : 'Loading Brick Breaker…'}</div>}><FeaturedGame locale={locale} /></Suspense></div>
      </section>
      <section className="home-recommendations" aria-label={locale === 'pl' ? 'Wybierz sposób gry' : 'Choose how to play'}>
        <article><h2>{locale === 'pl' ? 'Na dłuższy bieg' : 'For a longer run'}</h2><p>{locale === 'pl' ? 'Star Patrol miesza formacje i ataki nurkujące, a co czwartą falę wprowadza bossa.' : 'Star Patrol mixes formations and diving attacks, with a boss every fourth wave.'}</p><a href={getLocalePath(locale, 'games/star-patrol')}>{locale === 'pl' ? 'Zagraj w Star Patrol' : 'Play Star Patrol'} →</a></article>
        <article><h2>{locale === 'pl' ? 'Dla dwóch osób' : 'For two people'}</h2><p>{locale === 'pl' ? 'Soccer Duel to skoki i strzały na jednym boisku. W Paddle Duel ruch pałki nadaje rotację.' : 'Jump and shoot on one pitch in Soccer Duel. Add spin to each return in Paddle Duel.'}</p><a href={getLocalePath(locale, 'genres/two-player')}>{locale === 'pl' ? 'Gry dla dwóch graczy' : 'Two-player games'} →</a></article>
        <article><h2>{locale === 'pl' ? 'Na nowy rekord' : 'For a new high score'}</h2><p>{locale === 'pl' ? 'Neon Snake nagradza serie owoców. Dopalacz podwaja punkty, ale zostawia mniej czasu na zakręt.' : 'Neon Snake rewards fruit chains. Boosting doubles points and leaves less time to turn.'}</p><a href={getLocalePath(locale, 'games/neon-snake')}>{locale === 'pl' ? 'Zagraj w Neon Snake' : 'Play Neon Snake'} →</a></article>
      </section>
      <section className="catalog" id="games">
        <div className="catalog-heading">
          <div><h2>{copy.allGames}</h2><p>{copy.gameCount(games.length)}</p></div>
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <span className="visually-hidden">{copy.searchLabel}</span>
            <input ref={searchRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.searchPlaceholder} />
            <kbd>/</kbd>
          </label>
        </div>

        <div className="catalog-body">
          <nav className="genre-filters" aria-label={copy.categories}>
            <button aria-pressed={selectedGenre === 'all'} className={selectedGenre === 'all' ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setSelectedGenre('all')}>{copy.allGames}<span>{games.length}</span></button>
            {genres.map((genre) => (
              <button aria-pressed={selectedGenre === genre.slug} className={selectedGenre === genre.slug ? 'filter-chip is-active' : 'filter-chip'} onClick={() => setSelectedGenre(genre.slug)} key={genre.slug}>
                <span className="filter-icon" aria-hidden="true">{genre.icon}</span>{genre.title}
              </button>
            ))}
          </nav>
          <div className="catalog-games">

        {filteredGames.length ? (
          <div className="game-grid">{filteredGames.map((game) => <GameCard key={game.manifest.en.slug} game={game} locale={locale} />)}</div>
        ) : (
          <div className="empty-games"><strong>{copy.noGames}</strong><button className="text-button" onClick={() => { setQuery(''); setSelectedGenre('all') }}>{copy.clearSearch}</button></div>
        )}
        <AdSlot placement={`home-after-games-${locale}`} />
          </div>
        </div>
      </section>
      <section className="home-about">
        <div><h2>{locale === 'pl' ? 'Arcade, sport i lokalne pojedynki' : 'Arcade, sports, and local duels'}</h2><p>{locale === 'pl' ? 'Wszystkie gry działają w przeglądarce. Rozwijaj bieg solo, poprawiaj rekordy lub zagraj rewanż na jednej klawiaturze. Soccer Duel ma także bota i zapisany lokalnie bieg przez kolejne drużyny.' : 'Every game runs in your browser. Build a solo run, improve a high score, or settle a rematch on one keyboard. Soccer Duel also offers a bot and a locally saved run through successive teams.'}</p><nav aria-label={copy.categories}>{genres.map((genre) => <a key={genre.slug} href={getLocalePath(locale, `genres/${genre.slug}`)}>{genre.title} →</a>)}</nav></div>
        <div className="home-faq"><details><summary>{locale === 'pl' ? 'Czy potrzebuję konta?' : 'Do I need an account?'}</summary><p>{locale === 'pl' ? 'Nie. Wybierz grę i uruchom ją w przeglądarce. Nie trzeba nic instalować.' : 'No. Choose a game and start it in your browser. Nothing needs installing.'}</p></details><details><summary>{locale === 'pl' ? 'Czy można grać we dwie osoby?' : 'Can two people share one keyboard?'}</summary><p>{locale === 'pl' ? 'Tak. Paddle Duel i Soccer Duel mają osobne klawisze dla obu graczy na jednym urządzeniu.' : 'Yes. Paddle Duel and Soccer Duel give each player separate keys on the same device.'}</p></details><details><summary>{locale === 'pl' ? 'Gdzie zapisują się wyniki?' : 'Where are scores saved?'}</summary><p>{locale === 'pl' ? 'W tej przeglądarce na tym urządzeniu. Nie synchronizują się z innymi urządzeniami; wyczyszczenie danych przeglądarki usuwa także wyniki i zapisany postęp.' : 'In this browser on this device. They do not sync across devices; clearing browser data also removes scores and saved progress.'}</p></details></div>
      </section>
    </main>
  )
}
