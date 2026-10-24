import type { Locale } from './i18n.ts'

export type GenreSlug = 'arcade' | 'sports' | 'two-player'

export type Genre = {
  slug: GenreSlug
  title: string
  icon: string
}

const genres: Record<Locale, Genre[]> = {
  en: [
    { slug: 'arcade', title: 'Arcade', icon: '✦' },
    { slug: 'sports', title: 'Sports', icon: '◉' },
    { slug: 'two-player', title: 'Two player', icon: '↔' },
  ],
  pl: [
    { slug: 'arcade', title: 'Arcade', icon: '✦' },
    { slug: 'sports', title: 'Sport', icon: '◉' },
    { slug: 'two-player', title: 'Dla dwóch graczy', icon: '↔' },
  ],
}

export function getGenres(locale: Locale) {
  return genres[locale]
}

export function getGenre(slug: string, locale: Locale) {
  return genres[locale].find((genre) => genre.slug === slug)
}

export function matchesGenre(game: { genreSlug: string; localMultiplayer?: boolean }, genre: string) {
  return genre === 'all' || game.genreSlug === genre || (genre === 'two-player' && game.localMultiplayer === true)
}
