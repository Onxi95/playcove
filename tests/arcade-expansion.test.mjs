import assert from 'node:assert/strict'
import test from 'node:test'
import * as blocks from '../src/games/block-cascade/engine.ts'
import * as maze from '../src/games/maze-chase/engine.ts'
import * as river from '../src/games/river-crossing/engine.ts'
import * as blast from '../src/games/blast-arena/engine.ts'
import * as bubble from '../src/games/bubble-tower/engine.ts'
import * as barrel from '../src/games/barrel-ascent/engine.ts'
import * as formation from '../src/games/formation-rescue/engine.ts'
import * as coast from '../src/games/coastal-rush/engine.ts'
import * as iron from '../src/games/iron-front/engine.ts'
import * as asteroid from '../src/games/asteroid-drift/engine.ts'
import { loadGame } from './game-harness.mjs'
const slugs = [
  'asteroid-drift',
  'maze-chase',
  'block-cascade',
  'river-crossing',
  'blast-arena',
  'bubble-tower',
  'barrel-ascent',
  'formation-rescue',
  'coastal-rush',
  'iron-front',
]
function input(held = [], pressed = [], mode = 'solo') {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    pointer: { x: 450, y: 550, active: false, down: false },
    mode,
  }
}
function progress(stage = 1, carry = {}) {
  return { stage, score: 1200, lives: 3, elapsed: 600, carry }
}
function finite(value, path = 'state') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), path)
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value))
      finite(item, `${path}.${key}`)
}

test('All ten additions render, prevent gameplay scrolling, pause, save, resume, and retry cleanly', async () => {
  for (const slug of slugs) {
    const game = await loadGame(slug)
    assert.equal(game.status, 'ready', slug)
    game.start()
    game.advance(0.3)
    assert.equal(game.status, 'playing', slug)
    assert.ok(game.drawCalls > 10, slug)
    assert.equal(game.key('ArrowDown').defaultPrevented, true, slug)
    game.key('ArrowDown', false)
    const scene = game.scene()
    assert.ok(scene, slug)
    game.key('Escape')
    assert.equal(game.status, 'paused', slug)
    assert.ok(game.storage.has(`playcove.${slug}.checkpoint.v1`), slug)
    const saved = Object.fromEntries(game.storage)
    game.destroy()
    const resumed = await loadGame(slug, 'pl', saved)
    assert.equal(resumed.status, 'ready')
    resumed.start()
    resumed.advance(0.25)
    assert.equal(resumed.status, 'playing', slug)
    const s = resumed.scene()
    s.score = 3210
    s.phase = 'over'
    if (s.world) {
      s.world.score = 3210
      s.world.phase = 'over'
    }
    resumed.advance(0.3)
    assert.equal(resumed.status, 'over', slug)
    assert.ok(
      resumed.storage.get(`playcove.${slug}.scores`)?.includes('3210'),
      slug,
    )
    for (let retry = 0; retry < 3; retry++) {
      resumed.key('Enter')
      resumed.key('Enter', false)
      resumed.advance(0.2)
      assert.equal(resumed.status, 'playing', slug)
      const state = resumed.scene()
      state.phase = 'over'
      if (state.world) state.world.phase = 'over'
      resumed.advance(0.2)
    }
    resumed.destroy()
  }
})

test('Completed-stage checkpoints reopen at the choice without awarding the completion bonus again', async () => {
  for (const slug of [
    'maze-chase',
    'blast-arena',
    'coastal-rush',
    'iron-front',
  ]) {
    const game = await loadGame(slug)
    game.start()
    game.advance(0.1)
    game.scene().phase = 'choice'
    game.scene().score = 5432
    game.advance(0.2)
    const data = JSON.parse(game.storage.get(`playcove.${slug}.checkpoint.v1`))
    assert.equal(data.progress.carry.__phase, 'choice', slug)
    const stored = Object.fromEntries(game.storage)
    game.destroy()
    const restored = await loadGame(slug, 'en', stored)
    restored.start()
    restored.advance(0.2)
    assert.equal(restored.scene().phase, 'choice', slug)
    assert.equal(restored.scene().score, 5432, slug)
    restored.key('1')
    restored.advance(0.2)
    assert.equal(restored.scene().stage, 2, slug)
    assert.equal(restored.scene().phase, 'play', slug)
    restored.destroy()
  }
})

test('Block rotations preserve four distinct cells; wall kicks, hold, hard drops, clears, and restore cooperate', () => {
  for (let kind = 0; kind < 7; kind++)
    for (let rotation = 0; rotation < 4; rotation++) {
      const cells = blocks.cells({ kind, rotation, x: 3, y: 0 })
      assert.equal(new Set(cells.map((c) => `${c.x},${c.y}`)).size, 4)
      assert.ok(
        cells.every((c) => c.x >= 3 && c.x <= 6 && c.y >= 0 && c.y <= 3),
      )
    }
  const s = blocks.create()
  s.piece = { kind: 0, rotation: 1, x: -2, y: 2 }
  assert.ok(blocks.fits(s, s.piece))
  assert.ok(blocks.rotate(s, 1))
  assert.ok(blocks.fits(s, s.piece))
  blocks.update(s, input([], ['c']), 0.016)
  const hold = s.hold
  blocks.update(s, input([], ['c']), 0.016)
  assert.equal(s.hold, hold)
  s.board = Array.from({ length: 20 }, () => Array(10).fill(0))
  for (let x = 0; x < 10; x++)
    if (x !== 5) for (let y = 16; y < 20; y++) s.board[y][x] = 2
  s.piece = { kind: 0, rotation: 1, x: 3, y: 0 }
  blocks.update(s, input([], [' ']), 0.016)
  assert.equal(s.clearing.length, 4)
  const restored = blocks.create(blocks.save(s))
  assert.equal(restored.clearing.length, 4)
  blocks.update(restored, input(), 0.2)
  assert.equal(restored.lines, 4)
  assert.ok(restored.score >= 800)
  assert.equal(restored.phase, 'play')
})

test('Every maze district remains connected; power, reversals, and next-district decisions survive checkpoints', () => {
  for (let stage = 1; stage <= 30; stage++)
    for (let district = 0; district < 3; district++) {
      const s = maze.create(progress(stage, { district })),
        dist = maze.distances(s, 1, 19)
      assert.ok(
        s.walls.every((w, i) => w || Number.isFinite(dist[i])),
        `stage ${stage} district ${district}`,
      )
    }
  const s = maze.create()
  maze.update(s, input(), 0.01)
  assert.ok(s.power > 0)
  s.player = { x: 1, y: 19, tx: 2, ty: 19, progress: 0.4, dx: 1, dy: 0 }
  maze.update(s, input([], ['arrowleft']), 0)
  assert.equal(s.player.dx, -1)
  assert.ok(Math.abs(maze.position(s.player).x - 1.4) < 1e-8)
  const restored = maze.create(maze.save(s))
  assert.deepEqual(restored.dots, s.dots)
  s.phase = 'choice'
  maze.choose(s, 'station')
  assert.equal(s.stage, 2)
})

test('Crossings require distinct homes and expose late-stage turtle warnings; rewinds return to saved banks', () => {
  const s = river.create()
  s.invulnerable = 0
  s.x = 1
  s.y = 0
  river.update(s, input(), 0)
  assert.equal(s.homes[0], true)
  assert.equal(s.y, 13)
  s.invulnerable = 0
  s.x = 1
  s.y = 0
  river.update(s, input(), 0)
  assert.equal(s.lives, 2)
  s.safeX = 4
  s.safeY = 7
  river.update(s, input([], ['x']), 0)
  assert.equal(s.x, 4)
  assert.equal(s.y, 7)
  assert.equal(s.rewinds, 0)
  const late = river.create(progress(8))
  late.flow = 5.1
  assert.ok(river.laneObjects(late, 2).some((o) => o.warning))
  late.flow = 6
  assert.ok(river.laneObjects(late, 2).some((o) => o.submerged))
  assert.deepEqual(river.create(river.save(s)).homes, s.homes)
})

test('Bombs respect stone, stop at crates, chain fairly, and support local match series', () => {
  const s = blast.create()
  s.tiles.fill(0)
  s.tiles[5 * 13 + 7] = 2
  s.tiles[5 * 13 + 3] = 1
  const cells = blast.rays(s.tiles, 5, 5, 5)
  assert.ok(cells.includes(5 * 13 + 7))
  assert.ok(!cells.includes(5 * 13 + 8))
  assert.ok(!cells.includes(5 * 13 + 3))
  s.bombs = [
    { id: 1, x: 5, y: 5, owner: 0, timer: 0, range: 3, pass: [] },
    { id: 2, x: 6, y: 5, owner: 1, timer: 2, range: 3, pass: [] },
  ]
  blast.explode(s)
  assert.equal(s.bombs.length, 0)
  assert.equal(s.blasts.length, 2)
  assert.ok(s.blasts.every((b) => !b.cells.includes(5 * 13 + 8)))
  const local = blast.create(progress(1, { mode: 'local', p1: 2 }))
  local.actors[1].alive = false
  blast.update(local, input([], [], 'local'), 0.01)
  assert.equal(local.wins[0], 3)
  assert.equal(local.phase, 'over')
})

test('Bubble chains remove captured enemies once and cooperative rooms progress with shared lives', () => {
  const s = bubble.create()
  s.enemies = s.enemies.slice(0, 3)
  s.enemies.forEach((e) => {
    e.trapped = true
    e.alive = true
  })
  s.bubbles = s.enemies.map((e, n) => ({
    x: 300 + n * 30,
    y: 200,
    vx: 0,
    vy: 0,
    age: 1,
    life: 8,
    enemy: n,
  }))
  bubble.pop(s, 0)
  assert.equal(s.enemies.filter((e) => e.alive).length, 0)
  assert.equal(s.bubbles.length, 0)
  assert.equal(s.bestChain, 3)
  assert.equal(s.lives, 4)
  bubble.update(s, input(), 0.01)
  assert.equal(s.phase, 'choice')
  bubble.choose(s, 'wind')
  assert.equal(s.stage, 2)
})

test('Climbing supports ladders, jump clearance, collected bolts, and later moving-lift stages', () => {
  const s = barrel.create()
  const ladder = barrel.ladders(s)[0]
  s.x = ladder.x
  s.y = ladder.bottom - 34
  for (let n = 0; n < 90; n++) barrel.update(s, input(['w']), 1 / 60)
  assert.equal(s.floor, 1)
  assert.equal(s.climb, -1)
  barrel.update(s, input([], [' ']), 1 / 60)
  assert.ok(s.vy < 0)
  assert.equal(s.ground, false)
  s.bolts[0].taken = true
  const resumed = barrel.create(barrel.save(s))
  assert.equal(resumed.bolts[0].taken, true)
  const late = barrel.create(progress(9))
  assert.equal(late.bolts.length, 3)
})

test('Formation capture rewards rescue with dual fire and every fourth wave changes to a flight challenge', () => {
  const s = formation.create(progress(2))
  const carrier = s.enemies.find((e) => e.kind === 2)
  carrier.captive = true
  carrier.hp = 1
  formation.damage(s, carrier)
  assert.ok(s.rescue)
  s.rescue = { x: s.x, y: 548 }
  formation.update(s, input(), 0.01)
  assert.equal(s.dual, true)
  assert.equal(s.rescued, 1)
  s.fireTimer = 0
  s.shots = []
  formation.update(s, input([' ']), 0.01)
  assert.equal(s.shots.filter((b) => !b.enemy).length, 2)
  assert.equal(formation.create(progress(4)).challenge, true)
  assert.equal(formation.create(formation.save(s)).dual, true)
})

test('Touring supports braking, earned nitro, damage, route forks, and checkpoints', () => {
  const s = coast.create()
  s.speed = 180
  coast.update(s, input(['s']), 0.1)
  assert.ok(s.speed < 180)
  coast.update(s, input([], ['x']), 0.01)
  assert.ok(s.boost > 0)
  assert.ok(s.nitro < 30)
  s.speed = 200
  s.x = 0
  s.collision = 0
  s.traffic = [{ z: s.distance + 10, x: 0, speed: 80, color: 0, passed: false }]
  coast.update(s, input(), 0.01)
  assert.equal(s.integrity, 76)
  s.distance = coast.LENGTH
  coast.update(s, input(), 0.01)
  assert.equal(s.phase, 'choice')
  coast.choose(s, 'mountain')
  assert.equal(s.stage, 2)
  assert.equal(s.route, 2)
  assert.equal(s.time, 29)
  assert.equal(coast.create(coast.save(s)).integrity, s.integrity)
})

test('Campaign missions have jumpable platforms, weapon supplies, boss phases, vehicles, and persisted checkpoints', () => {
  const s = iron.create()
  iron.update(s, input([], [' ']), 0.016)
  assert.ok(s.vy < 0)
  assert.equal(s.ground, false)
  s.x = 650
  iron.update(s, input(), 0.01)
  assert.equal(s.weapon, 1)
  assert.equal(s.ammo, 160)
  s.x = 1900
  iron.update(s, input(), 0.01)
  assert.equal(s.checkpointX, 1800)
  const restored = iron.create(iron.save(s))
  assert.equal(restored.x, 1870)
  s.boss.hp = 1
  s.x = 3300
  s.y = 430
  s.shots = [
    { x: 3340, y: 445, vx: 740, vy: 0, enemy: false, life: 1, damage: 2 },
  ]
  iron.update(s, input(), 0.05)
  assert.equal(s.phase, 'choice')
  iron.choose(s, 'weapon')
  assert.equal(s.stage, 2)
  assert.equal(s.weapon, 2)
  assert.equal(iron.create(progress(3)).vehicle, true)
})

test('Late stages remain numerically stable through extended mixed-input simulations', () => {
  for (const [name, engine] of Object.entries({
    blocks,
    maze,
    river,
    blast,
    bubble,
    barrel,
    formation,
    coast,
    iron,
  })) {
    let s = engine.create(progress(24))
    for (let n = 0; n < 18000; n++) {
      if (s.phase === 'over') s = engine.create(progress(24))
      if (s.phase === 'choice')
        engine.choose(s, ['repair', 'coast', 'rapid'][n % 3])
      engine.update(
        s,
        input(
          n % 180 < 90 ? ['d', ' ', 'j'] : ['a', 's'],
          n % 61 === 0 ? ['x', ' '] : [],
        ),
        1 / 30,
      )
      if (n % 900 === 0) {
        finite(s, name)
        s.events = []
      }
    }
    finite(s, name)
  }
  const s = asteroid.createScene()
  s.wave = 30
  asteroid.beginWave(s)
  for (let n = 0; n < 3000 && s.phase === 'flying'; n++)
    asteroid.advance(
      s,
      {
        ...asteroid.emptyInput(),
        fire: true,
        up: true,
        left: n % 120 < 60,
        dash: n % 120 === 0,
      },
      'arcade',
      1 / 60,
    )
  assert.ok(s.elapsed > 0)
  finite(s, 'asteroid')
})

test('Coastal Rush earns drift releases, chains close passes, charges drafting, and extends its clock at gates', () => {
  const s = coast.create()
  s.traffic = []
  s.distance = 2200
  s.speed = 225
  s.steering = 1
  for (let n = 0; n < 100; n++) {
    s.x = 0
    coast.update(s, input([' ', 'd']), 0.01)
  }
  assert.ok(s.drift >= 60)
  const nitro = s.nitro
  coast.update(s, input(), 0.01)
  assert.ok(s.nitro > nitro + 15)
  assert.equal(s.driftTotal, 1)
  assert.equal(s.combo, 1)
  s.x = 0.3
  s.lateral = 0
  s.steering = 0
  s.collision = 0
  s.speed = 225
  s.traffic = [
    { z: s.distance - 17, x: 0, speed: 100, color: 0, kind: 0, passed: false },
  ]
  coast.update(s, input(), 0.03)
  assert.equal(s.near, 1)
  assert.equal(s.combo, 2)
  s.x = 0
  s.lateral = 0
  s.speed = 220
  s.traffic = [
    { z: s.distance + 250, x: 0, speed: 100, color: 1, kind: 0, passed: false },
  ]
  s.nitro = 10
  coast.update(s, input(), 0.05)
  assert.ok(s.drafting > 0)
  assert.ok(s.nitro > 10.1)
  s.traffic = []
  s.distance = coast.GATE - 1
  s.speed = 220
  s.time = 2
  coast.update(s, input(), 0.02)
  assert.equal(s.gate, 1)
  assert.ok(s.time > 20)
  assert.equal(s.phase, 'play')
  const saved = coast.save(s),
    restored = coast.create(saved)
  assert.equal(restored.speed, s.speed)
  assert.equal(restored.gate, s.gate)
  assert.equal(restored.distance, s.distance)
})

test('Coastal Rush spawns readable traffic groups and sustained driving exposes different routes', () => {
  const s = coast.create()
  s.speed = 220
  s.integrity = 100
  for (let n = 0; n < 6000; n++) {
    s.x = 0
    s.integrity = 100
    s.time = 60
    s.phase = 'play'
    coast.update(s, input(), 0.02)
    if (s.distance > coast.LENGTH - 100) s.distance = 0
    assert.ok(s.traffic.length < 70)
  }
  finite(s)
  for (let n = 0; n < 60; n++) {
    s.traffic = []
    s.spawn = 0
    coast.update(s, input(), 0.01)
    assert.ok(new Set(s.traffic.map((car) => car.x)).size < 3)
  }
  const curves = [1, 2, 3].map((route) =>
    Array.from({ length: 10 }, (_, n) =>
      coast.curve(1000 + n * 800, route),
    ).join(','),
  )
  assert.equal(new Set(curves).size, 3)
})

test('Every new canvas stays sharp on large and high-DPI screens, with physics frozen after blur', async () => {
  const dimensions = {
    'asteroid-drift': [1000, 640],
    'maze-chase': [532, 588],
    'block-cascade': [760, 650],
    'river-crossing': [572, 616],
    'blast-arena': [624, 528],
    'bubble-tower': [800, 600],
    'barrel-ascent': [800, 610],
    'formation-rescue': [900, 620],
    'coastal-rush': [1100, 680],
    'iron-front': [900, 560],
  }
  for (const slug of slugs) {
    const game = await loadGame(slug)
    game.start()
    game.advance(0.2)
    game.resize(1200, 2)
    game.advance(0.1)
    assert.equal(game.canvas.width, 2400, slug)
    assert.equal(
      game.canvas.height,
      Math.round((2400 * dimensions[slug][1]) / dimensions[slug][0]),
      slug,
    )
    const time = game.scene().elapsed
    game.emit('window', 'blur')
    game.advance(1)
    assert.equal(game.status, 'paused', slug)
    assert.equal(game.scene().elapsed, time, slug)
    game.destroy()
  }
})
