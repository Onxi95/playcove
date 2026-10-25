import { localTouch } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { bevel, orb } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { COLS, ROWS, choose, create, save, update } from './engine.ts'
import type { State } from './engine.ts'
const C = 48
const def: ArcadeDefinition<State> = {
  id: 'blast-arena',
  name: 'BLAST ARENA',
  width: COLS * C,
  height: ROWS * C,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (s, l) =>
    localTouch(
      s.mode === 'local',
      {
        label: 'P1',
        buttons: [
          ['←', 'a'],
          ['↑', 'w'],
          ['↓', 's'],
          ['→', 'd'],
          [l === 'pl' ? 'Bomba' : 'Bomb', ' '],
        ],
      },
      {
        label: 'P2',
        buttons: [
          ['←', 'arrowleft'],
          ['↑', 'arrowup'],
          ['↓', 'arrowdown'],
          ['→', 'arrowright'],
          [l === 'pl' ? 'Bomba' : 'Bomb', 'enter'],
        ],
      },
    ),
  tagline: {
    en: 'Leave yourself a way out.',
    pl: 'Zostaw sobie drogę ucieczki.',
  },
  help: {
    en: 'WASD / arrows move · Space places a bomb. In local duel: P1 WASD + Space, P2 arrows + Enter. Blasts stop at crates; bombs chain together.',
    pl: 'WASD / strzałki: ruch · spacja: bomba. W pojedynku: P1 WASD + spacja, P2 strzałki + Enter. Skrzynie zatrzymują ogień; bomby wybuchają łańcuchowo.',
  },
  modes: [
    {
      id: 'solo',
      title: { en: 'Arena ladder', pl: 'Drabinka aren' },
      detail: {
        en: 'Outsmart bots, earn pickups, upgrade between arenas.',
        pl: 'Przechytrz boty, zbieraj bonusy, rozwijaj się między arenami.',
      },
    },
    {
      id: 'local',
      title: { en: 'Local duel', pl: 'Lokalny pojedynek' },
      detail: {
        en: 'Two players, one keyboard. First to three rounds.',
        pl: 'Dwóch graczy, jedna klawiatura. Do trzech wygranych.',
      },
    },
  ],
  choices(s, locale) {
    if (s.mode === 'local')
      return [
        {
          id: 'next',
          title: locale === 'pl' ? 'Następna arena' : 'Next arena',
          detail: `P1 ${s.wins[0]} – ${s.wins[1]} P2`,
        },
      ]
    return locale === 'pl'
      ? [
          {
            id: 'range',
            title: 'Większy zasięg',
            detail: 'Wybuch sięga o jedno pole dalej.',
          },
          {
            id: 'capacity',
            title: 'Dodatkowa bomba',
            detail: 'Możesz umieścić więcej bomb naraz.',
          },
          {
            id: 'repair',
            title: 'Odzyskaj szansę',
            detail: 'Dodatkowe życie, maksymalnie pięć.',
          },
        ]
      : [
          {
            id: 'range',
            title: 'Longer blast',
            detail: 'Flames reach one extra cell.',
          },
          {
            id: 'capacity',
            title: 'Extra bomb',
            detail: 'Place another bomb before the first explodes.',
          },
          {
            id: 'repair',
            title: 'Recover a life',
            detail: 'One extra chance, up to five.',
          },
        ]
  },
  draw(ctx, s, locale, motion) {
    backdrop(ctx, COLS * C, ROWS * C, '#263b37')
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const tile = s.tiles[y * COLS + x]
        rect(
          ctx,
          x * C + 1,
          y * C + 1,
          C - 2,
          C - 2,
          tile === 1
            ? '#506365'
            : tile === 2
              ? '#a57e57'
              : (x + y) % 2
                ? '#314b40'
                : '#2b453b',
          tile ? 5 : 0,
        )
        if (tile === 1) {
          bevel(ctx, x * C + 2, y * C + 2, C - 4, C - 6, '#6b8588', 5)
          rect(ctx, x * C + 9, y * C + 10, C - 18, 3, '#b5c4b544', 1)
          for (const dx of [8, C - 9])
            circle(ctx, x * C + dx, y * C + C - 10, 2, '#32494e')
        }
        if (tile === 2) {
          bevel(ctx, x * C + 2, y * C + 2, C - 4, C - 6, '#b39165', 4)
          rect(ctx, x * C + 4, y * C + C - 9, C - 8, 4, '#71563e')
          ctx.strokeStyle = '#d8b17a'
          ctx.lineWidth = 4
          ctx.beginPath()
          ctx.moveTo(x * C + 9, y * C + C - 10)
          ctx.lineTo(x * C + C - 9, y * C + 9)
          ctx.stroke()
          rect(ctx, x * C + 7, y * C + 7, C - 14, 3, '#d0a776')
          ctx.strokeStyle = '#795e47'
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(x * C + 8, y * C + 10)
          ctx.lineTo(x * C + C - 8, y * C + C - 8)
          ctx.stroke()
        }
      }
    for (const item of s.items) {
      circle(
        ctx,
        item.x * C + C / 2,
        item.y * C + C / 2,
        13,
        ['#f1bf80', '#a5d7df', '#c1df9c'][item.kind],
      )
      text(
        ctx,
        ['+', '●', '»'][item.kind],
        item.x * C + C / 2,
        item.y * C + C / 2 + 5,
        17,
        '#294237',
        'center',
      )
    }
    for (const b of s.bombs) {
      const pulse = motion && b.timer < 0.8 ? Math.sin(s.elapsed * 25) * 2 : 0
      circle(
        ctx,
        b.x * C + C / 2,
        b.y * C + C / 2,
        14 + pulse,
        b.timer < 0.7 ? '#d78465' : '#1b2731',
      )
      orb(
        ctx,
        b.x * C + C / 2,
        b.y * C + C / 2,
        13 + pulse,
        b.timer < 0.7 ? '#d78b6c' : '#526574',
        '#9aafa7',
      )
      rect(ctx, b.x * C + C / 2 - 2, b.y * C + 7, 5, 8, '#d9b67c', 2)
      circle(ctx, b.x * C + C / 2 + 2, b.y * C + 7, 3, '#f5db9a')
    }
    for (const blast of s.blasts)
      for (const index of blast.cells) {
        const x = index % COLS,
          y = Math.floor(index / COLS)
        const fire = ctx.createRadialGradient(
          x * C + C / 2,
          y * C + C / 2,
          3,
          x * C + C / 2,
          y * C + C / 2,
          C * 0.65,
        )
        fire.addColorStop(0, '#fff2b8')
        fire.addColorStop(0.45, '#f1b363')
        fire.addColorStop(1, '#e77b4b00')
        ctx.fillStyle = fire
        ctx.fillRect(x * C - 8, y * C - 8, C + 16, C + 16)
        rect(ctx, x * C + 3, y * C + 3, C - 6, C - 6, '#f0b96f88', 8)
        rect(ctx, x * C + 11, y * C + 11, C - 22, C - 22, '#fff0b0', 6)
      }
    for (const a of s.actors) {
      if (!a.alive) continue
      const x = a.x * C + C / 2,
        y = a.y * C + C / 2
      circle(ctx, x, y + 12, 14, '#172e2d88')
      rect(
        ctx,
        x - 13,
        y - 10,
        26,
        29,
        a.bot ? '#d58b86' : a.id === 0 ? '#b4dcb6' : '#a8cce7',
        9,
      )
      circle(
        ctx,
        x,
        y - 13,
        13,
        a.bot ? '#b86b6d' : a.id === 0 ? '#d9edc4' : '#cce4ee',
      )
      rect(ctx, x - 10, y - 20, 20, 12, '#789a9c', 4)
      rect(ctx, x - 8, y - 17, 16, 8, '#243d50', 3)
      rect(ctx, x - 6, y - 15, 6, 2, '#c1ded9', 1)
      rect(ctx, x - 14, y + 15, 10, 7, '#263f43', 2)
      rect(ctx, x + 4, y + 15, 10, 7, '#263f43', 2)
      circle(ctx, x + 11, y - 23, 3, '#e9b489')
      if (!a.bot) text(ctx, `P${a.id + 1}`, x, y + 6, 10, '#2d4543', 'center')
    }
    if (s.mode === 'local')
      text(
        ctx,
        `P1  ${s.wins[0]} : ${s.wins[1]}  P2`,
        (COLS * C) / 2,
        25,
        15,
        '#f5e6b8',
        'center',
      )
  },
  endMessage(s, l) {
    return s.mode === 'local'
      ? `P${s.wins[0] > s.wins[1] ? 1 : 2} ${l === 'pl' ? 'wygrywa serię' : 'wins the series'} · ${s.wins[0]} : ${s.wins[1]}`
      : l === 'pl'
        ? `Arena ${s.stage}. Przed bombą znajdź drogę za narożnik; skrzynie zatrzymują wybuch.`
        : `Arena ${s.stage}. Find a route around a corner before planting; crates stop the blast.`
  },
  status(s, locale) {
    return s.mode === 'local'
      ? `P1 ${s.wins[0]} – ${s.wins[1]} P2`
      : `${locale === 'pl' ? 'BOTY' : 'BOTS'} ${s.actors.filter((a) => a.bot && a.alive).length} · ${locale === 'pl' ? 'ZASIĘG' : 'RANGE'} ${s.actors[0]?.range ?? s.range} · ● ${s.actors[0]?.capacity ?? s.capacity}`
  },
}
export const Game = createArcadeGame(def)
