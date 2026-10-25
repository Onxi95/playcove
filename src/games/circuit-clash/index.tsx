import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'circuit-clash',
    name: 'Circuit Clash',
    description:
      'Race five laps on hand-shaped circuits, recharge nitro through drifting and slipstream, and chase a seven-win tour.',
    genreSlug: 'sports',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'P1: WASD drive, Space nitro, Q drift. P2: arrows drive, Enter nitro, Shift drift.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'circuit-clash',
    name: 'Circuit Clash',
    description:
      'Ścigaj się przez pięć okrążeń, ładuj nitro driftem i jazdą w tunelu, wygraj siedem wyścigów.',
    genreSlug: 'sports',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'P1: WASD jazda, spacja: nitro, Q drift. P2: strzałki jazda, Enter: nitro, Shift drift.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Circuit Clash">
      <rect width="400" height="260" fill="#829c7f" />
      <ellipse
        cx="208"
        cy="136"
        rx="146"
        ry="81"
        fill="none"
        stroke="#e1d4b0"
        strokeWidth="43"
      />
      <ellipse
        cx="208"
        cy="136"
        rx="146"
        ry="81"
        fill="none"
        stroke="#52666c"
        strokeWidth="34"
      />
      <ellipse
        cx="208"
        cy="136"
        rx="146"
        ry="81"
        fill="none"
        stroke="#e1d4b088"
        strokeWidth="2"
        strokeDasharray="7 11"
      />
      <ellipse cx="208" cy="136" rx="65" ry="33" fill="#74a8a4" />
      <rect
        x="110"
        y="45"
        width="21"
        height="39"
        rx="5"
        fill="#e6a285"
        transform="rotate(68 120 64)"
      />
      <rect
        x="153"
        y="40"
        width="21"
        height="39"
        rx="5"
        fill="#a6cede"
        transform="rotate(87 163 59)"
      />
      <path d="M66 143h35m-35 8h35" stroke="#eadbb5" strokeWidth="3" />
    </svg>
  )
}
