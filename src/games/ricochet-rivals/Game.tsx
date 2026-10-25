import { localTouch } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { opponentModes, opponentMode, opponentLabel } from '../kit/opponent.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import { bevel, orb, polygon, shadow } from '../kit/art.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { create, update, choose, save } from './engine.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'ricochet-rivals',
  modes: opponentModes,
  configure(s, mode) {
    s.mode = opponentMode(mode, s.mode)
  },
  name: 'RICOCHET RIVALS',
  width: 1000,
  height: 620,
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
          [l === 'pl' ? 'Rzut' : 'Throw', ' '],
          [l === 'pl' ? 'Odbij' : 'Parry', 'q'],
        ],
      },
      {
        label: 'P2',
        buttons: [
          ['←', 'arrowleft'],
          ['↑', 'arrowup'],
          ['↓', 'arrowdown'],
          ['→', 'arrowright'],
          [l === 'pl' ? 'Rzut' : 'Throw', 'enter'],
          [l === 'pl' ? 'Odbij' : 'Parry', 'shift'],
        ],
      },
    ),
  tagline: {
    en: 'Bank the shot. Send it back.',
    pl: 'Odbij od ściany. Odeślij pocisk.',
  },
  help: {
    en: 'P1: WASD move, hold Space to lock aim and charge, release to throw; Q parries. P2 in local mode: arrows, hold/release Enter, Shift parries. Face a direction before charging; ricochets can hit their owner. Green cores restore a shield and energy. First to nine rounds wins.',
    pl: 'P1: WASD ruch, przytrzymaj spację, by zablokować cel i ładować; puść, by rzucić. Q odbija. P2 lokalnie: strzałki, Enter, Shift. Przed ładowaniem ustaw kierunek. Rykoszet może trafić właściciela. Zielone rdzenie odnawiają tarczę i energię. Do dziewięciu rund.',
  },
  choices: (_, l) => [
    {
      id: 'next',
      title: l === 'pl' ? 'Następna arena' : 'Next arena',
      detail:
        l === 'pl'
          ? 'Nowe osłony i linie rykoszetów.'
          : 'New cover and ricochet angles.',
    },
    {
      id: 'cross',
      title: l === 'pl' ? 'Skrzyżowanie' : 'Cross lanes',
      detail:
        l === 'pl'
          ? 'Długie kąty i dwa korytarze.'
          : 'Long bank shots and split approaches.',
    },
    {
      id: 'pillars',
      title: l === 'pl' ? 'Filary' : 'Pillars',
      detail:
        l === 'pl'
          ? 'Osłony wokół dwóch rdzeni.'
          : 'Cover around two contested cores.',
    },
  ],
  meter(s, l) {
    return {
      label: `P1 : ${opponentLabel(s.mode, l)}`,
      value: `${s.wins[0]} : ${s.wins[1]}`,
    }
  },
  status(s, l) {
    return `${l === 'pl' ? 'TARCZE' : 'SHIELDS'} ${s.players[0].hp} : ${s.players[1].hp} · ${l === 'pl' ? 'ODBICIA' : 'PARRIES'} ${s.parries} · ${l === 'pl' ? 'DO 9' : 'FIRST TO 9'}`
  },
  endMessage(s, l) {
    return `${s.reason === 'P2' ? opponentLabel(s.mode, l) : s.reason} ${l === 'pl' ? 'wygrywa turniej' : 'wins the tournament'} · ${s.wins[0]} : ${s.wins[1]}`
  },
  stats(s, l) {
    return [
      { label: 'P1', value: s.wins[0] },
      { label: 'P2', value: s.wins[1] },
      { label: l === 'pl' ? 'ODBICIA' : 'PARRIES', value: s.parries },
    ]
  },
  draw(ctx, s, l, motion) {
    backdrop(ctx, 1000, 620, '#142e3a')
    const glow = ctx.createRadialGradient(500, 310, 20, 500, 310, 600)
    glow.addColorStop(0, '#31515b')
    glow.addColorStop(1, '#102937')
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, 1000, 620)
    for (let x = 40; x < 1000; x += 40)
      for (let y = 40; y < 620; y += 40) {
        rect(ctx, x, y, 1, 1, '#abc9bc33')
        if ((x + y) % 120 === 0) {
          ctx.strokeStyle = '#9db8ae0c'
          ctx.strokeRect(x - 18, y - 18, 36, 36)
        }
      }
    for (const side of [0, 1])
      bevel(ctx, side ? 972 : 22, 22, 6, 576, side ? '#7eb6d4' : '#d9a487', 2)
    bevel(ctx, 22, 22, 956, 6, '#8bafad', 2)
    bevel(ctx, 22, 592, 956, 6, '#8bafad', 2)
    for (const wall of s.walls) {
      shadow(ctx, wall.x + wall.w / 2, wall.y + wall.h, wall.w * 0.55, 9)
      bevel(ctx, wall.x, wall.y, wall.w, wall.h, '#698a8d', 5)
      for (let x = wall.x + 9; x < wall.x + wall.w - 5; x += 18)
        rect(ctx, x, wall.y + 8, 5, 2, '#e2d8b37a', 1)
    }
    for (const core of s.orbs)
      if (core.active) {
        circle(ctx, core.x, core.y, 24, '#b7ddb315')
        orb(ctx, core.x, core.y, 12, '#b6dca5')
        text(ctx, '+', core.x, core.y + 5, 18, '#f8f3d2', 'center')
      }
    s.players.forEach((p, index) => {
      const color = index ? '#98c5dd' : '#e5ac8d'
      shadow(ctx, p.x, p.y + 18, 24, 7)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.angle)
      ctx.globalAlpha =
        p.invulnerable > 0 && motion ? 0.55 + Math.sin(s.elapsed * 30) * 0.2 : 1
      bevel(ctx, -17, -16, 34, 32, color, 10)
      rect(ctx, -8, -12, 21, 24, '#2b4b5e', 7)
      rect(ctx, 4, -8, 10, 3, '#c6e6df', 1)
      polygon(ctx, [19, -8, 31, 0, 19, 8], color)
      ctx.restore()
      for (let n = 0; n < 5; n++)
        rect(
          ctx,
          p.x - 23 + n * 10,
          p.y + 30,
          7,
          4,
          p.hp > n ? color : '#b1cac733',
          1,
        )
      rect(ctx, p.x - 24, p.y + 39, (48 * p.energy) / 100, 2, '#c4e1b6')
      if (p.held) {
        ctx.strokeStyle = color
        ctx.setLineDash([4, 7])
        ctx.beginPath()
        ctx.moveTo(p.x + Math.cos(p.angle) * 30, p.y + Math.sin(p.angle) * 30)
        ctx.lineTo(
          p.x + Math.cos(p.angle) * (65 + p.charge * 65),
          p.y + Math.sin(p.angle) * (65 + p.charge * 65),
        )
        ctx.stroke()
        ctx.setLineDash([])
      }
      if (p.parry > 0) {
        ctx.strokeStyle = '#e4edbd'
        ctx.lineWidth = 4
        ctx.beginPath()
        ctx.arc(p.x, p.y, 31, 0, Math.PI * 2)
        ctx.stroke()
      }
    })
    for (const d of s.discs) {
      ctx.strokeStyle = d.owner ? '#9ccce6' : '#edb392'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(d.x - d.vx * 0.04, d.y - d.vy * 0.04)
      ctx.lineTo(d.x, d.y)
      ctx.stroke()
      circle(ctx, d.x, d.y, 8, d.owner ? '#b4ddeb' : '#f4c39d')
      circle(ctx, d.x, d.y, 3, '#f2f2cc')
    }
    for (const p of s.sparks) {
      ctx.strokeStyle = '#efd49c'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(p.x, p.y, (1 - p.life / 0.5) * 35, 0, Math.PI * 2)
      ctx.stroke()
    }
    if (s.shrink > 0) {
      ctx.strokeStyle = '#e2a28866'
      ctx.lineWidth = 2
      ctx.strokeRect(
        28 + s.shrink,
        28 + s.shrink,
        944 - s.shrink * 2,
        564 - s.shrink * 2,
      )
    }
    text(
      ctx,
      `P1 ${s.wins[0]} : ${s.wins[1]} ${opponentLabel(s.mode, l)}`,
      500,
      47,
      18,
      '#dfddbe',
      'center',
    )
    if (s.countdown > 0)
      text(
        ctx,
        String(Math.ceil(s.countdown)),
        500,
        310,
        58,
        '#efdfb6',
        'center',
      )
    void l
  },
}
export const Game = createArcadeGame(definition)
