import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'block-cascade',
    name: 'Block Cascade',
    description:
      'Build clean stacks, hold your next move, and chase back-to-back clears through rising gravity.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'Arrows move and rotate. Space drops. C holds. Z reverses rotation. V spends a rescue.',
  },
  pl: {
    slug: 'block-cascade',
    name: 'Block Cascade',
    description:
      'Układaj bloki, planuj rezerwę i buduj serie przy rosnącej grawitacji.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'Strzałki: ruch i obrót. Spacja: zrzut. C: rezerwa. Z: obrót w lewo. V: ratunek.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Block Cascade">
      <rect width="400" height="260" fill="#203842" />
      <g stroke="#152c3c" strokeWidth="3">
        <path d="M88 190h90v30H88Z M118 160h60v30h-60Z" fill="#dfa18d" />
        <path d="M178 160h90v60h-90Z" fill="#9fc6b5" />
        <path d="M268 130h30v90h-30Z" fill="#d5be82" />
        <path d="M148 50h90v30h-30v30h-30V80h-30Z" fill="#a9b9db" />
      </g>
      <path
        d="M149 140h88v30h-29v29h-30v-29h-29Z"
        fill="none"
        stroke="#adc2c0"
        strokeDasharray="4 5"
      />
    </svg>
  )
}
