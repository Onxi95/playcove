export const WIDTH = 1000
export const HEIGHT = 640
export type Mode = 'arcade' | 'classic'
export type Upgrade = 'rapid' | 'spread' | 'engine' | 'shield' | 'repair'
export type Levels = {
  rapid: number
  spread: number
  engine: number
  shield: number
}
type Vec = { x: number; y: number; vx: number; vy: number }
export type Rock = Vec & {
  id: number
  size: 1 | 2 | 3
  angle: number
  spin: number
  shape: number
  grace: number
}
export type Shot = Vec & { life: number; enemy: boolean }
export type Saucer = Vec & {
  id: number
  hp: number
  maxHP: number
  timer: number
  elite: boolean
  phase: number
}
export type Pickup = Vec & {
  kind: 'repair' | 'shield' | 'overdrive'
  life: number
}
export type Particle = Vec & { life: number; total: number; color: string }
export type Floater = { x: number; y: number; value: number; life: number }
export type Input = {
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  fire: boolean
  dash: boolean
  aim: { x: number; y: number } | null
}
export type Scene = {
  seed: number
  nextId: number
  elapsed: number
  wave: number
  score: number
  lives: number
  kills: number
  combo: number
  bestCombo: number
  comboTime: number
  phase: 'flying' | 'upgrade' | 'over'
  clearTimer: number
  levels: Levels
  shield: boolean
  shieldRecharge: number
  overdrive: number
  shake: number
  options: Upgrade[]
  ship: Vec & {
    angle: number
    fireTimer: number
    invulnerable: number
    dashTimer: number
    dashFuel: number
    thrust: number
  }
  rocks: Rock[]
  shots: Shot[]
  saucers: Saucer[]
  pickups: Pickup[]
  particles: Particle[]
  floaters: Floater[]
  events: Array<'hit' | 'pickup' | 'boost' | 'point'>
}

export const SECTORS = [
  { id: 'orbit', en: 'Open orbit', pl: 'Otwarta orbita', color: '#edc487' },
  { id: 'belt', en: 'Debris belt', pl: 'Pas odłamków', color: '#8ed9d2' },
  { id: 'crossfire', en: 'Crossfire', pl: 'Krzyżowy ogień', color: '#f4a5a0' },
  {
    id: 'fragments',
    en: 'Shard storm',
    pl: 'Burza odłamków',
    color: '#b9a4e8',
  },
  { id: 'hunter', en: 'Hunter patrol', pl: 'Patrol łowcy', color: '#efb770' },
]
export const LIMITS: Levels = { rapid: 4, spread: 2, engine: 3, shield: 3 }
export function emptyInput(): Input {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    fire: false,
    dash: false,
    aim: null,
  }
}
export function sectorFor(wave: number) {
  return SECTORS[(wave - 1) % SECTORS.length]
}
export function radius(size: Rock['size']) {
  return size === 3 ? 44 : size === 2 ? 27 : 14
}
export function wrap(value: number, extent: number) {
  return ((value % extent) + extent) % extent
}
export function offset(from: number, to: number, extent: number) {
  return wrap(to - from + extent / 2, extent) - extent / 2
}
export function distance(
  a: { x: number; y: number },
  b: { x: number; y: number },
) {
  return Math.hypot(offset(a.x, b.x, WIDTH), offset(a.y, b.y, HEIGHT))
}
function random(scene: Scene) {
  scene.seed = (Math.imul(scene.seed, 1664525) + 1013904223) >>> 0
  return scene.seed / 4294967296
}
function move(body: Vec, delta: number) {
  body.x = wrap(body.x + body.vx * delta, WIDTH)
  body.y = wrap(body.y + body.vy * delta, HEIGHT)
}
function capSpeed(body: Vec, cap: number) {
  const speed = Math.hypot(body.vx, body.vy)
  if (speed > cap) {
    body.vx *= cap / speed
    body.vy *= cap / speed
  }
}

function makeRock(
  scene: Scene,
  size: Rock['size'],
  x: number,
  y: number,
  vx: number,
  vy: number,
): Rock {
  return {
    id: scene.nextId++,
    x: wrap(x, WIDTH),
    y: wrap(y, HEIGHT),
    vx,
    vy,
    size,
    angle: random(scene) * Math.PI * 2,
    spin: (random(scene) - 0.5) * 1.2,
    shape: random(scene) * 100,
    grace: 0.2,
  }
}
export function beginWave(scene: Scene) {
  const sector = sectorFor(scene.wave)
  const count =
    sector.id === 'hunter'
      ? 3
      : Math.min(9, 3 + Math.ceil(scene.wave / 2)) +
        (sector.id === 'fragments' ? 3 : 0)
  scene.phase = 'flying'
  scene.clearTimer = 0
  scene.options = []
  scene.rocks = []
  scene.saucers = []
  scene.shots = []
  scene.ship.invulnerable = Math.max(1.6, scene.ship.invulnerable)
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2 + random(scene) * 0.45
    const x = wrap(
      scene.ship.x + Math.cos(angle) * (330 + random(scene) * 100),
      WIDTH,
    )
    const y = wrap(scene.ship.y + Math.sin(angle) * 260, HEIGHT)
    const direction =
      Math.atan2(
        offset(y, scene.ship.y, HEIGHT),
        offset(x, scene.ship.x, WIDTH),
      ) +
      (random(scene) - 0.5) * 0.7
    const speed = 34 + Math.min(60, scene.wave * 3) + random(scene) * 22
    const belt = sector.id === 'belt'
    scene.rocks.push(
      makeRock(
        scene,
        sector.id === 'fragments' || sector.id === 'hunter' ? 2 : 3,
        x,
        y,
        belt ? speed * 1.3 : Math.cos(direction) * speed,
        belt ? (random(scene) - 0.5) * 32 : Math.sin(direction) * speed,
      ),
    )
  }
  if (sector.id === 'crossfire' || sector.id === 'hunter') {
    const elite = sector.id === 'hunter'
    const hp = elite ? 12 + Math.min(12, Math.floor(scene.wave / 5) * 2) : 4
    const saucers = scene.wave > 12 && !elite ? 2 : 1
    for (let index = 0; index < saucers; index += 1)
      scene.saucers.push({
        id: scene.nextId++,
        x: 80 + index * 760,
        y: 90,
        vx: elite ? 95 : 65,
        vy: 0,
        hp,
        maxHP: hp,
        timer: 2,
        elite,
        phase: index * Math.PI,
      })
  }
}
export function createScene(
  seed = Math.floor(Math.random() * 4294967295),
): Scene {
  const scene: Scene = {
    seed,
    nextId: 1,
    elapsed: 0,
    wave: 1,
    score: 0,
    lives: 3,
    kills: 0,
    combo: 0,
    bestCombo: 0,
    comboTime: 0,
    phase: 'flying',
    clearTimer: 0,
    levels: { rapid: 0, spread: 0, engine: 0, shield: 0 },
    shield: false,
    shieldRecharge: 0,
    overdrive: 0,
    shake: 0,
    options: [],
    ship: {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      fireTimer: 0,
      invulnerable: 2,
      dashTimer: 0,
      dashFuel: 100,
      thrust: 0,
    },
    rocks: [],
    shots: [],
    saucers: [],
    pickups: [],
    particles: [],
    floaters: [],
    events: [],
  }
  beginWave(scene)
  return scene
}
function burst(
  scene: Scene,
  x: number,
  y: number,
  color: string,
  count: number,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = random(scene) * Math.PI * 2,
      speed = 35 + random(scene) * 150
    const life = 0.25 + random(scene) * 0.35
    scene.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life,
      total: life,
      color,
    })
  }
  if (scene.particles.length > 240)
    scene.particles.splice(0, scene.particles.length - 240)
}
function award(scene: Scene, points: number, x: number, y: number) {
  scene.combo = scene.comboTime > 0 ? scene.combo + 1 : 1
  scene.comboTime = 2.8
  scene.bestCombo = Math.max(scene.bestCombo, scene.combo)
  const value = points * Math.min(5, 1 + Math.floor((scene.combo - 1) / 4))
  scene.score += value
  scene.kills += 1
  scene.ship.dashFuel = Math.min(100, scene.ship.dashFuel + 3)
  scene.floaters.push({ x, y, value, life: 0.85 })
  if (scene.kills % 7 === 0) {
    const kind =
      scene.kills % 21 === 0 && scene.lives < 5
        ? 'repair'
        : scene.kills % 14 === 0
          ? 'shield'
          : 'overdrive'
    scene.pickups.push({ x, y, vx: 0, vy: 0, kind, life: 12 })
  }
}
function breakRock(scene: Scene, index: number) {
  const rock = scene.rocks[index]
  scene.rocks.splice(index, 1)
  award(
    scene,
    rock.size === 3 ? 20 : rock.size === 2 ? 50 : 100,
    rock.x,
    rock.y,
  )
  burst(
    scene,
    rock.x,
    rock.y,
    sectorFor(scene.wave).color,
    rock.size === 3 ? 18 : 10,
  )
  scene.events.push('hit')
  scene.shake = Math.max(scene.shake, rock.size === 3 ? 0.13 : 0.06)
  if (rock.size > 1) {
    const size = rock.size === 3 ? 2 : 1
    for (const sign of [-1, 1]) {
      const angle = Math.atan2(rock.vy, rock.vx) + sign * 0.8
      const speed = Math.min(170, Math.hypot(rock.vx, rock.vy) + 24)
      scene.rocks.push(
        makeRock(
          scene,
          size,
          rock.x + Math.cos(angle) * 7,
          rock.y + Math.sin(angle) * 7,
          Math.cos(angle) * speed,
          Math.sin(angle) * speed,
        ),
      )
    }
  }
}
function hurt(scene: Scene) {
  if (scene.ship.invulnerable > 0) return
  if (scene.shield) {
    scene.shield = false
    scene.shieldRecharge =
      scene.levels.shield > 0 ? 18 - scene.levels.shield * 3 : 0
    scene.ship.invulnerable = 0.9
    burst(scene, scene.ship.x, scene.ship.y, '#89e4e7', 16)
  } else {
    scene.lives -= 1
    scene.shake = 0.3
    burst(scene, scene.ship.x, scene.ship.y, '#f7ae8d', 28)
    if (scene.lives <= 0) {
      scene.phase = 'over'
      return
    }
    scene.ship.x = WIDTH / 2
    scene.ship.y = HEIGHT / 2
    scene.ship.vx = 0
    scene.ship.vy = 0
    scene.ship.invulnerable = 2
    for (const rock of scene.rocks)
      if (distance(rock, scene.ship) < radius(rock.size) + 100)
        rock.x = wrap(rock.x + WIDTH / 3, WIDTH)
    for (const shot of scene.shots) if (shot.enemy) shot.life = 0
  }
  scene.events.push('boost')
}
export function availableUpgrades(scene: Scene): Upgrade[] {
  const pool: Upgrade[] = ['rapid', 'spread', 'engine', 'shield']
  const available = pool.filter(
    (id) => id !== 'repair' && scene.levels[id] < LIMITS[id],
  )
  if (scene.lives < 5) available.push('repair')
  for (let index = available.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random(scene) * (index + 1))
    ;[available[index], available[swap]] = [available[swap], available[index]]
  }
  return available.slice(0, 3)
}
export function chooseUpgrade(scene: Scene, upgrade: Upgrade) {
  if (scene.phase !== 'upgrade' || !scene.options.includes(upgrade))
    return false
  if (upgrade === 'repair') scene.lives = Math.min(5, scene.lives + 1)
  else {
    scene.levels[upgrade] = Math.min(LIMITS[upgrade], scene.levels[upgrade] + 1)
    if (upgrade === 'shield') {
      scene.shield = true
      scene.shieldRecharge = 0
    }
  }
  scene.wave += 1
  beginWave(scene)
  scene.events.push('point')
  return true
}
function shoot(scene: Scene) {
  const ship = scene.ship
  const spread = scene.levels.spread
  const angles =
    spread === 0 ? [0] : spread === 1 ? [-0.065, 0.065] : [-0.13, 0, 0.13]
  for (const extra of angles) {
    const angle = ship.angle + extra
    scene.shots.push({
      x: wrap(ship.x + Math.cos(angle) * 22, WIDTH),
      y: wrap(ship.y + Math.sin(angle) * 22, HEIGHT),
      vx: Math.cos(angle) * 620 + ship.vx * 0.35,
      vy: Math.sin(angle) * 620 + ship.vy * 0.35,
      life: 0.95,
      enemy: false,
    })
  }
  ship.fireTimer =
    (0.2 / (1 + scene.levels.rapid * 0.22)) * (scene.overdrive > 0 ? 0.58 : 1)
}
function tick(scene: Scene, input: Input, mode: Mode, delta: number) {
  scene.elapsed += delta
  scene.comboTime = Math.max(0, scene.comboTime - delta)
  if (scene.comboTime === 0) scene.combo = 0
  scene.shake = Math.max(0, scene.shake - delta)
  scene.overdrive = Math.max(0, scene.overdrive - delta)
  const ship = scene.ship
  ship.invulnerable = Math.max(0, ship.invulnerable - delta)
  ship.dashTimer = Math.max(0, ship.dashTimer - delta)
  ship.fireTimer = Math.max(0, ship.fireTimer - delta)
  ship.dashFuel = Math.min(100, ship.dashFuel + 14 * delta)
  if (scene.shieldRecharge > 0) {
    scene.shieldRecharge = Math.max(0, scene.shieldRecharge - delta)
    if (scene.shieldRecharge === 0) scene.shield = true
  }
  const dx = Number(input.right) - Number(input.left),
    dy = Number(input.down) - Number(input.up)
  const length = Math.hypot(dx, dy)
  ship.thrust = mode === 'arcade' ? length : Number(input.up)
  if (ship.dashTimer === 0) {
    if (mode === 'arcade') {
      const speed = 290 + scene.levels.engine * 25
      const response = 1 - Math.exp(-8 * delta)
      ship.vx += ((length ? (dx / length) * speed : 0) - ship.vx) * response
      ship.vy += ((length ? (dy / length) * speed : 0) - ship.vy) * response
      const target = input.aim
        ? Math.atan2(input.aim.y - ship.y, input.aim.x - ship.x)
        : length
          ? Math.atan2(dy, dx)
          : ship.angle
      ship.angle = target
    } else {
      ship.angle += dx * 3.9 * delta
      if (input.up) {
        ship.vx += Math.cos(ship.angle) * 350 * delta
        ship.vy += Math.sin(ship.angle) * 350 * delta
      }
      const drag = Math.exp(-(input.down ? 4 : 0.12) * delta)
      ship.vx *= drag
      ship.vy *= drag
      capSpeed(ship, 340 + scene.levels.engine * 25)
    }
  }
  if (input.dash && ship.dashFuel >= 65 && ship.dashTimer === 0) {
    const angle = mode === 'arcade' && length ? Math.atan2(dy, dx) : ship.angle
    ship.vx = Math.cos(angle) * 760
    ship.vy = Math.sin(angle) * 760
    ship.dashTimer = 0.18
    ship.invulnerable = Math.max(0.3, ship.invulnerable)
    ship.dashFuel -= 65
    burst(scene, ship.x, ship.y, '#90e4e3', 12)
    scene.events.push('boost')
  }
  move(ship, delta)
  if (input.fire && ship.fireTimer === 0 && scene.shots.length < 110)
    shoot(scene)
  for (const rock of scene.rocks) {
    move(rock, delta)
    rock.angle += rock.spin * delta
    rock.grace = Math.max(0, rock.grace - delta)
  }
  for (const saucer of scene.saucers) {
    saucer.x = wrap(saucer.x + saucer.vx * delta, WIDTH)
    saucer.phase += delta
    saucer.y = 105 + Math.sin(saucer.phase * 0.9) * 65
    saucer.timer -= delta
    if (saucer.timer <= 0) {
      const angle = Math.atan2(
        offset(saucer.y, ship.y, HEIGHT),
        offset(saucer.x, ship.x, WIDTH),
      )
      const angles =
        saucer.elite && saucer.hp <= saucer.maxHP / 2 ? [-0.22, 0, 0.22] : [0]
      for (const extra of angles)
        scene.shots.push({
          x: saucer.x,
          y: saucer.y,
          vx: Math.cos(angle + extra) * 240,
          vy: Math.sin(angle + extra) * 240,
          life: 3,
          enemy: true,
        })
      saucer.timer = saucer.elite ? 0.95 : 1.6
    }
  }
  for (let index = scene.shots.length - 1; index >= 0; index -= 1) {
    const shot = scene.shots[index]
    shot.life -= delta
    move(shot, delta)
    if (shot.life <= 0) {
      scene.shots.splice(index, 1)
      continue
    }
    if (shot.enemy) {
      if (distance(shot, ship) < 12) {
        scene.shots.splice(index, 1)
        hurt(scene)
        if (scene.phase === 'over') return
      }
      continue
    }
    const rockIndex = scene.rocks.findIndex(
      (rock) => distance(shot, rock) < radius(rock.size) + 3,
    )
    if (rockIndex >= 0) {
      breakRock(scene, rockIndex)
      scene.shots.splice(index, 1)
      continue
    }
    const enemyIndex = scene.saucers.findIndex(
      (saucer) => distance(shot, saucer) < (saucer.elite ? 29 : 22),
    )
    if (enemyIndex >= 0) {
      const saucer = scene.saucers[enemyIndex]
      saucer.hp -= 1
      scene.shots.splice(index, 1)
      burst(scene, shot.x, shot.y, '#f2a4a2', 5)
      scene.events.push('hit')
      if (saucer.hp <= 0) {
        award(scene, saucer.elite ? 600 : 250, saucer.x, saucer.y)
        burst(scene, saucer.x, saucer.y, '#f2bd85', 28)
        scene.saucers.splice(enemyIndex, 1)
        scene.shake = 0.22
      }
    }
  }
  if (
    scene.rocks.some(
      (rock) =>
        rock.grace === 0 && distance(rock, ship) < radius(rock.size) + 10,
    ) ||
    scene.saucers.some((saucer) => distance(saucer, ship) < 35)
  )
    hurt(scene)
  if (scene.phase === 'over') return
  for (let index = scene.pickups.length - 1; index >= 0; index -= 1) {
    const pickup = scene.pickups[index]
    pickup.life -= delta
    if (pickup.life <= 0) {
      scene.pickups.splice(index, 1)
      continue
    }
    if (distance(pickup, ship) < 120) {
      pickup.x = wrap(
        pickup.x + offset(pickup.x, ship.x, WIDTH) * delta * 2,
        WIDTH,
      )
      pickup.y = wrap(
        pickup.y + offset(pickup.y, ship.y, HEIGHT) * delta * 2,
        HEIGHT,
      )
    }
    if (distance(pickup, ship) < 27) {
      if (pickup.kind === 'repair') scene.lives = Math.min(5, scene.lives + 1)
      if (pickup.kind === 'shield') {
        scene.shield = true
        scene.shieldRecharge = 0
      }
      if (pickup.kind === 'overdrive') scene.overdrive = 8
      burst(scene, pickup.x, pickup.y, '#a7e4bd', 10)
      scene.events.push('pickup')
      scene.pickups.splice(index, 1)
    }
  }
  for (let index = scene.particles.length - 1; index >= 0; index -= 1) {
    const particle = scene.particles[index]
    particle.life -= delta
    particle.x += particle.vx * delta
    particle.y += particle.vy * delta
    if (particle.life <= 0) scene.particles.splice(index, 1)
  }
  for (let index = scene.floaters.length - 1; index >= 0; index -= 1) {
    scene.floaters[index].life -= delta
    scene.floaters[index].y -= delta * 26
    if (scene.floaters[index].life <= 0) scene.floaters.splice(index, 1)
  }
  if (
    scene.lives > 0 &&
    scene.rocks.length === 0 &&
    scene.saucers.length === 0
  ) {
    scene.clearTimer += delta
    if (scene.clearTimer >= 0.65) {
      scene.score += scene.wave * 150
      scene.options = availableUpgrades(scene)
      if (scene.options.length === 0) {
        scene.lives = Math.min(5, scene.lives + 1)
        scene.wave += 1
        beginWave(scene)
      } else scene.phase = 'upgrade'
      scene.events.push('point')
    }
  }
}
export function advance(
  scene: Scene,
  input: Input,
  mode: Mode,
  seconds: number,
) {
  scene.events = []
  if (scene.phase !== 'flying') return
  const duration = Math.min(0.1, Math.max(0, seconds))
  const steps = Math.max(1, Math.ceil(duration * 120)),
    delta = duration / steps
  for (let step = 0; step < steps && scene.phase === 'flying'; step += 1)
    tick(scene, { ...input, dash: input.dash && step === 0 }, mode, delta)
}
