import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'bubble-tower',
    name: 'Bubble Tower',
    description:
      'Trap creatures in floating bubbles, pop chain reactions, and climb changing rooms solo or together.',
    genreSlug: 'arcade',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'A D move, W jumps, Space bubbles, X pops. Co-op uses arrows, Enter and Shift.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'bubble-tower',
    name: 'Bubble Tower',
    description:
      'Łap stwory w bańki, łącz pęknięcia i pokonuj kolejne pokoje solo lub we dwoje.',
    genreSlug: 'arcade',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'A D ruch, W skok, spacja: bańki, X: pękanie. Współpraca: strzałki, Enter i Shift.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Bubble Tower">
      <rect width="400" height="260" fill="#203842" />
      <g fill="#778c82">
        <rect x="30" y="210" width="340" height="14" />
        <rect x="55" y="135" width="105" height="12" />
        <rect x="237" y="100" width="110" height="12" />
      </g>
      <g fill="#b8dfe022" stroke="#b8dfe0" strokeWidth="3">
        <circle cx="202" cy="92" r="29" />
        <circle cx="261" cy="153" r="23" />
        <circle cx="142" cy="65" r="17" />
      </g>
      <path d="M186 97v-12q16-20 32 0v12l-8-4-8 4-8-4Z" fill="#deb4a2" />
      <rect x="96" y="175" width="29" height="34" rx="12" fill="#c5d89b" />
    </svg>
  )
}
