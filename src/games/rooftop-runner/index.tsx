import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'rooftop-runner', name: 'Rooftop Runner', description: 'Leap over rooftop clutter, slide under signs, and snatch coins on a growing sprint.',
    genreSlug: 'arcade', players: '1 player', playTime: '15+ min', accent: 'coral', controls: 'Jump with Space / ↑ / W. Hold ↓ / S to slide. Collect coins to charge a dash; use Shift / X to smash through hazards. Find magnets and shields.',
  },
  pl: {
    slug: 'rooftop-runner', name: 'Rooftop Runner', description: 'Przeskakuj przeszkody, ślizgaj się pod znakami i zbieraj monety podczas biegu.',
    genreSlug: 'arcade', players: '1 gracz', playTime: '15+ min', accent: 'coral', controls: 'Skacz spacją / ↑ / W. Przytrzymaj ↓ / S, aby się ślizgać. Zbieraj monety, aby ładować dopalacz; użyj Shift / X, by przebijać się przez przeszkody. Łap magnesy i tarcze.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 260" role="img" aria-label="Runner leaping between city rooftops">
      <defs><linearGradient id="runner-art-bg" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#ffbd76" /><stop offset="1" stopColor="#fa785f" /></linearGradient></defs>
      <rect width="400" height="260" rx="22" fill="url(#runner-art-bg)" />
      <circle cx="320" cy="54" r="35" fill="#fff0bd" />
      <path d="M0 175h55V95h37v80h35V72h48v103h43v-57h45v57h44V86h55v89h38v85H0z" fill="#72506e" opacity=".72" />
      <path d="M0 207h400v53H0z" fill="#27384d" />
      <path d="M0 216h400" stroke="#fff1c5" strokeWidth="4" strokeDasharray="24 20" opacity=".8" />
      <circle cx="93" cy="145" r="11" fill="#f0bf91" />
      <path d="M82 158h24l10 31H75z" fill="#fff0bd" />
      <path d="m82 186-9 20m25-20 18 3" stroke="#26364c" strokeWidth="9" strokeLinecap="round" />
      <path d="m200 204 18-42 18 42z" fill="#f8d36f" />
      <circle cx="291" cy="164" r="10" fill="#ffe17a" /><circle cx="324" cy="150" r="10" fill="#ffe17a" />
      <path d="M267 154h15m-37 10h14" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".7" />
    </svg>
  )
}
