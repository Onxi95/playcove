import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'soccer-duel', name: 'Soccer Duel', description: 'Build a football arcade run through changing teams and arenas, or challenge a friend on one keyboard.',
    localMultiplayer: true,
    genreSlug: 'sports', players: '1–2 players', playTime: '15+ min', accent: 'lime', controls: 'Player 1: A / D move, W jump, Q lob aim, S low aim. Hold and release Space to kick. Player 2: ← / → move, ↑ jump, Shift lob aim, ↓ low aim; hold and release Enter to kick. Touch controls are inside the game.',
  },
  pl: {
    slug: 'soccer-duel', name: 'Soccer Duel', description: 'Przejdź przez kolejne drużyny i boiska w biegu arcade albo zmierz się z drugą osobą na jednej klawiaturze.',
    localMultiplayer: true,
    genreSlug: 'sports', players: '1–2 graczy', playTime: '15+ min', accent: 'lime', controls: 'Gracz 1: A / D: ruch, W: skok, Q: lob, S: niski strzał. Przytrzymaj i puść spację, by strzelić. Gracz 2: ← / →: ruch, ↑: skok, Shift: lob, ↓: niski strzał; przytrzymaj i puść Enter. Przyciski dotykowe znajdziesz w grze.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 260" role="img" aria-label="Two players chasing a football across a windy pitch">
      <defs>
        <linearGradient id="soccer-duel-sky" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#92c9ed" />
          <stop offset="1" stopColor="#d5efd4" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#soccer-duel-sky)" />
      <circle cx="333" cy="55" r="32" fill="#ffe69a" />
      <path d="M0 181c67-25 111-26 178-4 74 25 145 5 222-14v97H0z" fill="#79b95c" />
      <path d="M0 221h400" stroke="#e7f3c9" strokeWidth="3" />
      <path d="M25 87h64m-41 18h46m194-24h72m-48 18h55" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity=".74" />
      <path d="M45 165v-48h25v48m260 0v-48h25v48" fill="none" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
      <circle cx="202" cy="143" r="14" fill="#fff" />
      <path d="m198 137 7-3 5 6-3 7h-8l-4-6z" fill="#263446" />
      <circle cx="154" cy="156" r="10" fill="#f1c398" />
      <path d="M144 169h21l8 29h-29z" fill="#f66c4e" />
      <path d="m148 196-3 23m17-23 7 22" stroke="#27374b" strokeWidth="8" strokeLinecap="round" />
      <circle cx="248" cy="152" r="10" fill="#d9a57d" />
      <path d="M238 165h21l-4 31h-25z" fill="#4e73e8" />
      <path d="m238 195-9 22m24-22 5 23" stroke="#27374b" strokeWidth="8" strokeLinecap="round" />
      <path d="m194 151-18 5m42-7 19 3" stroke="#fff" strokeWidth="3" strokeDasharray="3 6" />
    </svg>
  )
}
