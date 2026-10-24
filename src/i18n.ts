export const locales = ['en', 'pl'] as const

export type Locale = (typeof locales)[number]

function polishGameCount(count: number) {
  const lastDigit = count % 10
  const lastTwoDigits = count % 100
  const noun = count === 1 ? 'gra' : lastDigit >= 2 && lastDigit <= 4 && (lastTwoDigits < 12 || lastTwoDigits > 14) ? 'gry' : 'gier'
  return `${count} ${noun}`
}

const messages = {
  en: {
    navGames: 'Games', navArcade: 'Arcade', navSports: 'Sports', navTwoPlayer: '2 players',
    language: 'Language', languageNames: { en: 'English', pl: 'Polski' },
    homeTitle: 'Arcade.',
    homeDescription: 'Play solo or with a friend on the same keyboard.',
    homeAction: 'Browse games',
    featured: 'FEATURED GAME', play: 'Play game',
    categories: 'Browse by type', allGames: 'All games', searchLabel: 'Search games', searchPlaceholder: 'Search titles or types',
    gameShelf: 'GAME LIBRARY', gameCount: (count: number) => `${count} ${count === 1 ? 'game' : 'games'}`,
    noGames: 'No games match that search.', clearSearch: 'Clear search',
    gameNotFound: 'Game not found', genreNotFound: 'Category not found', backToGames: 'Back to games',
    breadcrumbsGames: 'Games', players: 'PLAYERS', round: 'ROUND', controls: 'CONTROLS',
    playLabel: 'PLAY', localScores: 'Scores stay on this device',
    moreGames: 'MORE GAMES', viewAll: 'View all games', noGamesInGenre: 'No games in this category yet.',
    footerNote: 'Free browser games. No account required.', savedLocally: 'Local scores stay on this device.',
  },
  pl: {
    navGames: 'Gry', navArcade: 'Arcade', navSports: 'Sport', navTwoPlayer: '2 graczy',
    language: 'Język', languageNames: { en: 'English', pl: 'Polski' },
    homeTitle: 'Arcade.',
    homeDescription: 'Graj solo lub z drugą osobą na jednej klawiaturze.',
    homeAction: 'Zobacz gry',
    featured: 'POLECANA GRA', play: 'Graj',
    categories: 'Kategorie', allGames: 'Wszystkie gry', searchLabel: 'Szukaj gier', searchPlaceholder: 'Wpisz tytuł lub kategorię',
    gameShelf: 'BIBLIOTEKA GIER', gameCount: polishGameCount,
    noGames: 'Brak gier pasujących do wyszukiwania.', clearSearch: 'Wyczyść wyszukiwanie',
    gameNotFound: 'Nie znaleziono gry', genreNotFound: 'Nie znaleziono kategorii', backToGames: 'Wróć do gier',
    breadcrumbsGames: 'Gry', players: 'GRACZE', round: 'CZAS GRY', controls: 'STEROWANIE',
    playLabel: 'GRA', localScores: 'Wyniki zapisują się na tym urządzeniu',
    moreGames: 'WIĘCEJ GIER', viewAll: 'Zobacz wszystkie gry', noGamesInGenre: 'W tej kategorii nie ma jeszcze gier.',
    footerNote: 'Darmowe gry w przeglądarce. Bez konta.', savedLocally: 'Wyniki zapisują się na tym urządzeniu.',
  },
} as const

export function normalizeLocale(value: string): Locale {
  return value === 'pl' ? 'pl' : 'en'
}

export function getMessages(locale: Locale) {
  return messages[locale]
}

export function getLocalePath(locale: Locale, path = '') {
  return path ? `/${locale}/${path.replace(/^\/+/, '')}` : `/${locale}`
}
