import {
  base,
  clamp,
  loseLife,
  nextStage,
  numberCarry,
  pressed,
  random,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const COLS = 19,
  ROWS = 21
export type Actor = {
  x: number
  y: number
  tx: number
  ty: number
  progress: number
  dx: number
  dy: number
}
type Ghost = Actor & { kind: number; waiting: number }
export type State = ArcadeState & {
  walls: number[]
  dots: number[]
  player: Actor
  ghosts: Ghost[]
  wish: { x: number; y: number }
  power: number
  hunt: number
  dash: number
  charges: number
  collected: number
  fruit: { x: number; y: number; life: number } | null
  district: number
  invulnerable: number
}
export function maze(stage: number, district = 0) {
  return Array.from({ length: COLS * ROWS }, (_, i) => {
    const x = i % COLS,
      y = Math.floor(i / COLS)
    if (y === 9 && (x === 0 || x === 18)) return 0
    if (x === 0 || x === 18 || y === 0 || y === 20) return 1
    if (
      x === 1 ||
      x === 17 ||
      y === 1 ||
      y === 19 ||
      x % 4 === 1 ||
      y % 4 === 1
    )
      return 0
    if (
      stage > 1 &&
      y % 4 === 3 &&
      (Math.floor(x / 4) + Math.floor(y / 4) + district + stage) % 3 === 0
    )
      return 0
    return 1
  })
}
function actor(x: number, y: number): Actor {
  return { x, y, tx: x, ty: y, progress: 0, dx: 0, dy: 0 }
}
export function create(progress?: Progress): State {
  const b = base(progress),
    district = Math.floor(numberCarry(progress, 'district', 0, 0, 2)),
    walls = maze(b.stage, district)
  const s: State = {
    ...b,
    walls,
    dots: walls.map((v) => (v ? 0 : 1)),
    player: actor(1, 19),
    ghosts: [
      [9, 9],
      [9, 5],
      [13, 9],
      [5, 9],
    ].map(([x, y], kind) => ({
      ...actor(x, y),
      kind,
      waiting: 2 + kind * 1.5,
    })),
    wish: { x: 1, y: 0 },
    power: 0,
    hunt: 0,
    dash: 0,
    charges: 1,
    collected: 0,
    fruit: null,
    district,
    invulnerable: 1.5,
  }
  for (const [x, y] of [
    [1, 1],
    [17, 1],
    [1, 19],
    [17, 19],
  ])
    s.dots[y * COLS + x] = 2
  const saved = progress?.carry.dots
  if (
    typeof saved === 'string' &&
    saved.length === COLS * ROWS &&
    /^[0-2]+$/.test(saved)
  )
    s.dots = saved.split('').map((v, i) => (walls[i] ? 0 : Number(v)))
  s.collected = numberCarry(progress, 'collected', 0)
  s.charges = numberCarry(progress, 'charges', 1, 0, 2)
  s.power = numberCarry(progress, 'power', 0, 0, 8)
  const x = Math.floor(numberCarry(progress, 'x', 1, 0, 18)),
    y = Math.floor(numberCarry(progress, 'y', 19, 1, 19))
  if (!walls[y * COLS + x]) s.player = actor(x, y)
  return s
}
export function neighbors(s: State, x: number, y: number) {
  return [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ].flatMap(([dx, dy]) => {
    let nx = x + dx
    const ny = y + dy
    if (ny === 9) nx = (nx + COLS) % COLS
    return nx >= 0 &&
      nx < COLS &&
      ny >= 0 &&
      ny < ROWS &&
      !s.walls[ny * COLS + nx]
      ? [{ x: nx, y: ny, dx, dy }]
      : []
  })
}
export function distances(s: State, x: number, y: number) {
  const values = Array(COLS * ROWS).fill(Infinity),
    queue = [{ x, y }]
  values[y * COLS + x] = 0
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]
    for (const n of neighbors(s, p.x, p.y))
      if (values[n.y * COLS + n.x] === Infinity) {
        values[n.y * COLS + n.x] = values[p.y * COLS + p.x] + 1
        queue.push(n)
      }
  }
  return values
}
export function position(a: Actor) {
  let dx = a.tx - a.x
  if (Math.abs(dx) > COLS / 2) dx = Math.sign(-dx)
  return { x: a.x + dx * a.progress, y: a.y + (a.ty - a.y) * a.progress }
}
function stepActor(
  s: State,
  a: Actor,
  speed: number,
  dt: number,
  choose: () => { x: number; y: number; dx: number; dy: number } | undefined,
) {
  let remaining = speed * dt
  while (remaining > 0) {
    if (a.progress === 0) {
      const next = choose()
      if (!next) return
      a.tx = next.x
      a.ty = next.y
      a.dx = next.dx
      a.dy = next.dy
    }
    const amount = Math.min(1 - a.progress, remaining)
    a.progress += amount
    remaining -= amount
    if (a.progress >= 1 - 1e-8) {
      a.x = a.tx
      a.y = a.ty
      a.progress = 0
    }
  }
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.power = Math.max(0, s.power - dt)
  s.dash = Math.max(0, s.dash - dt)
  s.invulnerable = Math.max(0, s.invulnerable - dt)
  for (const key of input.pressed) {
    const dir =
      key === 'arrowleft' || key === 'a'
        ? { x: -1, y: 0 }
        : key === 'arrowright' || key === 'd'
          ? { x: 1, y: 0 }
          : key === 'arrowup' || key === 'w'
            ? { x: 0, y: -1 }
            : key === 'arrowdown' || key === 's'
              ? { x: 0, y: 1 }
              : null
    if (dir) s.wish = dir
  }
  if (pressed(input, ' ', 'x') && s.charges > 0 && s.dash === 0) {
    s.charges--
    s.dash = 0.9
    s.invulnerable = Math.max(0.35, s.invulnerable)
    s.events.push('boost')
  }
  const p = s.player
  if (p.progress > 0 && s.wish.x === -p.dx && s.wish.y === -p.dy) {
    ;[p.x, p.tx] = [p.tx, p.x]
    ;[p.y, p.ty] = [p.ty, p.y]
    p.progress = 1 - p.progress
    p.dx = -p.dx
    p.dy = -p.dy
  }
  stepActor(s, p, 5.6 * (s.dash > 0 ? 1.5 : 1), dt, () => {
    const n = neighbors(s, p.x, p.y)
    return (
      n.find((n) => n.dx === s.wish.x && n.dy === s.wish.y) ??
      n.find((n) => n.dx === p.dx && n.dy === p.dy)
    )
  })
  const pos = position(p),
    cx = clamp(Math.round(pos.x), 0, 18),
    cy = clamp(Math.round(pos.y), 0, 20),
    index = cy * COLS + cx,
    dot = s.dots[index]
  if (dot && Math.hypot(pos.x - cx, pos.y - cy) < 0.3) {
    s.dots[index] = 0
    s.score += dot === 2 ? 50 : 10
    s.collected++
    if (dot === 2) {
      s.power = Math.max(4, 8 - Math.min(3, s.stage * 0.2))
      s.hunt = 0
      s.events.push('boost')
    } else if (s.collected % 8 === 0) s.events.push('pickup')
    if (s.collected % 60 === 0) s.charges = Math.min(2, s.charges + 1)
    if (s.collected % 45 === 0) {
      const floors = s.walls.flatMap((v, i) => (!v ? [i] : [])),
        at = floors[Math.floor(random(s) * floors.length)]
      s.fruit = { x: at % COLS, y: Math.floor(at / COLS), life: 13 }
    }
  }
  if (s.fruit) {
    s.fruit.life -= dt
    if (Math.hypot(pos.x - s.fruit.x, pos.y - s.fruit.y) < 0.6) {
      s.score += 300 * s.stage
      s.charges = Math.min(2, s.charges + 1)
      s.fruit = null
      s.events.push('point')
    } else if (s.fruit.life <= 0) s.fruit = null
  }
  for (const g of s.ghosts) {
    if (g.waiting > 0) {
      g.waiting -= dt
      continue
    }
    stepActor(
      s,
      g,
      s.power > 0
        ? 2.5
        : Math.min(4.8, 3.5 + s.stage * 0.12 + (s.district === 1 ? 0.18 : 0)),
      dt,
      () => {
        let tx = p.x,
          ty = p.y
        const scatter = Math.floor(s.elapsed / 12) % 3 === 2
        if (
          scatter ||
          (g.kind === 3 && Math.abs(g.x - p.x) + Math.abs(g.y - p.y) < 5)
        ) {
          tx = g.kind % 2 ? 17 : 1
          ty = g.kind < 2 ? 1 : 19
        } else if (g.kind === 1) {
          tx = clamp(p.x + p.dx * 4, 1, 17)
          ty = clamp(p.y + p.dy * 4, 1, 19)
        } else if (g.kind === 2) {
          tx = clamp(18 - p.x, 1, 17)
          ty = clamp(20 - p.y, 1, 19)
        }
        if (s.walls[ty * COLS + tx]) {
          tx = p.x
          ty = p.y
        }
        const map = distances(s, tx, ty),
          all = neighbors(s, g.x, g.y),
          options = all.filter((n) => n.dx !== -g.dx || n.dy !== -g.dy),
          choices = options.length ? options : all
        return choices.sort((a, b) =>
          s.power > 0
            ? map[b.y * COLS + b.x] - map[a.y * COLS + a.x]
            : map[a.y * COLS + a.x] - map[b.y * COLS + b.x],
        )[0]
      },
    )
    const gp = position(g),
      dx = Math.min(Math.abs(gp.x - pos.x), COLS - Math.abs(gp.x - pos.x))
    if (Math.hypot(dx, gp.y - pos.y) < 0.65) {
      if (s.power > 0) {
        s.score += 200 * 2 ** Math.min(3, s.hunt++)
        g.x = 9
        g.y = 9
        g.tx = 9
        g.ty = 9
        g.progress = 0
        g.waiting = 4
        s.events.push('point')
      } else if (s.invulnerable === 0) {
        loseLife(s)
        s.player = actor(1, 19)
        s.wish = { x: 1, y: 0 }
        s.invulnerable = 2
        s.ghosts.forEach((ghost, i) => {
          Object.assign(ghost, actor(9, 9))
          ghost.waiting = 2 + i
        })
        break
      }
    }
  }
  if (s.phase !== 'over' && s.dots.every((v) => v === 0)) {
    s.score += 1000 * s.stage
    s.phase = 'choice'
    s.events.push('point')
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const district = id === 'market' ? 0 : id === 'station' ? 1 : 2
  const progress = {
    stage: s.stage + 1,
    score: s.score,
    lives: Math.min(5, s.lives + (s.stage % 3 === 0 ? 1 : 0)),
    elapsed: s.elapsed,
    carry: { district },
  }
  Object.assign(s, create(progress))
  if (district === 2) s.charges = 2
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: s.lives,
    elapsed: s.elapsed,
    carry: {
      dots: s.dots.join(''),
      x: s.player.x,
      y: s.player.y,
      collected: s.collected,
      charges: s.charges,
      power: s.power,
      district: s.district,
    },
  }
}
