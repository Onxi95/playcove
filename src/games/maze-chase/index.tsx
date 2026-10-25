import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'maze-chase',
    name: 'Maze Chase',
    description:
      'Clear winding districts, outthink four pursuers, and chain power-pellet captures.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'Arrows or WASD turn. Space dashes. Collect every dot to choose the next district.',
  },
  pl: {
    slug: 'maze-chase',
    name: 'Maze Chase',
    description:
      'Czyść dzielnice labiryntu, przechytrz czterech rywali i łącz serie polowań.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'Strzałki lub WASD: skręt. Spacja: zryw. Zbierz kropki i wybierz kolejną dzielnicę.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Maze Chase">
      <rect width="400" height="260" fill="#203842" />
      <g fill="none" stroke="#6f9f9b" strokeWidth="10" strokeLinejoin="round">
        <path d="M30 40h120v55H75v75h80v50H30Z M230 40h135v75h-65v45h65v60H230v-70h-35V95h35Z" />
      </g>
      <path d="M159 115a26 26 0 1 0 0 30l-24-15Z" fill="#eed17a" />
      <g fill="#e8dec0">
        <circle cx="187" cy="130" r="4" />
        <circle cx="213" cy="130" r="4" />
        <circle cx="239" cy="130" r="4" />
      </g>
      <path d="M276 132v-20a18 18 0 0 1 36 0v20l-9-6-9 6-9-6Z" fill="#dc9c95" />
    </svg>
  )
}
