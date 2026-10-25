import { base, down, loseLife, numberCarry, pressed } from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const COLS = 13,
  ROWS = 14,
  HOMES = [1, 3, 6, 9, 11],
  RIVER = [1, 2, 4, 5, 6],
  ROAD = [8, 9, 10, 11, 12]
export type State = ArcadeState & {
  x: number
  y: number
  fromX: number
  fromY: number
  toX: number
  toY: number
  hop: number
  cooldown: number
  homes: boolean[]
  safeX: number
  safeY: number
  invulnerable: number
  highest: number
  rewinds: number
  leafX: number
  leafTaken: boolean
  reason: string
  flow: number
  route: number
}
export function create(progress?: Progress): State {
  const s: State = {
    ...base(progress),
    x: 6,
    y: 13,
    fromX: 6,
    fromY: 13,
    toX: 6,
    toY: 13,
    hop: 1,
    cooldown: 0,
    homes: Array(5).fill(false),
    safeX: 6,
    safeY: 13,
    invulnerable: 1,
    highest: 13,
    rewinds: 1,
    leafX: 2 + (((progress?.stage ?? 1) * 3) % 9),
    leafTaken: false,
    reason: '',
    flow: numberCarry(progress, 'flow', 0),
    route: Math.floor(numberCarry(progress, 'route', 0, 0, 1)),
  }
  const homes = progress?.carry.homes
  if (typeof homes === 'string' && /^[01]{5}$/.test(homes))
    s.homes = homes.split('').map((v) => v === '1')
  s.rewinds = numberCarry(progress, 'rewinds', 1, 0, 2)
  return s
}
export function laneSpeed(s: State, row: number) {
  return (
    (0.7 + (row % 3) * 0.27 + Math.min(0.95, (s.stage - 1) * 0.06)) *
    (row % 2 ? 1 : -1) *
    (s.route ? 1.1 : 1)
  )
}
export function laneObjects(s: State, row: number) {
  const river = RIVER.includes(row),
    width = river ? 3.2 : row % 2 ? 1.25 : 2.1,
    spacing = river ? 6.4 : 5.1
  const speed = laneSpeed(s, row)
  return Array.from({ length: 5 }, (_, i) => {
    const x =
      ((((i * spacing + row * 1.7 + s.flow * speed) % (spacing * 5)) +
        spacing * 5) %
        (spacing * 5)) -
      spacing
    const turtle = river && s.stage >= 3 && row % 2 === 0
    const cycle = (s.flow + row) % 9
    return {
      x,
      width,
      turtle,
      warning: turtle && cycle > 6.7 && cycle < 7.6,
      submerged: turtle && cycle >= 7.6,
    }
  }).filter((o) => o.x + o.width >= -1 && o.x < 14)
}
function death(s: State, reason: string) {
  if (s.invulnerable > 0) return
  loseLife(s)
  s.reason = reason
  s.x = 6
  s.y = 13
  s.fromX = 6
  s.fromY = 13
  s.toX = 6
  s.toY = 13
  s.hop = 1
  s.highest = 13
  s.invulnerable = 1.1
  s.cooldown = 0.15
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.flow += dt
  s.invulnerable = Math.max(0, s.invulnerable - dt)
  s.cooldown = Math.max(0, s.cooldown - dt)
  if (pressed(input, 'x') && s.rewinds > 0) {
    s.rewinds--
    s.x = s.safeX
    s.y = s.safeY
    s.toX = s.x
    s.toY = s.y
    s.hop = 1
    s.invulnerable = 0.5
    s.events.push('boost')
  }
  if (s.hop >= 1 && s.cooldown === 0) {
    const dx =
        Number(down(input, 'arrowright', 'd')) -
        Number(down(input, 'arrowleft', 'a')),
      dy =
        Number(down(input, 'arrowdown', 's')) -
        Number(down(input, 'arrowup', 'w', ' '))
    if (dx || dy) {
      s.fromX = s.x
      s.fromY = s.y
      s.toX = Math.round(s.x) + (dx ? Math.sign(dx) : 0)
      s.toY = s.y + (dx ? 0 : Math.sign(dy))
      if (s.toX >= 0 && s.toX < 13 && s.toY >= 0 && s.toY <= 13) {
        s.hop = 0
        s.cooldown = 0.19
      } else {
        s.toX = s.x
        s.toY = s.y
      }
    }
  }
  if (s.hop < 1) {
    s.hop = Math.min(1, s.hop + dt * 9)
    s.x = s.fromX + (s.toX - s.fromX) * s.hop
    s.y = s.fromY + (s.toY - s.fromY) * s.hop
    if (s.hop === 1) {
      s.x = s.toX
      s.y = s.toY
      s.events.push('hit')
      if (s.y < s.highest) {
        s.score += 10
        s.highest = s.y
      }
    }
  }
  const row = Math.round(s.y)
  if (ROAD.includes(row) && Math.abs(row - s.y) < 0.35) {
    if (
      laneObjects(s, row).some(
        (o) => s.x + 0.25 > o.x && s.x - 0.25 < o.x + o.width,
      )
    )
      death(s, 'traffic')
  }
  if (s.hop >= 1 && RIVER.includes(row)) {
    const log = laneObjects(s, row).find(
      (o) => !o.submerged && s.x - 0.18 >= o.x && s.x + 0.18 <= o.x + o.width,
    )
    if (!log) death(s, 'water')
    else {
      s.x += laneSpeed(s, row) * dt
      s.toX = s.x
      s.fromX = s.x
      if (s.x < -0.1 || s.x > 12.8) death(s, 'edge')
    }
  }
  if (s.hop >= 1 && (s.y === 7 || s.y === 3 || s.y === 13)) {
    s.safeX = Math.round(s.x)
    s.safeY = s.y
  }
  if (!s.leafTaken && s.y === 3 && Math.abs(s.x - s.leafX) < 0.4) {
    s.leafTaken = true
    s.rewinds = Math.min(2, s.rewinds + 1)
    s.score += 200
    s.events.push('pickup')
  }
  if (s.hop >= 1 && s.y === 0) {
    const index = HOMES.findIndex((x) => Math.abs(s.x - x) < 0.45)
    if (index < 0 || s.homes[index]) death(s, 'home')
    else {
      s.homes[index] = true
      s.score += 500 * s.stage
      s.events.push('point')
      s.x = 6
      s.y = 13
      s.toX = 6
      s.toY = 13
      s.hop = 1
      s.highest = 13
      s.safeX = 6
      s.safeY = 13
      s.leafTaken = false
      s.leafX = 1 + (((index + s.stage) * 3) % 11)
      s.invulnerable = 0.6
      if (s.homes.every(Boolean)) {
        s.score += 1000 * s.stage
        s.phase = 'choice'
      }
    }
  }
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  Object.assign(
    s,
    create({
      stage: s.stage + 1,
      score: s.score,
      lives: Math.min(5, s.lives + 1),
      elapsed: s.elapsed,
      carry: { route: id === 'rapids' ? 1 : 0 },
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
      homes: s.homes.map((v) => (v ? '1' : '0')).join(''),
      rewinds: s.rewinds,
      flow: s.flow,
      route: s.route,
    },
  }
}
