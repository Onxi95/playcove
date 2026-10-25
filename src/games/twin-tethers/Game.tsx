import type { TouchGroup } from '../kit/TouchControls.tsx'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { circle, rect, text } from '../kit/arcade.ts'
import { bevel, creature, polygon, shadow } from '../kit/art.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { create, update, choose, save, platforms, ROOMS } from './engine.ts'
import type { State } from './engine.ts'
const definition: ArcadeDefinition<State> = {
  id: 'twin-tethers',
  name: 'TWIN TETHERS',
  width: 1000,
  height: 620,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (_, l): TouchGroup[] => [
    {
      label: 'P1',
      buttons: [
        ['←', 'a'],
        ['→', 'd'],
        ['↑', 'w'],
        ['↓', 's'],
        [l === 'pl' ? 'Linka' : 'Tether', ' '],
      ],
    },
    {
      label: 'P2',
      buttons: [
        ['←', 'arrowleft'],
        ['→', 'arrowright'],
        ['↑', 'arrowup'],
        ['↓', 'arrowdown'],
        [l === 'pl' ? 'Linka' : 'Tether', 'enter'],
      ],
    },
  ],
  tagline: {
    en: 'Stay close. Make the leap together.',
    pl: 'Trzymajcie się razem. Skaczcie wspólnie.',
  },
  help: {
    en: 'Co-op. P1: A D move, W jump, Space tether-hop. P2: ← → move, ↑ jump, Enter tether-hop. Hold jump for height; ↓ / S drops through platforms. Collect your own color stars and latch both matching pads to open the exit. Tether-hops pull you toward your partner. New rooms add lasers, moving lifts, and gusts. No time limit.',
    pl: 'Współpraca. P1: A D ruch, W skok, spacja: skok na lince. P2: ← → ruch, ↑ skok, Enter: skok na lince. Przytrzymaj skok, by skoczyć wyżej; ↓ / S opuszcza platformę. Zbieraj swój kolor gwiazd i aktywuj oba przyciski. Linka przyciąga do partnera. Dalej: lasery, windy i wiatr. Bez limitu czasu.',
  },
  choices: (_, l) => [
    {
      id: 'next',
      title: l === 'pl' ? 'Dalsza droga' : 'Continue the journey',
      detail:
        l === 'pl'
          ? 'Nowy pokój. Co trzeci etap przywraca życie.'
          : 'New room. Every third stage restores a life.',
    },
    {
      id: 'spires',
      title: l === 'pl' ? 'Bliźniacze wieże' : 'Twin spires',
      detail:
        l === 'pl'
          ? 'Wysokie podejścia i wspólne skoki.'
          : 'Higher approaches and coordinated jumps.',
    },
    {
      id: 'sky',
      title: l === 'pl' ? 'Podniebne rusztowanie' : 'Sky scaffold',
      detail:
        l === 'pl'
          ? 'Dodatkowe piętro i dłuższa trasa.'
          : 'An extra tier and a longer route.',
    },
  ],
  status(s, l) {
    return `${ROOMS[s.room][l]} · ${l === 'pl' ? 'GWIAZDY' : 'STARS'} ${s.stars.filter((p) => p.taken).length}/${s.stars.length} · ${l === 'pl' ? 'PRZYCISKI' : 'PADS'} ${s.pads.filter((p) => p.active).length}/2`
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Pokój ${s.stage}. ${s.reason === 'laser' ? 'Laser był aktywny. Poczekaj na zgaśnięcie.' : 'Partner spadł. Użyj skoku na lince przed upadkiem.'}`
      : `Room ${s.stage}. ${s.reason === 'laser' ? 'The beam was live. Wait for its off phase.' : 'Your partner fell. Use a tether-hop before dropping too far.'}`
  },
  stats(s, l) {
    return [
      { label: l === 'pl' ? 'POKÓJ' : 'ROOM', value: s.stage },
      {
        label: l === 'pl' ? 'SKOKI NA LINCE' : 'TETHER HOPS',
        value: s.rescues,
      },
      { label: l === 'pl' ? 'UPADKI' : 'FALLS', value: s.deaths },
    ]
  },
  draw(ctx, s, l, motion) {
    const sky = ctx.createLinearGradient(0, 0, 0, 620)
    sky.addColorStop(0, '#233d53')
    sky.addColorStop(1, '#829f91')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 1000, 620)
    circle(ctx, 800, 95, 40, '#ead7ac55')
    for (let layer = 0; layer < 3; layer++) {
      const points = [0, 620]
      for (let x = 0; x <= 1020; x += 25)
        points.push(x, 250 + layer * 80 - Math.sin(x / 110 + layer) * 35)
      points.push(1020, 620)
      polygon(ctx, points, ['#597f83', '#4a7372', '#3f6264'][layer])
    }
    for (let column = 0; column < 6; column++) {
      const x = column * 190 - 20
      bevel(ctx, x, 90, 24, 550, '#76918b22', 3)
      ctx.strokeStyle = '#b7c4a411'
      ctx.lineWidth = 8
      ctx.beginPath()
      ctx.arc(x + 90, 240, 78, Math.PI, 0)
      ctx.stroke()
    }
    const path = platforms(s)
    for (const p of path) {
      shadow(ctx, p.x + p.w / 2, p.y + 15, p.w * 0.48, 8)
      bevel(ctx, p.x, p.y, p.w, p.y === 540 ? 80 : 17, '#6f8a82', 4)
      for (let x = p.x + 5; x < p.x + p.w - 7; x += 17) {
        rect(ctx, x, p.y - 3, 12, 6, '#a0b88e', 2)
        if (Math.floor(x / 17) % 3 === 0)
          rect(ctx, x + 3, p.y + 2, 3, 7, '#8ba381', 1)
      }
    }
    const open = s.pads.every((p) => p.active),
      exitOpen = open && s.stars.every((star) => star.taken)
    bevel(ctx, 875, 410, 20, 130, open ? '#708c7d44' : '#c4a477', 4)
    rect(ctx, 928, 460, 55, 78, exitOpen ? '#9ac6a244' : '#304f5f88', 24)
    text(
      ctx,
      exitOpen ? '↑' : '●',
      956,
      505,
      28,
      exitOpen ? '#e6ecc3' : '#809b96',
      'center',
    )
    text(
      ctx,
      l === 'pl' ? 'RAZEM' : 'TOGETHER',
      956,
      555,
      9,
      '#d3dfbf',
      'center',
    )
    for (const pad of s.pads) {
      bevel(
        ctx,
        pad.x - 21,
        pad.y - 5,
        42,
        6,
        pad.active ? '#cbe1ae' : pad.owner ? '#87b9dc' : '#df9e83',
        2,
      )
      text(
        ctx,
        pad.active ? '✓' : `P${pad.owner + 1}`,
        pad.x,
        pad.y - 15,
        11,
        '#e7e5c7',
        'center',
      )
    }
    for (const star of s.stars)
      if (!star.taken) {
        const pulse = motion ? Math.sin(s.roomTime * 4 + star.x) * 2 : 0,
          points: number[] = []
        for (let n = 0; n < 10; n++) {
          const angle = -Math.PI / 2 + (n * Math.PI) / 5,
            r = n % 2 ? 5 : 12 + pulse
          points.push(
            star.x + Math.cos(angle) * r,
            star.y + Math.sin(angle) * r,
          )
        }
        circle(ctx, star.x, star.y, 18, '#d9dcb315')
        polygon(ctx, points, star.owner ? '#a4d3e8' : '#efbc9a')
      }
    const a = s.players[0],
      b = s.players[1],
      distance = Math.hypot(a.x - b.x, a.y - b.y)
    ctx.strokeStyle = distance > 230 ? '#ecc291' : '#c7d9beaa'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(a.x, a.y + 18)
    ctx.quadraticCurveTo(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2 + 18 + Math.max(0, 200 - distance) * 0.35,
      b.x,
      b.y + 18,
    )
    ctx.stroke()
    s.players.forEach((p, index) => {
      ctx.globalAlpha =
        p.invulnerable > 0 && motion
          ? 0.5 + Math.abs(Math.sin(s.elapsed * 10)) * 0.5
          : 1
      creature(
        ctx,
        p.x,
        p.y,
        index ? '#91c3db' : '#dfa88e',
        p.vx < 0 ? -1 : 1,
        motion ? s.elapsed : 0,
        -1,
      )
      ctx.globalAlpha = 1
      rect(
        ctx,
        p.x - 18,
        p.y + 45,
        (36 * p.energy) / 100,
        3,
        index ? '#a6d6e5' : '#e9c29e',
        1,
      )
      text(ctx, `P${index + 1}`, p.x, p.y - 12, 10, '#f1e4c2', 'center')
    })
    if (s.stage >= 4) {
      bevel(ctx, 509, 226, 22, 20, '#8e9a8e', 4)
      if (s.laser) {
        rect(ctx, 516, 250, 8, 290, s.laser === 1 ? '#efcd8422' : '#f2bd8c88')
        rect(ctx, 519, 250, 2, 290, s.laser === 1 ? '#efcd8444' : '#fff1c1')
      }
      text(
        ctx,
        s.laser === 2 ? '!' : s.laser === 1 ? '···' : '✓',
        520,
        215,
        16,
        '#e7d5a7',
        'center',
      )
    }
    rect(ctx, 338, 21, 324, 60, '#193b4cdd', 8)
    text(ctx, ROOMS[s.room][l], 500, 44, 15, '#e4dfbb', 'center')
    text(
      ctx,
      `${l === 'pl' ? 'GWIAZDY' : 'STARS'} ${s.stars.filter((p) => p.taken).length}/${s.stars.length} · ${l === 'pl' ? 'PRZYCISKI' : 'PADS'} ${s.pads.filter((p) => p.active).length}/2`,
      500,
      66,
      12,
      '#b4cec2',
      'center',
    )
    if (s.checkpointFlash > 0)
      text(
        ctx,
        l === 'pl' ? 'PUNKT KONTROLNY' : 'CHECKPOINT',
        500,
        110,
        16,
        '#e6e8bc',
        'center',
      )
    if (s.wind)
      text(
        ctx,
        s.wind > 0 ? 'WIND →' : '← WIND',
        500,
        137,
        11,
        '#d1dfc5',
        'center',
      )
  },
}
export const Game = createArcadeGame(definition)
