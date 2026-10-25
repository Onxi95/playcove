import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'ricochet-rivals',
    name: 'Ricochet Rivals',
    description:
      'Charge a bank shot, parry it back, and contest shield cores through a nine-win arena tournament.',
    genreSlug: 'arcade',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'P1: WASD, hold/release Space to throw, Q parry. P2: arrows, Enter to throw, Shift parry.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'ricochet-rivals',
    name: 'Ricochet Rivals',
    description:
      'Ładuj rykoszety, odbijaj je i walcz o rdzenie tarcz w turnieju do dziewięciu wygranych.',
    genreSlug: 'arcade',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'P1: WASD, przytrzymaj i puść spację: rzut, Q odbicie. P2: strzałki, Enter: rzut, Shift odbicie.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Ricochet Rivals">
      <rect width="400" height="260" fill="#213f4e" />
      <path
        d="M22 22h356v216H22Z"
        fill="none"
        stroke="#829f9d"
        strokeWidth="4"
      />
      <rect x="131" y="60" width="26" height="67" rx="5" fill="#789798" />
      <rect x="245" y="142" width="26" height="67" rx="5" fill="#789798" />
      <rect x="57" y="167" width="32" height="32" rx="10" fill="#e1ad91" />
      <rect x="315" y="58" width="32" height="32" rx="10" fill="#a8cddf" />
      <path
        d="m91 166 93-140 109 117"
        fill="none"
        stroke="#eac797"
        strokeWidth="3"
        strokeDasharray="6 7"
      />
      <circle cx="293" cy="143" r="9" fill="#eec994" />
      <circle cx="202" cy="213" r="12" fill="#b9d7ac" />
    </svg>
  )
}
