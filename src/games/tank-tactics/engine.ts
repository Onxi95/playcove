import { opponentMode, skill, botInput } from '../kit/opponent.ts'
import type { OpponentMode } from '../kit/opponent.ts'
import {
  base,
  clamp,
  down,
  numberCarry,
  pressed,
  random,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const WIDTH = 1000,
  HEIGHT = 620,
  STEP = 4
export const LANDSCAPES = [
  { en: 'RED ROCK BASIN', pl: 'CZERWONA KOTLINA', hill: 55, wind: 20 },
  { en: 'ALPINE RIDGE', pl: 'ALPEJSKA GRAŃ', hill: 110, wind: 65 },
  { en: 'DUNE SEA', pl: 'MORZE WYDM', hill: 80, wind: 100 },
  { en: 'LUNAR CALDERA', pl: 'KSIĘŻYCOWA KALDERA', hill: 95, wind: 0 },
]
export type Tank = {
  x: number
  y: number
  angle: number
  power: number
  hp: number
  weapon: number
  heavy: number
  skipper: number
}
export type Projectile = {
  x: number
  y: number
  vx: number
  vy: number
  owner: number
  kind: number
  bounces: number
  age: number
}
export type State = ArcadeState & {
  terrain: number[]
  tanks: Tank[]
  turn: number
  shot: Projectile | null
  resolve: number
  wind: number
  landscape: number
  wins: number[]
  lastWinner: number
  explosions: Array<{ x: number; y: number; r: number; life: number }>
  shots: number
  mode: OpponentMode
  botTimer: number
  botKeys: string[]
  botPlan: { angle: number; power: number; weapon: number } | null
  reason: string
}
export function ground(s: State, x: number) {
  const at = clamp(x / STEP, 0, s.terrain.length - 1),
    left = Math.floor(at),
    right = Math.min(s.terrain.length - 1, left + 1)
  return s.terrain[left] + (s.terrain[right] - s.terrain[left]) * (at - left)
}
export function create(p?: Progress): State {
  const landscape = Math.floor(numberCarry(p, 'landscape', 0, 0, 3)),
    profile = LANDSCAPES[landscape],
    stage = p?.stage ?? 1
  const s: State = {
    ...base(p),
    terrain: Array.from({ length: 251 }, (_, n) =>
      Math.round(
        420 +
          Math.sin(n / 29 + stage) * profile.hill +
          Math.sin(n / 12) * profile.hill * 0.3,
      ),
    ),
    tanks: [],
    turn: numberCarry(p, 'turn', 0, 0, 1),
    shot: null,
    resolve: 0,
    wind: numberCarry(
      p,
      'wind',
      (stage % 2 ? 1 : -1) * profile.wind,
      -150,
      150,
    ),
    landscape,
    wins: [numberCarry(p, 'w1', 0, 0, 7), numberCarry(p, 'w2', 0, 0, 7)],
    lastWinner: -1,
    explosions: [],
    shots: numberCarry(p, 'shots', 0),
    mode: opponentMode(p?.carry.mode),
    botTimer: 0,
    botKeys: [],
    botPlan: null,
    reason: '',
  }
  try {
    const saved: unknown = JSON.parse(
      typeof p?.carry.terrain === 'string' ? p.carry.terrain : 'null',
    )
    if (
      Array.isArray(saved) &&
      saved.length === 251 &&
      saved.every(
        (v) =>
          typeof v === 'number' && Number.isFinite(v) && v >= 220 && v <= 575,
      )
    )
      s.terrain = saved
  } catch {}
  s.tanks = [0, 1].map((index) => ({
    x: index ? 850 : 150,
    y: 0,
    angle: numberCarry(p, `angle${index}`, 55, 10, 85),
    power: numberCarry(p, `power${index}`, 65, 20, 100),
    hp: numberCarry(p, `hp${index}`, 5, 0, 5),
    weapon: numberCarry(p, `weapon${index}`, 0, 0, 2),
    heavy: numberCarry(p, `heavy${index}`, 2, 0, 2),
    skipper: numberCarry(p, `skipper${index}`, 2, 0, 2),
  }))
  for (const t of s.tanks) t.y = ground(s, t.x) - 14
  try {
    const shot: unknown = JSON.parse(
      typeof p?.carry.projectile === 'string' ? p.carry.projectile : 'null',
    )
    if (
      shot &&
      typeof shot === 'object' &&
      'x' in shot &&
      typeof shot.x === 'number' &&
      Number.isFinite(shot.x) &&
      'y' in shot &&
      typeof shot.y === 'number' &&
      Number.isFinite(shot.y) &&
      'vx' in shot &&
      typeof shot.vx === 'number' &&
      Math.abs(shot.vx) < 1000 &&
      'vy' in shot &&
      typeof shot.vy === 'number' &&
      Math.abs(shot.vy) < 2000 &&
      'owner' in shot &&
      (shot.owner === 0 || shot.owner === 1) &&
      'kind' in shot &&
      (shot.kind === 0 || shot.kind === 1 || shot.kind === 2) &&
      'age' in shot &&
      typeof shot.age === 'number' &&
      shot.age >= 0 &&
      shot.age < 10 &&
      'bounces' in shot &&
      typeof shot.bounces === 'number' &&
      shot.bounces >= 0 &&
      shot.bounces <= 1
    )
      s.shot = {
        x: shot.x,
        y: shot.y,
        vx: shot.vx,
        vy: shot.vy,
        owner: shot.owner,
        kind: shot.kind,
        age: shot.age,
        bounces: shot.bounces,
      }
  } catch {}
  return s
}
export function launch(t: Tank, index: number) {
  const angle = (t.angle * Math.PI) / 180,
    velocity = 220 + t.power * 4.8,
    direction = index ? -1 : 1
  return {
    x: t.x + Math.cos(angle) * direction * 31,
    y: t.y - 10 - Math.sin(angle) * 31,
    vx: Math.cos(angle) * velocity * direction,
    vy: -Math.sin(angle) * velocity,
    owner: index,
    kind: t.weapon,
    bounces: 0,
    age: 0,
  }
}
export function fire(s: State) {
  if (s.shot || s.resolve > 0 || s.phase !== 'play') return false
  const t = s.tanks[s.turn]
  if ((t.weapon === 1 && t.heavy <= 0) || (t.weapon === 2 && t.skipper <= 0))
    t.weapon = 0
  if (t.weapon === 1) t.heavy--
  if (t.weapon === 2) t.skipper--
  s.shot = launch(t, s.turn)
  s.shots++
  s.events.push('hit')
  return true
}
export function explode(s: State, x: number, y: number, kind: number) {
  const radius = kind === 1 ? 100 : kind === 2 ? 65 : 75
  s.explosions.push({ x, y, r: radius, life: 0.65 })
  for (let index = 0; index < s.terrain.length; index++) {
    const dx = index * STEP - x
    if (Math.abs(dx) < radius) {
      const bottom = y + Math.sqrt(radius * radius - dx * dx) * 0.55
      s.terrain[index] = clamp(Math.max(s.terrain[index], bottom), 220, 575)
    }
  }
  for (const t of s.tanks) {
    const distance = Math.hypot(t.x - x, t.y - y)
    if (distance < radius + 18) {
      const damage = distance < 35 ? (kind === 1 ? 3 : 2) : 1
      t.hp = Math.max(0, t.hp - damage)
      s.score += damage * 150
    }
  }
  s.events.push('boost')
  s.shot = null
  s.resolve = 0.8
  const living = s.tanks.map((t) => t.hp > 0)
  if (!living[0] || !living[1]) {
    s.lastWinner = living[0] ? 0 : living[1] ? 1 : -1
    if (s.lastWinner >= 0) {
      s.wins[s.lastWinner]++
      s.score += 800
    }
    if (Math.max(...s.wins) >= 7) {
      s.phase = 'over'
      s.reason = `P${s.lastWinner + 1}`
    } else s.phase = 'choice'
  }
}
export function update(s: State, input: ArcadeInput, seconds: number) {
  if (s.phase !== 'play') return
  s.mode = opponentMode(input.mode, s.mode)
  if (s.mode !== 'local') input = computerInput(s, input, seconds)
  s.events = []
  const steps = Math.max(1, Math.ceil(seconds * 120)),
    dt = Math.min(0.1, seconds) / steps
  for (let n = 0; n < steps && s.phase === 'play'; n++) {
    s.elapsed += dt
    for (const t of s.tanks) t.y = ground(s, t.x) - 14
    for (const e of s.explosions) e.life -= dt
    s.explosions = s.explosions.filter((e) => e.life > 0)
    if (s.resolve > 0) {
      s.resolve -= dt
      if (s.resolve <= 0) {
        s.turn = 1 - s.turn
        s.wind = clamp(s.wind + (random(s) - 0.5) * 16, -120, 120)
      }
      continue
    }
    if (!s.shot) {
      const t = s.tanks[s.turn],
        second = s.turn === 1
      t.angle = clamp(
        t.angle +
          (Number(down(input, second ? 'arrowup' : 'w')) -
            Number(down(input, second ? 'arrowdown' : 's'))) *
            38 *
            dt,
        10,
        85,
      )
      t.power = clamp(
        t.power +
          (Number(down(input, second ? 'arrowright' : 'd')) -
            Number(down(input, second ? 'arrowleft' : 'a'))) *
            32 *
            dt,
        20,
        100,
      )
      if (n === 0 && pressed(input, second ? 'shift' : 'q'))
        t.weapon = (t.weapon + 1) % 3
      if (n === 0 && pressed(input, second ? 'enter' : ' ')) fire(s)
      continue
    }
    const b = s.shot
    b.age += dt
    b.vx += s.wind * dt
    b.vy += (s.landscape === 3 ? 260 : 410) * dt
    b.x += b.vx * dt
    b.y += b.vy * dt
    const hit = s.tanks.some((t) => Math.hypot(t.x - b.x, t.y - 5 - b.y) < 25)
    if (b.x < -60 || b.x > 1060 || b.age > 8) {
      s.shot = null
      s.resolve = 0.4
    } else if (hit || b.y >= ground(s, b.x)) {
      if (b.kind === 2 && b.bounces === 0 && !hit) {
        b.y = ground(s, b.x) - 5
        b.vy = -Math.max(160, Math.abs(b.vy) * 0.65)
        b.vx *= 0.8
        b.bounces++
      } else explode(s, b.x, b.y, b.kind)
    }
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const landscape =
    id === 'ridge' ? 1 : id === 'moon' ? 3 : (s.landscape + 1) % 4
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
        landscape,
        shots: s.shots,
        turn: s.lastWinner < 0 ? s.stage % 2 : 1 - s.lastWinner,
      },
    }),
  )
}
export function save(s: State): Progress {
  const carry: Progress['carry'] = {
    mode: s.mode,
    terrain: JSON.stringify(s.terrain),
    projectile: JSON.stringify(s.shot),
    turn: s.resolve > 0 ? 1 - s.turn : s.turn,
    landscape: s.landscape,
    wind: s.wind,
    w1: s.wins[0],
    w2: s.wins[1],
    shots: s.shots,
  }
  s.tanks.forEach((t, i) => {
    for (const key of ['angle', 'power', 'hp', 'weapon', 'heavy', 'skipper']) {
      if (key === 'angle') carry[`angle${i}`] = t.angle
      if (key === 'power') carry[`power${i}`] = t.power
      if (key === 'hp') carry[`hp${i}`] = t.hp
      if (key === 'weapon') carry[`weapon${i}`] = t.weapon
      if (key === 'heavy') carry[`heavy${i}`] = t.heavy
      if (key === 'skipper') carry[`skipper${i}`] = t.skipper
    }
  })
  return { stage: s.stage, score: s.score, lives: 3, elapsed: s.elapsed, carry }
}

function computerInput(
  s: State,
  input: ArcadeInput,
  seconds: number,
): ArcadeInput {
  if (s.turn !== 1) {
    s.botPlan = null
    s.botTimer = 0.7
    return botInput(input, [])
  }
  if (s.shot || s.resolve > 0) return botInput(input, [])
  const level = skill(s.mode),
    tank = s.tanks[1],
    target = s.tanks[0]
  if (!s.botPlan) {
    let best = Infinity,
      angle = 55,
      power = 65
    for (let a = 25; a <= 80; a += 5)
      for (let p = 35; p <= 100; p += 5) {
        const shot = launch({ ...tank, angle: a, power: p }, 1)
        for (let frame = 0; frame < 320; frame++) {
          shot.vx += s.wind * 0.025
          shot.vy += (s.landscape === 3 ? 260 : 410) * 0.025
          shot.x += shot.vx * 0.025
          shot.y += shot.vy * 0.025
          if (
            shot.x < 0 ||
            shot.x > 1000 ||
            shot.y >= ground(s, shot.x) ||
            Math.hypot(shot.x - target.x, shot.y - target.y) < 24
          ) {
            const distance = Math.hypot(shot.x - target.x, shot.y - target.y)
            if (distance < best) {
              best = distance
              angle = a
              power = p
            }
            break
          }
        }
      }
    const error = [5, 2, 0.4][level]
    s.botPlan = {
      angle: clamp(angle + (random(s) - 0.5) * error * 2, 10, 85),
      power: clamp(power + (random(s) - 0.5) * error * 3, 20, 100),
      weapon: tank.heavy > 0 && target.hp >= 2 ? 1 : 0,
    }
    s.botTimer = [1.1, 0.75, 0.5][level]
  }
  s.botTimer -= Math.min(0.1, seconds)
  const plan = s.botPlan,
    held: string[] = [],
    tapped: string[] = []
  tank.weapon = plan.weapon
  if (tank.angle < plan.angle - 0.7) held.push('arrowup')
  if (tank.angle > plan.angle + 0.7) held.push('arrowdown')
  if (tank.power < plan.power - 0.6) held.push('arrowright')
  if (tank.power > plan.power + 0.6) held.push('arrowleft')
  if (
    s.botTimer <= 0 &&
    Math.abs(tank.angle - plan.angle) < 1.5 &&
    Math.abs(tank.power - plan.power) < 1.5
  )
    tapped.push('enter')
  return botInput(input, held, tapped)
}
