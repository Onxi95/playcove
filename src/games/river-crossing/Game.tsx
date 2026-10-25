import { bevel, shadow } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import {
  COLS,
  HOMES,
  RIVER,
  ROAD,
  choose,
  create,
  laneObjects,
  laneSpeed,
  save,
  update,
} from './engine.ts'
import type { State } from './engine.ts'
const C = 44,
  W = COLS * C,
  H = 14 * C
const def: ArcadeDefinition<State> = {
  id: 'river-crossing',
  name: 'RIVER CROSSING',
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
        [l === 'pl' ? 'Cofnij' : 'Rewind', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'Read the traffic. Ride the river.',
    pl: 'Czytaj ruch. Wykorzystaj rzekę.',
  },
  help: {
    en: 'Arrows / WASD hop. Space hops forward. Ride logs across the river and fill five homes. X rewinds to the last bank; leaves refill it.',
    pl: 'Strzałki / WASD: skoki. Spacja: skok w przód. Przepłyń na kłodach i zajmij pięć domków. X cofa na ostatni brzeg; liście odnawiają cofnięcie.',
  },
  choices: (_, locale) =>
    locale === 'pl'
      ? [
          {
            id: 'banks',
            title: 'Spokojne brzegi',
            detail: 'Normalny nurt i kolejne pięć przepraw.',
          },
          {
            id: 'rapids',
            title: 'Szybsze nurty',
            detail: 'Szybsze kłody i ruch uliczny.',
          },
        ]
      : [
          {
            id: 'banks',
            title: 'Quiet banks',
            detail: 'Steady currents and five new crossings.',
          },
          {
            id: 'rapids',
            title: 'Fast currents',
            detail: 'Faster logs and traffic.',
          },
        ],
  draw(ctx, s, locale, motion) {
    backdrop(ctx, W, H, '#2d5145')
    for (let i = 0; i < 95; i++) {
      const x = (i * 71) % W,
        y = (i * 137) % H
      rect(ctx, x, y, 2, 4, '#9dc08222')
      if (i % 8 === 0) circle(ctx, x + 3, y, 2, '#dbbe7d66')
    }
    for (let row = 0; row < 14; row++) {
      if (ROAD.includes(row)) {
        rect(ctx, 0, row * C, W, C, '#35444e')
        rect(ctx, 0, row * C + 3, W, 2, '#21353f66')
        for (let i = 0; i < 40; i++)
          rect(
            ctx,
            (i * 53 + row * 23) % W,
            row * C + ((i * 17) % C),
            1,
            1,
            '#a3b7ae22',
          )
        for (let x = 0; x < W; x += 70)
          rect(ctx, x, row * C + 1, 34, 2, '#748480')
      } else if (RIVER.includes(row)) {
        const water = ctx.createLinearGradient(0, row * C, 0, (row + 1) * C)
        water.addColorStop(0, '#214d66')
        water.addColorStop(1, '#2a7180')
        ctx.fillStyle = water
        ctx.fillRect(0, row * C, W, C)
        for (let i = 0; i < 10; i++) {
          const wx = (i * 79 + s.flow * laneSpeed(s, row) * 9 + W * 20) % W
          ctx.strokeStyle = '#92c9bf22'
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.ellipse(wx, row * C + 31, 13, 3, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
        for (let i = 0; i < 12; i++)
          rect(
            ctx,
            (((i * 69 + s.flow * 8 * (row % 2 ? 1 : -1)) % W) + W) % W,
            row * C + 17,
            20,
            2,
            '#3e7180',
          )
      }
      if (ROAD.includes(row) || RIVER.includes(row))
        for (const o of laneObjects(s, row)) {
          if (o.submerged) {
            ctx.globalAlpha = 0.25
            circle(ctx, (o.x + o.width / 2) * C, row * C + 22, 12, '#a2c4bf')
            ctx.globalAlpha = 1
            continue
          }
          const x = o.x * C,
            y = row * C + 7,
            w = o.width * C
          if (RIVER.includes(row)) {
            shadow(ctx, x + w / 2, y + 29, w / 2, 4, '#102d3b55')
            bevel(ctx, x, y, w, 30, o.turtle ? '#79aa82' : '#b4966d', 12)
            if (!o.turtle) {
              ctx.strokeStyle = '#694e3f'
              ctx.lineWidth = 2
              ctx.beginPath()
              ctx.ellipse(x + 9, y + 15, 5, 10, 0, 0, Math.PI * 2)
              ctx.ellipse(x + w - 9, y + 15, 5, 10, 0, 0, Math.PI * 2)
              ctx.stroke()
            }
            if (o.turtle) {
              for (let i = 0; i < 3; i++)
                circle(
                  ctx,
                  x + 20 + i * 39,
                  y + 15,
                  13,
                  o.warning && motion ? '#d2bb74' : '#537c64',
                )
            } else {
              rect(ctx, x + 13, y + 6, w - 26, 2, '#d4ab7b')
              rect(ctx, x + 13, y + 21, w - 26, 2, '#815d4a')
            }
          } else {
            const color = ['#df9c74', '#9fbfbd', '#c5abdb', '#d4c57a'][row % 4]
            shadow(ctx, x + w / 2, y + 30, w / 2, 4)
            bevel(ctx, x, y, w, 29, color, 7)
            rect(ctx, x + 3, y + 6, 3, 7, '#f4dfac', 1)
            rect(ctx, x + 3, y + 19, 3, 7, '#f4dfac', 1)
            rect(ctx, x + w - 6, y + 6, 3, 6, '#e49b81', 1)
            rect(ctx, x + w - 6, y + 18, 3, 6, '#e49b81', 1)
            rect(ctx, x + w * 0.26, y + 4, w * 0.38, 21, '#355264', 3)
            rect(ctx, x + w * 0.3, y + 5, w * 0.29, 2, '#aac8bd', 1)
            rect(ctx, x + w * 0.4, y + 4, w * 0.09, 21, color, 1)
            rect(ctx, x + 8, y - 3, 14, 5, '#152830', 2)
            rect(ctx, x + w - 22, y + 27, 14, 5, '#152830', 2)
          }
        }
    }
    for (let i = 0; i < 5; i++) {
      rect(
        ctx,
        HOMES[i] * C + 3,
        3,
        38,
        35,
        s.homes[i] ? '#e5d486' : '#234739',
        9,
      )
      if (s.homes[i])
        text(ctx, '✓', HOMES[i] * C + 22, 28, 24, '#385344', 'center')
    }
    if (!s.leafTaken) {
      circle(ctx, s.leafX * C + 22, 3 * C + 22, 9, '#c7e18c')
      text(ctx, '↶', s.leafX * C + 22, 3 * C + 28, 17, '#3e643e', 'center')
    }
    const x = s.x * C + 22,
      y = s.y * C + 22 - (s.hop < 1 ? Math.sin(s.hop * Math.PI) * 9 : 0)
    ctx.globalAlpha =
      s.invulnerable > 0 && motion
        ? 0.4 + Math.abs(Math.sin(s.elapsed * 12)) * 0.6
        : 1
    shadow(ctx, x, y + 14, 15, 5)
    for (const dx of [-11, 11])
      for (const dy of [-8, 8]) circle(ctx, x + dx, y + dy, 5, '#8dc38b')
    rect(ctx, x - 10, y - 10, 20, 21, '#b8df92', 7)
    circle(ctx, x - 5, y - 9, 4, '#e8f3bd')
    circle(ctx, x + 5, y - 9, 4, '#e8f3bd')
    circle(ctx, x - 5, y - 10, 1.8, '#26493f')
    circle(ctx, x + 5, y - 10, 1.8, '#26493f')
    ctx.globalAlpha = 1
    text(
      ctx,
      `${locale === 'pl' ? 'DOMKI' : 'HOMES'} ${s.homes.filter(Boolean).length}/5  ·  ↶ ${s.rewinds}`,
      W / 2,
      H - 12,
      12,
      '#e6efd2',
      'center',
    )
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Brzeg ${s.stage}. ${s.reason === 'traffic' ? 'Potrąciło cię auto.' : s.reason === 'home' ? 'Ten domek jest zajęty albo poza zasięgiem.' : 'Zabrakło bezpiecznej kłody.'} X cofa na bezpieczny brzeg.`
      : `Bank ${s.stage}. ${s.reason === 'traffic' ? 'Traffic caught you.' : s.reason === 'home' ? 'That home was occupied or out of reach.' : 'You lost your footing on the river.'} X rewinds to the last safe bank.`
  },
  status(s, locale) {
    return `${locale === 'pl' ? 'BRZEG' : 'BANK'} ${s.stage} · ${s.homes.filter(Boolean).length}/5 · ${locale === 'pl' ? 'COFNIĘCIA' : 'REWINDS'} ${s.rewinds}`
  },
}
export const Game = createArcadeGame(def)
