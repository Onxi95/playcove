import { localTouch } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { opponentModes, opponentMode, opponentLabel } from '../kit/opponent.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import { bevel, polygon, shadow } from '../kit/art.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { create, update, choose, save, TRACKS } from './engine.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'circuit-clash',
  modes: opponentModes,
  configure(s, mode) {
    s.mode = opponentMode(mode, s.mode)
  },
  name: 'CIRCUIT CLASH',
  width: 1000,
  height: 650,
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
          ['→', 'd'],
          [l === 'pl' ? 'Gaz' : 'Gas', 'w'],
          [l === 'pl' ? 'Hamulec' : 'Brake', 's'],
          ['Nitro', ' '],
          ['Drift', 'q'],
        ],
      },
      {
        label: 'P2',
        buttons: [
          ['←', 'arrowleft'],
          ['→', 'arrowright'],
          [l === 'pl' ? 'Gaz' : 'Gas', 'arrowup'],
          [l === 'pl' ? 'Hamulec' : 'Brake', 'arrowdown'],
          ['Nitro', 'enter'],
          ['Drift', 'shift'],
        ],
      },
    ),
  tagline: {
    en: 'Share the track. Own the racing line.',
    pl: 'Wspólny tor. Twój idealny przejazd.',
  },
  help: {
    en: 'P1: W throttle, S brake, A D steer, Space nitro, Q drift. Local P2: ↑ throttle, ↓ brake, ← → steer, Enter nitro, Shift drift. Five laps per race; first to seven race wins takes the tour. Follow the colored gate markers. Racing checkpoints restart the current race.',
    pl: 'P1: W gaz, S hamulec, A D skręt, spacja: nitro, Q drift. P2 lokalnie: ↑ gaz, ↓ hamulec, ← → skręt, Enter: nitro, Shift drift. Pięć okrążeń; do siedmiu wygranych. Przejeżdżaj bramki po kolei. Zapis wznawia bieżący wyścig.',
  },
  choices: (_, l) => [
    {
      id: 'next',
      title: l === 'pl' ? 'Kolejny tor' : 'Next circuit',
      detail:
        l === 'pl'
          ? 'Nowy układ i odnowione nitro.'
          : 'A different layout and fresh nitro.',
    },
    {
      id: 'alpine',
      title: l === 'pl' ? 'Pętla alpejska' : 'Alpine loop',
      detail:
        l === 'pl'
          ? 'Mniejsza przyczepność i serpentyny.'
          : 'Lower grip and switchbacks.',
    },
    {
      id: 'night',
      title: l === 'pl' ? 'Nocne Grand Prix' : 'Night Grand Prix',
      detail:
        l === 'pl'
          ? 'Szybki asfalt i kręte odcinki.'
          : 'Fast asphalt with a twisting infield.',
    },
  ],
  meter(s, l) {
    return {
      label: `P1 : ${opponentLabel(s.mode, l)}`,
      value: `${s.wins[0]} : ${s.wins[1]}`,
    }
  },
  status(s, l) {
    return `${TRACKS[s.track][l]} · ${l === 'pl' ? 'OKRĄŻENIA' : 'LAPS'} ${s.cars[0].lap}/5 : ${s.cars[1].lap}/5 · ${l === 'pl' ? 'WYGRANE' : 'WINS'} ${s.wins[0]} : ${s.wins[1]}`
  },
  endMessage(s, l) {
    return `${s.reason === 'P2' ? opponentLabel(s.mode, l) : s.reason} ${l === 'pl' ? 'wygrywa trasę' : 'wins the tour'} · ${s.wins[0]} : ${s.wins[1]}`
  },
  stats(s, l) {
    return [
      { label: 'P1', value: s.wins[0] },
      { label: 'P2', value: s.wins[1] },
      { label: l === 'pl' ? 'OKRĄŻENIA' : 'LAPS', value: s.laps },
    ]
  },
  draw(ctx, s, l, motion) {
    const night = s.track === 3
    backdrop(ctx, 1000, 650, night ? '#233d3e' : '#74947a')
    for (let y = 60; y < 650; y += 42)
      rect(ctx, 0, y, 1000, 20, night ? '#47665318' : '#adc28b22')
    shadow(ctx, 520, 330, 145, 90, '#466f76')
    shadow(ctx, 510, 320, 132, 78, night ? '#31575e' : '#7db3b0')
    for (let n = 0; n < 14; n++) {
      const x = (n * 149 + 45) % 980,
        y = (n * 97 + 80) % 560
      circle(ctx, x, y, 16, '#253f3d33')
      circle(ctx, x - 2, y - 3, 13, night ? '#496d57' : '#8aab74')
      circle(ctx, x - 6, y - 7, 7, '#b5c29233')
    }
    const road = (color: string, width: number) => {
      ctx.strokeStyle = color
      ctx.lineWidth = width
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.beginPath()
      s.path.forEach((p, i) =>
        i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y),
      )
      ctx.closePath()
      ctx.stroke()
    }
    road('#21383f44', TRACKS[s.track].width * 2 + 23)
    road('#e0d3b2', TRACKS[s.track].width * 2 + 10)
    ctx.lineWidth = TRACKS[s.track].width * 2 + 10
    for (let n = 0; n < s.path.length; n += 4) {
      if (n % 8 === 0) continue
      ctx.strokeStyle = '#c68070'
      ctx.beginPath()
      ctx.moveTo(s.path[n].x, s.path[n].y)
      const p = s.path[(n + 4) % s.path.length]
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
    }
    road(night ? '#354854' : '#53636a', TRACKS[s.track].width * 2)
    ctx.setLineDash([12, 20])
    road('#ece2ba55', 1)
    ctx.setLineDash([])
    for (let gate = 0; gate < 4; gate++) {
      const index = Math.floor((s.path.length * gate) / 4),
        p = s.path[index],
        q = s.path[(index + 1) % s.path.length],
        angle = Math.atan2(q.y - p.y, q.x - p.x)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(angle)
      for (let n = -5; n < 5; n++) {
        rect(ctx, -4, n * 10, 4, 10, (n + gate) % 2 ? '#e3dec7' : '#243e48')
        rect(ctx, 0, n * 10, 4, 10, (n + gate) % 2 ? '#243e48' : '#e3dec7')
      }
      text(
        ctx,
        gate === 0 ? 'FINISH' : String(gate),
        0,
        -TRACKS[s.track].width - 13,
        10,
        '#efe6c3',
        'center',
      )
      ctx.restore()
    }
    for (const pickup of s.pickups)
      if (pickup.timers.some((t) => t === 0)) {
        circle(ctx, pickup.x, pickup.y, 13, '#b3d3ab33')
        text(ctx, '✦', pickup.x, pickup.y + 5, 18, '#d7e5ac', 'center')
      }
    s.cars.forEach((c, index) => {
      const color = index ? '#98c7d9' : '#e8a17f'
      for (const p of c.skids) rect(ctx, p.x - 2, p.y - 2, 4, 4, '#142d3c33')
      shadow(ctx, c.x + 2, c.y + 4, 17, 8)
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.angle + Math.PI / 2)
      rect(ctx, -13, -12, 5, 12, '#24343b', 2)
      rect(ctx, 8, -12, 5, 12, '#24343b', 2)
      rect(ctx, -13, 8, 5, 12, '#24343b', 2)
      rect(ctx, 8, 8, 5, 12, '#24343b', 2)
      bevel(ctx, -10, -21, 20, 42, color, 5)
      polygon(ctx, [-7, -5, -5, -12, 5, -12, 7, -5, 7, 8, -7, 8], '#294c60')
      rect(ctx, -8, 13, 16, 4, '#2e4952', 1)
      rect(ctx, -9, -18, 4, 3, '#fff0c8', 1)
      rect(ctx, 5, -18, 4, 3, '#fff0c8', 1)
      if (c.boost > 0)
        polygon(
          ctx,
          [-5, 22, 0, 34 + (motion ? Math.sin(s.elapsed * 45) * 5 : 0), 5, 22],
          '#9de1e1',
        )
      ctx.restore()
      text(
        ctx,
        index ? opponentLabel(s.mode, l) : 'P1',
        c.x,
        c.y - 30,
        10,
        color,
        'center',
      )
      const panelX = index ? 765 : 25
      rect(ctx, panelX, 18, 210, 57, '#1b3646e6', 7)
      text(
        ctx,
        `${index ? opponentLabel(s.mode, l) : 'P1'}  ${l === 'pl' ? 'OKR.' : 'LAP'} ${Math.min(5, c.lap + 1)} / 5`,
        panelX + 13,
        39,
        14,
        color,
      )
      text(
        ctx,
        `${Math.round(c.speed)} km/h   NITRO ${Math.floor(c.nitro)}%`,
        panelX + 13,
        60,
        11,
        '#d8dfca',
      )
      const nextGate =
          c.gate === 4 ? 0 : Math.floor((s.path.length * c.gate) / 4),
        target = s.path[nextGate]
      ctx.strokeStyle = color + '88'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(target.x, target.y, 12 + index * 5, 0, Math.PI * 2)
      ctx.stroke()
    })
    text(ctx, TRACKS[s.track][l], 500, 38, 15, '#e8e2bf', 'center')
    text(
      ctx,
      `${s.wins[0]} : ${s.wins[1]}  ·  ${l === 'pl' ? 'DO 7' : 'FIRST TO 7'}`,
      500,
      60,
      11,
      '#d4ddc4',
      'center',
    )
    if (s.countdown > 0) {
      rect(ctx, 425, 274, 150, 75, '#1b3646e6', 8)
      for (let n = 0; n < 3; n++)
        circle(
          ctx,
          455 + n * 45,
          310,
          12,
          s.countdown < 2 - n * 0.6 ? '#b7d19a' : '#c18579',
        )
    }
  },
}
export const Game = createArcadeGame(definition)
