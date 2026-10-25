import {
  base,
  clamp,
  down,
  numberCarry,
  pressed,
  random,
} from '../kit/arcade.ts'
import type { ArcadeState, ArcadeInput, Progress } from '../kit/arcade.ts'
export type Car = {
  z: number
  x: number
  speed: number
  color: number
  passed: boolean
  kind: number
}
export type State = ArcadeState & {
  distance: number
  speed: number
  x: number
  steering: number
  lateral: number
  nitro: number
  boost: number
  integrity: number
  time: number
  traffic: Car[]
  spawn: number
  collision: number
  route: number
  near: number
  reason: string
  drift: number
  drifting: boolean
  driftTotal: number
  combo: number
  comboTime: number
  bestCombo: number
  drafting: number
  gate: number
  overtakes: number
  clean: number
  braking: boolean
  toast: string
  toastTime: number
  toastValue: number
  shake: number
  marks: Array<{ z: number; x: number }>
  tuning: number
}
export const LENGTH = 18000,
  GATE = 4500,
  VIEW = 4400
export const ROUTES = [
  {
    en: 'SUNSET COAST',
    pl: 'WYBRZEŻE O ZACHODZIE',
    reward: 1,
    traffic: 1,
    grip: 1,
  },
  {
    en: 'PALM EXPRESS',
    pl: 'PALMOWA AUTOSTRADA',
    reward: 1,
    traffic: 0.9,
    grip: 1.05,
  },
  {
    en: 'SIERRA PASS',
    pl: 'PRZEŁĘCZ SIERRA',
    reward: 1.5,
    traffic: 0.95,
    grip: 0.85,
  },
  {
    en: 'MIDNIGHT RUN',
    pl: 'NOCNY PRZEJAZD',
    reward: 1.3,
    traffic: 1.3,
    grip: 0.95,
  },
]
export function curve(z: number, route: number) {
  const start = Math.min(1, Math.max(0, (z - 550) / 1800))
  return (
    start *
    (Math.sin(z / (route === 2 ? 950 : 1550) + route * 0.9) *
      (route === 2 ? 0.95 : 0.68) +
      Math.sin(z / 3700) * 0.3)
  )
}
function makeCar(s: State, z: number, lane: number, kind = 0): Car {
  return {
    z,
    x: lane * 0.64,
    speed: kind === 1 ? 85 : 105 + random(s) * 45,
    color: Math.floor(random(s) * 6),
    passed: false,
    kind,
  }
}
function validTraffic(encoded: unknown): Car[] | null {
  if (typeof encoded !== 'string') return null
  try {
    const cars: unknown = JSON.parse(encoded)
    if (!Array.isArray(cars) || cars.length > 70) return null
    const result: Car[] = []
    for (const c of cars) {
      if (
        typeof c !== 'object' ||
        c === null ||
        !('z' in c) ||
        typeof c.z !== 'number' ||
        !Number.isFinite(c.z) ||
        !('x' in c) ||
        typeof c.x !== 'number' ||
        Math.abs(c.x) > 1 ||
        !('speed' in c) ||
        typeof c.speed !== 'number' ||
        c.speed < 0 ||
        c.speed > 200 ||
        !('color' in c) ||
        typeof c.color !== 'number' ||
        !Number.isInteger(c.color) ||
        c.color < 0 ||
        c.color > 5 ||
        !('kind' in c) ||
        typeof c.kind !== 'number' ||
        !Number.isInteger(c.kind) ||
        c.kind < 0 ||
        c.kind > 2 ||
        !('passed' in c) ||
        typeof c.passed !== 'boolean'
      )
        return null
      result.push({
        z: c.z,
        x: c.x,
        speed: c.speed,
        color: c.color,
        kind: c.kind,
        passed: c.passed,
      })
    }
    return result
  } catch {
    return null
  }
}
export function create(p?: Progress): State {
  const s: State = {
    ...base(p),
    distance: numberCarry(p, 'distance', 0, 0, LENGTH),
    speed: numberCarry(p, 'speed', 100, 0, 330),
    x: numberCarry(p, 'x', 0, -1.6, 1.6),
    steering: 0,
    lateral: 0,
    nitro: numberCarry(p, 'nitro', 55, 0, 100),
    boost: 0,
    integrity: numberCarry(p, 'integrity', 100, 1, 100),
    time: numberCarry(p, 'time', 34, 0, 180),
    traffic: [],
    spawn: 2.2,
    collision: 0,
    route: Math.floor(numberCarry(p, 'route', 0, 0, 3)),
    near: numberCarry(p, 'near', 0),
    reason: '',
    drift: 0,
    drifting: false,
    driftTotal: numberCarry(p, 'driftTotal', 0),
    combo: 0,
    comboTime: 0,
    bestCombo: numberCarry(p, 'bestCombo', 0),
    drafting: 0,
    gate: Math.floor(numberCarry(p, 'gate', 0, 0, 3)),
    overtakes: numberCarry(p, 'overtakes', 0),
    clean: 0,
    braking: false,
    toast: 'start',
    toastTime: 3,
    toastValue: 0,
    shake: 0,
    marks: [],
    tuning: Math.floor(numberCarry(p, 'tuning', 0, 0, 3)),
  }
  s.traffic = validTraffic(p?.carry.traffic) ?? [
    makeCar(s, s.distance + 360, 0),
    makeCar(s, s.distance + 830, -1, 1),
    makeCar(s, s.distance + 1350, 1),
    makeCar(s, s.distance + 1950, 0, 1),
  ]
  return s
}
function announce(s: State, message: string, value = 0) {
  s.toast = message
  s.toastTime = 2
  s.toastValue = value
}
function reward(s: State, points: number, message: string) {
  s.combo = Math.min(5, s.combo + 1)
  s.bestCombo = Math.max(s.bestCombo, s.combo)
  s.comboTime = 6
  const value = Math.round(points * s.combo * ROUTES[s.route].reward)
  s.score += value
  announce(s, message, value)
  s.events.push('pickup')
}
export function update(s: State, i: ArcadeInput, seconds: number) {
  if (s.phase !== 'play') return
  s.events = []
  const steps = Math.max(1, Math.ceil(seconds * 120)),
    dt = Math.min(0.1, seconds) / steps
  for (let n = 0; n < steps && s.phase === 'play'; n++) tick(s, i, dt, n === 0)
}
function tick(s: State, i: ArcadeInput, dt: number, first: boolean) {
  s.elapsed += dt
  s.time -= dt
  s.collision = Math.max(0, s.collision - dt)
  s.boost = Math.max(0, s.boost - dt)
  s.toastTime = Math.max(0, s.toastTime - dt)
  s.shake = Math.max(0, s.shake - dt * 2)
  s.comboTime = Math.max(0, s.comboTime - dt)
  if (s.comboTime === 0) s.combo = 0
  const steer =
      Number(down(i, 'd', 'arrowright')) - Number(down(i, 'a', 'arrowleft')),
    brake = down(i, 's', 'arrowdown'),
    bend = curve(s.distance, s.route)
  s.steering += (steer - s.steering) * (1 - Math.exp(-dt * 9))
  s.braking = brake
  if (first && pressed(i, 'x', 'shift') && s.nitro >= 30) {
    s.nitro -= 30
    s.boost = 2.1
    s.events.push('boost')
    announce(s, 'boost')
  }
  const wasDrifting = s.drifting
  s.drifting =
    down(i, ' ') &&
    Math.abs(s.steering) > 0.35 &&
    s.speed > 115 &&
    Math.abs(s.x) < 1.05
  if (s.drifting && Math.abs(bend) > 0.15) {
    s.drift += dt * s.speed * 0.38
    s.comboTime = Math.max(s.comboTime, 1)
    if (Math.floor(s.elapsed * 25) !== Math.floor((s.elapsed - dt) * 25))
      s.marks.push({ z: s.distance, x: s.x })
  }
  if (wasDrifting && !s.drifting) {
    if (s.drift >= 60) {
      const tier = Math.min(3, Math.floor(s.drift / 60))
      s.nitro = Math.min(100, s.nitro + 12 + tier * 8)
      s.driftTotal++
      reward(s, 100 * tier, 'drift')
    }
    s.drift = 0
  }
  const top = s.boost > 0 ? 325 : 245 + s.tuning * 5,
    acceleration = brake ? -165 : s.drifting ? -22 : s.boost > 0 ? 160 : 95
  s.speed = clamp(s.speed + acceleration * dt, 0, top)
  const target =
    s.steering *
    (0.65 + s.speed / 240) *
    (s.drifting ? 1.32 : 1) *
    ROUTES[s.route].grip
  s.lateral +=
    (target - s.lateral) * (1 - Math.exp(-dt * (s.drifting ? 3.5 : 8)))
  s.x = clamp(
    s.x + (s.lateral - bend * (s.speed / 245) ** 2 * 0.55) * dt,
    -1.6,
    1.6,
  )
  if (Math.abs(s.x) > 1.06) {
    s.speed = Math.max(70, s.speed - 210 * dt)
    s.integrity -= dt * 5
    s.combo = 0
    s.comboTime = 0
    s.clean = 0
    s.reason = 'shoulder'
  } else s.clean += dt
  s.distance += s.speed * dt
  s.nitro = Math.min(100, s.nitro + dt * 0.65)
  s.spawn -= dt
  s.drafting = 0
  if (s.spawn <= 0) {
    const lane = Math.floor(random(s) * 3) - 1,
      z = s.distance + 2400,
      pattern = Math.floor(random(s) * 4)
    s.traffic.push(
      makeCar(s, z, lane, pattern === 0 ? 1 : pattern === 3 ? 2 : 0),
    )
    if (pattern === 2) {
      const other = lane === 1 ? -1 : 1
      s.traffic.push(makeCar(s, z + 65, other, 0))
    }
    s.spawn =
      Math.max(1.1, 2.7 - Math.min(12, s.stage) * 0.09) /
      ROUTES[s.route].traffic
  }
  for (let index = s.traffic.length - 1; index >= 0; index--) {
    const car = s.traffic[index],
      previous = car.z - s.distance + s.speed * dt
    car.z += car.speed * dt
    const gap = car.z - s.distance,
      side = Math.abs(car.x - s.x),
      width = car.kind === 1 ? 0.24 : car.kind === 2 ? 0.15 : 0.205
    if (gap > 55 && gap < 420 && side < 0.2 && s.speed > car.speed) {
      s.drafting = 1 - gap / 500
      s.nitro = Math.min(100, s.nitro + dt * 7 * s.drafting)
    }
    if (gap < 28 && gap > -35 && side < width && s.collision === 0) {
      s.integrity = Math.max(0, s.integrity - 24)
      s.speed *= 0.48
      s.lateral += s.x >= car.x ? 0.75 : -0.75
      s.collision = 1.1
      s.shake = 1
      s.combo = 0
      s.comboTime = 0
      s.drift = 0
      s.clean = 0
      s.reason = 'traffic'
      s.events.push('hit')
      announce(s, 'collision')
    }
    if (!car.passed && gap < -18) {
      car.passed = true
      s.overtakes++
      s.score += Math.round(50 * ROUTES[s.route].reward)
      if (
        side >= width + 0.015 &&
        side < width + 0.25 &&
        previous > -60 &&
        s.collision === 0
      ) {
        s.near++
        s.nitro = Math.min(100, s.nitro + 10)
        reward(s, 180, 'near')
      }
    }
    if (gap < -180 || gap > VIEW + 500) s.traffic.splice(index, 1)
  }
  const ordered = [...s.traffic].sort((a, b) => a.z - b.z)
  for (let index = 0; index < ordered.length - 2; index++) {
    const group = ordered.slice(index, index + 3)
    if (
      group[2].z - group[0].z < 260 &&
      new Set(group.map((car) => car.x)).size === 3
    ) {
      group[0].speed = Math.max(60, group[0].speed - 100 * dt)
      group[2].speed = Math.min(190, group[2].speed + 100 * dt)
    }
  }
  s.marks = s.marks.filter((mark) => s.distance - mark.z < 550).slice(-100)
  const gate = Math.min(3, Math.floor(s.distance / GATE))
  if (gate > s.gate) {
    s.gate = gate
    s.time = Math.min(90, s.time + (s.route === 2 ? 18 : 22))
    s.integrity = Math.min(100, s.integrity + 8)
    s.score += 500 * s.stage
    s.events.push('point')
    announce(s, 'checkpoint', s.route === 2 ? 18 : 22)
  }
  if (s.integrity <= 0 || s.time <= 0) {
    s.lives = 0
    s.phase = 'over'
    s.reason = s.integrity <= 0 ? 'damage' : 'time'
  } else if (s.distance >= LENGTH) {
    s.score += Math.floor(s.time) * 25 + 750 * s.stage
    s.phase = 'choice'
    s.events.push('point')
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const route = id === 'coast' ? 1 : id === 'mountain' ? 2 : 3
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: 3,
      elapsed: s.elapsed,
      carry: {
        route,
        nitro: Math.min(100, s.nitro + 25),
        integrity: Math.min(100, s.integrity + 30),
        time: route === 2 ? 29 : 34,
        near: s.near,
        driftTotal: s.driftTotal,
        bestCombo: s.bestCombo,
        overtakes: s.overtakes,
        tuning: Math.min(3, Math.floor(s.stage / 3)),
      },
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
      distance: s.distance,
      speed: s.speed,
      x: s.x,
      nitro: s.nitro,
      integrity: s.integrity,
      time: s.time,
      route: s.route,
      near: s.near,
      driftTotal: s.driftTotal,
      bestCombo: s.bestCombo,
      overtakes: s.overtakes,
      gate: s.gate,
      tuning: s.tuning,
      traffic: JSON.stringify(s.traffic),
    },
  }
}
