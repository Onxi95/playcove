import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'penguin-launch', name: 'Penguin Launch', description: 'Race down the ramp, steer your glide, and bounce farther with each flight.',
    genreSlug: 'arcade', players: '1 player', playTime: 'Long play', accent: 'blue', controls: 'The ramp accelerates automatically. In flight, ← pulls up and → dives. Hold Space for rocket thrust; tap X near the snow for a stronger bounce. Buy upgrades between flights.',
  },
  pl: {
    slug: 'penguin-launch', name: 'Penguin Launch', description: 'Rozpędź pingwina na rampie, steruj lotem i odbijaj się coraz dalej.',
    genreSlug: 'arcade', players: '1 gracz', playTime: 'Długa gra', accent: 'blue', controls: 'Rozbieg rozpędza się sam. W locie ← unosi dziób, a → pozwala nurkować. Spacją uruchom rakietę, X tuż nad śniegiem wykonaj mocniejsze odbicie. Ulepszaj sprzęt między lotami.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Penguin soaring over snowy mountains">
      <defs>
        <linearGradient id="penguin-launch-sky" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#6ba9d3" /><stop offset="1" stopColor="#d2f1ed" /></linearGradient>
        <linearGradient id="penguin-launch-snow" x1="0" y1="0" x2="0" y2="1"><stop stopColor="#f7ffff" /><stop offset="1" stopColor="#a8d7e6" /></linearGradient>
      </defs>
      <rect width="400" height="260" rx="22" fill="url(#penguin-launch-sky)" />
      <circle cx="317" cy="57" r="28" fill="#fff1ae" />
      <path d="m0 192 86-96 75 74 82-115 157 152v53H0z" fill="#83b8d0" opacity=".72" />
      <path d="m0 220 112-83 77 43 86-82 125 95v67H0z" fill="url(#penguin-launch-snow)" />
      <path d="M0 235q83-30 168-3t232-4v32H0z" fill="#fff" />
      <path d="M40 229 157 180l88 28" fill="none" stroke="#ec805a" strokeWidth="8" strokeLinecap="round" />
      <path d="M155 180q44-52 90-86" fill="none" stroke="#fff6c7" strokeWidth="3" strokeDasharray="8 9" />
      <g transform="translate(270 98) rotate(-28)">
        <ellipse cx="0" cy="10" rx="21" ry="27" fill="#26384d" />
        <ellipse cx="4" cy="15" rx="12" ry="18" fill="#f8ffff" />
        <circle cx="6" cy="-15" r="17" fill="#26384d" />
        <circle cx="12" cy="-18" r="2.5" fill="#fff" />
        <path d="m21-14 14 5-13 5z" fill="#f2a65a" />
        <path d="M-17 13q-19-3-19-18 17 3 25 13z" fill="#344c65" />
        <path d="M-16 1q14 11 30 10" fill="none" stroke="#f07e68" strokeWidth="6" strokeLinecap="round" />
      </g>
      <path d="M225 95q20-20 41-23" fill="none" stroke="#fff3bf" strokeWidth="4" strokeLinecap="round" opacity=".8" />
      <circle cx="118" cy="192" r="8" fill="#ffd968" /><circle cx="151" cy="177" r="8" fill="#ffd968" />
    </svg>
  )
}
