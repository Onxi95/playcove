import {
  base,
  down,
  loseLife,
  numberCarry,
  pressed,
  random,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const COLS = 13,
  ROWS = 11
export type Actor = {
  id: number
  x: number
  y: number
  tx: number
  ty: number
  t: number
  alive: boolean
  bot: boolean
  timer: number
  capacity: number
  range: number
  speed: number
}
export type Bomb = {
  id: number
  x: number
  y: number
  owner: number
  timer: number
  range: number
  pass: number[]
}
export type State = ArcadeState & {
  tiles: number[]
  actors: Actor[]
  bombs: Bomb[]
  blasts: Array<{ cells: number[]; time: number }>
  items: Array<{ x: number; y: number; kind: number }>
  id: number
  mode: string
  wins: number[]
  reset: number
  range: number
  capacity: number
  boots: number
  roundWinner: number
}
function actor(id: number, x: number, y: number, bot: boolean): Actor {
  return {
    id,
    x,
    y,
    tx: x,
    ty: y,
    t: 1,
    alive: true,
    bot,
    timer: 0.4 + id * 0.2,
    capacity: 1,
    range: 2,
    speed: bot ? 3 : 4.8,
  }
}
export function create(progress?: Progress): State {
  const s: State = {
    ...base(progress),
    tiles: [],
    actors: [],
    bombs: [],
    blasts: [],
    items: [],
    id: 1,
    mode: progress?.carry.mode === 'local' ? 'local' : 'solo',
    wins: [numberCarry(progress, 'p1', 0), numberCarry(progress, 'p2', 0)],
    reset: 0,
    range: numberCarry(progress, 'range', 2, 2, 5),
    capacity: numberCarry(progress, 'capacity', 1, 1, 4),
    boots: numberCarry(progress, 'boots', 0, 0, 3),
    roundWinner: -1,
  }
  build(s)
  return s
}
export function build(s: State) {
  s.tiles = Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = i % COLS,
      y = Math.floor(i / COLS)
    if (
      x === 0 ||
      x === 12 ||
      y === 0 ||
      y === 10 ||
      (x % 2 === 0 && y % 2 === 0)
    )
      return 1
    const safe = [
      [1, 1],
      [11, 9],
      [11, 1],
      [1, 9],
    ].some(([px, py]) => Math.abs(x - px) + Math.abs(y - py) <= 3)
    return !safe && random(s) < 0.58 ? 2 : 0
  })
  s.actors =
    s.mode === 'local'
      ? [actor(0, 1, 1, false), actor(1, 11, 9, false)]
      : [
          actor(0, 1, 1, false),
          actor(1, 11, 9, true),
          ...(s.stage > 1 ? [actor(2, 11, 1, true)] : []),
          ...(s.stage > 3 ? [actor(3, 1, 9, true)] : []),
        ]
  s.actors[0].range = s.range
  s.actors[0].capacity = s.capacity
  s.actors[0].speed = 4.8 + s.boots * 0.3
  for (const a of s.actors)
    if (a.bot) a.speed = Math.min(3.8, 2.6 + s.stage * 0.12)
  s.bombs = []
  s.blasts = []
  s.items = []
  s.reset = 0
  s.phase = 'play'
}
export function rays(tiles: number[], x: number, y: number, range: number) {
  const cells = [y * COLS + x]
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ])
    for (let i = 1; i <= range; i++) {
      const nx = x + dx * i,
        ny = y + dy * i
      if (nx < 0 || nx >= COLS || ny < 0 || ny >= ROWS) break
      const index = ny * COLS + nx
      if (tiles[index] === 1) break
      cells.push(index)
      if (tiles[index] === 2) break
    }
  return cells
}
function cell(a: Actor) {
  return Math.round(a.y) * COLS + Math.round(a.x)
}
function walkable(s: State, x: number, y: number, id: number) {
  return (
    x > 0 &&
    x < 12 &&
    y > 0 &&
    y < 10 &&
    s.tiles[y * COLS + x] === 0 &&
    !s.bombs.some((b) => b.x === x && b.y === y && !b.pass.includes(id))
  )
}
function options(s: State, a: Actor) {
  const x = Math.round(a.x),
    y = Math.round(a.y)
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]
    .map(([dx, dy]) => ({ x: x + dx, y: y + dy }))
    .filter((p) => walkable(s, p.x, p.y, a.id))
}
function pathToSafety(s: State, a: Actor, danger: Set<number>) {
  const queue = [
      {
        x: Math.round(a.x),
        y: Math.round(a.y),
        first: { x: Math.round(a.x), y: Math.round(a.y) },
        steps: 0,
      },
    ],
    seen = new Set<number>()
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i],
      index = p.y * COLS + p.x
    if (seen.has(index)) continue
    seen.add(index)
    if (!danger.has(index) && p.steps > 0) return p.first
    if (p.steps >= 6) continue
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = p.x + dx,
        y = p.y + dy
      if (walkable(s, x, y, a.id))
        queue.push({
          x,
          y,
          first: p.steps === 0 ? { x, y } : p.first,
          steps: p.steps + 1,
        })
    }
  }
  return null
}
export function place(s: State, a: Actor) {
  const x = Math.round(a.x),
    y = Math.round(a.y)
  if (
    !a.alive ||
    s.bombs.some((b) => b.x === x && b.y === y) ||
    s.bombs.filter((b) => b.owner === a.id).length >= a.capacity
  )
    return false
  s.bombs.push({
    id: s.id++,
    x,
    y,
    owner: a.id,
    timer: 2.2,
    range: a.range,
    pass: [a.id],
  })
  s.events.push('hit')
  return true
}
export function explode(s: State) {
  const tiles = [...s.tiles],
    queue = s.bombs.filter((b) => b.timer <= 0).map((b) => b.id),
    done = new Set<number>()
  for (let index = 0; index < queue.length; index++) {
    const bomb = s.bombs.find((b) => b.id === queue[index])
    if (!bomb || done.has(bomb.id)) continue
    done.add(bomb.id)
    const cells = rays(tiles, bomb.x, bomb.y, bomb.range)
    s.blasts.push({ cells, time: 0.5 })
    for (const other of s.bombs)
      if (cells.includes(other.y * COLS + other.x) && !done.has(other.id))
        queue.push(other.id)
    for (const i of cells)
      if (s.tiles[i] === 2) {
        s.tiles[i] = 0
        s.score += 20
        if (random(s) < 0.38)
          s.items.push({
            x: i % COLS,
            y: Math.floor(i / COLS),
            kind: Math.floor(random(s) * 3),
          })
      }
    s.events.push('boost')
  }
  s.bombs = s.bombs.filter((b) => !done.has(b.id))
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  if (input.mode !== s.mode) {
    s.mode = input.mode
    build(s)
  }
  if (s.reset > 0) {
    s.reset -= dt
    if (s.reset <= 0) {
      if (s.mode === 'local') {
        s.phase = 'choice'
      } else if (s.lives > 0) build(s)
    }
    return
  }
  const danger = new Set(
    s.bombs.flatMap((b) => rays(s.tiles, b.x, b.y, b.range)),
  )
  for (const blast of s.blasts) for (const c of blast.cells) danger.add(c)
  for (const a of s.actors) {
    if (!a.alive) continue
    const px = a.x,
      py = a.y
    if (a.t < 1) {
      a.t = Math.min(1, a.t + dt * a.speed)
      a.x =
        px +
        (a.tx - px) *
          Math.min(1, (dt * a.speed) / Math.max(0.001, 1 - a.t + dt * a.speed))
      a.y =
        py +
        (a.ty - py) *
          Math.min(1, (dt * a.speed) / Math.max(0.001, 1 - a.t + dt * a.speed))
      if (a.t === 1) {
        a.x = a.tx
        a.y = a.ty
      }
    }
    if (a.t === 1) {
      let next: { x: number; y: number } | null = null
      if (a.bot) {
        a.timer -= dt
        if (danger.has(cell(a))) next = pathToSafety(s, a, danger)
        else if (a.timer <= 0) {
          a.timer = 0.18
          const opts = options(s, a).filter(
            (p) => !danger.has(p.y * COLS + p.x),
          )
          const target = s.actors.find((p) => p.alive && !p.bot)
          opts.sort((p, q) =>
            target
              ? Math.abs(p.x - target.x) +
                Math.abs(p.y - target.y) -
                Math.abs(q.x - target.x) -
                Math.abs(q.y - target.y)
              : 0,
          )
          next =
            random(s) < 0.8
              ? (opts[0] ?? null)
              : (opts[Math.floor(random(s) * opts.length)] ?? null)
          const adjacent = options(s, a)
          const near =
            target && Math.abs(target.x - a.x) + Math.abs(target.y - a.y) < 3
          const box = [
            [1, 0],
            [-1, 0],
            [0, 1],
            [0, -1],
          ].some(([dx, dy]) => s.tiles[(a.y + dy) * COLS + a.x + dx] === 2)
          if (
            (near || box) &&
            s.bombs.filter((b) => b.owner === a.id).length === 0
          ) {
            const projected = new Set([
              ...danger,
              ...rays(s.tiles, a.x, a.y, a.range),
            ])
            if (pathToSafety(s, a, projected)) {
              place(s, a)
              next = pathToSafety(s, a, projected)
            }
          }
        }
      } else {
        const second = a.id === 1
        const dx =
            Number(down(input, second ? 'arrowright' : 'd')) -
            Number(down(input, second ? 'arrowleft' : 'a')),
          dy =
            Number(down(input, second ? 'arrowdown' : 's')) -
            Number(down(input, second ? 'arrowup' : 'w'))
        const keysMove = s.mode !== 'local' && a.id === 0
        if (keysMove) {
          const ax =
              Number(down(input, 'd', 'arrowright')) -
              Number(down(input, 'a', 'arrowleft')),
            ay =
              Number(down(input, 's', 'arrowdown')) -
              Number(down(input, 'w', 'arrowup'))
          if (ax || ay)
            next = {
              x: a.x + (ax ? Math.sign(ax) : 0),
              y: a.y + (ax ? 0 : Math.sign(ay)),
            }
        } else if (dx || dy)
          next = {
            x: a.x + (dx ? Math.sign(dx) : 0),
            y: a.y + (dx ? 0 : Math.sign(dy)),
          }
      }
      if (next && walkable(s, next.x, next.y, a.id)) {
        a.tx = next.x
        a.ty = next.y
        a.t = 0
      }
    }
    if (
      !a.bot &&
      pressed(input, a.id === 1 ? 'enter' : ' ', ...(a.id === 0 ? ['j'] : []))
    )
      place(s, a)
    for (const b of s.bombs)
      if (b.pass.includes(a.id) && Math.hypot(a.x - b.x, a.y - b.y) > 0.55)
        b.pass = b.pass.filter((id) => id !== a.id)
    for (let i = s.items.length - 1; i >= 0; i--) {
      const item = s.items[i]
      if (Math.hypot(a.x - item.x, a.y - item.y) < 0.4) {
        if (item.kind === 0) a.range = Math.min(5, a.range + 1)
        if (item.kind === 1) a.capacity = Math.min(4, a.capacity + 1)
        if (item.kind === 2) a.speed = Math.min(5.7, a.speed + 0.3)
        s.items.splice(i, 1)
        s.events.push('pickup')
      }
    }
  }
  for (const b of s.bombs) b.timer -= dt
  explode(s)
  for (const blast of s.blasts) {
    blast.time -= dt
    for (const a of s.actors)
      if (a.alive && blast.cells.includes(cell(a))) {
        a.alive = false
        if (a.bot) s.score += 250 * s.stage
      }
  }
  s.blasts = s.blasts.filter((b) => b.time > 0)
  if (s.mode === 'local') {
    const alive = s.actors.filter((a) => a.alive)
    if (alive.length < 2) {
      s.roundWinner = alive[0]?.id ?? -1
      if (s.roundWinner >= 0) {
        s.wins[s.roundWinner]++
        s.score += 1000
      }
      if (Math.max(...s.wins) >= 3) {
        s.phase = 'over'
        s.lives = 0
      } else s.reset = 0.8
    }
  } else if (!s.actors[0].alive) {
    loseLife(s)
    s.reset = s.phase === 'over' ? 0 : 1
  } else if (s.actors.every((a) => !a.bot || !a.alive)) {
    s.score += 750 * s.stage
    s.phase = 'choice'
    s.range = s.actors[0].range
    s.capacity = s.actors[0].capacity
    s.boots = Math.round((s.actors[0].speed - 4.8) / 0.3)
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  if (id === 'range') s.range = Math.min(5, s.range + 1)
  if (id === 'capacity') s.capacity = Math.min(4, s.capacity + 1)
  if (id === 'repair') s.lives = Math.min(5, s.lives + 1)
  s.stage++
  s.startScore = s.score
  build(s)
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.phase === 'choice' ? s.score : s.startScore,
    lives: s.lives,
    elapsed: s.elapsed,
    carry: {
      mode: s.mode,
      range: s.range,
      capacity: s.capacity,
      boots: s.boots,
      p1: s.wins[0],
      p2: s.wins[1],
    },
  }
}
