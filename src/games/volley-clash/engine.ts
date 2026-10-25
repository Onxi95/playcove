import { opponentMode, skill, botInput } from '../kit/opponent.ts'
import type { OpponentMode } from '../kit/opponent.ts'
import { base, clamp, down, numberCarry, pressed } from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const WIDTH = 1000,
  HEIGHT = 620,
  FLOOR = 535,
  NET = 355
export const COURTS = [
  { en: 'SUNSET BEACH', pl: 'PLAŻA O ZACHODZIE', wind: 0, gravity: 920 },
  { en: 'ROOFTOP CROSSWIND', pl: 'WIATR NA DACHU', wind: 100, gravity: 920 },
  { en: 'MOON GARDEN', pl: 'KSIĘŻYCOWY OGRÓD', wind: 0, gravity: 700 },
  { en: 'TIDAL BREEZE', pl: 'MORSKA BRYZA', wind: -75, gravity: 1040 },
]
export type Player = {
  x: number
  y: number
  vx: number
  vy: number
  ground: boolean
  charge: number
  hit: number
  dash: number
  energy: number
  buffer: number
}
export type State = ArcadeState & {
  players: Player[]
  ball: {
    x: number
    y: number
    vx: number
    vy: number
    spin: number
    last: number
    contact: number
  }
  points: number[]
  wins: number[]
  serve: number
  server: number
  court: number
  rally: number
  bestRally: number
  lastWinner: number
  pointFlash: number
  mode: OpponentMode
  bot: { timer: number; target: number; jump: number }
  reason: string
}
function player(x: number): Player {
  return {
    x,
    y: FLOOR - 60,
    vx: 0,
    vy: 0,
    ground: true,
    charge: 0,
    hit: 0,
    dash: 0,
    energy: 100,
    buffer: 0,
  }
}
export function create(p?: Progress): State {
  const s: State = {
    ...base(p),
    players: [player(230), player(770)],
    ball: { x: 230, y: 350, vx: 0, vy: 0, spin: 0, last: 0, contact: 0 },
    points: [
      numberCarry(p, 'p1', 0, 0, 1000),
      numberCarry(p, 'p2', 0, 0, 1000),
    ],
    wins: [numberCarry(p, 'w1', 0, 0, 3), numberCarry(p, 'w2', 0, 0, 3)],
    serve: 1.3,
    server: numberCarry(p, 'server', 0, 0, 1),
    court: numberCarry(p, 'court', 0, 0, 3),
    rally: 0,
    bestRally: numberCarry(p, 'bestRally', 0),
    lastWinner: -1,
    pointFlash: 0,
    mode: opponentMode(p?.carry.mode),
    bot: { timer: 0, target: 770, jump: 0 },
    reason: '',
  }
  s.ball.x = s.server ? 770 : 230
  return s
}
export function award(s: State, winner: number) {
  s.points[winner]++
  s.score += 100 + Math.min(1000, s.rally * 20)
  s.lastWinner = winner
  s.server = winner
  s.pointFlash = 1
  s.events.push('point')
  s.bestRally = Math.max(s.bestRally, s.rally)
  s.rally = 0
  if (
    s.points[winner] >= 11 &&
    (s.points[winner] - s.points[1 - winner] >= 2 || s.points[winner] >= 17)
  ) {
    s.wins[winner]++
    if (s.wins[winner] >= 3) {
      s.phase = 'over'
      s.reason = `P${winner + 1}`
      s.score += 3000
    } else {
      s.phase = 'choice'
      s.score += 1000
    }
  } else {
    for (let i = 0; i < 2; i++) s.players[i] = player(i ? 770 : 230)
    s.ball = {
      x: winner ? 770 : 230,
      y: 350,
      vx: 0,
      vy: 0,
      spin: 0,
      last: winner,
      contact: 0,
    }
    s.serve = 1.3
  }
}
export function update(s: State, input: ArcadeInput, seconds: number) {
  if (s.phase !== 'play') return
  s.mode = opponentMode(input.mode, s.mode)
  if (s.mode !== 'local') input = computerInput(s, input, seconds)
  s.events = []
  const steps = Math.max(1, Math.ceil(seconds * 120)),
    dt = Math.min(0.1, seconds) / steps
  for (let step = 0; step < steps && s.phase === 'play'; step++)
    tick(s, input, dt, step === 0)
}
function tick(s: State, input: ArcadeInput, dt: number, first: boolean) {
  s.elapsed += dt
  s.pointFlash = Math.max(0, s.pointFlash - dt)
  const court = COURTS[s.court]
  for (let index = 0; index < 2; index++) {
    const p = s.players[index],
      right = down(input, index ? 'arrowright' : 'd'),
      left = down(input, index ? 'arrowleft' : 'a'),
      strike = down(input, index ? 'enter' : ' '),
      dx = Number(right) - Number(left)
    p.hit = Math.max(0, p.hit - dt)
    p.dash = Math.max(0, p.dash - dt)
    p.energy = Math.min(100, p.energy + dt * 23)
    p.buffer =
      first && pressed(input, index ? 'arrowup' : 'w')
        ? 0.14
        : Math.max(0, p.buffer - dt)
    if (first && pressed(input, index ? 'shift' : 'q') && p.energy >= 65) {
      p.dash = 0.2
      p.energy -= 65
      s.events.push('boost')
    }
    p.vx +=
      (dx * (p.dash > 0 ? 620 : 330) - p.vx) *
      (1 - Math.exp(-dt * (p.ground ? 18 : 9)))
    if (p.buffer > 0 && p.ground) {
      p.vy = -555
      p.ground = false
      p.buffer = 0
      s.events.push('hit')
    }
    p.x = clamp(p.x + p.vx * dt, index ? 529 : 22, index ? 978 : 471)
    p.y += p.vy * dt
    p.vy += 1250 * dt
    if (p.y >= FLOOR - 60) {
      p.y = FLOOR - 60
      p.vy = 0
      p.ground = true
    }
    if (strike) p.charge = Math.min(1, p.charge + dt * 2.2)
    else if (p.charge > 0) {
      p.hit = 0.24
      p.charge = 0
    }
  }
  if (s.serve > 0) {
    s.serve = Math.max(0, s.serve - dt)
    const p = s.players[s.server]
    s.ball.x = p.x
    s.ball.y = p.y - 80
    if (s.serve === 0) {
      s.ball.vx = s.server ? -310 : 310
      s.ball.vy = -600
      s.ball.last = s.server
    }
    s.ball.contact = 0
    return
  }
  const b = s.ball,
    previousX = b.x,
    previousY = b.y
  b.contact = Math.max(0, b.contact - dt)
  b.vx += (court.wind * Math.sin(s.elapsed * 0.6) + b.spin * 0.3) * dt
  b.spin *= Math.exp(-dt * 0.8)
  b.vy += court.gravity * dt
  b.x += b.vx * dt
  b.y += b.vy * dt
  if (b.x < 15 || b.x > WIDTH - 15) {
    b.x = clamp(b.x, 15, WIDTH - 15)
    b.vx *= -0.8
  }
  if (b.y < 20) {
    b.y = 20
    b.vy = Math.abs(b.vy) * 0.75
  }
  if (b.y > NET - 15 && Math.abs(b.x - 500) < 22) {
    if (previousY <= NET - 15 && b.vy > 0) {
      b.y = NET - 15
      b.vy = -Math.abs(b.vy) * 0.7
      b.vx += Math.sign(b.x - 500 || b.vx) * 45
    } else {
      b.x = previousX < 500 ? 477 : 523
      b.vx = Math.sign(b.x - 500) * Math.max(80, Math.abs(b.vx) * 0.7)
    }
  }
  for (let index = 0; index < 2; index++) {
    const p = s.players[index],
      dx = b.x - p.x,
      dy = b.y - (p.y + 20),
      distance = Math.hypot(dx, dy),
      attacking = down(input, index ? 'enter' : ' ') || p.hit > 0
    if (distance < 48 && b.contact === 0) {
      const toward = index ? -1 : 1,
        low = down(input, index ? 'arrowdown' : 's'),
        forward =
          Number(down(input, index ? 'arrowright' : 'd')) -
          Number(down(input, index ? 'arrowleft' : 'a'))
      b.x = p.x + (dx / Math.max(1, distance)) * 49
      b.y = p.y + 20 + (dy / Math.max(1, distance)) * 49
      b.vx =
        toward * (attacking ? 285 + 150 * p.charge : 170) +
        p.vx * 0.36 +
        forward * 65
      b.vy =
        attacking && !p.ground && low
          ? -80
          : -(attacking ? 590 : 510) + (low ? 95 : 0)
      b.spin = p.vx * 0.25
      b.last = index
      b.contact = 0.16
      s.rally++
      s.bestRally = Math.max(s.bestRally, s.rally)
      p.hit = 0.12
      p.charge = 0
      p.energy = Math.min(100, p.energy + 10)
      s.events.push('hit')
    }
  }
  b.vx = clamp(b.vx, -600, 600)
  b.vy = clamp(b.vy, -750, 900)
  if (b.y >= FLOOR - 15) award(s, b.x < 500 ? 1 : 0)
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const court = id === 'breeze' ? 1 : id === 'moon' ? 2 : (s.court + 1) % 4
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: 3,
      elapsed: s.elapsed,
      carry: {
        w1: s.wins[0],
        w2: s.wins[1],
        court,
        bestRally: s.bestRally,
        server: s.lastWinner,
        mode: s.mode,
      },
    }),
  )
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: 3,
    elapsed: s.elapsed,
    carry: {
      p1: s.points[0],
      p2: s.points[1],
      w1: s.wins[0],
      w2: s.wins[1],
      court: s.court,
      server: s.server,
      bestRally: s.bestRally,
      mode: s.mode,
    },
  }
}

function computerInput(
  s: State,
  input: ArcadeInput,
  seconds: number,
): ArcadeInput {
  const p = s.players[1],
    b = s.ball,
    level = skill(s.mode),
    dt = Math.min(0.1, seconds),
    incoming = b.x > 500 || b.vx > 70
  s.bot.timer -= dt
  s.bot.jump = Math.max(0, s.bot.jump - dt)
  if (s.bot.timer <= 0) {
    s.bot.timer = [0.3, 0.18, 0.08][level]
    const gravity = COURTS[s.court].gravity,
      time = clamp(
        (-b.vy +
          Math.sqrt(Math.max(0, b.vy * b.vy + 2 * gravity * (430 - b.y)))) /
          gravity,
        0.05,
        2,
      )
    let x =
      b.x +
      b.vx * time +
      COURTS[s.court].wind * Math.sin(s.elapsed * 0.6) * time * time * 0.5
    while (x < 15 || x > 985) x = x < 15 ? 30 - x : 1970 - x
    s.bot.target = incoming
      ? clamp(x + Math.sin(s.elapsed * 1.7) * [22, 9, 2][level], 545, 955)
      : 755
  }
  const held: string[] = [],
    tapped: string[] = []
  if (p.x < s.bot.target - 10) held.push('arrowright')
  if (p.x > s.bot.target + 10) held.push('arrowleft')
  if (incoming && Math.abs(b.x - p.x) < 330) held.push('enter')
  if (
    incoming &&
    p.ground &&
    s.bot.jump === 0 &&
    Math.abs(b.x - p.x) < [45, 70, 85][level] &&
    b.vy > 30 &&
    b.y > p.y - 125 &&
    b.y < p.y + 5
  ) {
    s.bot.jump = 0.32
    tapped.push('arrowup')
  }
  if (s.bot.jump > 0) held.push('arrowup')
  if (
    level > 0 &&
    p.energy > 80 &&
    Math.abs(p.x - s.bot.target) > 150 &&
    b.y > 300 &&
    b.vy > 0
  )
    tapped.push('shift')
  return botInput(input, held, tapped)
}
