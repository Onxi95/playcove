import { createScene, HEIGHT, LIMITS, WIDTH } from './engine.ts'
import type {
  Levels,
  Mode,
  Pickup,
  Rock,
  Saucer,
  Scene,
  Upgrade,
} from './engine.ts'

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function number(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  )
}
function integer(
  value: unknown,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
): value is number {
  return number(value, min, max) && Number.isSafeInteger(value)
}
function vector(value: Record<string, unknown>): value is Record<
  string,
  unknown
> & {
  x: number
  y: number
  vx: number
  vy: number
} {
  return (
    number(value.x, 0, WIDTH) &&
    number(value.y, 0, HEIGHT) &&
    number(value.vx, -2000, 2000) &&
    number(value.vy, -2000, 2000)
  )
}
function rock(value: unknown): value is Rock {
  return (
    object(value) &&
    vector(value) &&
    integer(value.id, 1) &&
    (value.size === 1 || value.size === 2 || value.size === 3) &&
    number(value.angle, -1e8, 1e8) &&
    number(value.spin, -10, 10) &&
    number(value.shape, 0, 100) &&
    number(value.grace, 0, 1)
  )
}
function saucer(value: unknown): value is Saucer {
  return (
    object(value) &&
    vector(value) &&
    integer(value.id, 1) &&
    integer(value.hp, 1, 100) &&
    integer(value.maxHP, 1, 100) &&
    value.hp <= value.maxHP &&
    number(value.timer, -1, 5) &&
    typeof value.elite === 'boolean' &&
    number(value.phase, 0, 1e8)
  )
}
function pickup(value: unknown): value is Pickup {
  return (
    object(value) &&
    vector(value) &&
    number(value.life, 0, 12) &&
    (value.kind === 'repair' ||
      value.kind === 'shield' ||
      value.kind === 'overdrive')
  )
}
function levels(value: unknown): value is Levels {
  return (
    object(value) &&
    integer(value.rapid, 0, LIMITS.rapid) &&
    integer(value.spread, 0, LIMITS.spread) &&
    integer(value.engine, 0, LIMITS.engine) &&
    integer(value.shield, 0, LIMITS.shield)
  )
}
function upgrade(value: unknown): value is Upgrade {
  return (
    value === 'rapid' ||
    value === 'spread' ||
    value === 'engine' ||
    value === 'shield' ||
    value === 'repair'
  )
}

export function readRun(encoded: string): { scene: Scene; mode: Mode } | null {
  try {
    const value: unknown = JSON.parse(encoded)
    if (
      !object(value) ||
      value.version !== 1 ||
      (value.mode !== 'arcade' && value.mode !== 'classic') ||
      !integer(value.seed, 0, 4294967295) ||
      !integer(value.nextId, 1) ||
      !number(value.elapsed, 0, 1e8) ||
      !integer(value.wave, 1, 100000) ||
      !integer(value.score) ||
      !integer(value.lives, 1, 5) ||
      !integer(value.kills) ||
      !integer(value.combo) ||
      !integer(value.bestCombo) ||
      !number(value.comboTime, 0, 2.8) ||
      (value.phase !== 'flying' && value.phase !== 'upgrade') ||
      !number(value.clearTimer, 0, 1) ||
      !levels(value.levels) ||
      typeof value.shield !== 'boolean' ||
      !number(value.shieldRecharge, 0, 18) ||
      !number(value.overdrive, 0, 8)
    )
      return null
    if (
      !object(value.ship) ||
      !vector(value.ship) ||
      !number(value.ship.angle, -1e8, 1e8) ||
      !number(value.ship.dashFuel, 0, 100)
    )
      return null
    if (
      !Array.isArray(value.rocks) ||
      value.rocks.length > 90 ||
      !value.rocks.every(rock) ||
      !Array.isArray(value.saucers) ||
      value.saucers.length > 2 ||
      !value.saucers.every(saucer) ||
      !Array.isArray(value.pickups) ||
      value.pickups.length > 30 ||
      !value.pickups.every(pickup) ||
      !Array.isArray(value.options) ||
      value.options.length > 3 ||
      !value.options.every(upgrade)
    )
      return null
    if (value.phase === 'upgrade' && value.options.length === 0) return null
    const scene = createScene(value.seed)
    Object.assign(scene, {
      seed: value.seed,
      nextId: value.nextId,
      elapsed: value.elapsed,
      wave: value.wave,
      score: value.score,
      lives: value.lives,
      kills: value.kills,
      combo: value.combo,
      bestCombo: value.bestCombo,
      comboTime: value.comboTime,
      phase: value.phase,
      clearTimer: value.clearTimer,
      levels: value.levels,
      shield: value.shield,
      shieldRecharge: value.shieldRecharge,
      overdrive: value.overdrive,
      options: value.options,
      rocks: value.rocks,
      saucers: value.saucers,
      pickups: value.pickups,
    })
    scene.ship = {
      ...scene.ship,
      x: value.ship.x,
      y: value.ship.y,
      vx: value.ship.vx,
      vy: value.ship.vy,
      angle: value.ship.angle,
      dashFuel: value.ship.dashFuel,
      invulnerable: 1.6,
    }
    return { scene, mode: value.mode }
  } catch {
    return null
  }
}
