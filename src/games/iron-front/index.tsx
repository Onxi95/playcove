import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'iron-front',
    name: 'Iron Front',
    description:
      'Run, jump, rescue engineers, and break siege machines across an expanding mission campaign.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'A D move, Space jumps, J fires, X grenades. Down crouches. Every third mission brings a rover.',
  },
  pl: {
    slug: 'iron-front',
    name: 'Iron Front',
    description:
      'Biegnij, skacz, ratuj inżynierów i niszcz maszyny oblężnicze w kolejnych misjach.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'A D ruch, spacja: skok, J: strzał, X: granat. Dół: kucanie. Co trzecia misja daje pojazd.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Iron Front">
      <rect width="400" height="260" fill="#203842" />
      <g fill="#5e7b76">
        <rect x="30" y="90" width="65" height="135" />
        <rect x="115" y="65" width="50" height="160" />
        <rect x="285" y="55" width="90" height="170" />
      </g>
      <rect x="0" y="218" width="400" height="42" fill="#334c45" />
      <rect x="244" y="161" width="98" height="47" rx="10" fill="#99a78d" />
      <rect x="223" y="170" width="48" height="12" fill="#bec5a3" />
      <g fill="#2b443e">
        <circle cx="261" cy="209" r="12" />
        <circle cx="289" cy="209" r="12" />
        <circle cx="321" cy="209" r="12" />
      </g>
      <rect x="117" y="182" width="25" height="32" rx="5" fill="#cbd3ad" />
      <circle cx="130" cy="175" r="11" fill="#d7b68a" />
      <path d="M140 194h35m17 0h15" stroke="#f1d792" strokeWidth="5" />
    </svg>
  )
}
