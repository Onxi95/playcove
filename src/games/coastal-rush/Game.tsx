import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { create, update, choose, save, ROUTES } from './engine.ts'
import { draw, WIDTH, HEIGHT } from './render.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'coastal-rush',
  name: 'COASTAL RUSH',
  width: WIDTH,
  height: HEIGHT,
  create,
  update,
  choose,
  checkpoint: save,
  draw,
  touch: [
    ['←', 'arrowleft'],
    ['→', 'arrowright'],
    ['BRAKE', 'arrowdown'],
    ['DRIFT', ' '],
    ['NITRO', 'x'],
  ],
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['→', 'arrowright'],
        [l === 'pl' ? 'Hamulec' : 'Brake', 'arrowdown'],
        ['Drift', ' '],
        ['Nitro', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'One more bend. One more close call.',
    pl: 'Jeszcze jeden zakręt. Jeszcze jedno wyprzedzenie.',
  },
  help: {
    en: '← → / A D steer · ↓ / S brake · hold Space while turning to drift · X / Shift nitro. Bank a corner drift when you release Space. Chain close passes for ×5 points. Draft behind traffic to recharge nitro. Reach each gate before time runs out.',
    pl: '← → / A D kierownica · ↓ / S hamulec · spacja ze skrętem: drift · X / Shift nitro. Puść spację, by zaliczyć drift. Bliskie wyprzedzanie daje mnożnik do ×5. Jazda za autem ładuje nitro. Zdąż do kolejnej bramy.',
  },
  choices: (_, l) =>
    l === 'pl'
      ? [
          {
            id: 'coast',
            title: 'Palmowa autostrada',
            detail: 'Szerokie łuki, lżejszy ruch. +30% karoserii i +25 nitro.',
          },
          {
            id: 'mountain',
            title: 'Przełęcz Sierra',
            detail: 'Ciasne zakręty, mniejsza przyczepność. Punkty ×1,5.',
          },
          {
            id: 'city',
            title: 'Nocny przejazd',
            detail: 'Ciężarówki, skutery i gęsty ruch. Punkty ×1,3.',
          },
        ]
      : [
          {
            id: 'coast',
            title: 'Palm Express',
            detail: 'Long sweepers, lighter traffic. +30% body and +25 nitro.',
          },
          {
            id: 'mountain',
            title: 'Sierra Pass',
            detail: 'Tighter bends and looser grip. Score rewards ×1.5.',
          },
          {
            id: 'city',
            title: 'Midnight Run',
            detail: 'Trucks, bikes, dense traffic. Score rewards ×1.3.',
          },
        ],
  meter(s, l) {
    return {
      label: l === 'pl' ? 'AUTO' : 'BODY',
      value: `${Math.max(0, Math.round(s.integrity))}%`,
    }
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `${s.reason === 'time' ? 'Czas minął przed kolejną bramą.' : 'Auto nie wytrzymało kolejnych uderzeń.'} ${s.near} bliskich wyprzedzeń, ${s.driftTotal} driftów. Jazda w tunelu i drift odnawiają nitro.`
      : `${s.reason === 'time' ? 'The clock ran out before the next gate.' : 'The car took too much damage.'} ${s.near} close passes, ${s.driftTotal} banked drifts. Slipstream and drift to earn more nitro.`
  },
  status(s, l) {
    return `${ROUTES[s.route][l]} · ${l === 'pl' ? 'WYPRZEDZENIA' : 'OVERTAKES'} ${s.overtakes} · ${l === 'pl' ? 'DRIFTY' : 'DRIFTS'} ${s.driftTotal} · ${l === 'pl' ? 'REKORD SERII' : 'BEST CHAIN'} ×${s.bestCombo}`
  },
  stats(s, l) {
    return [
      { label: l === 'pl' ? 'ETAP' : 'LEG', value: s.stage },
      { label: l === 'pl' ? 'WYPRZEDZENIA' : 'OVERTAKES', value: s.overtakes },
      { label: l === 'pl' ? 'BLISKIE MIJANIE' : 'CLOSE PASSES', value: s.near },
      { label: l === 'pl' ? 'DRIFTY' : 'DRIFTS', value: s.driftTotal },
    ]
  },
}
export const Game = createArcadeGame(definition)
