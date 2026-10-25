import {
  base,
  clamp,
  down,
  loseLife,
  numberCarry,
  pressed,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export type Enemy = {
  id: number
  x: number
  y: number
  hx: number
  hy: number
  hp: number
  alive: boolean
  kind: number
  t: number
  state: 'formation' | 'dive' | 'beam'
  timer: number
  target: number
  captive: boolean
}
export type State = ArcadeState & {
  x: number
  invulnerable: number
  fireTimer: number
  fireLevel: number
  guardLevel: number
  guard: number
  roll: number
  dual: boolean
  enemies: Enemy[]
  shots: Array<{
    x: number
    y: number
    vx: number
    vy: number
    enemy: boolean
  }>
  rescue: { x: number; y: number } | null
  clock: number
  diveTimer: number
  shotTimer: number
  hits: number
  missed: number
  captured: number
  rescued: number
  challenge: boolean
}
export function create(progress?: Progress): State {
  const b = base(progress),
    challenge = b.stage % 4 === 0
  const s: State = {
    ...b,
    x: 450,
    invulnerable: 1.4,
    fireTimer: 0,
    fireLevel: numberCarry(progress, 'fireLevel', 0, 0, 4),
    guardLevel: numberCarry(progress, 'guardLevel', 0, 0, 3),
    guard: 100,
    roll: 0,
    dual: progress?.carry.dual === true,
    enemies: [],
    shots: [],
    rescue: null,
    clock: 0,
    diveTimer: 2,
    shotTimer: 1.4,
    hits: numberCarry(progress, 'hits', 0),
    missed: 0,
    captured: numberCarry(progress, 'captured', 0),
    rescued: numberCarry(progress, 'rescued', 0),
    challenge,
  }
  const count = challenge ? 18 : Math.min(24, 12 + Math.floor(b.stage / 2) * 2)
  for (let i = 0; i < count; i++) {
    const hx = 170 + (i % 8) * 80,
      hy = 80 + Math.floor(i / 8) * 57,
      kind = !challenge && i < 2 && b.stage >= 2 ? 2 : i % 2
    s.enemies.push({
      id: i,
      x: hx,
      y: hy,
      hx,
      hy,
      hp: kind === 2 ? 2 : 1,
      alive: true,
      kind,
      t: 0,
      state: challenge ? 'dive' : 'formation',
      timer: challenge ? i * 0.22 : 0,
      target: 120 + ((i * 137) % 660),
      captive: false,
    })
  }
  const dead = progress?.carry.dead
  if (typeof dead === 'string' && dead.length === count)
    s.enemies.forEach((e, i) => (e.alive = dead[i] !== '1'))
  return s
}
export function damage(s: State, e: Enemy) {
  if (!e.alive) return
  e.hp--
  s.events.push('hit')
  if (e.hp > 0) return
  e.alive = false
  s.hits++
  s.score += (e.kind === 2 ? 150 : 75) * s.stage
  if (e.captive) {
    s.rescue = { x: e.x, y: e.y }
    s.events.push('point')
  }
}
function hurt(s: State) {
  if (s.invulnerable > 0) return
  if (s.dual) s.dual = false
  else loseLife(s)
  s.invulnerable = 1.7
  s.shots = s.shots.filter((b) => !b.enemy)
  s.x = 450
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.clock += dt
  s.invulnerable = Math.max(0, s.invulnerable - dt)
  s.roll = Math.max(0, s.roll - dt)
  s.guard = Math.min(100, s.guard + dt * (17 + s.guardLevel * 4))
  s.fireTimer = Math.max(0, s.fireTimer - dt)
  s.x = clamp(
    s.x +
      (Number(down(input, 'd', 'arrowright')) -
        Number(down(input, 'a', 'arrowleft'))) *
        410 *
        dt,
    35,
    865,
  )
  if (input.pointer.down) s.x = clamp(input.pointer.x, 35, 865)
  if (pressed(input, 'x', 'shift') && s.guard >= 80) {
    s.guard -= 80
    s.roll = 0.5
    s.invulnerable = Math.max(0.5, s.invulnerable)
    s.events.push('boost')
  }
  if ((down(input, ' ', 'j') || input.pointer.down) && s.fireTimer === 0) {
    for (const dx of s.dual ? [-14, 14] : [0])
      s.shots.push({ x: s.x + dx, y: 535, vx: 0, vy: -650, enemy: false })
    s.fireTimer = 0.22 / (1 + s.fireLevel * 0.16)
  }
  s.diveTimer -= dt
  if (!s.challenge && s.diveTimer <= 0) {
    const e = s.enemies.find((e) => e.alive && e.state === 'formation')
    if (e) {
      e.state = 'dive'
      e.t = 0
      e.target = s.x
    }
    s.diveTimer = Math.max(0.65, 2.3 - s.stage * 0.1)
  }
  for (const e of s.enemies) {
    if (!e.alive) continue
    if (s.challenge) {
      e.timer -= dt
      if (e.timer > 0) {
        e.x = -100
        continue
      }
      e.t += dt * 0.22
      e.x = 450 + Math.sin(e.t * Math.PI * 2 + e.id * 0.3) * 340
      e.y = -40 + e.t * 740
      if (e.t > 1) {
        e.alive = false
        s.missed++
      }
      continue
    }
    if (e.state === 'formation') {
      e.x = e.hx + Math.sin(s.clock * 0.7) * 58
      e.y = e.hy + Math.sin(s.clock * 1.1 + e.id) * 4
    } else if (e.state === 'dive') {
      e.t += dt * 0.36
      e.x = e.hx + (e.target - e.hx) * Math.sin(e.t * Math.PI)
      e.y = e.hy + Math.sin(e.t * Math.PI) * 430
      if (e.kind === 2 && !e.captive && e.t > 0.43 && e.t < 0.5) {
        e.state = 'beam'
        e.timer = 1.8
      } else if (e.t >= 1) {
        e.state = 'formation'
        e.t = 0
      }
    } else {
      e.timer -= dt
      if (
        e.timer < 1.1 &&
        e.timer > 0.15 &&
        Math.abs(e.x - s.x) < 36 &&
        s.invulnerable === 0 &&
        !e.captive
      ) {
        s.lives--
        s.captured++
        e.captive = true
        s.dual = false
        s.invulnerable = 2
        s.x = 450
        s.events.push('boost')
        if (s.lives <= 0) s.phase = 'over'
        e.timer = 0.1
      }
      if (e.timer <= 0) {
        e.state = 'dive'
        e.t = 0.51
      }
    }
    if (Math.hypot(e.x - s.x, e.y - 550) < 30) hurt(s)
  }
  s.shotTimer -= dt
  if (!s.challenge && s.shotTimer <= 0) {
    const shooters = s.enemies.filter((e) => e.alive && e.state !== 'beam')
    const e = shooters[Math.floor(s.clock * 13) % Math.max(1, shooters.length)]
    if (e) {
      const vx = clamp((s.x - e.x) * 0.45, -130, 130)
      s.shots.push({
        x: e.x,
        y: e.y + 18,
        vx,
        vy: 245 + Math.min(70, s.stage * 5),
        enemy: true,
      })
    }
    s.shotTimer = Math.max(0.42, 1.4 - s.stage * 0.07)
  }
  for (let i = s.shots.length - 1; i >= 0; i--) {
    const shot = s.shots[i]
    if (!shot) continue
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    if (shot.y < 0 || shot.y > 620) {
      s.shots.splice(i, 1)
      continue
    }
    if (shot.enemy) {
      if (Math.abs(shot.x - s.x) < 17 && Math.abs(shot.y - 550) < 22) {
        s.shots.splice(i, 1)
        hurt(s)
        break
      }
    } else {
      const e = s.enemies.find(
        (e) =>
          e.alive && Math.abs(e.x - shot.x) < 24 && Math.abs(e.y - shot.y) < 21,
      )
      if (e) {
        damage(s, e)
        s.shots.splice(i, 1)
      }
    }
  }
  if (s.rescue) {
    s.rescue.y += 110 * dt
    if (Math.hypot(s.rescue.x - s.x, s.rescue.y - 550) < 36) {
      s.dual = true
      s.rescued++
      s.lives = Math.min(5, s.lives + 1)
      s.rescue = null
      s.events.push('point')
    } else if (s.rescue.y > 620) s.rescue = null
  }
  if (s.phase !== 'over' && s.enemies.every((e) => !e.alive) && !s.rescue) {
    s.score += s.challenge
      ? (s.missed === 0 ? 2000 : 500) * s.stage
      : 500 * s.stage
    if (s.challenge && s.missed === 0) s.lives = Math.min(5, s.lives + 1)
    s.phase = 'choice'
    s.events.push('point')
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const carry = {
    fireLevel: Math.min(4, s.fireLevel + (id === 'rapid' ? 1 : 0)),
    guardLevel: Math.min(3, s.guardLevel + (id === 'guard' ? 1 : 0)),
    dual: s.dual,
    hits: s.hits,
    captured: s.captured,
    rescued: s.rescued,
  }
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: Math.min(5, s.lives + (id === 'repair' ? 1 : 0)),
      elapsed: s.elapsed,
      carry,
    }),
  )
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: s.lives,
    elapsed: s.elapsed,
    carry: {
      dead: s.enemies.map((e) => (e.alive ? '0' : '1')).join(''),
      fireLevel: s.fireLevel,
      guardLevel: s.guardLevel,
      dual: s.dual,
      hits: s.hits,
      captured: s.captured,
      rescued: s.rescued,
    },
  }
}
