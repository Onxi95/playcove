import { localTouch } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { opponentModes, opponentMode, opponentLabel } from '../kit/opponent.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { circle, rect, text } from '../kit/arcade.ts'
import { bevel, orb, polygon, shadow, worker } from '../kit/art.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import {
  create,
  update,
  choose,
  save,
  COURTS,
  FLOOR,
  NET,
  COURT_LEFT,
  COURT_RIGHT,
} from './engine.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'volley-clash',
  modes: opponentModes,
  configure(s, mode) {
    s.mode = opponentMode(mode, s.mode)
  },
  name: 'VOLLEY CLASH',
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
          ['→', 'd'],
          ['↑', 'w'],
          [l === 'pl' ? 'Atak' : 'Hit', ' '],
          [l === 'pl' ? 'Unik' : 'Dash', 'q'],
          ['↓', 's'],
        ],
      },
      {
        label: 'P2',
        buttons: [
          ['←', 'arrowleft'],
          ['→', 'arrowright'],
          ['↑', 'arrowup'],
          [l === 'pl' ? 'Atak' : 'Hit', 'enter'],
          [l === 'pl' ? 'Unik' : 'Dash', 'shift'],
          ['↓', 'arrowdown'],
        ],
      },
    ),
  tagline: {
    en: 'Two sides. One more impossible save.',
    pl: 'Dwie strony. Jeszcze jedna obrona.',
  },
  help: {
    en: 'P1: A D move, W jump, Space power hit, Q dash. Local P2: ← → move, ↑ jump, Enter power hit, Shift dash. Shots landing outside the court lose a point for the last hitter. Hold a hit to charge; ↓ / S aims lower. First to 11, win by two; sudden point at 16–16. Win three sets across changing courts.',
    pl: 'P1: A D ruch, W skok, spacja: mocne odbicie, Q unik. P2 lokalnie: ← → ruch, ↑ skok, Enter: mocne odbicie, Shift unik. Aut oznacza punkt dla rywala ostatniego odbijającego. Przytrzymaj odbicie, by naładować; ↓ / S celuje niżej. Do 11, przewaga dwóch; przy 16–16 decyduje kolejny punkt. Wygraj trzy sety.',
  },
  choices: (_, l) => [
    {
      id: 'beach',
      title: l === 'pl' ? 'Następny kort' : 'Next court',
      detail:
        l === 'pl'
          ? 'Nowa sceneria i inne warunki.'
          : 'Fresh scenery and different conditions.',
    },
    {
      id: 'breeze',
      title: l === 'pl' ? 'Wiatr na dachu' : 'Rooftop crosswind',
      detail:
        l === 'pl'
          ? 'Czytaj znoszenie przed mocnym atakiem.'
          : 'Read the breeze before committing to a hit.',
    },
    {
      id: 'moon',
      title: l === 'pl' ? 'Księżycowy ogród' : 'Moon garden',
      detail:
        l === 'pl'
          ? 'Dłuższy lot piłki, więcej gry w powietrzu.'
          : 'Longer ball flights and more aerial play.',
    },
  ],
  meter(s, l) {
    return {
      label: `P1 : ${opponentLabel(s.mode, l)}`,
      value: `${s.points[0]} : ${s.points[1]}`,
    }
  },
  status(s, l) {
    return `${COURTS[s.court][l]} · ${l === 'pl' ? 'SETY' : 'SETS'} ${s.wins[0]} : ${s.wins[1]} · ${l === 'pl' ? 'WYMIANA' : 'RALLY'} ${s.rally}`
  },
  stats(s, l) {
    return [
      { label: 'P1', value: s.wins[0] },
      { label: 'P2', value: s.wins[1] },
      { label: l === 'pl' ? 'WYMIANA' : 'BEST RALLY', value: s.bestRally },
    ]
  },
  endMessage(s, l) {
    return `${s.reason === 'P2' ? opponentLabel(s.mode, l) : s.reason} ${l === 'pl' ? 'wygrywa mecz' : 'wins the match'} · ${s.wins[0]} : ${s.wins[1]}`
  },
  draw(ctx, s, l, motion) {
    const moon = s.court === 2,
      roof = s.court === 1,
      sky = ctx.createLinearGradient(0, 0, 0, FLOOR)
    sky.addColorStop(0, moon ? '#1d2c4e' : roof ? '#b293a4' : '#df9a83')
    sky.addColorStop(1, moon ? '#64758c' : '#f1d4a7')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1000, 620)
    circle(ctx, 790, 95, 45, moon ? '#ede5be' : '#ffe1ab')
    for (let layer = 0; layer < 2; layer++) {
      const points = [0, FLOOR]
      for (let x = 0; x <= 1020; x += 30)
        points.push(x, 260 + layer * 80 - Math.sin(x / 130 + layer) * 25)
      points.push(1020, FLOOR)
      polygon(
        ctx,
        points,
        moon ? '#3d526b' : roof ? '#7f8093' : layer ? '#67a7a9' : '#a0b9ac',
      )
    }
    if (roof)
      for (let n = 0; n < 14; n++) {
        const x = n * 78
        rect(ctx, x, 240 + (n % 3) * 18, 55, 260, '#4b6072')
        for (let y = 270; y < 480; y += 24)
          rect(ctx, x + 8, y, 8, 10, '#d8c49b66')
      }
    rect(
      ctx,
      0,
      FLOOR,
      1000,
      85,
      moon ? '#9ea5aa' : roof ? '#67717d' : '#d7bc8b',
    )
    for (let n = 0; n < 85; n++)
      rect(
        ctx,
        (n * 139) % 1000,
        FLOOR + 8 + ((n * 17) % 70),
        3,
        1,
        '#fff2c344',
      )
    rect(ctx, 0, FLOOR, COURT_LEFT, 85, '#685e6944')
    rect(ctx, COURT_RIGHT, FLOOR, 1000 - COURT_RIGHT, 85, '#685e6944')
    for (const x of [COURT_LEFT, COURT_RIGHT]) {
      rect(ctx, x - 2, FLOOR - 2, 4, 47, '#fff0c9')
      rect(ctx, x - 8, FLOOR - 2, 16, 4, '#fff0c9')
    }
    text(
      ctx,
      l === 'pl' ? 'AUT' : 'OUT',
      COURT_LEFT / 2,
      FLOOR + 53,
      11,
      '#60575d',
      'center',
    )
    text(
      ctx,
      l === 'pl' ? 'AUT' : 'OUT',
      (COURT_RIGHT + 1000) / 2,
      FLOOR + 53,
      11,
      '#60575d',
      'center',
    )
    if (s.pointFlash > 0) {
      ctx.strokeStyle = s.pointCall === 'out' ? '#b35d55' : '#f0d091'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(
        Math.max(17, Math.min(983, s.landing)),
        FLOOR + 5,
        15,
        5,
        0,
        0,
        Math.PI * 2,
      )
      ctx.stroke()
    }
    ctx.strokeStyle = '#fff4d7'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(COURT_LEFT, FLOOR + 4)
    ctx.lineTo(COURT_RIGHT, FLOOR + 4)
    ctx.stroke()
    bevel(ctx, 494, NET, 12, FLOOR - NET, '#9fbebc', 3)
    rect(ctx, 484, NET, 32, 5, '#f0e7c8', 2)
    ctx.strokeStyle = '#fff4d72a'
    ctx.lineWidth = 1
    for (let y = NET + 10; y < FLOOR; y += 12) {
      ctx.beginPath()
      ctx.moveTo(488, y)
      ctx.lineTo(512, y)
      ctx.stroke()
    }
    s.players.forEach((p, i) => {
      shadow(ctx, p.x, FLOOR + 3, 29, 6)
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.scale(1.4, 1.65)
      worker(
        ctx,
        0,
        0,
        i ? '#8bb8d8' : '#df8d74',
        i ? -1 : 1,
        motion ? s.elapsed : 0,
        Math.abs(p.vx) > 20,
        false,
      )
      ctx.restore()
      if (p.charge > 0) {
        rect(ctx, p.x - 23, p.y - 18, 46, 4, '#263e4f66')
        rect(ctx, p.x - 23, p.y - 18, 46 * p.charge, 4, '#ffe4a6')
      }
      rect(ctx, p.x - 22, FLOOR + 15, 44, 3, '#38526355')
      rect(
        ctx,
        p.x - 22,
        FLOOR + 15,
        (44 * p.energy) / 100,
        3,
        i ? '#a6cbdf' : '#e6ae8b',
      )
    })
    shadow(ctx, s.ball.x, FLOOR + 3, 15, 4, '#25475833')
    orb(ctx, s.ball.x, s.ball.y, 15, '#f2db9a')
    ctx.save()
    ctx.translate(s.ball.x, s.ball.y)
    ctx.rotate(motion ? s.elapsed * 3 : 0)
    ctx.strokeStyle = '#d78c72'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(0, 0, 10, -1.2, 1.2)
    ctx.stroke()
    ctx.restore()
    rect(ctx, 405, 24, 190, 62, '#173849dd', 8)
    text(
      ctx,
      `${s.points[0]} : ${s.points[1]}`,
      500,
      60,
      32,
      '#f6e7c3',
      'center',
    )
    text(
      ctx,
      `${l === 'pl' ? 'SETY' : 'SETS'} ${s.wins[0]} : ${s.wins[1]}`,
      500,
      78,
      10,
      '#b5c9c5',
      'center',
    )
    text(ctx, 'P1', 35, 39, 16, '#753e42')
    text(ctx, opponentLabel(s.mode, l), 965, 39, 16, '#314f76', 'right')
    if (s.pointFlash > 0) {
      const winner = s.lastWinner === 0 ? 'P1' : opponentLabel(s.mode, l)
      text(
        ctx,
        s.pointCall === 'out'
          ? (l === 'pl' ? 'AUT · PUNKT DLA' : 'OUT · POINT TO') + ' ' + winner
          : (l === 'pl' ? 'PUNKT DLA' : 'POINT TO') + ' ' + winner,
        500,
        148,
        19,
        s.pointCall === 'out' ? '#8f4546' : '#f7e8bd',
        'center',
      )
    }
    if (s.serve > 0 && s.pointFlash === 0)
      text(
        ctx,
        `${l === 'pl' ? 'SERWIS' : 'SERVE'} P${s.server + 1} · ${Math.ceil(s.serve)}`,
        500,
        150,
        19,
        '#fff2cf',
        'center',
      )
    if (Math.abs(COURTS[s.court].wind) > 0)
      text(
        ctx,
        COURTS[s.court].wind > 0 ? 'WIND →' : '← WIND',
        500,
        120,
        12,
        '#fff0cf',
        'center',
      )
  },
}
export const Game = createArcadeGame(definition)
