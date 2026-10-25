import {
  base,
  clamp,
  down,
  loseLife,
  numberCarry,
  pressed,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export type State = ArcadeState & {
  x: number
  y: number
  vx: number
  vy: number
  floor: number
  ground: boolean
  climb: number
  invulnerable: number
  buffer: number
  barrels: Array<{
    x: number
    y: number
    vx: number
    vy: number
    floor: number
    fall: boolean
    dropX: number
    warning: number
  }>
  spawn: number
  bolts: Array<{ x: number; floor: number; taken: boolean }>
  hammer: number
  charges: number
  hammerTaken: boolean
  cleared: number
  lift: boolean
  reason: string
}
export const LADDER_PAIRS = [
  [140, 650],
  [260, 560],
  [110, 670],
  [330, 730],
]
export function floorY(floor: number, x: number) {
  return 550 - floor * 100 + (x - 400) * (floor % 2 ? -0.035 : 0.035)
}
export function ladders(s: State) {
  return LADDER_PAIRS.flatMap((positions, floor) =>
    positions.map((x) => ({
      x: s.stage % 2 === 0 ? 800 - x : x,
      floor,
      top: floorY(floor + 1, s.stage % 2 === 0 ? 800 - x : x),
      bottom: floorY(floor, s.stage % 2 === 0 ? 800 - x : x),
    })),
  )
}
export function create(progress?: Progress): State {
  const s: State = {
    ...base(progress),
    x: 60,
    y: floorY(0, 60) - 34,
    vx: 0,
    vy: 0,
    floor: 0,
    ground: true,
    climb: -1,
    invulnerable: 1.4,
    buffer: 0,
    barrels: [],
    spawn: 1.2,
    bolts: [
      { x: 110, floor: 1, taken: false },
      { x: 680, floor: 2, taken: false },
      ...((progress?.stage ?? 1) > 2
        ? [{ x: 150, floor: 3, taken: false }]
        : []),
    ],
    hammer: 0,
    charges: numberCarry(progress, 'charges', 0, 0, 2),
    hammerTaken: false,
    cleared: numberCarry(progress, 'cleared', 0),
    lift: false,
    reason: '',
  }
  const saved = progress?.carry.bolts
  if (typeof saved === 'string' && saved.length === s.bolts.length)
    s.bolts.forEach((b, i) => (b.taken = saved[i] === '1'))
  return s
}
function hurt(s: State, reason: string) {
  if (s.invulnerable > 0) return
  loseLife(s)
  s.reason = reason
  s.x = 60
  s.y = floorY(0, 60) - 34
  s.vx = 0
  s.vy = 0
  s.floor = 0
  s.climb = -1
  s.ground = true
  s.invulnerable = 2
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.invulnerable = Math.max(0, s.invulnerable - dt)
  s.hammer = Math.max(0, s.hammer - dt)
  s.buffer = pressed(input, ' ') ? 0.14 : Math.max(0, s.buffer - dt)
  if (pressed(input, 'x') && s.charges > 0 && s.hammer === 0) {
    s.charges--
    s.hammer = 7
    s.events.push('boost')
  }
  const dx =
      Number(down(input, 'd', 'arrowright')) -
      Number(down(input, 'a', 'arrowleft')),
    dy =
      Number(down(input, 's', 'arrowdown')) -
      Number(down(input, 'w', 'arrowup'))
  const ladderList = ladders(s)
  if (dy && s.climb < 0) {
    const index = ladderList.findIndex(
      (l) =>
        Math.abs(l.x - s.x) < 17 &&
        s.y + 34 >= l.top - 5 &&
        s.y + 34 <= l.bottom + 5 &&
        (dy < 0 ? s.y + 34 > l.top + 5 : s.y + 34 < l.bottom - 5),
    )
    if (index >= 0) {
      s.climb = index
      s.ground = false
      s.vy = 0
      s.x = ladderList[index].x
    }
  }
  if (s.climb >= 0) {
    const l = ladderList[s.climb]
    s.y += dy * 120 * dt
    if (s.y + 34 <= l.top) {
      s.y = l.top - 34
      s.floor = l.floor + 1
      s.climb = -1
      s.ground = true
    } else if (s.y + 34 >= l.bottom) {
      s.y = l.bottom - 34
      s.floor = l.floor
      s.climb = -1
      s.ground = true
    }
    if (pressed(input, ' ')) {
      s.climb = -1
      s.vy = -470
    }
  } else {
    const previous = s.y
    s.x = clamp(s.x + dx * 215 * dt, 20, 780)
    if (s.buffer > 0 && s.ground) {
      s.vy = -470
      s.ground = false
      s.buffer = 0
      s.lift = false
    }
    s.y += s.vy * dt
    s.vy += 1350 * dt
    let landed = false
    if (s.vy >= 0) {
      for (let floor = 4; floor >= 0; floor--) {
        const y = floorY(floor, s.x)
        if (previous + 34 <= y + 4 && s.y + 34 >= y) {
          s.y = y - 34
          s.vy = 0
          s.floor = floor
          s.ground = true
          landed = true
          break
        }
      }
    }
    if (!landed && s.ground && !s.lift) {
      s.y = floorY(s.floor, s.x) - 34
      s.vy = 0
    }
    if (s.stage % 3 === 0 && s.x > 355 && s.x < 445) {
      const liftY = 450 - (Math.sin(s.elapsed * 0.65) + 1) * 90,
        prev = 450 - (Math.sin((s.elapsed - dt) * 0.65) + 1) * 90
      if (
        s.lift ||
        (s.vy >= 0 && previous + 34 <= prev + 3 && s.y + 34 >= liftY)
      ) {
        s.y = liftY - 34
        s.vy = 0
        s.ground = true
        s.lift = true
      }
    } else s.lift = false
  }
  if (s.y > 620) hurt(s, 'fall')
  s.spawn -= dt
  if (s.spawn <= 0) {
    const direction = s.stage % 2 === 0 ? -1 : 1,
      start = direction > 0 ? 35 : 765,
      drop = ladders(s).filter((l) => l.floor === 3)[
        Math.floor((s.elapsed * 17) % 2)
      ]
    s.barrels.push({
      x: start,
      y: floorY(4, start) - 13,
      vx: direction * (90 + Math.min(85, s.stage * 6)),
      vy: 0,
      floor: 4,
      fall: false,
      dropX: s.stage > 1 && s.barrels.length % 3 === 1 ? drop.x : -100,
      warning: 0,
    })
    s.spawn = Math.max(1.25, 3.1 - s.stage * 0.13)
  }
  for (let i = s.barrels.length - 1; i >= 0; i--) {
    const b = s.barrels[i]
    if (!b.fall) {
      b.x += b.vx * dt
      b.y = floorY(b.floor, b.x) - 13
      if (b.dropX > 0 && Math.abs(b.x - b.dropX) < 65) b.warning = 0.5
      if (
        b.x < 20 ||
        b.x > 780 ||
        (b.dropX > 0 && Math.abs(b.x - b.dropX) < 6)
      ) {
        b.x = clamp(b.x, 20, 780)
        b.fall = true
        b.vy = 0
        b.dropX = -100
      }
    } else {
      const previous = b.y
      b.y += b.vy * dt
      b.vy += 650 * dt
      if (
        b.floor > 0 &&
        previous + 13 <= floorY(b.floor - 1, b.x) &&
        b.y + 13 >= floorY(b.floor - 1, b.x)
      ) {
        b.floor--
        b.y = floorY(b.floor, b.x) - 13
        b.vx *= -1
        b.fall = false
      }
    }
    if (b.y > 620 || (b.floor === 0 && (b.x < 18 || b.x > 782))) {
      s.barrels.splice(i, 1)
      continue
    }
    const distance = Math.hypot(b.x - s.x, b.y - (s.y + 18))
    if (s.hammer > 0 && distance < 52) {
      s.barrels.splice(i, 1)
      s.cleared++
      s.score += 150
      s.events.push('pickup')
    } else if (distance < 25) hurt(s, 'barrel')
  }
  for (const bolt of s.bolts)
    if (
      !bolt.taken &&
      Math.abs(s.x - bolt.x) < 23 &&
      Math.abs(s.y + 34 - floorY(bolt.floor, bolt.x)) < 35
    ) {
      bolt.taken = true
      s.score += 300 * s.stage
      s.events.push('point')
    }
  if (
    !s.hammerTaken &&
    Math.abs(s.x - 370) < 25 &&
    Math.abs(s.y + 34 - floorY(2, 370)) < 30
  ) {
    s.hammerTaken = true
    s.charges = Math.min(2, s.charges + 1)
    s.events.push('boost')
  }
  const exit = s.stage % 2 === 0 ? 70 : 730
  if (
    s.floor === 4 &&
    Math.abs(s.x - exit) < 28 &&
    s.bolts.every((b) => b.taken) &&
    s.phase !== 'over'
  ) {
    s.score += 1000 * s.stage
    s.phase = 'choice'
    s.events.push('point')
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: Math.min(5, s.lives + (id === 'rest' ? 1 : 0)),
      elapsed: s.elapsed,
      carry: { charges: id === 'hammer' ? 1 : 0, cleared: s.cleared },
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
      bolts: s.bolts.map((b) => (b.taken ? '1' : '0')).join(''),
      charges: s.charges,
      cleared: s.cleared,
    },
  }
}
