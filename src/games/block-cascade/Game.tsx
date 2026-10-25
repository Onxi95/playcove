import { bevel } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { cells, create, ghost, save, SHAPES, update } from './engine.ts'
import type { State } from './engine.ts'
const COLORS = [
  '#72c9d1',
  '#edd080',
  '#a6b4ef',
  '#df9d83',
  '#80b9d8',
  '#9ac690',
  '#db8aa4',
]
const def: ArcadeDefinition<State> = {
  id: 'block-cascade',
  name: 'BLOCK CASCADE',
  width: 760,
  height: 650,
  touch: [
    ['←', 'arrowleft'],
    ['↻', 'arrowup'],
    ['↓', 'arrowdown'],
    ['→', 'arrowright'],
    ['⬇', ' '],
    ['H', 'c'],
    ['✦', 'v'],
  ],
  create,
  update,
  checkpoint: save,
  choices: () => [],
  choose: () => {},
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['↻', 'arrowup'],
        ['→', 'arrowright'],
        ['↓', 'arrowdown'],
        [l === 'pl' ? 'Zrzuć' : 'Drop', ' '],
        [l === 'pl' ? 'Schowek' : 'Hold', 'c'],
        [l === 'pl' ? 'Ratunek' : 'Rescue', 'v'],
      ],
    },
  ],
  tagline: {
    en: 'Make room for the next piece.',
    pl: 'Zrób miejsce na kolejny klocek.',
  },
  help: {
    en: '← → move · ↑ / X rotate · Z turns back · ↓ soft drop · Space drops · C / Shift holds · V uses an earned rescue.',
    pl: '← → ruch · ↑ / X obrót · Z obrót wstecz · ↓ wolny zrzut · spacja: zrzut · C / Shift: schowek · V: zdobyta pomoc.',
  },
  draw(ctx, s, locale) {
    backdrop(ctx, 760, 650, '#12222b')
    const ox = 235,
      oy = 37,
      c = 28
    rect(ctx, ox - 5, oy - 5, 290, 570, '#09151e', 4)
    for (let i = 0; i < 12; i++) {
      ctx.strokeStyle = '#acc5bc0a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, i * 70)
      ctx.lineTo(760, i * 70 - 180)
      ctx.stroke()
    }
    bevel(ctx, ox - 10, oy - 10, 300, 580, '#3e5d68', 8)
    rect(ctx, ox - 4, oy - 4, 288, 568, '#10232f', 3)
    for (const panel of [
      { x: 37, y: 37, w: 150, h: 150 },
      { x: 37, y: 220, w: 150, h: 80 },
      { x: 37, y: 328, w: 150, h: 84 },
      { x: 37, y: 440, w: 150, h: 105 },
      { x: 545, y: 37, w: 140, h: 410 },
    ]) {
      rect(ctx, panel.x, panel.y, panel.w, panel.h, '#abc8c508', 8)
      rect(ctx, panel.x + 10, panel.y + 10, 16, 2, '#bed9ce44', 1)
    }
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 10; x++) {
        rect(ctx, ox + x * c, oy + y * c, c - 1, c - 1, '#172b35')
        const value = s.board[y][x]
        if (value) {
          bevel(
            ctx,
            ox + x * c + 1,
            oy + y * c + 1,
            c - 3,
            c - 3,
            s.clearing.includes(y) ? '#f9f2d5' : COLORS[value - 1],
            3,
          )
          rect(ctx, ox + x * c + 4, oy + y * c + 4, c - 9, 3, '#ffffff45')
        }
      }
    if (s.phase === 'play' && !s.clearTime) {
      ctx.strokeStyle = '#8cadb1'
      ctx.lineWidth = 1.5
      for (const { x, y } of cells(ghost(s)))
        if (y >= 0) ctx.strokeRect(ox + x * c + 3, oy + y * c + 3, c - 6, c - 6)
      for (const { x, y } of cells(s.piece))
        if (y >= 0)
          bevel(
            ctx,
            ox + x * c + 1,
            oy + y * c + 1,
            c - 3,
            c - 3,
            COLORS[s.piece.kind],
            3,
          )
    }
    const preview = (kind: number, x: number, y: number) => {
      if (kind < 0) return
      for (const [p, q] of SHAPES[kind])
        bevel(ctx, x + p * 19, y + q * 19, 17, 17, COLORS[kind], 2)
    }
    text(ctx, locale === 'pl' ? 'SCHOWEK' : 'HOLD', 58, 59, 13, '#a4bac0')
    preview(s.hold, 58, 83)
    text(ctx, 'C / SHIFT', 58, 156, 11, '#75929c')
    text(ctx, locale === 'pl' ? 'DALEJ' : 'NEXT', 565, 59, 13, '#a4bac0')
    s.queue
      .slice(0, 5)
      .forEach((kind, index) => preview(kind, 565, 82 + index * 74))
    text(ctx, locale === 'pl' ? 'LINIE' : 'LINES', 57, 245, 12, '#8aaab3')
    text(ctx, String(s.lines), 57, 279, 30, '#e8dba4')
    text(ctx, locale === 'pl' ? 'RATUNEK' : 'RESCUE', 57, 355, 12, '#8aaab3')
    text(ctx, `${s.rescue} · V`, 57, 385, 24, '#aedac9')
    text(ctx, locale === 'pl' ? 'CEL' : 'GOAL', 57, 470, 12, '#8aaab3')
    const goals =
      locale === 'pl'
        ? ['2 linie naraz', '4 linie naraz', '2 serie linii']
        : ['2 lines at once', '4 lines at once', '2 line-clear chain']
    text(ctx, goals[s.goal % 3], 57, 496, 12, '#c0d1bf')
    text(
      ctx,
      locale === 'pl' ? 'Premia + ratunek' : 'Bonus + rescue',
      57,
      519,
      11,
      '#70938e',
    )
    if (s.board.slice(0, 4).some((row) => row.some(Boolean))) {
      ctx.strokeStyle = '#eb8b8c'
      ctx.lineWidth = 3
      ctx.strokeRect(ox - 3, oy - 3, 286, 566)
    }
  },
  meter(s, l) {
    return { label: l === 'pl' ? 'LINIE' : 'LINES', value: s.lines }
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Brak miejsca na nowy klocek. ${s.lines} usuniętych linii. Schowek C pomaga zachować wolny kanał.`
      : `The stack blocked the next piece. ${s.lines} lines cleared. Use hold (C) to keep a recovery channel open.`
  },
  status(s, locale) {
    return `${locale === 'pl' ? 'LINIE' : 'LINES'} ${s.lines} · ${locale === 'pl' ? 'POZIOM' : 'LEVEL'} ${s.stage} · ${locale === 'pl' ? 'RATUNEK' : 'RESCUE'} ${s.rescue}`
  },
  stats(s, locale) {
    return [
      { label: locale === 'pl' ? 'LINIE' : 'LINES', value: s.lines },
      { label: locale === 'pl' ? 'POZIOM' : 'LEVEL', value: s.stage },
      { label: locale === 'pl' ? 'SERIA' : 'CHAIN', value: s.bestCombo },
    ]
  },
}
export const Game = createArcadeGame(def)
