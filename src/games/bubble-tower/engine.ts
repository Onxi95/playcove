import {
  base,
  clamp,
  down,
  loseLife,
  numberCarry,
  pressed,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export type Platform = { x: number; y: number; w: number }
type Player = {
  x: number
  y: number
  vx: number
  vy: number
  ground: boolean
  face: number
  fire: number
  invulnerable: number
  buffer: number
  drop: number
}
type Enemy = {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  kind: number
  alive: boolean
  trapped: boolean
  angry: boolean
}
export type State = ArcadeState & {
  players: Player[]
  platforms: Platform[]
  enemies: Enemy[]
  bubbles: Array<{
    x: number
    y: number
    vx: number
    vy: number
    life: number
    enemy: number
    age: number
  }>
  fruit: Array<{ x: number; y: number; vy: number; value: number }>
  mode: string
  wind: number
  chain: number
  bestChain: number
  popFlash: number
}
function player(x: number): Player {
  return {
    x,
    y: 520,
    vx: 0,
    vy: 0,
    ground: false,
    face: 1,
    fire: 0,
    invulnerable: 1.5,
    buffer: 0,
    drop: 0,
  }
}
export function create(progress?: Progress): State {
  const b = base(progress),
    flip = b.stage % 2 === 0
  const rooms = [
    [
      { x: 50, y: 480, w: 230 },
      { x: 330, y: 390, w: 270 },
      { x: 75, y: 300, w: 255 },
      { x: 410, y: 210, w: 280 },
    ],
    [
      { x: 90, y: 480, w: 200 },
      { x: 460, y: 460, w: 230 },
      { x: 300, y: 365, w: 230 },
      { x: 50, y: 265, w: 230 },
      { x: 510, y: 265, w: 220 },
    ],
    [
      { x: 30, y: 485, w: 200 },
      { x: 300, y: 395, w: 210 },
      { x: 570, y: 305, w: 190 },
      { x: 260, y: 215, w: 250 },
    ],
    [
      { x: 30, y: 470, w: 740 },
      { x: 100, y: 370, w: 200 },
      { x: 490, y: 370, w: 210 },
      { x: 300, y: 260, w: 200 },
    ],
  ]
  const platforms = [
    { x: 0, y: 570, w: 800 },
    ...rooms[Math.floor((b.stage - 1) / 2) % rooms.length].map((p) =>
      flip ? { ...p, x: 800 - p.x - p.w } : { ...p },
    ),
  ]
  const s: State = {
    ...b,
    players: [player(110)],
    platforms,
    enemies: [],
    bubbles: [],
    fruit: [],
    mode: 'solo',
    wind: numberCarry(progress, 'wind', 0, -35, 35),
    chain: 0,
    bestChain: numberCarry(progress, 'bestChain', 0),
    popFlash: 0,
  }
  const count = Math.min(10, 3 + Math.floor(b.stage * 0.7))
  for (let i = 0; i < count; i++) {
    const p = platforms[i % platforms.length]
    s.enemies.push({
      id: i,
      x: p.x + 40 + ((i * 67) % Math.max(50, p.w - 80)),
      y: p.y - 28,
      vx: (i % 2 ? 1 : -1) * (50 + Math.min(65, b.stage * 4)),
      vy: 0,
      kind: i % 3,
      alive: true,
      trapped: false,
      angry: false,
    })
  }
  const dead = progress?.carry.dead
  if (typeof dead === 'string' && dead.length === count)
    for (const e of s.enemies) e.alive = dead[e.id] !== '1'
  return s
}
function land(
  body: { x: number; y: number; vy: number },
  height: number,
  previous: number,
  platforms: Platform[],
  drop = false,
) {
  if (body.vy < 0 || drop) return false
  const p = platforms.find(
    (p) =>
      previous + height <= p.y + 2 &&
      body.y + height >= p.y &&
      body.x + 13 > p.x &&
      body.x - 13 < p.x + p.w,
  )
  if (!p) return false
  body.y = p.y - height
  body.vy = 0
  return true
}
export function pop(s: State, index: number) {
  const queue = [index],
    visited = new Set<number>()
  let chain = 0
  for (let n = 0; n < queue.length; n++) {
    const i = queue[n],
      b = s.bubbles[i]
    if (!b || visited.has(i) || b.enemy < 0) continue
    visited.add(i)
    const e = s.enemies[b.enemy]
    if (e?.alive) {
      e.alive = false
      e.trapped = false
      chain++
      s.score += 150 * s.stage * chain
      s.fruit.push({ x: b.x, y: b.y, vy: -100, value: 100 * chain })
      for (let j = 0; j < s.bubbles.length; j++)
        if (Math.hypot(s.bubbles[j].x - b.x, s.bubbles[j].y - b.y) < 70)
          queue.push(j)
    }
  }
  s.bubbles = s.bubbles.filter((_, i) => !visited.has(i))
  if (chain) {
    s.chain = chain
    s.bestChain = Math.max(s.bestChain, chain)
    s.popFlash = 0.3
    s.events.push(chain > 1 ? 'point' : 'pickup')
    if (chain >= 3) s.lives = Math.min(5, s.lives + 1)
  }
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.popFlash = Math.max(0, s.popFlash - dt)
  if (input.mode !== s.mode) {
    s.mode = input.mode
    s.players =
      input.mode === 'coop' ? [player(110), player(160)] : [player(110)]
  }
  for (let i = 0; i < s.players.length; i++) {
    const p = s.players[i],
      second = i === 1,
      solo = s.mode !== 'coop'
    const left = down(
        input,
        ...(solo ? ['a', 'arrowleft'] : second ? ['arrowleft'] : ['a']),
      ),
      right = down(
        input,
        ...(solo ? ['d', 'arrowright'] : second ? ['arrowright'] : ['d']),
      )
    const jump = pressed(
      input,
      ...(solo ? ['w', 'arrowup'] : second ? ['arrowup'] : ['w']),
    )
    const fire = down(input, ...(second ? ['enter'] : [' ', 'j']))
    p.fire = Math.max(0, p.fire - dt)
    p.invulnerable = Math.max(0, p.invulnerable - dt)
    p.drop = Math.max(0, p.drop - dt)
    p.buffer = jump ? 0.14 : Math.max(0, p.buffer - dt)
    const direction = Number(right) - Number(left)
    if (direction) p.face = direction
    p.vx = direction * 240
    const previous = p.y
    if (p.buffer > 0 && p.ground) {
      p.vy = -550
      p.ground = false
      p.buffer = 0
    }
    if (down(input, second ? 'arrowdown' : 's') && p.ground && p.y < 530) {
      p.drop = 0.2
      p.ground = false
      p.y += 4
    }
    p.x = clamp(p.x + p.vx * dt, 15, 785)
    p.y += p.vy * dt
    p.vy += 1200 * dt
    p.ground = land(p, 36, previous, s.platforms, p.drop > 0)
    if (p.y > 620) {
      p.x = 110
      p.y = 520
      p.vy = 0
    }
    if (fire && p.fire === 0 && s.bubbles.length < 18) {
      s.bubbles.push({
        x: p.x + p.face * 20,
        y: p.y + 12,
        vx: p.face * 230,
        vy: -12,
        life: 6.5,
        enemy: -1,
        age: 0,
      })
      p.fire = 0.24
      s.events.push('hit')
    }
    if (pressed(input, second ? 'shift' : 'x')) {
      const target = s.bubbles.findIndex(
        (b) => b.enemy >= 0 && Math.hypot(b.x - p.x, b.y - (p.y + 15)) < 115,
      )
      if (target >= 0) pop(s, target)
    }
    for (const e of s.enemies)
      if (
        e.alive &&
        !e.trapped &&
        Math.abs(e.x - p.x) < 25 &&
        Math.abs(e.y - p.y) < 31 &&
        p.invulnerable === 0
      ) {
        loseLife(s)
        p.x = 110 + i * 50
        p.y = 520
        p.vx = 0
        p.vy = 0
        p.invulnerable = 2
        break
      }
  }
  for (const e of s.enemies) {
    if (!e.alive || e.trapped) continue
    const previous = e.y
    e.x += e.vx * dt * (e.angry ? 1.5 : 1)
    if (e.x < 18 || e.x > 782) {
      e.x = clamp(e.x, 18, 782)
      e.vx *= -1
    }
    if (e.kind === 2 && s.stage >= 3) {
      e.y = 280 + Math.sin(s.elapsed * 1.5 + e.id) * 110
      continue
    }
    e.y += e.vy * dt
    e.vy += 1000 * dt
    const ground = land(e, 28, previous, s.platforms)
    if (ground) {
      const floor = s.platforms.find(
        (p) => Math.abs(p.y - (e.y + 28)) < 3 && e.x >= p.x && e.x <= p.x + p.w,
      )
      if (
        floor &&
        ((e.x < floor.x + 20 && e.vx < 0) ||
          (e.x > floor.x + floor.w - 20 && e.vx > 0))
      )
        e.vx *= -1
      if (e.kind === 1 && Math.sin(s.elapsed * 2 + e.id) > 0.985) e.vy = -430
    }
    if (e.y > 600) {
      e.y = 20
      e.x = 400
    }
  }
  for (let i = s.bubbles.length - 1; i >= 0; i--) {
    const b = s.bubbles[i]
    if (!b) continue
    b.life -= dt
    b.age += dt
    b.x += b.vx * dt
    b.vx *= Math.exp(-2 * dt)
    b.x += s.wind * dt
    b.y += (b.age > 0.55 ? -42 : b.vy) * dt
    b.x = clamp(b.x, 14, 786)
    if (b.enemy < 0) {
      const e = s.enemies.find(
        (e) =>
          e.alive && !e.trapped && Math.hypot(e.x - b.x, e.y + 12 - b.y) < 27,
      )
      if (e) {
        e.trapped = true
        b.enemy = e.id
        b.vx = 0
        b.life = 7
        s.events.push('boost')
      }
    } else if (
      s.players.some((p) => Math.hypot(p.x - b.x, p.y + 14 - b.y) < 28)
    ) {
      pop(s, i)
      continue
    }
    if (b.life <= 0 || b.y < 30) {
      if (b.enemy >= 0) {
        const e = s.enemies[b.enemy]
        e.trapped = false
        e.angry = true
        e.x = b.x
        e.y = Math.max(40, b.y)
        e.vy = 0
      }
      s.bubbles.splice(i, 1)
    }
  }
  for (let i = s.fruit.length - 1; i >= 0; i--) {
    const f = s.fruit[i]
    f.y += f.vy * dt
    f.vy += 500 * dt
    if (f.y > 555) {
      f.y = 555
      f.vy = 0
    }
    if (s.players.some((p) => Math.hypot(p.x - f.x, p.y + 20 - f.y) < 30)) {
      s.score += f.value
      s.fruit.splice(i, 1)
      s.events.push('pickup')
    }
  }
  if (s.phase !== 'over' && s.enemies.every((e) => !e.alive)) {
    s.score += 700 * s.stage
    s.phase = 'choice'
    s.events.push('point')
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const mode = s.mode,
    players = s.players.length
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: s.lives,
      elapsed: s.elapsed,
      carry: { wind: id === 'wind' ? 22 : 0, bestChain: s.bestChain },
    }),
  )
  s.mode = mode
  if (players === 2) s.players.push(player(160))
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: s.lives,
    elapsed: s.elapsed,
    carry: {
      dead: s.enemies.map((e) => (e.alive ? '0' : '1')).join(''),
      wind: s.wind,
      bestChain: s.bestChain,
    },
  }
}
