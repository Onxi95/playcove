import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'tank-tactics',
    name: 'Tank Tactics',
    description:
      'Aim through changing winds, carve craters into the hills, and outthink a friend in a seven-win artillery expedition.',
    genreSlug: 'arcade',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'P1: W S angle, A D power, Q shell, Space fires. P2: arrows, Shift shell, Enter fires.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'tank-tactics',
    name: 'Tank Tactics',
    description:
      'Celuj na wietrze, twórz kratery i przechytrz znajomego w ekspedycji artyleryjskiej do siedmiu wygranych.',
    genreSlug: 'arcade',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'P1: W S kąt, A D moc, Q pocisk, spacja: strzał. P2: strzałki, Shift pocisk, Enter: strzał.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Tank Tactics">
      <path d="M0 0h400v260H0Z" fill="#9cbbb9" />
      <circle cx="310" cy="60" r="29" fill="#ecd1a0" />
      <path d="M0 185q95-80 180 15t220-20v80H0Z" fill="#b69575" />
      <path d="M0 214q115-50 210 10t190-22v58H0Z" fill="#7e7665" />
      <g fill="#d9ab82">
        <rect x="48" y="170" width="61" height="20" rx="7" />
        <rect x="63" y="157" width="31" height="21" rx="6" />
      </g>
      <path d="m78 164 31-24" stroke="#e6c398" strokeWidth="8" />
      <g fill="#abcbd5">
        <rect x="285" y="181" width="61" height="20" rx="7" />
        <rect x="300" y="168" width="31" height="21" rx="6" />
      </g>
      <path d="m315 175-30-23" stroke="#d0e1df" strokeWidth="8" />
      <path
        d="M113 130Q206 12 275 145"
        fill="none"
        stroke="#f6e5bc"
        strokeWidth="3"
        strokeDasharray="4 8"
      />
    </svg>
  )
}
