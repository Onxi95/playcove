import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'formation-rescue',
    name: 'Formation Rescue',
    description:
      'Dodge diving formations, rescue captured fighters, and master dual fire and challenge waves.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'A D or arrows steer. Space fires. X rolls. Destroy captors to recover your wingman.',
  },
  pl: {
    slug: 'formation-rescue',
    name: 'Formation Rescue',
    description:
      'Omijaj nurkujące formacje, ratuj myśliwce i opanuj podwójny ogień oraz fale wyzwań.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'blue',
    controls:
      'A D lub strzałki: ruch. Spacja: ogień. X: unik. Zniszcz porywacza, by odzyskać skrzydłowego.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Formation Rescue">
      <rect width="400" height="260" fill="#203842" />
      <g fill="#a5c8b3">
        <path d="m90 45 20 28-20-6-20 6Z M155 45l20 28-20-6-20 6Z M220 45l20 28-20-6-20 6Z M285 45l20 28-20-6-20 6Z" />
      </g>
      <path d="m222 110 26 34-26-9-26 9Z" fill="#d8b28d" />
      <path d="m222 144-45 47h90Z" fill="#c2dfd322" />
      <path
        d="m180 190 19 40-19-8-19 8Z M220 190l19 40-19-8-19 8Z"
        fill="#c2d7e7"
      />
      <path d="M180 178v-21m40 21v-21" stroke="#efd39b" strokeWidth="4" />
    </svg>
  )
}
