import type { ArcadeInput } from './arcade.ts'
export type OpponentMode = 'solo' | 'relaxed' | 'expert' | 'local'
export const opponentModes = [
  {
    id: 'solo',
    title: { en: 'Solo · club opponent', pl: 'Solo · poziom klubowy' },
    detail: {
      en: 'A fair computer opponent using the same controls and physics.',
      pl: 'Komputer gra na tych samych zasadach i z tą samą fizyką.',
    },
  },
  {
    id: 'local',
    title: {
      en: 'Two players · one keyboard',
      pl: 'Dwóch graczy · jedna klawiatura',
    },
    detail: {
      en: 'Player one uses WASD; player two uses arrows.',
      pl: 'Pierwszy gracz: WASD; drugi: strzałki.',
    },
  },
  {
    id: 'relaxed',
    title: { en: 'Solo · relaxed', pl: 'Solo · spokojnie' },
    detail: {
      en: 'More reaction time and a less precise opponent.',
      pl: 'Więcej czasu na reakcję i mniej precyzyjny rywal.',
    },
  },
  {
    id: 'expert',
    title: { en: 'Solo · expert', pl: 'Solo · ekspert' },
    detail: {
      en: 'Sharper decisions, without extra speed or health.',
      pl: 'Lepsze decyzje, bez dodatkowej prędkości czy zdrowia.',
    },
  },
]
export function opponentMode(
  value: unknown,
  fallback: OpponentMode = 'local',
): OpponentMode {
  return value === 'solo' ||
    value === 'relaxed' ||
    value === 'expert' ||
    value === 'local'
    ? value
    : fallback
}
export function skill(mode: OpponentMode) {
  return mode === 'relaxed' ? 0 : mode === 'expert' ? 2 : 1
}
export function botInput(
  source: ArcadeInput,
  held: string[],
  pressed: string[] = [],
): ArcadeInput {
  const controls = new Set([
    'arrowleft',
    'arrowright',
    'arrowup',
    'arrowdown',
    'enter',
    'shift',
  ])
  return {
    ...source,
    held: new Set(
      [...source.held].filter((key) => !controls.has(key)).concat(held),
    ),
    pressed: new Set(
      [...source.pressed].filter((key) => !controls.has(key)).concat(pressed),
    ),
  }
}

export function opponentLabel(mode: OpponentMode, locale: 'en' | 'pl') {
  return mode === 'local' ? 'P2' : locale === 'pl' ? 'BOT' : 'CPU'
}
