import {
  base,
  clamp,
  down,
  loseLife,
  numberCarry,
  pressed,
} from '../kit/arcade.ts'
import type { ArcadeState, ArcadeInput, Progress } from '../kit/arcade.ts'
type Enemy = {
  x: number
  y: number
  hp: number
  kind: number
  timer: number
  warning: number
  alive: boolean
}
type Shot = {
  x: number
  y: number
  vx: number
  vy: number
  enemy: boolean
  life: number
  damage: number
}
export type State = ArcadeState & {
  x: number
  y: number
  vy: number
  vx: number
  aimUp: boolean
  ground: boolean
  facing: number
  camera: number
  fire: number
  invulnerable: number
  grenades: number
  grenadeShots: Array<{
    x: number
    y: number
    vx: number
    vy: number
    fuse: number
  }>
  crouching: boolean
  weapon: number
  ammo: number
  enemies: Enemy[]
  shots: Shot[]
  explosions: Array<{ x: number; y: number; life: number }>
  pickups: Array<{ x: number; kind: number; taken: boolean }>
  boss: {
    x: number
    hp: number
    max: number
    timer: number
    warning: number
    phase: number
  }
  checkpointX: number
  rescued: number
  vehicle: boolean
  reason: string
  buffer: number
}
export const END = 3600
const TERRAIN = [
  [
    { x: 430, y: 435, w: 200 },
    { x: 900, y: 390, w: 230 },
    { x: 1420, y: 440, w: 180 },
    { x: 2010, y: 400, w: 240 },
    { x: 2650, y: 425, w: 190 },
  ],
  [
    { x: 380, y: 420, w: 180 },
    { x: 840, y: 440, w: 250 },
    { x: 1350, y: 395, w: 200 },
    { x: 1880, y: 440, w: 210 },
    { x: 2450, y: 410, w: 260 },
  ],
  [
    { x: 510, y: 445, w: 230 },
    { x: 1000, y: 410, w: 170 },
    { x: 1530, y: 440, w: 240 },
    { x: 2060, y: 395, w: 250 },
    { x: 2660, y: 445, w: 170 },
  ],
]
export function platforms(stage: number) {
  return TERRAIN[(stage - 1) % TERRAIN.length]
}
export function create(p?: Progress): State {
  const stage = p?.stage ?? 1,
    checkpointX = numberCarry(p, 'checkpointX', 0, 0, 2500)
  const s: State = {
    ...base(p),
    x: checkpointX + 70,
    y: 466,
    vy: 0,
    vx: 0,
    aimUp: false,
    ground: true,
    facing: 1,
    camera: 0,
    fire: 0,
    invulnerable: 2,
    grenades: numberCarry(p, 'grenades', 3, 0, 8),
    weapon: numberCarry(p, 'weapon', 0, 0, 2),
    ammo: numberCarry(p, 'ammo', 0, 0, 300),
    enemies: Array.from({ length: 10 + Math.min(6, stage) }, (_, n) => ({
      x: 430 + n * 230,
      y: n % 3 === 1 ? 356 : 466,
      hp: n % 3 === 2 ? 3 : 2,
      kind: n % 3,
      timer: 1.5 + n * 0.15,
      warning: 0,
      alive: 430 + n * 230 > checkpointX,
    })),
    shots: [],
    grenadeShots: [],
    crouching: false,
    explosions: [],
    pickups: [
      { x: 650, kind: 0, taken: checkpointX >= 650 },
      { x: 1230, kind: 1, taken: checkpointX >= 1230 },
      { x: 1820, kind: 2, taken: checkpointX >= 1820 },
      { x: 2520, kind: 0, taken: checkpointX >= 2520 },
    ],
    boss: {
      x: 3380,
      hp: 24 + Math.min(20, stage * 3),
      max: 24 + Math.min(20, stage * 3),
      timer: 2.2,
      warning: 0,
      phase: 0,
    },
    checkpointX,
    rescued: numberCarry(p, 'rescued', 0),
    vehicle: stage % 3 === 0,
    reason: '',
    buffer: 0,
  }
  const ledges = platforms(stage)
  s.enemies.forEach((enemy, index) => {
    if (enemy.kind === 1) {
      const ledge = ledges[Math.floor(index / 3) % ledges.length]
      enemy.x = ledge.x + ledge.w / 2
      enemy.y = ledge.y - 34
      enemy.alive = enemy.x > checkpointX
    }
  })
  const taken = p?.carry.pickups
  if (typeof taken === 'string' && taken.length === s.pickups.length)
    s.pickups.forEach((pickup, index) => (pickup.taken = taken[index] === '1'))
  const flags = p?.carry.enemies
  if (typeof flags === 'string' && flags.length === s.enemies.length)
    s.enemies.forEach(
      (e, n) => (e.alive = flags[n] !== '0' && e.x > checkpointX),
    )
  s.boss.hp = numberCarry(p, 'boss', s.boss.max, 0, s.boss.max)
  return s
}
function hurt(s: State) {
  if (s.invulnerable > 0) return
  loseLife(s)
  s.invulnerable = 2.5
  s.reason = 'fire'
  if (s.lives > 0) {
    s.x = Math.max(s.checkpointX + 70, s.x - 160)
    s.y = 466
    s.vy = 0
    s.shots = s.shots.filter((b) => !b.enemy)
    s.grenades = Math.max(2, s.grenades)
  }
}
export function update(s: State, i: ArcadeInput, dt: number) {
  if (s.phase !== 'play') return
  s.events = []
  s.elapsed += dt
  s.invulnerable = Math.max(0, s.invulnerable - dt)
  s.fire -= dt
  s.buffer = pressed(i, ' ') ? 0.14 : Math.max(0, s.buffer - dt)
  const dx =
      Number(down(i, 'd', 'arrowright')) - Number(down(i, 'a', 'arrowleft')),
    crouch = down(i, 's', 'arrowdown') && s.ground,
    previous = s.y
  s.vx = dx * (s.vehicle ? 265 : 235) * (crouch ? 0.35 : 1)
  if (dx) s.facing = dx
  s.x = clamp(
    s.x + dx * (s.vehicle ? 265 : 235) * (crouch ? 0.35 : 1) * dt,
    20,
    END,
  )
  if (s.buffer > 0 && s.ground) {
    s.vy = -580
    s.ground = false
    s.buffer = 0
  }
  s.y += s.vy * dt
  s.vy += 1500 * dt
  if (s.vy >= 0) {
    for (const p of [...platforms(s.stage), { x: 0, y: 500, w: END + 200 }])
      if (
        s.x > p.x - 12 &&
        s.x < p.x + p.w + 12 &&
        previous + 34 <= p.y + 2 &&
        s.y + 34 >= p.y
      ) {
        s.y = p.y - 34
        s.vy = 0
        s.ground = true
        break
      }
  }
  if (
    s.ground &&
    s.y < 466 &&
    !platforms(s.stage).some(
      (p) =>
        s.x > p.x - 12 && s.x < p.x + p.w + 12 && Math.abs(s.y + 34 - p.y) < 3,
    )
  )
    s.ground = false
  s.crouching = crouch
  const aimUp = down(i, 'arrowup', 'w')
  s.aimUp = aimUp
  if ((down(i, 'j', 'z') || i.pointer.down) && s.fire <= 0) {
    s.fire = s.weapon === 1 && s.ammo > 0 ? 0.085 : 0.21
    const fire = (angle: number) =>
      s.shots.push({
        x: s.x + s.facing * 20,
        y: s.y + (crouch ? 25 : 12),
        vx: Math.cos(angle) * 740,
        vy: Math.sin(angle) * 740,
        enemy: false,
        life: 1.1,
        damage: s.vehicle ? 2 : 1,
      })
    const angle = aimUp ? -Math.PI / 2 : s.facing < 0 ? Math.PI : 0
    fire(angle)
    if (s.weapon === 2 && s.ammo > 0) {
      fire(angle - 0.14)
      fire(angle + 0.14)
    }
    if (s.ammo > 0) {
      s.ammo--
      if (!s.ammo) s.weapon = 0
    }
    s.events.push('hit')
  }
  if (pressed(i, 'x', 'k', 'shift') && s.grenades > 0) {
    s.grenades--
    s.grenadeShots.push({
      x: s.x + s.facing * 22,
      y: s.y + 10,
      vx: s.facing * 350,
      vy: -330,
      fuse: 0.95,
    })
    s.events.push('hit')
  }
  for (let index = s.grenadeShots.length - 1; index >= 0; index--) {
    const grenade = s.grenadeShots[index]
    grenade.x += grenade.vx * dt
    grenade.y += grenade.vy * dt
    grenade.vy += 850 * dt
    grenade.fuse -= dt
    if (grenade.y > 492) {
      grenade.y = 492
      grenade.vy = -Math.abs(grenade.vy) * 0.35
      grenade.vx *= 0.8
    }
    if (grenade.fuse > 0) continue
    s.explosions.push({ x: grenade.x, y: grenade.y, life: 0.45 })
    for (const enemy of s.enemies)
      if (
        enemy.alive &&
        Math.hypot(enemy.x - grenade.x, enemy.y + 15 - grenade.y) < 160
      ) {
        enemy.hp -= 5
        if (enemy.hp <= 0) {
          enemy.alive = false
          s.score += 200
        }
      }
    if (Math.hypot(s.boss.x - grenade.x, 440 - grenade.y) < 180) s.boss.hp -= 6
    s.grenadeShots.splice(index, 1)
    s.events.push('boost')
  }
  for (const e of s.enemies) {
    if (!e.alive || Math.abs(e.x - s.x) > 850) continue
    if (e.kind === 0)
      e.x += Math.sign(s.x - e.x) * Math.min(48, 24 + s.stage * 2) * dt
    e.timer -= dt
    e.warning = e.timer < 0.65 ? 1 : 0
    if (e.timer <= 0) {
      const targetY = s.y + (crouch ? 27 : 15),
        angle = Math.atan2(targetY - (e.y + 12), s.x - e.x),
        speed = 210 + Math.min(100, s.stage * 8)
      s.shots.push({
        x: e.x,
        y: e.y + 12,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        enemy: true,
        life: 4,
        damage: 1,
      })
      if (e.kind === 2)
        s.shots.push({
          x: e.x,
          y: e.y + 12,
          vx: Math.cos(angle + 0.12) * speed,
          vy: Math.sin(angle + 0.12) * speed,
          enemy: true,
          life: 4,
          damage: 1,
        })
      e.timer = Math.max(1.2, 2.9 - s.stage * 0.08)
    }
    if (Math.abs(e.x - s.x) < 22 && Math.abs(e.y - s.y) < 30) hurt(s)
  }
  const b = s.boss
  if (s.x > 2850 && b.hp > 0) {
    b.timer -= dt
    b.warning = b.timer < 0.85 ? 1 : 0
    if (b.timer <= 0) {
      b.phase++
      for (let n = 0; n < 5; n++) {
        const angle = Math.PI + 0.05 + (n - 2) * 0.17
        s.shots.push({
          x: b.x - 40,
          y: 440,
          vx: Math.cos(angle) * 265,
          vy: Math.sin(angle) * 265,
          enemy: true,
          life: 4,
          damage: 1,
        })
      }
      if (b.hp < b.max / 2)
        s.shots.push({
          x: s.x,
          y: 250,
          vx: 0,
          vy: 260,
          enemy: true,
          life: 2,
          damage: 1,
        })
      b.timer = b.hp < b.max / 2 ? 1.7 : 2.5
    }
  }
  for (let n = s.shots.length - 1; n >= 0; n--) {
    const shot = s.shots[n]
    if (!shot) continue
    shot.x += shot.vx * dt
    shot.y += shot.vy * dt
    shot.life -= dt
    if (shot.enemy) {
      if (
        Math.abs(shot.x - s.x) < (s.vehicle ? 30 : 14) &&
        shot.y > s.y + (crouch ? 18 : 0) &&
        shot.y < s.y + 34
      ) {
        hurt(s)
        shot.life = 0
      }
    } else {
      for (const e of s.enemies)
        if (
          e.alive &&
          Math.abs(shot.x - e.x) < 22 &&
          shot.y > e.y - 6 &&
          shot.y < e.y + 36
        ) {
          e.hp -= shot.damage
          shot.life = 0
          if (e.hp <= 0) {
            e.alive = false
            s.score += 200
            s.events.push('pickup')
          }
          break
        }
      if (
        shot.life > 0 &&
        b.hp > 0 &&
        Math.abs(shot.x - b.x) < 55 &&
        shot.y > 390 &&
        shot.y < 500
      ) {
        b.hp -= shot.damage
        shot.life = 0
        s.score += 20
      }
    }
    if (shot.life <= 0 || shot.y > 600 || shot.y < -100) s.shots.splice(n, 1)
  }
  for (const p of s.pickups)
    if (!p.taken && Math.abs(p.x - s.x) < 30) {
      p.taken = true
      if (p.kind === 0) {
        s.weapon = s.stage % 2 ? 1 : 2
        s.ammo = 160
      } else if (p.kind === 1) {
        s.rescued++
        s.score += 500
        s.grenades = Math.min(8, s.grenades + 2)
      } else s.lives = Math.min(5, s.lives + 1)
      s.events.push('pickup')
    }
  for (const e of s.explosions) e.life -= dt
  s.explosions = s.explosions.filter((e) => e.life > 0)
  if (s.x > s.checkpointX + 900 && s.x < 2800) {
    s.checkpointX = Math.floor(s.x / 900) * 900
    s.events.push('point')
  }
  s.camera = clamp(s.x - 260, 0, END - 900)
  if (b.hp <= 0 && s.lives > 0) {
    s.score += 1500 * s.stage
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
      lives: Math.min(5, s.lives + (id === 'medic' ? 1 : 0)),
      elapsed: s.elapsed,
      carry: {
        grenades: id === 'supply' ? 5 : 3,
        weapon: id === 'weapon' ? 2 : 0,
        ammo: id === 'weapon' ? 180 : 0,
        rescued: s.rescued,
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
      checkpointX: s.checkpointX,
      grenades: s.grenades,
      weapon: s.weapon,
      ammo: s.ammo,
      enemies: s.enemies.map((e) => (e.alive ? '1' : '0')).join(''),
      boss: Math.max(0, s.boss.hp),
      pickups: s.pickups.map((p) => (p.taken ? '1' : '0')).join(''),
      rescued: s.rescued,
    },
  }
}
