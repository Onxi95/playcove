import { opponentMode, skill, botInput } from '../kit/opponent.ts'
import type { OpponentMode } from '../kit/opponent.ts'
import { base, clamp, down, numberCarry, pressed } from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const WIDTH = 1000,
  HEIGHT = 620
export type Wall = { x: number; y: number; w: number; h: number }
export const ARENAS: Wall[][] = [
  [
    { x: 310, y: 160, w: 38, h: 120 },
    { x: 652, y: 340, w: 38, h: 120 },
  ],
  [
    { x: 300, y: 160, w: 65, h: 65 },
    { x: 635, y: 395, w: 65, h: 65 },
    { x: 475, y: 255, w: 50, h: 110 },
  ],
  [
    { x: 260, y: 120, w: 32, h: 150 },
    { x: 708, y: 350, w: 32, h: 150 },
    { x: 430, y: 180, w: 140, h: 28 },
    { x: 430, y: 412, w: 140, h: 28 },
  ],
  [
    { x: 270, y: 205, w: 130, h: 30 },
    { x: 600, y: 385, w: 130, h: 30 },
    { x: 480, y: 115, w: 40, h: 120 },
    { x: 480, y: 385, w: 40, h: 120 },
  ],
]
export type Player = {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  hp: number
  charge: number
  cooldown: number
  parry: number
  energy: number
  invulnerable: number
  held: boolean
}
export type Disc = {
  x: number
  y: number
  vx: number
  vy: number
  owner: number
  life: number
  ricochets: number
  age: number
}
export type State = ArcadeState & {
  players: Player[]
  discs: Disc[]
  walls: Wall[]
  arena: number
  wins: number[]
  lastWinner: number
  countdown: number
  orbs: Array<{ x: number; y: number; active: boolean; timer: number }>
  sparks: Array<{ x: number; y: number; life: number }>
  parries: number
  hits: number
  mode: OpponentMode
  botTimer: number
  botKeys: string[]
  reason: string
  shrink: number
  roundTime: number
}
function player(x: number, y: number, angle: number): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    angle,
    hp: 5,
    charge: 0,
    cooldown: 0,
    parry: 0,
    energy: 100,
    invulnerable: 0,
    held: false,
  }
}
export function create(p?: Progress): State {
  const arena = Math.floor(numberCarry(p, 'arena', 0, 0, 3))
  return {
    ...base(p),
    players: [player(150, 310, 0), player(850, 310, Math.PI)],
    discs: [],
    walls: ARENAS[arena],
    arena,
    wins: [numberCarry(p, 'w1', 0, 0, 9), numberCarry(p, 'w2', 0, 0, 9)],
    lastWinner: -1,
    countdown: 1.4,
    orbs: [
      { x: 500, y: 85, active: true, timer: 0 },
      { x: 500, y: 535, active: true, timer: 0 },
    ],
    sparks: [],
    parries: numberCarry(p, 'parries', 0),
    hits: numberCarry(p, 'hits', 0),
    mode: opponentMode(p?.carry.mode),
    botTimer: 0,
    botKeys: [],
    reason: '',
    shrink: 0,
    roundTime: 0,
  }
}
function overlaps(x: number, y: number, r: number, wall: Wall) {
  const nx = clamp(x, wall.x, wall.x + wall.w),
    ny = clamp(y, wall.y, wall.y + wall.h)
  return Math.hypot(x - nx, y - ny) < r
}
export function throwDisc(s: State, index: number, charge: number) {
  const p = s.players[index]
  if (p.cooldown > 0) return
  const speed = 390 + charge * 280
  s.discs.push({
    x: p.x + Math.cos(p.angle) * 29,
    y: p.y + Math.sin(p.angle) * 29,
    vx: Math.cos(p.angle) * speed,
    vy: Math.sin(p.angle) * speed,
    owner: index,
    life: 3.6,
    ricochets: 0,
    age: 0,
  })
  p.cooldown = 0.45 + charge * 0.2
  s.events.push('hit')
}
export function update(s: State, i: ArcadeInput, seconds: number) {
  if (s.phase !== 'play') return
  s.mode = opponentMode(i.mode, s.mode)
  if (s.mode !== 'local') i = computerInput(s, i, seconds)
  s.events = []
  const steps = Math.max(1, Math.ceil(seconds * 120)),
    dt = Math.min(0.1, seconds) / steps
  for (let n = 0; n < steps && s.phase === 'play'; n++) tick(s, i, dt, n === 0)
}
function tick(s: State, i: ArcadeInput, dt: number, first: boolean) {
  s.elapsed += dt
  s.countdown = Math.max(0, s.countdown - dt)
  if (s.countdown > 0) return
  s.roundTime += dt
  s.shrink = Math.min(70, Math.max(0, s.roundTime - 60) * 0.7)
  for (let index = 0; index < 2; index++) {
    const p = s.players[index],
      dx =
        Number(down(i, index ? 'arrowright' : 'd')) -
        Number(down(i, index ? 'arrowleft' : 'a')),
      dy =
        Number(down(i, index ? 'arrowdown' : 's')) -
        Number(down(i, index ? 'arrowup' : 'w')),
      length = Math.hypot(dx, dy),
      shoot = down(i, index ? 'enter' : ' ')
    p.cooldown = Math.max(0, p.cooldown - dt)
    p.parry = Math.max(0, p.parry - dt)
    p.invulnerable = Math.max(0, p.invulnerable - dt)
    p.energy = Math.min(100, p.energy + dt * 21)
    if (first && pressed(i, index ? 'shift' : 'q') && p.energy >= 55) {
      p.energy -= 55
      p.parry = 0.28
      s.events.push('boost')
    }
    if (length) {
      const desired = Math.atan2(dy, dx)
      if (!shoot) p.angle = desired
    }
    const speed = shoot ? 205 : 285
    p.vx +=
      ((dx / Math.max(1, length)) * speed - p.vx) * (1 - Math.exp(-dt * 16))
    p.vy +=
      ((dy / Math.max(1, length)) * speed - p.vy) * (1 - Math.exp(-dt * 16))
    const oldX = p.x,
      oldY = p.y
    p.x = clamp(p.x + p.vx * dt, 38 + s.shrink, WIDTH - 38 - s.shrink)
    for (const wall of s.walls) if (overlaps(p.x, p.y, 18, wall)) p.x = oldX
    p.y = clamp(p.y + p.vy * dt, 38 + s.shrink, HEIGHT - 38 - s.shrink)
    for (const wall of s.walls) if (overlaps(p.x, p.y, 18, wall)) p.y = oldY
    if (shoot) {
      p.charge = Math.min(1, p.charge + dt * 1.6)
      p.held = true
    } else if (p.held) {
      throwDisc(s, index, p.charge)
      p.charge = 0
      p.held = false
    }
  }
  for (let index = s.discs.length - 1; index >= 0; index--) {
    const d = s.discs[index]
    d.life -= dt
    d.age += dt
    const oldX = d.x,
      oldY = d.y
    d.x += d.vx * dt
    d.y += d.vy * dt
    let bounce = false
    if (d.x < 29 + s.shrink || d.x > WIDTH - 29 - s.shrink) {
      d.x = clamp(d.x, 29 + s.shrink, WIDTH - 29 - s.shrink)
      d.vx *= -1
      bounce = true
    }
    if (d.y < 29 + s.shrink || d.y > HEIGHT - 29 - s.shrink) {
      d.y = clamp(d.y, 29 + s.shrink, HEIGHT - 29 - s.shrink)
      d.vy *= -1
      bounce = true
    }
    for (const wall of s.walls)
      if (overlaps(d.x, d.y, 8, wall)) {
        if (oldX <= wall.x - 7 || oldX >= wall.x + wall.w + 7) {
          d.x = oldX
          d.vx *= -1
        } else {
          d.y = oldY
          d.vy *= -1
        }
        bounce = true
      }
    if (bounce) {
      d.ricochets++
      s.sparks.push({ x: d.x, y: d.y, life: 0.25 })
      s.events.push('hit')
    }
    for (let pindex = 0; pindex < 2; pindex++) {
      const p = s.players[pindex]
      if (
        (d.owner === pindex && d.age < 0.22) ||
        p.invulnerable > 0 ||
        Math.hypot(p.x - d.x, p.y - d.y) > 27
      )
        continue
      if (p.parry > 0) {
        const target = s.players[1 - pindex],
          angle = Math.atan2(target.y - p.y, target.x - p.x),
          speed = Math.max(500, Math.hypot(d.vx, d.vy))
        d.vx = Math.cos(angle) * speed
        d.vy = Math.sin(angle) * speed
        d.owner = pindex
        d.age = 0
        d.x = p.x + Math.cos(angle) * 32
        d.y = p.y + Math.sin(angle) * 32
        d.life = 3.2
        p.energy = Math.min(100, p.energy + 35)
        s.parries++
        s.score += 150
        s.events.push('pickup')
        break
      }
      p.hp--
      p.invulnerable = 0.65
      d.life = 0
      s.hits++
      s.score += d.ricochets ? 250 : 100
      s.sparks.push({ x: p.x, y: p.y, life: 0.4 })
      s.events.push('boost')
      if (p.hp <= 0) {
        s.lastWinner = 1 - pindex
        s.wins[s.lastWinner]++
        s.score += 600
        if (s.wins[s.lastWinner] >= 9) {
          s.phase = 'over'
          s.reason = `P${s.lastWinner + 1}`
        } else s.phase = 'choice'
      }
      break
    }
    if (d.life <= 0 || d.ricochets > 6) s.discs.splice(index, 1)
  }
  for (const orb of s.orbs) {
    if (!orb.active) {
      orb.timer -= dt
      if (orb.timer <= 0) orb.active = true
      continue
    }
    for (const p of s.players)
      if (Math.hypot(p.x - orb.x, p.y - orb.y) < 32) {
        p.energy = 100
        p.hp = Math.min(5, p.hp + 1)
        orb.active = false
        orb.timer = 12
        s.score += 50
        s.events.push('pickup')
        break
      }
  }
  for (const spark of s.sparks) spark.life -= dt
  s.sparks = s.sparks.filter((p) => p.life > 0)
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const arena = id === 'cross' ? 2 : id === 'pillars' ? 3 : (s.arena + 1) % 4
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: 3,
      elapsed: s.elapsed,
      carry: {
        mode: s.mode,
        w1: s.wins[0],
        w2: s.wins[1],
        arena,
        parries: s.parries,
        hits: s.hits,
      },
    }),
  )
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.phase === 'choice' ? s.score : s.startScore,
    lives: 3,
    elapsed: s.elapsed,
    carry: {
      mode: s.mode,
      w1: s.wins[0],
      w2: s.wins[1],
      arena: s.arena,
      parries: s.parries,
      hits: s.hits,
    },
  }
}

function computerInput(
  s: State,
  input: ArcadeInput,
  seconds: number,
): ArcadeInput {
  const p = s.players[1],
    target = s.players[0],
    level = skill(s.mode),
    dt = Math.min(0.1, seconds)
  s.botTimer -= dt
  const clear = (a: { x: number; y: number }, b: { x: number; y: number }) => {
    for (let t = 0.08; t < 1; t += 0.08)
      if (
        s.walls.some((w) =>
          overlaps(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 9, w),
        )
      )
        return false
    return true
  }
  if (s.botTimer <= 0) {
    s.botTimer = [0.28, 0.16, 0.075][level]
    const distance = Math.hypot(target.x - p.x, target.y - p.y),
      angle = Math.atan2(target.y - p.y, target.x - p.x)
    let desired = angle
    if (distance < 280)
      desired += (Math.PI / 2) * (Math.floor(s.roundTime / 5) % 2 ? 1 : -1)
    const core = s.orbs
      .filter((o) => o.active)
      .sort(
        (a, b) =>
          Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y),
      )[0]
    if (core && (p.hp < 4 || p.energy < 45))
      desired = Math.atan2(core.y - p.y, core.x - p.x)
    if (p.cooldown <= 0.02 && !p.held) desired = angle
    let best = -Infinity,
      dx = 0,
      dy = 0
    for (const [x, y] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const len = Math.hypot(x, y),
        nx = p.x + (x / len) * 55,
        ny = p.y + (y / len) * 55
      if (
        nx < 45 + s.shrink ||
        nx > 955 - s.shrink ||
        ny < 45 + s.shrink ||
        ny > 575 - s.shrink ||
        s.walls.some((w) => overlaps(nx, ny, 22, w))
      )
        continue
      const dot = (Math.cos(desired) * x) / len + (Math.sin(desired) * y) / len
      if (dot > best) {
        best = dot
        dx = x
        dy = y
      }
    }
    s.botKeys = []
    if (dx > 0) s.botKeys.push('arrowright')
    if (dx < 0) s.botKeys.push('arrowleft')
    if (dy > 0) s.botKeys.push('arrowdown')
    if (dy < 0) s.botKeys.push('arrowup')
  }
  const held = [...s.botKeys],
    tapped: string[] = []
  const angle = Math.atan2(target.y - p.y, target.x - p.x),
    error = Math.atan2(Math.sin(angle - p.angle), Math.cos(angle - p.angle))
  if (p.held) {
    if (p.charge < [0.32, 0.5, 0.7][level]) held.push('enter')
  } else if (
    p.cooldown === 0 &&
    Math.abs(error) < [0.3, 0.23, 0.18][level] &&
    clear(p, target)
  )
    held.push('enter')
  if (p.energy >= 55) {
    const threat = s.discs.some((d) => {
      if (d.owner === 1 && d.age < 0.22) return false
      const speed = d.vx * d.vx + d.vy * d.vy,
        time = ((p.x - d.x) * d.vx + (p.y - d.y) * d.vy) / speed
      return (
        time > 0 &&
        time < [0.065, 0.12, 0.2][level] &&
        Math.hypot(d.x + d.vx * time - p.x, d.y + d.vy * time - p.y) < 27
      )
    })
    if (threat) tapped.push('shift')
  }
  return botInput(input, held, tapped)
}
