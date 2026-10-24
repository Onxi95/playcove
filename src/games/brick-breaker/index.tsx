import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'brick-breaker', name: 'Brick Breaker', description: 'Clear endless waves, chain hit streaks, and catch boosts as the ball speeds up.',
    genreSlug: 'arcade', players: '1 player', playTime: 'Endless', accent: 'coral', controls: 'Move with ← → or A / D. Steer the ball with the paddle edge and catch falling boosts.',
  },
  pl: {
    slug: 'brick-breaker', name: 'Brick Breaker', description: 'Czyść kolejne fale, buduj serię trafień i łap bonusy, gdy piłka przyspiesza.',
    genreSlug: 'arcade', players: '1 gracz', playTime: 'Bez końca', accent: 'coral', controls: 'Poruszaj się klawiszami ← → lub A / D. Kieruj piłką krawędzią pałki i łap spadające bonusy.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Brick wall and bouncing ball">
      <defs>
        <linearGradient id="breaker-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#ff9c72" />
          <stop offset="1" stopColor="#ee5b4d" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#breaker-bg)" />
      <circle cx="332" cy="52" r="76" fill="#ffc74e" opacity=".8" />
      <g fill="#fff5e8">
        <rect x="54" y="55" width="83" height="23" rx="7" />
        <rect x="145" y="55" width="83" height="23" rx="7" opacity=".8" />
        <rect x="236" y="55" width="83" height="23" rx="7" opacity=".65" />
        <rect x="74" y="85" width="83" height="23" rx="7" opacity=".8" />
        <rect x="165" y="85" width="83" height="23" rx="7" opacity=".65" />
        <rect x="256" y="85" width="70" height="23" rx="7" opacity=".5" />
      </g>
      <circle cx="255" cy="157" r="12" fill="#ffe680" />
      <path d="M245 177 202 207" stroke="#ffe680" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 7" />
      <rect x="124" y="211" width="150" height="14" rx="7" fill="#fff5e8" />
      <path d="M50 184h64M316 184h34" stroke="#fff5e8" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    </svg>
  )
}
