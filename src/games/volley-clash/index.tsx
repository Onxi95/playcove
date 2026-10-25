import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'volley-clash',
    name: 'Volley Clash',
    description:
      'Charge spikes, dive for saves, and play a five-set volleyball match across beaches, rooftops, and low-gravity gardens.',
    genreSlug: 'sports',
    players: '1–2 players',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'P1: A D, W jump, Space hit, Q dash. P2: arrows, Enter hit, Shift dash.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'volley-clash',
    name: 'Volley Clash',
    description:
      'Ładuj ataki, ratuj piłkę i graj w siatkówkę na plaży, dachach i w księżycowym ogrodzie.',
    genreSlug: 'sports',
    players: '1–2 graczy',
    playTime: '15–30+ min',
    accent: 'coral',
    controls:
      'P1: A D, W skok, spacja: odbicie, Q unik. P2: strzałki, Enter: odbicie, Shift unik.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Volley Clash">
      <path d="M0 0h400v185H0Z" fill="#e6b29a" />
      <circle cx="317" cy="62" r="31" fill="#f5d9a4" />
      <path d="M0 143q100-35 200 0t200 0v117H0Z" fill="#78aaa8" />
      <path d="M0 212h400v48H0Z" fill="#d9bf92" />
      <path d="M195 125h10v100h-10Z" fill="#dbe2cf" />
      <path d="M185 125h30" stroke="#fff2d0" strokeWidth="5" />
      <rect x="95" y="172" width="27" height="40" rx="10" fill="#d18f78" />
      <rect x="282" y="167" width="27" height="45" rx="10" fill="#9dc4d6" />
      <circle cx="241" cy="81" r="15" fill="#f8dba3" />
      <path
        d="m249 111 17 27"
        stroke="#f8dba3"
        strokeWidth="3"
        strokeDasharray="4 5"
      />
    </svg>
  )
}
