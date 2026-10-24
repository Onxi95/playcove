import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'star-patrol', name: 'Star Patrol', description: 'Hold the line against incoming formations, clear waves, and scoop up ship upgrades.',
    genreSlug: 'arcade', players: '1 player', playTime: '15+ min', accent: 'blue', controls: 'Move with ← / → or A / D. The ship fires automatically. Press Space for a charged pulse that clears bullets. Collect shield and rapid-fire upgrades.',
  },
  pl: {
    slug: 'star-patrol', name: 'Star Patrol', description: 'Powstrzymaj kolejne formacje, czyść fale i zbieraj ulepszenia statku.',
    genreSlug: 'arcade', players: '1 gracz', playTime: '15+ min', accent: 'blue', controls: 'Poruszaj się ← / → lub A / D. Statek strzela automatycznie. Spacja aktywuje naładowany impuls usuwający pociski. Zbieraj tarczę i szybkostrzelność.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 260" role="img" aria-label="Blue ship firing at an alien formation">
      <defs><linearGradient id="patrol-art-bg" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#171b4d" /><stop offset="1" stopColor="#493477" /></linearGradient></defs>
      <rect width="400" height="260" rx="22" fill="url(#patrol-art-bg)" />
      <g fill="#fff" opacity=".72"><circle cx="43" cy="41" r="2"/><circle cx="114" cy="77" r="2"/><circle cx="326" cy="48" r="2"/><circle cx="359" cy="139" r="2"/><circle cx="57" cy="172" r="2"/><circle cx="274" cy="94" r="2"/></g>
      <g fill="#9bf3d0"><path d="M97 86h19V72h19v14h15v21h-15v12h-38v-12H82V86z"/><path d="M178 68h19V54h19v14h15v21h-15v12h-38V89h-15V68z"/><path d="M259 86h19V72h19v14h15v21h-15v12h-38v-12h-15V86z"/></g>
      <path d="M190 216 200 184 210 216 235 234h-70z" fill="#8ac9ff" />
      <path d="M195 222h10l-5 19z" fill="#ffe278" />
      <path d="M200 181v-60m0 0v-25" stroke="#ffe278" strokeWidth="5" strokeLinecap="round" strokeDasharray="5 10" />
      <circle cx="314" cy="196" r="13" fill="#b5f26d"/><path d="M314 188v16m-8-8h16" stroke="#203148" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
