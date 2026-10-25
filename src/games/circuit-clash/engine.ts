import { opponentMode, skill, botInput } from '../kit/opponent.ts'
import type { OpponentMode } from '../kit/opponent.ts'
import { base, clamp, down, numberCarry, pressed } from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export type Point = { x: number; y: number }
export const TRACKS = [
  {
    en: 'PALM CIRCUIT',
    pl: 'TOR PALMOWY',
    width: 55,
    grip: 1,
    knots: [
      [180, 480],
      [125, 300],
      [280, 145],
      [680, 130],
      [870, 285],
      [800, 480],
      [480, 530],
    ],
  },
  {
    en: 'HARBOR HAIRPINS',
    pl: 'PORTOWE NAWROTY',
    width: 51,
    grip: 0.94,
    knots: [
      [170, 500],
      [140, 300],
      [270, 140],
      [450, 215],
      [630, 120],
      [850, 230],
      [820, 480],
      [550, 515],
      [420, 390],
    ],
  },
  {
    en: 'ALPINE LOOP',
    pl: 'PĘTLA ALPEJSKA',
    width: 49,
    grip: 0.78,
    knots: [
      [180, 500],
      [125, 290],
      [280, 125],
      [460, 210],
      [660, 125],
      [870, 310],
      [760, 505],
      [530, 430],
      [370, 530],
    ],
  },
  {
    en: 'NIGHT GRAND PRIX',
    pl: 'NOCNE GRAND PRIX',
    width: 54,
    grip: 1.08,
    knots: [
      [140, 470],
      [130, 220],
      [330, 130],
      [530, 220],
      [820, 150],
      [870, 450],
      [650, 525],
      [390, 450],
    ],
  },
  {
    en: 'GARDEN CHICANE',
    pl: 'OGRODOWA SZYKANA',
    width: 53,
    grip: 0.98,
    knots: [
      [180, 500],
      [130, 280],
      [280, 145],
      [550, 140],
      [820, 220],
      [830, 460],
      [650, 520],
      [540, 360],
      [370, 480],
    ],
  },
]
export type Car = {
  x: number
  y: number
  vx: number
  vy: number
  angle: number
  speed: number
  nitro: number
  boost: number
  lap: number
  gate: number
  nearest: number
  offroad: boolean
  drifting: boolean
  drafting: boolean
  drift: number
  bestLap: number
  lapTime: number
  skids: Point[]
}
export type State = ArcadeState & {
  cars: Car[]
  path: Point[]
  track: number
  wins: number[]
  countdown: number
  lastWinner: number
  roundTime: number
  pickups: Array<Point & { timers: number[] }>
  laps: number
  bumps: number
  mode: OpponentMode
  botTimer: number
  botKeys: string[]
  reason: string
}
export function trackPath(track: number): Point[] {
  const points = TRACKS[track].knots
  const result: Point[] = []
  for (let index = 0; index < points.length; index++) {
    const a = points[(index - 1 + points.length) % points.length],
      b = points[index],
      c = points[(index + 1) % points.length],
      d = points[(index + 2) % points.length]
    for (let step = 0; step < 20; step++) {
      const t = step / 20,
        t2 = t * t,
        t3 = t2 * t
      result.push({
        x:
          0.5 *
          (2 * b[0] +
            (-a[0] + c[0]) * t +
            (2 * a[0] - 5 * b[0] + 4 * c[0] - d[0]) * t2 +
            (-a[0] + 3 * b[0] - 3 * c[0] + d[0]) * t3),
        y:
          0.5 *
          (2 * b[1] +
            (-a[1] + c[1]) * t +
            (2 * a[1] - 5 * b[1] + 4 * c[1] - d[1]) * t2 +
            (-a[1] + 3 * b[1] - 3 * c[1] + d[1]) * t3),
      })
    }
  }
  return result
}
function car(path: Point[], index: number): Car {
  const a = path[0],
    b = path[1],
    angle = Math.atan2(b.y - a.y, b.x - a.x),
    side = index ? 1 : -1
  return {
    x: a.x - Math.sin(angle) * side * 18,
    y: a.y + Math.cos(angle) * side * 18,
    vx: 0,
    vy: 0,
    angle,
    speed: 0,
    nitro: 60,
    boost: 0,
    lap: 0,
    gate: 1,
    nearest: 0,
    offroad: false,
    drifting: false,
    drafting: false,
    drift: 0,
    bestLap: 0,
    lapTime: 0,
    skids: [],
  }
}
export function create(p?: Progress): State {
  const track = Math.floor(numberCarry(p, 'track', 0, 0, 4)),
    path = trackPath(track)
  return {
    ...base(p),
    track,
    path,
    cars: [car(path, 0), car(path, 1)],
    wins: [numberCarry(p, 'w1', 0, 0, 7), numberCarry(p, 'w2', 0, 0, 7)],
    countdown: 2.2,
    lastWinner: -1,
    roundTime: 0,
    pickups: [0.18, 0.48, 0.77].map((r) => ({
      ...path[Math.floor(path.length * r)],
      timers: [0, 0],
    })),
    laps: Math.floor(numberCarry(p, 'laps', 0)),
    bumps: 0,
    mode: opponentMode(p?.carry.mode),
    botTimer: 0,
    botKeys: [],
    reason: '',
  }
}
export function nearest(s: State, p: Point) {
  let distance = Infinity,
    index = 0
  for (let n = 0; n < s.path.length; n++) {
    const d = (s.path[n].x - p.x) ** 2 + (s.path[n].y - p.y) ** 2
    if (d < distance) {
      distance = d
      index = n
    }
  }
  return { index, distance: Math.sqrt(distance) }
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
  const track = TRACKS[s.track]
  for (let index = 0; index < 2; index++) {
    const c = s.cars[index],
      throttle = down(i, index ? 'arrowup' : 'w'),
      brake = down(i, index ? 'arrowdown' : 's'),
      steer =
        Number(down(i, index ? 'arrowright' : 'd')) -
        Number(down(i, index ? 'arrowleft' : 'a'))
    c.lapTime += dt
    c.boost = Math.max(0, c.boost - dt)
    c.nitro = Math.min(100, c.nitro + dt * 1.4)
    const rival = s.cars[1 - index],
      toward =
        (rival.x - c.x) * Math.cos(c.angle) +
        (rival.y - c.y) * Math.sin(c.angle),
      offset =
        -(rival.x - c.x) * Math.sin(c.angle) +
        (rival.y - c.y) * Math.cos(c.angle)
    c.drafting =
      toward > 30 &&
      toward < 115 &&
      Math.abs(offset) < 22 &&
      Math.hypot(c.vx, c.vy) > 90
    if (c.drafting) c.nitro = Math.min(100, c.nitro + dt * 4)
    if (
      first &&
      pressed(i, index ? 'enter' : ' ') &&
      c.nitro >= 25 &&
      c.boost === 0
    ) {
      c.nitro -= 25
      c.boost = 1.4
      s.events.push('boost')
    }
    const v = Math.hypot(c.vx, c.vy)
    c.drifting = down(i, index ? 'shift' : 'q') && v > 95 && !c.offroad
    c.angle +=
      steer * dt * (1.3 + Math.min(1, v / 150) * 1.6) * (brake ? 1.18 : 1)
    if (!throttle && brake && v < 20) c.angle += steer * dt
    const forward = c.vx * Math.cos(c.angle) + c.vy * Math.sin(c.angle),
      side = -c.vx * Math.sin(c.angle) + c.vy * Math.cos(c.angle),
      grip = (c.drifting ? 2.2 : 10) * track.grip,
      newSide = side * Math.exp(-grip * dt),
      acceleration = throttle ? (c.boost > 0 ? 275 : 180) : brake ? -240 : -65,
      top = c.offroad ? 92 : c.boost > 0 ? 310 : 218
    let speed = clamp(forward + acceleration * dt, 0, top)
    if (c.offroad) speed = Math.min(speed, Math.max(80, v - 250 * dt))
    c.speed = speed
    c.vx = Math.cos(c.angle) * speed - Math.sin(c.angle) * newSide
    c.vy = Math.sin(c.angle) * speed + Math.cos(c.angle) * newSide
    c.x = clamp(c.x + c.vx * dt, 35, 965)
    c.y = clamp(c.y + c.vy * dt, 75, 605)
    const at = nearest(s, c)
    c.nearest = at.index
    c.offroad = at.distance > track.width - 6
    if (c.drifting && Math.abs(steer) > 0) {
      c.drift += dt
      if (Math.floor(s.roundTime * 20) !== Math.floor((s.roundTime - dt) * 20))
        c.skids.push({ x: c.x, y: c.y })
      c.nitro = Math.min(100, c.nitro + dt * 6)
    } else c.drift = 0
    c.skids = c.skids.slice(-45)
    const gateIndex =
        c.gate === 4 ? 0 : Math.floor((s.path.length * c.gate) / 4),
      next = s.path[(at.index + 1) % s.path.length],
      here = s.path[at.index],
      direction = (next.x - here.x) * c.vx + (next.y - here.y) * c.vy,
      indexGap = Math.min(
        Math.abs(at.index - gateIndex),
        s.path.length - Math.abs(at.index - gateIndex),
      )
    if (indexGap <= 3 && !c.offroad && direction > 0) {
      if (c.gate === 4) {
        c.lap++
        s.laps++
        c.bestLap = c.bestLap ? Math.min(c.bestLap, c.lapTime) : c.lapTime
        c.lapTime = 0
        c.gate = 1
        s.score += 400
        if (c.lap >= 5) {
          s.lastWinner = index
          s.wins[index]++
          s.score += 1000
          s.events.push('point')
          if (s.wins[index] >= 7) {
            s.phase = 'over'
            s.reason = `P${index + 1}`
          } else s.phase = 'choice'
        }
      } else {
        c.gate++
        c.nitro = Math.min(100, c.nitro + 8)
        s.score += 50
        s.events.push('pickup')
      }
    }
    for (const pickup of s.pickups) {
      pickup.timers[index] = Math.max(0, pickup.timers[index] - dt)
      if (
        pickup.timers[index] === 0 &&
        Math.hypot(c.x - pickup.x, c.y - pickup.y) < 26
      ) {
        pickup.timers[index] = 8
        c.nitro = Math.min(100, c.nitro + 16)
        s.events.push('pickup')
      }
    }
  }
  const a = s.cars[0],
    b = s.cars[1],
    dx = b.x - a.x,
    dy = b.y - a.y,
    distance = Math.hypot(dx, dy)
  if (distance < 29 && distance > 0.001) {
    const nx = dx / distance,
      ny = dy / distance,
      overlap = (29 - distance) / 2
    a.x -= nx * overlap
    a.y -= ny * overlap
    b.x += nx * overlap
    b.y += ny * overlap
    const relative = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
    if (relative < 0) {
      a.vx += relative * nx * 0.8
      a.vy += relative * ny * 0.8
      b.vx -= relative * nx * 0.8
      b.vy -= relative * ny * 0.8
      s.bumps++
      if (s.bumps % 15 === 1) s.events.push('hit')
    }
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const track =
    id === 'alpine' ? 2 : id === 'night' ? 3 : (s.track + 1) % TRACKS.length
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: 3,
      elapsed: s.elapsed,
      carry: {
        track,
        mode: s.mode,
        w1: s.wins[0],
        w2: s.wins[1],
        laps: s.laps,
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
      track: s.track,
      mode: s.mode,
      w1: s.wins[0],
      w2: s.wins[1],
      laps: s.laps,
    },
  }
}

function computerInput(
  s: State,
  input: ArcadeInput,
  seconds: number,
): ArcadeInput {
  const c = s.cars[1],
    level = skill(s.mode)
  s.botTimer -= Math.min(0.1, seconds)
  const at = nearest(s, c),
    target = s.path[(at.index + [5, 6, 7][level]) % s.path.length],
    desired = Math.atan2(target.y - c.y, target.x - c.x),
    angle = Math.atan2(Math.sin(desired - c.angle), Math.cos(desired - c.angle))
  if (s.botTimer <= 0) {
    s.botTimer = [0.22, 0.12, 0.06][level]
    s.botKeys = []
    if (angle > 0.055) s.botKeys.push('arrowright')
    if (angle < -0.055) s.botKeys.push('arrowleft')
    s.botKeys.push(
      Math.abs(angle) > 0.65 || c.speed > [160, 195, 218][level]
        ? 'arrowdown'
        : 'arrowup',
    )
    if (
      level > 0 &&
      Math.abs(angle) > 0.18 &&
      Math.abs(angle) < 0.4 &&
      c.speed > 140 &&
      c.speed < 185
    )
      s.botKeys.push('shift')
  }
  const tapped: string[] = []
  const ahead = s.path[(at.index + 14) % s.path.length],
    turn = Math.atan2(ahead.y - target.y, ahead.x - target.x),
    bend = Math.atan2(Math.sin(turn - desired), Math.cos(turn - desired))
  if (
    c.nitro >= 45 &&
    c.boost === 0 &&
    !c.offroad &&
    Math.abs(angle) < 0.12 &&
    Math.abs(bend) < 0.3 &&
    c.speed > 130
  )
    tapped.push('enter')
  return botInput(input, s.botKeys, tapped)
}
