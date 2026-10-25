import type { TouchGroup } from '../kit/TouchControls.tsx'
import { opponentModes, opponentMode, opponentLabel } from '../kit/opponent.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { circle, rect, text } from '../kit/arcade.ts'
import { bevel, orb, polygon, shadow } from '../kit/art.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import {
  create,
  update,
  choose,
  save,
  launch,
  LANDSCAPES,
  ground,
} from './engine.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'tank-tactics',
  modes: opponentModes,
  configure(s, mode) {
    s.mode = opponentMode(mode, s.mode)
  },
  name: 'TANK TACTICS',
  width: 1000,
  height: 620,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (s, l): TouchGroup[] => {
    const player = s.mode === 'local' ? s.turn : 0
    return [
      {
        label: `P${player + 1} · ${s.mode !== 'local' && s.turn === 1 ? (l === 'pl' ? 'komputer celuje…' : 'computer aiming…') : l === 'pl' ? 'kąt / moc / pocisk' : 'angle / power / shell'}`,
        buttons: [
          ['−°', player ? 'arrowdown' : 's'],
          ['+°', player ? 'arrowup' : 'w'],
          ['−%', player ? 'arrowleft' : 'a'],
          ['+%', player ? 'arrowright' : 'd'],
          [l === 'pl' ? 'Pocisk' : 'Shell', player ? 'shift' : 'q'],
          [l === 'pl' ? 'Ogień' : 'Fire', player ? 'enter' : ' '],
        ],
      },
    ]
  },
  tagline: {
    en: 'Read the wind. Reshape the battlefield.',
    pl: 'Czytaj wiatr. Zmieniaj pole bitwy.',
  },
  help: {
    en: 'Take turns. P1: W S angle, A D power, Q shell, Space fires. Local P2: ↑ ↓ angle, ← → power, Shift shell, Enter fires. Heavy shells make deep craters; skipper shells bounce once. First to seven battles wins the expedition. No turn timer.',
    pl: 'Na zmianę. P1: W S kąt, A D moc, Q pocisk, spacja: strzał. P2 lokalnie: ↑ ↓ kąt, ← → moc, Shift pocisk, Enter: strzał. Ciężkie pociski tworzą kratery; skaczące odbijają się raz. Do siedmiu wygranych. Bez limitu czasu tury.',
  },
  choices: (_, l) => [
    {
      id: 'next',
      title: l === 'pl' ? 'Nowy krajobraz' : 'New landscape',
      detail:
        l === 'pl'
          ? 'Świeży teren i inny wiatr.'
          : 'Fresh terrain and a different wind.',
    },
    {
      id: 'ridge',
      title: l === 'pl' ? 'Alpejska grań' : 'Alpine ridge',
      detail:
        l === 'pl'
          ? 'Wysokie wzniesienia i boczne podmuchy.'
          : 'High hills and shifting crosswinds.',
    },
    {
      id: 'moon',
      title: l === 'pl' ? 'Księżycowa kaldera' : 'Lunar caldera',
      detail:
        l === 'pl'
          ? 'Niska grawitacja, bez wiatru.'
          : 'Low gravity and no wind.',
    },
  ],
  meter(s, l) {
    return {
      label: `P1 : ${opponentLabel(s.mode, l)}`,
      value: `${s.wins[0]} : ${s.wins[1]}`,
    }
  },
  status(s, l) {
    return `${LANDSCAPES[s.landscape][l]} · ${l === 'pl' ? 'TURA' : 'TURN'} P${s.turn + 1} · ${l === 'pl' ? 'DO 7 WYGRANYCH' : 'FIRST TO 7'}`
  },
  endMessage(s, l) {
    return `${s.reason === 'P2' ? opponentLabel(s.mode, l) : s.reason} ${l === 'pl' ? 'wygrywa ekspedycję' : 'wins the expedition'} · ${s.wins[0]} : ${s.wins[1]}`
  },
  stats(s, l) {
    return [
      { label: 'P1', value: s.wins[0] },
      { label: 'P2', value: s.wins[1] },
      { label: l === 'pl' ? 'STRZAŁY' : 'SHOTS', value: s.shots },
    ]
  },
  draw(ctx, s, l, motion) {
    const moon = s.landscape === 3,
      sky = ctx.createLinearGradient(0, 0, 0, 620)
    sky.addColorStop(0, moon ? '#162740' : '#789eac')
    sky.addColorStop(1, moon ? '#5a6582' : '#ebcba2')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1000, 620)
    circle(ctx, 760, 100, 42, moon ? '#cfceba' : '#f7d9a2')
    for (let layer = 0; layer < 2; layer++) {
      const points = [0, 620]
      for (let x = 0; x <= 1020; x += 20)
        points.push(
          x,
          310 + layer * 75 - Math.sin(x / (90 + layer * 60) + s.landscape) * 50,
        )
      points.push(1020, 620)
      polygon(
        ctx,
        points,
        moon ? (layer ? '#4f5d76' : '#3b4f68') : layer ? '#a28f7c' : '#91a4a0',
      )
    }
    const terrain = [0, 620]
    s.terrain.forEach((height, i) => terrain.push(i * 4, height))
    terrain.push(1000, 620)
    const earth = ctx.createLinearGradient(0, 300, 0, 620)
    earth.addColorStop(0, moon ? '#85949c' : '#bb8b62')
    earth.addColorStop(1, moon ? '#43566e' : '#6b5546')
    polygon(ctx, terrain, earth)
    ctx.strokeStyle = moon ? '#bdc9c5' : '#e9c18c'
    ctx.lineWidth = 4
    ctx.beginPath()
    s.terrain.forEach((y, i) => (i ? ctx.lineTo(i * 4, y) : ctx.moveTo(0, y)))
    ctx.stroke()
    for (let i = 0; i < 70; i++) {
      const x = (i * 139) % 1000,
        y = ground(s, x) + 10 + ((i * 37) % 70)
      if (y < 615) rect(ctx, x, y, 4 + (i % 4), 2, '#efd3a322')
    }
    s.tanks.forEach((t, index) => {
      shadow(ctx, t.x, t.y + 14, 31, 6)
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.rotate(
        Math.atan2(ground(s, t.x + 12) - ground(s, t.x - 12), 24) * 0.35,
      )
      bevel(ctx, -30, 0, 60, 19, '#45585e', 8)
      for (let n = 0; n < 5; n++) circle(ctx, -23 + n * 11, 11, 6, '#263e49')
      bevel(ctx, -26, -11, 52, 19, index ? '#8ab6c9' : '#d19d79', 5)
      bevel(ctx, -15, -23, 30, 18, index ? '#a5c9d5' : '#e1b48b', 6)
      ctx.strokeStyle = index ? '#b3d5dc' : '#f0cb9b'
      ctx.lineWidth = 8
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(0, -11)
      ctx.lineTo(
        Math.cos((t.angle * Math.PI) / 180) * (index ? -1 : 1) * 34,
        -11 - Math.sin((t.angle * Math.PI) / 180) * 34,
      )
      ctx.stroke()
      ctx.restore()
      for (let n = 0; n < 5; n++)
        rect(
          ctx,
          t.x - 30 + n * 13,
          t.y + 31,
          10,
          5,
          t.hp > n ? (index ? '#a7d6dd' : '#efbf92') : '#273e4b66',
          1,
        )
      text(
        ctx,
        index ? opponentLabel(s.mode, l) : 'P1',
        t.x,
        t.y + 56,
        13,
        '#f4e4c1',
        'center',
      )
    })
    if (!s.shot && !s.resolve) {
      const b = launch(s.tanks[s.turn], s.turn)
      ctx.fillStyle = '#fff1c28c'
      for (let n = 0; n < 28; n++) {
        b.x += b.vx * 0.05
        b.y += b.vy * 0.05
        b.vx += s.wind * 0.05
        b.vy += (moon ? 260 : 410) * 0.05
        if (b.x < 0 || b.x > 1000 || b.y > ground(s, b.x)) break
        if (n % 2 === 0) circle(ctx, b.x, b.y, 2, '#fff2cb88')
      }
    }
    if (s.shot) {
      for (let n = 1; n < 5; n++)
        circle(
          ctx,
          s.shot.x - s.shot.vx * n * 0.012,
          s.shot.y - s.shot.vy * n * 0.012,
          3 - n * 0.4,
          '#f2dbb766',
        )
      orb(ctx, s.shot.x, s.shot.y, 5, '#f1d18a')
    }
    for (const e of s.explosions) {
      const r = e.r * (1 - e.life / 0.8)
      circle(ctx, e.x, e.y, Math.max(1, r), '#eeb46744')
      circle(ctx, e.x, e.y, Math.max(1, r * 0.55), '#f5d59677')
    }
    const t = s.tanks[s.turn]
    rect(ctx, 295, 24, 410, 86, '#193445e8', 9)
    text(
      ctx,
      `${l === 'pl' ? 'TURA' : 'TURN'} P${s.turn + 1} · ${l === 'pl' ? 'WIATR' : 'WIND'} ${Math.round(s.wind)} ${s.wind < 0 ? '←' : '→'}`,
      500,
      48,
      15,
      '#e9d8b4',
      'center',
    )
    text(
      ctx,
      `${Math.round(t.angle)}°  /  ${Math.round(t.power)}%  /  ${t.weapon === 0 ? (l === 'pl' ? 'ZWYKŁY ∞' : 'STANDARD ∞') : t.weapon === 1 ? `HEAVY ${t.heavy}` : `SKIPPER ${t.skipper}`}`,
      500,
      78,
      20,
      '#f7e4ba',
      'center',
    )
    text(
      ctx,
      `P1 ${s.wins[0]} : ${s.wins[1]} ${opponentLabel(s.mode, l)}`,
      500,
      99,
      12,
      '#b5c9c9',
      'center',
    )
    void motion
  },
}
export const Game = createArcadeGame(definition)
