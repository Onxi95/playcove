import { worker, polygon, orb } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { choose, create, floorY, ladders, save, update } from './engine.ts'
import type { State } from './engine.ts'
const def: ArcadeDefinition<State> = {
  id: 'barrel-ascent',
  name: 'BARREL ASCENT',
  width: 800,
  height: 610,
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
        [l === 'pl' ? 'Skok' : 'Jump', ' '],
        [l === 'pl' ? 'Młot' : 'Hammer', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'Read the roll. Find your ladder.',
    pl: 'Obserwuj beczki. Wybierz drabinę.',
  },
  help: {
    en: 'A/D or ← → move · ↑/↓ or W/S climb · Space jumps · X activates a collected hammer. Collect every bolt before the top exit.',
    pl: 'A/D lub ← → ruch · ↑/↓ lub W/S drabiny · spacja: skok · X uruchamia zebrany młot. Zbierz wszystkie śruby przed wyjściem na szczycie.',
  },
  choices: (_, locale) =>
    locale === 'pl'
      ? [
          {
            id: 'hammer',
            title: 'Weź młot',
            detail: 'Następne rusztowanie zaczynasz z młotem.',
          },
          {
            id: 'rest',
            title: 'Napraw wyposażenie',
            detail: 'Odzyskaj jedno życie przed wspinaczką.',
          },
        ]
      : [
          {
            id: 'hammer',
            title: 'Pack a hammer',
            detail: 'Start the next scaffold with a hammer.',
          },
          {
            id: 'rest',
            title: 'Repair your gear',
            detail: 'Recover one life before the next climb.',
          },
        ],
  draw(ctx, s, locale, motion) {
    backdrop(ctx, 800, 610, '#18283b')
    const dusk = ctx.createLinearGradient(0, 0, 0, 610)
    dusk.addColorStop(0, '#293b58')
    dusk.addColorStop(0.5, '#776c78')
    dusk.addColorStop(1, '#b08b79')
    ctx.fillStyle = dusk
    ctx.fillRect(0, 0, 800, 610)
    circle(ctx, 640, 95, 36, '#eed3a355')
    for (let x = 70; x < 800; x += 220) {
      rect(ctx, x, 20, 7, 540, '#233a4d44')
      ctx.strokeStyle = '#33465555'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(x, 35)
      ctx.lineTo(x + 160, 160)
      ctx.moveTo(x, 35)
      ctx.lineTo(x + 160, 40)
      ctx.lineTo(x + 160, 260)
      ctx.stroke()
    }
    for (let i = 0; i < 10; i++) {
      const x = i * 89 - 20
      rect(ctx, x, 90 + (i % 3) * 35, 65, 470, '#203449')
      for (let y = 120; y < 550; y += 50)
        rect(ctx, x + 14, y, 8, 12, '#627e7c55')
    }
    for (const l of ladders(s)) {
      ctx.strokeStyle = '#91b8b4'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(l.x - 11, l.top)
      ctx.lineTo(l.x - 11, l.bottom)
      ctx.moveTo(l.x + 11, l.top)
      ctx.lineTo(l.x + 11, l.bottom)
      for (let y = l.top + 10; y < l.bottom; y += 15) {
        ctx.moveTo(l.x - 11, y)
        ctx.lineTo(l.x + 11, y)
      }
      ctx.stroke()
    }
    for (let floor = 0; floor < 5; floor++) {
      ctx.strokeStyle = '#cf8e6b'
      ctx.lineWidth = 12
      ctx.beginPath()
      ctx.moveTo(20, floorY(floor, 20))
      ctx.lineTo(780, floorY(floor, 780))
      ctx.stroke()
      for (let x = 22; x < 770; x += 46) {
        const y = floorY(floor, x)
        polygon(ctx, [x, y + 4, x + 23, y + 15, x + 46, y + 4], '#bc8b6b')
        circle(ctx, x + 5, y, 1.7, '#ffe3a9')
      }
      ctx.strokeStyle = '#f0bf8c'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(20, floorY(floor, 20) - 5)
      ctx.lineTo(780, floorY(floor, 780) - 5)
      ctx.stroke()
    }
    if (s.stage % 3 === 0)
      rect(
        ctx,
        350,
        450 - (Math.sin(s.elapsed * 0.65) + 1) * 90,
        100,
        9,
        '#a5c3b3',
        3,
      )
    for (const b of s.barrels) {
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.x / 17)
      orb(ctx, 0, 0, 13, '#b78c61', '#e1bf8b')
      rect(ctx, -10, -7, 20, 3, '#614e3d', 1)
      rect(ctx, -10, 4, 20, 3, '#614e3d', 1)
      ctx.strokeStyle = '#e6be83'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(0, 0, 10, 0, Math.PI * 2)
      ctx.moveTo(-10, 0)
      ctx.lineTo(10, 0)
      ctx.moveTo(0, -10)
      ctx.lineTo(0, 10)
      ctx.stroke()
      ctx.restore()
      if (b.warning > 0) text(ctx, '↓', b.x, b.y - 25, 19, '#f4d28e', 'center')
    }
    for (const b of s.bolts)
      if (!b.taken) {
        const y = floorY(b.floor, b.x) - 23
        circle(ctx, b.x, y, 8, '#f1d186')
        rect(ctx, b.x - 2, y - 5, 4, 10, '#95764d')
      }
    if (!s.hammerTaken) {
      rect(ctx, 365, floorY(2, 370) - 28, 5, 22, '#bb8c62')
      rect(ctx, 358, floorY(2, 370) - 33, 25, 11, '#a8c5c5', 3)
    }
    const x = s.x,
      y = s.y
    ctx.globalAlpha =
      s.invulnerable > 0 && motion
        ? 0.4 + Math.abs(Math.sin(s.elapsed * 12)) * 0.6
        : 1
    worker(
      ctx,
      x,
      y,
      '#a3bfca',
      s.vx < 0 ? -1 : 1,
      s.elapsed,
      Math.abs(s.vx) > 10 || s.climb >= 0,
    )
    if (s.hammer > 0) {
      rect(ctx, x + 18, y - 8, 4, 30, '#b58b62')
      rect(ctx, x + 9, y - 15, 24, 13, '#c8d4ce', 3)
    }
    ctx.globalAlpha = 1
    const exit = s.stage % 2 === 0 ? 70 : 730
    rect(
      ctx,
      exit - 18,
      floorY(4, exit) - 43,
      36,
      41,
      s.bolts.every((b) => b.taken) ? '#a5cb92' : '#485d6b',
      5,
    )
    text(
      ctx,
      s.bolts.every((b) => b.taken) ? '↑' : '●',
      exit,
      floorY(4, exit) - 15,
      21,
      '#e8e5bf',
      'center',
    )
    text(
      ctx,
      `${locale === 'pl' ? 'ŚRUBY' : 'BOLTS'} ${s.bolts.filter((b) => b.taken).length}/${s.bolts.length} · X ${s.charges}`,
      400,
      35,
      14,
      '#e6d6b2',
      'center',
    )
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Rusztowanie ${s.stage}. Zebrane śruby: ${s.bolts.filter((b) => b.taken).length}/${s.bolts.length}. Zmień drabinę, gdy beczka sygnalizuje spadek.`
      : `Scaffold ${s.stage}. Bolts: ${s.bolts.filter((b) => b.taken).length}/${s.bolts.length}. Switch ladders when a barrel signals a drop.`
  },
  status(s, locale) {
    return `${locale === 'pl' ? 'RUSZTOWANIE' : 'SCAFFOLD'} ${s.stage} · ${locale === 'pl' ? 'MŁOT' : 'HAMMER'} ${s.hammer > 0 ? `${Math.ceil(s.hammer)}s` : s.charges}`
  },
}
export const Game = createArcadeGame(def)
