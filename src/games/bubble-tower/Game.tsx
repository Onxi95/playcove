import { localTouch } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { bevel, creature } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { choose, create, save, update } from './engine.ts'
import type { State } from './engine.ts'
const def: ArcadeDefinition<State> = {
  id: 'bubble-tower',
  name: 'BUBBLE TOWER',
  width: 800,
  height: 600,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (s, l) =>
    localTouch(
      s.mode === 'coop',
      {
        label: 'P1',
        buttons: [
          ['←', 'a'],
          ['↑', 'w'],
          ['↓', 's'],
          ['→', 'd'],
          [l === 'pl' ? 'Bańka' : 'Bubble', ' '],
          [l === 'pl' ? 'Rozbij' : 'Pop', 'x'],
        ],
      },
      {
        label: 'P2',
        buttons: [
          ['←', 'arrowleft'],
          ['↑', 'arrowup'],
          ['↓', 'arrowdown'],
          ['→', 'arrowright'],
          [l === 'pl' ? 'Bańka' : 'Bubble', 'enter'],
          [l === 'pl' ? 'Rozbij' : 'Pop', 'shift'],
        ],
      },
    ),
  tagline: {
    en: 'Trap them. Climb. Pop the whole chain.',
    pl: 'Złap je. Wspinaj się. Rozbij całą serię.',
  },
  help: {
    en: 'A/D or arrows move · W/↑ jumps · Space blows bubbles · X pops nearby captures. Down drops through platforms. Co-op P2: arrows, Enter bubbles, Shift pops.',
    pl: 'A/D lub strzałki: ruch · W/↑ skok · spacja: bańki · X rozbija pobliskie pułapki. Dół: spadnij z platformy. P2: strzałki, Enter: bańki, Shift: rozbicie.',
  },
  modes: [
    {
      id: 'solo',
      title: { en: 'Solo tower', pl: 'Wieża solo' },
      detail: {
        en: 'Capture chains and climb room by room.',
        pl: 'Łap serie i zdobywaj kolejne pokoje.',
      },
    },
    {
      id: 'coop',
      title: { en: 'Two-player co-op', pl: 'Współpraca dla dwóch' },
      detail: {
        en: 'Share the tower and a pool of lives.',
        pl: 'Wspólna wieża i pula żyć.',
      },
    },
  ],
  choices: (_, locale) =>
    locale === 'pl'
      ? [
          {
            id: 'calm',
            title: 'Spokojny pokój',
            detail: 'Bańki unoszą się pionowo.',
          },
          {
            id: 'wind',
            title: 'Pokój z prądem',
            detail: 'Prąd powietrza przesuwa bańki.',
          },
        ]
      : [
          {
            id: 'calm',
            title: 'Quiet room',
            detail: 'Bubbles rise vertically.',
          },
          {
            id: 'wind',
            title: 'Air-current room',
            detail: 'A breeze carries your captures.',
          },
        ],
  draw(ctx, s, locale, motion) {
    backdrop(ctx, 800, 600, ['#172a36', '#292338', '#19362f'][s.stage % 3])
    for (let column = 0; column < 5; column++) {
      const x = column * 180 + 20
      rect(ctx, x, 0, 50, 570, '#a3aaa00a')
      rect(ctx, x + 6, 0, 4, 570, '#d7d7ae0a')
      ctx.strokeStyle = '#b4bbcf14'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(x + 25, 200, 64, Math.PI, 0)
      ctx.lineTo(x + 89, 500)
      ctx.stroke()
      rect(ctx, x - 24, 145, 98, 225, '#131e301c', 38)
    }
    for (let i = 0; i < 24; i++) {
      const x = (i * 149 + 23) % 800,
        y = (i * 71 - s.elapsed * 3 + 600) % 550
      circle(ctx, x, y, 1 + (i % 3) * 0.5, '#b9d9cc33')
    }
    for (const p of s.platforms) {
      bevel(ctx, p.x, p.y, p.w, 18, '#64878b', 5)
      for (let x = p.x + 8; x < p.x + p.w - 6; x += 19) {
        rect(ctx, x, p.y - 2, 11, 5, '#96bda0', 2)
        if (Math.floor(x / 19) % 3 === 0)
          rect(ctx, x + 3, p.y + 1, 3, 7, '#83a48b', 2)
      }
      rect(ctx, p.x, p.y, p.w, 4, '#a0cfb2', 3)
      for (let x = p.x + 15; x < p.x + p.w; x += 35)
        rect(ctx, x, p.y + 7, 17, 2, '#7c9090')
    }
    for (const e of s.enemies)
      if (e.alive && !e.trapped) {
        creature(
          ctx,
          e.x,
          e.y,
          e.angry ? '#ed8d8b' : ['#e0ad8b', '#c0a5df', '#e1c57d'][e.kind],
          Math.sign(e.vx),
          s.elapsed,
          e.kind,
        )
      }
    for (const b of s.bubbles) {
      ctx.strokeStyle = b.enemy >= 0 ? '#c6e0f5' : '#8ed5d899'
      ctx.lineWidth = b.enemy >= 0 ? 2.4 : 1.5
      ctx.fillStyle = b.enemy >= 0 ? '#7ca6dc33' : '#8ed5d810'
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.enemy >= 0 ? 21 : 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()
      ctx.strokeStyle = '#eac9ef88'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.enemy >= 0 ? 18 : 11, 3.6, 4.7)
      ctx.stroke()
      ctx.strokeStyle = '#9ae4d388'
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.enemy >= 0 ? 18 : 11, 0.3, 1.2)
      ctx.stroke()
      circle(ctx, b.x - 5, b.y - 7, 3, '#ffffffaa')
      if (b.enemy >= 0) {
        rect(ctx, b.x - 8, b.y - 7, 16, 17, '#e5a2a2', 5)
        if (b.life < 2) text(ctx, '!', b.x, b.y + 6, 13, '#293647', 'center')
      }
    }
    for (const f of s.fruit) {
      circle(ctx, f.x, f.y, 9, '#efb878')
      circle(ctx, f.x + 3, f.y - 8, 4, '#a8d29b')
    }
    s.players.forEach((p, i) => {
      ctx.globalAlpha =
        p.invulnerable > 0 && motion
          ? 0.4 + Math.abs(Math.sin(s.elapsed * 12)) * 0.6
          : 1
      creature(ctx, p.x, p.y, i ? '#a5cbe5' : '#a8ddaf', p.face, s.elapsed, 1)
      ctx.globalAlpha = 1
    })
    if (s.popFlash > 0)
      text(
        ctx,
        `${s.chain} ${locale === 'pl' ? 'W SERII' : 'CHAIN'}!`,
        400,
        60,
        30,
        '#f4dba5',
        'center',
      )
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Pokój ${s.stage}. Najlepsza seria: ${s.bestChain}. Zbliż bańki do siebie i rozbij je razem, zanim pękną.`
      : `Room ${s.stage}. Best chain: ${s.bestChain}. Gather captured bubbles and pop them together before they escape.`
  },
  status(s, locale) {
    return `${locale === 'pl' ? 'POKÓJ' : 'ROOM'} ${s.stage} · ${locale === 'pl' ? 'WROGOWIE' : 'ENEMIES'} ${s.enemies.filter((e) => e.alive).length} · ${locale === 'pl' ? 'SERIA' : 'CHAIN'} ${s.bestChain}`
  },
}
export const Game = createArcadeGame(def)
