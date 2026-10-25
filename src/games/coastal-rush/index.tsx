import type { GameManifest } from '../contract.ts'

export const manifest = {
  en: {
    slug: 'coastal-rush',
    name: 'Coastal Rush',
    description:
      'Drift through coastal bends, chain close passes, draft for nitro, and chase checkpoints into mountain roads and city nights.',
    genreSlug: 'arcade',
    players: '1 player',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'A D or arrows steer. S brakes. Hold Space and turn to drift; release to bank. X boosts. Slipstream and close passes recharge nitro.',
  },
  pl: {
    slug: 'coastal-rush',
    name: 'Coastal Rush',
    description:
      'Docieraj do punktów kontrolnych, wyprzedzaj i wybieraj wybrzeże, góry lub nocne miasto.',
    genreSlug: 'arcade',
    players: '1 gracz',
    playTime: '15–30+ min',
    accent: 'lime',
    controls:
      'A D lub strzałki: kierownica. S: hamulec. Spacja ze skrętem: drift; puść, by zaliczyć. X: nitro. Jazda za autem i bliskie wyprzedzanie ładują nitro.',
  },
} satisfies Record<'en' | 'pl', GameManifest>

export function Miniature() {
  return (
    <svg viewBox="0 0 400 260" role="img" aria-label="Coastal Rush">
      <rect width="400" height="260" fill="#203842" />
      <path d="M0 0h400v140H0Z" fill="#a2ced0" />
      <circle cx="305" cy="66" r="30" fill="#edd6a2" />
      <path d="M0 140 90 90l80 50 83-45 147 55v110H0Z" fill="#779e87" />
      <path d="M180 130h40l110 130H70Z" fill="#49575d" />
      <path
        d="m200 140-2 20m0 15-5 34m0 15-4 36"
        stroke="#e8dbb9"
        strokeWidth="4"
      />
      <rect x="186" y="192" width="64" height="44" rx="9" fill="#df9471" />
      <rect x="195" y="198" width="46" height="18" rx="4" fill="#42637a" />
    </svg>
  )
}
