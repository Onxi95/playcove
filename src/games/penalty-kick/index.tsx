import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'penalty-kick', name: 'Penalty Shootout', description: 'Read the keeper, time your shot, and score from the spot.',
    genreSlug: 'sports', players: '1 player', playTime: '1–3 min', accent: 'lime', controls: 'Aim with ← / → or A / D. Press Space or Enter when the power meter is in the green.',
  },
  pl: {
    slug: 'penalty-kick', name: 'Rzuty karne', description: 'Obserwuj bramkarza, wyczuj moment strzału i zdobywaj gole.',
    genreSlug: 'sports', players: '1 gracz', playTime: '1–3 min', accent: 'lime', controls: 'Celuj klawiszami ← / → lub A / D. Naciśnij Spację albo Enter, gdy wskaźnik mocy jest na zielonym polu.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="A football goal and a ball">
      <defs>
        <linearGradient id="kick-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#b9e86b" />
          <stop offset="1" stopColor="#4d9c68" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#kick-bg)" />
      <circle cx="334" cy="46" r="79" fill="#e9ffb6" opacity=".34" />
      <path d="M81 70h238v117H81z" fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" />
      <path d="M104 76v105M127 76v105M150 76v105M173 76v105M196 76v105M219 76v105M242 76v105M265 76v105M288 76v105M85 99h230M85 123h230M85 147h230M85 171h230" stroke="#fff" strokeWidth="2" opacity=".6" />
      <path d="M57 223h286" stroke="#dcf8aa" strokeWidth="3" strokeLinecap="round" />
      <circle cx="200" cy="220" r="11" fill="#fff" />
      <path d="m195 216 5-3 5 4-2 6h-6z" fill="#274e40" />
      <path d="M200 208c-3-19-10-28-21-38" stroke="#fff1a0" strokeWidth="3" strokeDasharray="4 7" fill="none" />
    </svg>
  )
}
