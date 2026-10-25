import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'river-crossing',
    name: 'River Crossing',
    description:
      'Weave through traffic, ride shifting logs, and reach five river homes on each bank.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'Arrows or WASD hop. X rewinds to safety. Watch turtle warnings and fill distinct homes.',
  },
  pl: {
    slug: 'river-crossing',
    name: 'River Crossing',
    description:
      'Przemknij przez ruch uliczny, wskakuj na kłody i zajmij pięć domków.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'Strzałki lub WASD: skok. X: powrót w bezpieczne miejsce. Obserwuj żółwie i zajmuj różne domki.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="River Crossing">
      <rect width="400" height="260" fill="#203842" />
      <path d="M0 35h400v100H0Z" fill="#416f81" />
      <path d="M0 165h400v70H0Z" fill="#526168" />
      <g fill="#b89b71">
        <rect x="30" y="52" width="110" height="26" rx="13" />
        <rect x="220" y="98" width="140" height="26" rx="13" />
      </g>
      <rect x="80" y="181" width="65" height="34" rx="8" fill="#e3b286" />
      <rect x="275" y="181" width="90" height="34" rx="8" fill="#b2cad3" />
      <ellipse cx="192" cy="147" rx="23" ry="19" fill="#bdd593" />
      <circle cx="179" cy="133" r="8" fill="#dce7ba" />
      <circle cx="205" cy="133" r="8" fill="#dce7ba" />
    </svg>
  )
}
