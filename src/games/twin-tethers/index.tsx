import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'twin-tethers',
    name: 'Twin Tethers',
    description:
      'Climb mossy ruins together, use a shared tether to rescue your partner, and solve rooms with lifts, lasers, and wind.',
    genreSlug: 'arcade',
    players: '2 players',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'P1: A D move, W jump, Space tether-hop. P2: arrows move/jump, Enter tether-hop.',
    localMultiplayer: true,
  },
  pl: {
    slug: 'twin-tethers',
    name: 'Twin Tethers',
    description:
      'Wspinajcie się po ruinach, ratujcie partnera linką i pokonujcie pokoje z windami, laserami i wiatrem.',
    genreSlug: 'arcade',
    players: '2 graczy',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'P1: A D ruch, W skok, spacja: skok na lince. P2: strzałki ruch i skok, Enter: skok na lince.',
    localMultiplayer: true,
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Twin Tethers">
      <rect width="400" height="260" fill="#3f626b" />
      <path d="M0 172q95-64 193-20t207 12v96H0Z" fill="#658c83" />
      <g fill="#76968a">
        <rect x="25" y="209" width="120" height="14" rx="4" />
        <rect x="160" y="155" width="100" height="14" rx="4" />
        <rect x="290" y="104" width="85" height="14" rx="4" />
      </g>
      <path
        d="M111 190q61 11 89-56"
        fill="none"
        stroke="#dfd9b3"
        strokeWidth="3"
      />
      <rect x="97" y="174" width="28" height="35" rx="10" fill="#e2b196" />
      <rect x="189" y="120" width="28" height="35" rx="10" fill="#a4cddd" />
      <g fill="#f0d49d">
        <path d="m270 62 4 10 11 1-9 7 3 11-9-6-10 6 3-11-8-7 11-1Z" />
      </g>
    </svg>
  )
}
