import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'barrel-ascent',
    name: 'Barrel Ascent',
    description:
      'Jump rolling hazards, find alternate ladders, and collect the bolts that unlock each tower.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'Arrows or WASD move and climb. Space jumps. X uses a collected hammer.',
  },
  pl: {
    slug: 'barrel-ascent',
    name: 'Barrel Ascent',
    description:
      'Przeskakuj beczki, szukaj drabin i zbieraj śruby otwierające kolejne wieże.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'Strzałki lub WASD: ruch i wspinaczka. Spacja: skok. X: zebrany młotek.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Barrel Ascent">
      <rect width="400" height="260" fill="#203842" />
      <g stroke="#bf9680" strokeWidth="12">
        <path d="m25 220 350-12M25 150l350 14M25 100l350-14M25 38l350 14" />
      </g>
      <g fill="none" stroke="#96aaa2" strokeWidth="4">
        <path d="M72 103v44m20-44v44m-20-30h20m-20 15h20M290 164v47m20-47v47m-20-32h20m-20 15h20M245 47v45m20-45v45m-20-30h20m-20 15h20" />
      </g>
      <circle
        cx="173"
        cy="133"
        r="18"
        fill="#ba9569"
        stroke="#e3c798"
        strokeWidth="4"
      />
      <rect x="142" y="183" width="24" height="28" rx="5" fill="#b6ced1" />
    </svg>
  )
}
