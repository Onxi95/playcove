import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'paddle-duel', name: 'Paddle Duel', description: 'Play table tennis against a computer or a friend on one keyboard. Steer rallies through boost orbs and play to seven, winning by two.',
    localMultiplayer: true,
    genreSlug: 'two-player', players: '1–2 players', playTime: '15+ min', accent: 'blue', controls: 'Player 1: W / S. Player 2: ↑ / ↓. Paddle movement steers each return; cross the court center to collect boosts.',
  },
  pl: {
    slug: 'paddle-duel', name: 'Paddle Duel', description: 'Tenis stołowy z komputerem lub znajomym na jednej klawiaturze. Kieruj piłkę przez bonusy i graj do siedmiu z przewagą dwóch.',
    localMultiplayer: true,
    genreSlug: 'two-player', players: '1–2 graczy', playTime: '15+ min', accent: 'blue', controls: 'Gracz 1: W / S. Gracz 2: ↑ / ↓. Ruch pałki kieruje piłką; przetnij środek kortu, by zebrać bonus.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg preserveAspectRatio="xMidYMid slice" viewBox="0 0 400 260" role="img" aria-label="Two paddles and a ball">
      <defs>
        <linearGradient id="paddle-bg" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#79ceff" />
          <stop offset="1" stopColor="#4577e7" />
        </linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#paddle-bg)" />
      <circle cx="330" cy="48" r="72" fill="#b8f26d" opacity=".8" />
      <path d="M200 28v204" stroke="#fff" strokeWidth="3" strokeDasharray="8 10" opacity=".55" />
      <rect x="46" y="95" width="16" height="70" rx="8" fill="#fff" />
      <rect x="338" y="95" width="16" height="70" rx="8" fill="#fff" />
      <circle cx="250" cy="93" r="11" fill="#ffef9a" />
      <path d="M238 106 185 129" stroke="#ffef9a" strokeWidth="4" strokeLinecap="round" strokeDasharray="5 8" />
      <text x="89" y="82" fill="#fff" fontSize="14" fontWeight="800" fontFamily="sans-serif">1</text>
      <text x="301" y="82" fill="#fff" fontSize="14" fontWeight="800" fontFamily="sans-serif">2</text>
    </svg>
  )
}
