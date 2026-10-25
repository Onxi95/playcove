import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'blast-arena',
    name: 'Blast Arena',
    description:
      'Carve escape routes, chain bomb blasts, and climb a solo ladder or duel on one keyboard.',
    genreSlug: 'arcade',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'WASD and Space plant bombs. In local play: arrows and Enter for player two.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'blast-arena',
    name: 'Blast Arena',
    description:
      'Planuj ucieczkę, łącz eksplozje i graj solo lub z drugą osobą na jednej klawiaturze.',
    genreSlug: 'arcade',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'coral',
    controls: 'WASD i spacja: bomby. Drugi gracz: strzałki i Enter.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Blast Arena">
      <rect width="400" height="260" fill="#203842" />
      <g fill="#607c76">
        <rect x="55" y="45" width="45" height="45" rx="5" />
        <rect x="175" y="45" width="45" height="45" rx="5" />
        <rect x="295" y="45" width="45" height="45" rx="5" />
        <rect x="55" y="165" width="45" height="45" rx="5" />
        <rect x="175" y="165" width="45" height="45" rx="5" />
        <rect x="295" y="165" width="45" height="45" rx="5" />
      </g>
      <path d="M115 109h170v37H115Z M182 85h37v90h-37Z" fill="#e5b477" />
      <circle cx="200" cy="127" r="22" fill="#263e42" />
      <path
        d="m208 107 7-15 10 4"
        fill="none"
        stroke="#f3dfaa"
        strokeWidth="4"
      />
      <circle cx="131" cy="68" r="15" fill="#bdd3cd" />
    </svg>
  )
}
