import { orb, shadow, polygon } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { COLS, ROWS, choose, create, position, save, update } from './engine.ts'
import type { State } from './engine.ts'
const C = 28,
  W = COLS * C,
  H = ROWS * C
const def: ArcadeDefinition<State> = {
  id: 'maze-chase',
  name: 'MAZE CHASE',
  width: W,
  height: H,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['↑', 'arrowup'],
        ['↓', 'arrowdown'],
        ['→', 'arrowright'],
        [l === 'pl' ? 'Zryw' : 'Dash', ' '],
      ],
    },
  ],
  tagline: {
    en: 'Plan your exit before the chase.',
    pl: 'Zaplanuj ucieczkę przed pościgiem.',
  },
  help: {
    en: 'Arrows / WASD steer; turns buffer until the next opening. Space / X spends a dash. Bright orbs turn pursuers into targets.',
    pl: 'Strzałki / WASD: ruch; zakręty czekają na najbliższe przejście. Spacja / X zużywa unik. Jasne kule odwracają pościg.',
  },
  choices: (_, locale) =>
    (locale === 'pl'
      ? [
          ['market', 'Targ', 'Więcej objazdów i owoców.'],
          ['station', 'Stacja', 'Szybsi prześladowcy, krótsze skróty.'],
          ['canal', 'Kanały', 'Dwa uniki na początek.'],
        ]
      : [
          ['market', 'Market', 'Extra loops and fruit routes.'],
          ['station', 'Station', 'Faster pursuers and tight shortcuts.'],
          ['canal', 'Canals', 'Start with two dashes.'],
        ]
    ).map(([id, title, detail]) => ({ id, title, detail })),
  draw(ctx, s, locale, motion) {
    backdrop(ctx, W, H, '#101c2d')
    const wall = ['#3e7283', '#725c9c', '#437e69'][s.district]
    for (let y = 0; y < ROWS; y++)
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x
        if (s.walls[i]) {
          const px = x * C,
            py = y * C
          rect(ctx, px, py, C, C, '#152c40')
          rect(ctx, px + 2, py + 2, C - 4, C - 4, wall + '33', 3)
          ctx.strokeStyle = wall
          ctx.lineWidth = 2
          ctx.beginPath()
          if (y === 0 || !s.walls[i - COLS]) {
            ctx.moveTo(px, py + 2)
            ctx.lineTo(px + C, py + 2)
          }
          if (y === ROWS - 1 || !s.walls[i + COLS]) {
            ctx.moveTo(px, py + C - 2)
            ctx.lineTo(px + C, py + C - 2)
          }
          if (x === 0 || !s.walls[i - 1]) {
            ctx.moveTo(px + 2, py)
            ctx.lineTo(px + 2, py + C)
          }
          if (x === COLS - 1 || !s.walls[i + 1]) {
            ctx.moveTo(px + C - 2, py)
            ctx.lineTo(px + C - 2, py + C)
          }
          ctx.stroke()
          if (x % 4 === 3 && y % 4 === 3) {
            rect(ctx, px + 7, py + 8, 14, 10, '#779caa22', 2)
            rect(ctx, px + 8, py + 9, 12, 2, '#bad0cb22', 1)
          }
        } else if (s.dots[i])
          circle(
            ctx,
            x * C + C / 2,
            y * C + C / 2,
            s.dots[i] === 2 ? 6 + (motion ? Math.sin(s.elapsed * 7) : 0) : 2.5,
            s.dots[i] === 2 ? '#ffe5a0' : '#d7d5ba',
          )
      }
    if (s.fruit) {
      circle(ctx, s.fruit.x * C + C / 2, s.fruit.y * C + C / 2, 8, '#ee8e92')
      text(
        ctx,
        '+',
        s.fruit.x * C + C / 2,
        s.fruit.y * C + 19,
        13,
        '#fff',
        'center',
      )
    }
    const p = position(s.player)
    ctx.save()
    ctx.translate(p.x * C + C / 2, p.y * C + C / 2)
    ctx.rotate(Math.atan2(s.player.dy, s.player.dx || 0.001))
    if (s.invulnerable > 0)
      ctx.globalAlpha = motion
        ? 0.4 + Math.abs(Math.sin(s.elapsed * 12)) * 0.6
        : 0.7
    ctx.fillStyle = s.dash > 0 ? '#c0f4e2' : '#edcb72'
    ctx.beginPath()
    const bite = motion ? 0.15 + Math.abs(Math.sin(s.elapsed * 15)) * 0.4 : 0.3
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, 10, bite, Math.PI * 2 - bite)
    ctx.closePath()
    ctx.fill()
    circle(ctx, -2, -5, 2, '#fdf2c9')
    circle(ctx, 1, -5, 1.3, '#273b49')
    ctx.restore()
    for (const g of s.ghosts) {
      if (g.waiting > 0) continue
      const p = position(g)
      const x = p.x * C + C / 2,
        y = p.y * C + C / 2,
        color =
          s.power > 0
            ? '#6f96d8'
            : ['#e68e92', '#99cfb4', '#e1b67b', '#b2a3df'][g.kind]
      shadow(ctx, x, y + 10, 11, 3)
      orb(ctx, x, y - 2, 10, color, color)
      rect(ctx, x - 10, y - 2, 20, 11, color, 3)
      polygon(
        ctx,
        [
          x - 10,
          y + 6,
          x - 6,
          y + 11,
          x - 2,
          y + 6,
          x + 2,
          y + 11,
          x + 6,
          y + 6,
          x + 10,
          y + 10,
          x + 10,
          y,
        ],
        color,
      )
      circle(ctx, x - 4, y - 2, 3, '#edf4ea')
      circle(ctx, x + 4, y - 2, 3, '#edf4ea')
      circle(ctx, x - 4 + g.dx, y - 2 + g.dy, 1.6, '#1a3442')
      circle(ctx, x + 4 + g.dx, y - 2 + g.dy, 1.6, '#1a3442')
    }
    if (s.power > 0)
      text(
        ctx,
        `${locale === 'pl' ? 'MOC' : 'POWER'} ${Math.ceil(s.power)}s`,
        W / 2,
        21,
        12,
        '#fcdda3',
        'center',
      )
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Dzielnica ${s.stage}. Zostało ${s.dots.filter(Boolean).length} kropek. Zachowaj kulę mocy przy drodze ucieczki.`
      : `District ${s.stage}. ${s.dots.filter(Boolean).length} dots left. Keep a power orb near your escape route.`
  },
  status(s, locale) {
    return `${locale === 'pl' ? 'KROPKI' : 'DOTS'} ${s.dots.filter(Boolean).length} · ${locale === 'pl' ? 'UNIKI' : 'DASHES'} ${s.charges}${s.power > 0 ? ` · ${Math.ceil(s.power)}s` : ''}`
  },
  stats(s, locale) {
    return [
      { label: locale === 'pl' ? 'DZIELNICA' : 'DISTRICT', value: s.stage },
      { label: locale === 'pl' ? 'KROPKI' : 'DOTS', value: s.collected },
      {
        label: locale === 'pl' ? 'CZAS' : 'TIME',
        value: `${Math.floor(s.elapsed)}s`,
      },
    ]
  },
}
export const Game = createArcadeGame(def)
