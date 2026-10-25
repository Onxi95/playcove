import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'asteroid-drift',
    name: 'Asteroid Drift',
    description:
      'Thread drifting rocks, split asteroid fields, and build a custom ship through endless sectors.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'Flight, aim, fire, and dash. Choose direct steering or classic thrust controls.',
  },
  pl: {
    slug: 'asteroid-drift',
    name: 'Asteroid Drift',
    description:
      'Omijaj skały, rozbijaj asteroidy i ulepszaj statek w kolejnych sektorach.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'Ruch, celowanie, strzał i unik. Wybierz sterowanie bezpośrednie lub klasyczny ciąg.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Asteroid Drift">
      <rect width="400" height="260" fill="#203842" />
      <g fill="none" stroke="#d5ddc4" strokeWidth="4">
        <path d="m75 52 40 8 17 35-20 39-45-6-18-39Z" />
        <path d="m299 151 36-18 32 25-6 39-39 17-36-28Z" />
        <path d="m189 172 16-64 26 57-21-8Z" />
      </g>
      <path d="m204 179-9 28" stroke="#efbe84" strokeWidth="8" />
      <circle cx="244" cy="80" r="4" fill="#edc799" />
    </svg>
  )
}
