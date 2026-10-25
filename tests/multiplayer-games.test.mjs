import assert from 'node:assert/strict'
import test from 'node:test'
import * as volley from '../src/games/volley-clash/engine.ts'
import * as tank from '../src/games/tank-tactics/engine.ts'
import * as disc from '../src/games/ricochet-rivals/engine.ts'
import * as racing from '../src/games/circuit-clash/engine.ts'
import * as twins from '../src/games/twin-tethers/engine.ts'
import { loadGame } from './game-harness.mjs'
const slugs = [
  'volley-clash',
  'tank-tactics',
  'ricochet-rivals',
  'circuit-clash',
  'twin-tethers',
]
const engines = [volley, tank, disc, racing, twins]
function input(held = [], pressed = []) {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    pointer: { x: 0, y: 0, active: false, down: false },
    mode: 'normal',
  }
}
function progress(stage = 1, carry = {}) {
  return { stage, score: 700, lives: 5, elapsed: 700, carry }
}
function finite(value, path = 'scene') {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), path)
  else if (value && typeof value === 'object')
    for (const [key, item] of Object.entries(value))
      finite(item, `${path}.${key}`)
}

test('Five multiplayer games render in both languages, resize sharply, pause, resume checkpoints, and retry', async () => {
  for (const slug of slugs)
    for (const locale of ['en', 'pl']) {
      const game = await loadGame(slug, locale)
      game.start()
      game.advance(0.25)
      assert.equal(game.status, 'playing', slug)
      assert.ok(game.drawCalls > 40, slug)
      assert.equal(game.key('ArrowDown').defaultPrevented, true)
      game.key('ArrowDown', false)
      game.resize(1200, 2)
      assert.equal(game.canvas.width, 2400)
      const time = game.scene().elapsed
      game.emit('window', 'blur')
      game.advance(0.5)
      assert.equal(game.status, 'paused')
      assert.equal(game.scene().elapsed, time)
      const data = Object.fromEntries(game.storage)
      assert.ok(data[`playcove.${slug}.checkpoint.v1`])
      game.destroy()
      const restored = await loadGame(slug, locale, data)
      restored.start()
      restored.advance(0.2)
      assert.equal(restored.status, 'playing')
      const s = restored.scene()
      s.score = 3456
      s.phase = 'over'
      restored.advance(0.2)
      assert.equal(restored.status, 'over')
      assert.ok(
        restored.storage.get(`playcove.${slug}.scores`)?.includes('3456'),
      )
      for (let n = 0; n < 3; n++) {
        restored.key('Enter')
        restored.key('Enter', false)
        restored.advance(0.2)
        assert.equal(restored.status, 'playing', slug)
        restored.scene().phase = 'over'
        restored.advance(0.2)
      }
      restored.destroy()
    }
})

test('Volleyball serves cross the net, both players jump, power hits steer, and sets require a two-point lead', () => {
  const s = volley.create()
  s.serve = 0.001
  volley.update(s, input(), 0.01)
  assert.ok(s.ball.vx > 0)
  let crossed = false
  for (let n = 0; n < 100; n++) {
    volley.update(s, input(), 0.01)
    if (s.ball.x > 522 && s.ball.y < volley.NET - 15) crossed = true
  }
  assert.ok(crossed, 'Opening serve must clear the net')
  volley.update(s, input(['w', 'arrowup'], ['w', 'arrowup']), 0.016)
  assert.ok(s.players.every((p) => p.vy < 0))
  s.serve = 0
  s.ball = {
    x: s.players[1].x - 10,
    y: s.players[1].y - 20,
    vx: 0,
    vy: 100,
    spin: 0,
    last: 0,
    contact: 0,
  }
  volley.update(s, input(['enter']), 0.02)
  assert.ok(s.ball.vx < 0)
  assert.ok(s.ball.vy < 0)
  s.points = [10, 10]
  s.phase = 'play'
  volley.award(s, 0)
  assert.equal(s.phase, 'play')
  volley.award(s, 0)
  assert.equal(s.phase, 'choice')
  assert.equal(s.wins[0], 1)
  const saved = volley.save(s)
  assert.equal(volley.create(saved).wins[0], 1)
  volley.choose(s, 'moon')
  assert.equal(s.court, 2)
  assert.equal(s.stage, 2)
  assert.deepEqual(s.points, [0, 0])
  s.wins = [2, 0]
  s.points = [10, 0]
  volley.award(s, 0)
  assert.equal(s.phase, 'over')
  assert.equal(s.wins[0], 3)
})

test('Artillery has independently controlled turns, wind, bounded craters, shell supplies, and exact in-flight saves', () => {
  const s = tank.create()
  const oldAngle = s.tanks[0].angle
  tank.update(s, input(['w', 'd']), 0.1)
  assert.ok(s.tanks[0].angle > oldAngle)
  assert.equal(s.tanks[1].angle, 55)
  s.tanks[0].weapon = 1
  const terrain = [...s.terrain]
  assert.ok(tank.fire(s))
  assert.equal(s.tanks[0].heavy, 1)
  assert.equal(tank.fire(s), false)
  tank.update(s, input(), 0.1)
  const saved = tank.save(s),
    restored = tank.create(saved)
  assert.deepEqual(restored.shot, s.shot)
  assert.deepEqual(restored.terrain, s.terrain)
  for (let n = 0; n < 1200 && s.turn === 0 && s.phase === 'play'; n++)
    tank.update(s, input(), 0.01)
  assert.equal(s.turn, 1)
  tank.update(s, input(['arrowdown', 'arrowleft']), 0.1)
  assert.ok(s.tanks[1].angle < 55)
  tank.explode(s, 500, tank.ground(s, 500), 1)
  assert.ok(s.terrain.some((y, n) => y > terrain[n]))
  assert.ok(s.terrain.every((y) => y <= 575 && y >= 220))
  s.tanks[1].hp = 1
  tank.explode(s, s.tanks[1].x, s.tanks[1].y, 0)
  assert.equal(s.phase, 'choice')
  assert.equal(s.wins[0], 1)
  tank.choose(s, 'moon')
  assert.equal(s.landscape, 3)
})

test('Discs lock aim while charging, ricochet, can hit their owner, and reward timed parries', () => {
  const s = disc.create()
  s.countdown = 0
  s.players[0].angle = 0
  disc.update(s, input([' ', 'w']), 0.2)
  assert.equal(s.players[0].angle, 0)
  assert.ok(s.players[0].charge > 0)
  disc.update(s, input(), 0.01)
  assert.equal(s.discs.length, 1)
  assert.ok(s.discs[0].vx > 0)
  s.discs = [
    {
      x: 969,
      y: 90,
      vx: 500,
      vy: 0,
      owner: 0,
      life: 3,
      ricochets: 0,
      age: 0.5,
    },
  ]
  disc.update(s, input(), 0.02)
  assert.ok(s.discs[0].vx < 0)
  assert.equal(s.discs[0].ricochets, 1)
  const target = s.players[1]
  s.discs = [
    {
      x: target.x - 26,
      y: target.y,
      vx: 500,
      vy: 0,
      owner: 0,
      life: 3,
      ricochets: 0,
      age: 1,
    },
  ]
  disc.update(s, input([], ['shift']), 0.02)
  assert.equal(target.hp, 5)
  assert.equal(s.discs[0].owner, 1)
  assert.equal(s.parries, 1)
  s.players[0].invulnerable = 0
  s.discs = [
    {
      x: s.players[0].x + 20,
      y: s.players[0].y,
      vx: -400,
      vy: 0,
      owner: 0,
      life: 3,
      ricochets: 1,
      age: 0.6,
    },
  ]
  disc.update(s, input(), 0.01)
  assert.equal(s.players[0].hp, 4)
  const late = disc.create(progress(20))
  late.countdown = 0
  disc.update(late, input(), 0.02)
  assert.equal(late.shrink, 0, 'Saved total time must not shrink a new arena')
})

function drive(s) {
  const keys = []
  s.cars.forEach((car, index) => {
    const at = racing.nearest(s, car),
      target = s.path[(at.index + 6) % s.path.length],
      desired = Math.atan2(target.y - car.y, target.x - car.x)
    let angle = desired - car.angle
    while (angle > Math.PI) angle -= Math.PI * 2
    while (angle < -Math.PI) angle += Math.PI * 2
    if (angle > 0.05) keys.push(index ? 'arrowright' : 'd')
    if (angle < -0.05) keys.push(index ? 'arrowleft' : 'a')
    keys.push(
      Math.abs(angle) > 0.65
        ? index
          ? 'arrowdown'
          : 's'
        : index
          ? 'arrowup'
          : 'w',
    )
  })
  return input(keys)
}

test('Every racing circuit is driveable for five laps; gates prevent shortcut wins and both cars can win', () => {
  for (let track = 0; track < racing.TRACKS.length; track++) {
    const s = racing.create(progress(1, { track }))
    s.countdown = 0
    for (let n = 0; n < 18000 && s.phase === 'play'; n++)
      racing.update(s, drive(s), 1 / 60)
    assert.equal(
      s.phase,
      'choice',
      `Track ${track}: ${s.cars.map((c) => `${c.lap}/${c.gate}/${c.nearest}`).join(' vs ')}`,
    )
    assert.equal(
      s.wins.reduce((a, b) => a + b),
      1,
    )
    assert.ok(s.cars.some((c) => c.lap === 5))
    finite(s)
  }
  const s = racing.create()
  s.countdown = 0
  s.cars[0].x = s.path[0].x
  s.cars[0].y = s.path[0].y
  racing.update(s, input(['w']), 0.02)
  assert.equal(s.cars[0].lap, 0)
})

test('Twin Tethers respects colored objectives, shared losses, checkpoints, rescue hops, and later hazards', () => {
  const s = twins.create()
  twins.update(s, input(['w', 'arrowup'], ['w', 'arrowup']), 0.01)
  assert.ok(s.players.every((p) => p.vy < 0))
  const star = s.stars[0]
  s.players[1].x = star.x
  s.players[1].y = star.y - 17
  twins.update(s, input(), 0)
  assert.equal(star.taken, false)
  s.players[0].x = star.x
  s.players[0].y = star.y - 17
  twins.update(s, input(), 0)
  assert.equal(star.taken, true)
  s.players.forEach((p) => (p.invulnerable = 0))
  const lives = s.lives
  twins.fail(s, 'fall')
  assert.equal(s.lives, lives - 1)
  twins.fail(s, 'fall')
  assert.equal(
    s.lives,
    lives - 1,
    'Shared respawn immunity prevents double damage',
  )
  s.checkpoint = 1
  s.stars[0].taken = true
  s.pads[0].active = true
  const saved = twins.create(twins.save(s))
  assert.ok(saved.players.every((p) => p.x > 500))
  assert.equal(saved.stars[0].taken, true)
  assert.equal(saved.pads[0].active, true)
  const energy = s.players[0].energy
  twins.update(s, input([], [' ']), 0.01)
  assert.ok(s.players[0].energy < energy)
  assert.ok(s.players[0].vy < 0)
  const late = twins.create(progress(10))
  late.roomTime = 3
  twins.update(late, input(), 0.01)
  assert.equal(late.laser, 2)
  assert.notEqual(late.wind, 0)
  assert.ok(twins.platforms(late).length > late.platforms.length + 2)
})

test('Multiplayer tournaments retain results across stage choices and saved completed rounds', async () => {
  for (let n = 0; n < slugs.length; n++) {
    const slug = slugs[n],
      engine = engines[n],
      game = await loadGame(slug)
    game.start()
    game.advance(0.1)
    const s = game.scene()
    s.phase = 'choice'
    s.score = 4321
    if (s.wins) s.wins[0] = 2
    game.advance(0.2)
    const stored = Object.fromEntries(game.storage)
    game.destroy()
    const restored = await loadGame(slug, 'en', stored)
    restored.start()
    restored.advance(0.1)
    assert.equal(restored.scene().phase, 'choice', slug)
    assert.equal(restored.scene().score, 4321, slug)
    restored.key('1')
    restored.advance(0.1)
    assert.equal(restored.scene().stage, 2)
    if (restored.scene().wins) assert.equal(restored.scene().wins[0], 2)
    restored.destroy()
    const later = engine.create(progress(24))
    finite(later)
    for (let frame = 0; frame < 3000 && later.phase === 'play'; frame++) {
      engine.update(
        later,
        input(
          frame % 200 < 100
            ? ['d', 'arrowleft', 'w', 'enter']
            : ['a', 'arrowright', 's', ' '],
          frame % 71 === 0 ? ['q', 'shift', ' '] : [],
        ),
        1 / 60,
      )
    }
    finite(later)
  }
})

test('Solo opponents actually serve, aim, shoot, and complete races under the same physics', () => {
  const solo = (mode = 'solo') => ({ ...input(), mode })
  const v = volley.create()
  for (let n = 0; n < 1800 && v.phase === 'play'; n++)
    volley.update(v, solo(), 1 / 60)
  assert.equal(v.mode, 'solo')
  assert.ok(v.players[1].x !== 770)
  assert.ok(v.points[1] > 0 || v.wins[1] > 0)
  const t = tank.create()
  t.turn = 1
  for (let n = 0; n < 1200 && t.turn === 1 && t.phase === 'play'; n++)
    tank.update(t, solo(), 1 / 60)
  assert.ok(t.shots > 0)
  assert.ok(t.turn === 0 || t.phase === 'choice')
  assert.ok(
    t.tanks[0].hp < 5,
    'Computer artillery must be able to hit its target',
  )
  const d = disc.create()
  for (let n = 0; n < 1800 && d.phase === 'play'; n++)
    disc.update(d, solo(), 1 / 60)
  assert.ok(d.hits > 0)
  assert.ok(d.players[0].hp < 5 || d.wins[1] > 0)
  for (const track of [0, 2, 3]) {
    const r = racing.create(progress(1, { track }))
    for (let n = 0; n < 18000 && r.phase === 'play'; n++)
      racing.update(r, solo(), 1 / 60)
    assert.equal(r.wins[1], 1, `Computer racer failed track ${track}`)
    assert.equal(r.cars[0].lap, 0)
  }
  for (const engine of [volley, tank, disc, racing])
    for (const mode of ['relaxed', 'expert', 'local']) {
      const s = engine.create()
      for (let n = 0; n < 60; n++) engine.update(s, solo(mode), 1 / 60)
      assert.equal(s.mode, mode)
      assert.equal(engine.create(engine.save(s)).mode, mode)
      finite(s)
    }
})
