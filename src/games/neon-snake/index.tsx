import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'neon-snake', name: 'Neon Snake', description: 'Guide the snake, grab glowing fruit, and see how long your run can grow.',
    genreSlug: 'arcade', players: '1 player', playTime: 'Endless', accent: 'lime', controls: 'Move with the arrow keys or W / A / S / D. On touchscreens, use the direction pad below the board.',
  },
  pl: {
    slug: 'neon-snake', name: 'Neon Snake', description: 'Prowadź węża, zbieraj świecące owoce i sprawdź, jak długa będzie twoja seria.',
    genreSlug: 'arcade', players: '1 gracz', playTime: 'Bez końca', accent: 'lime', controls: 'Poruszaj się strzałkami lub klawiszami W / A / S / D. Na ekranie dotykowym użyj pada pod planszą.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Glowing green snake chasing fruit">
      <defs>
        <linearGradient id="snake-art-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#122d39" /><stop offset="1" stopColor="#1b604e" /></linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#snake-art-bg)" />
      <path d="M0 65h400M0 130h400M0 195h400M80 0v260M160 0v260M240 0v260M320 0v260" stroke="#c8f7d0" strokeWidth="1" opacity=".09" />
      <path d="M87 174h73v-64h81" fill="none" stroke="#7df29b" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="241" cy="110" r="17" fill="#a4ffb0" />
      <circle cx="321" cy="71" r="12" fill="#ff7183" />
      <circle cx="317" cy="67" r="4" fill="#fff" opacity=".8" />
      <circle cx="87" cy="174" r="13" fill="#c2ffd1" />
      <circle cx="91" cy="170" r="2.5" fill="#183a3c" />
    </svg>
  )
}
