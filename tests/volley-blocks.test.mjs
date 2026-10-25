import assert from 'node:assert/strict'
import test from 'node:test'
import * as volley from '../src/games/volley-clash/engine.ts'
import { loadGame } from './game-harness.mjs'
function input(held = [], pressed = [], mode = 'local') {
  return {
    held: new Set(held),
    pressed: new Set(pressed),
    pointer: { x: 0, y: 0, active: false, down: false },
    mode,
  }
}
function attack(index = 0) {
  const s = volley.create()
  s.serve = 0
  const p = s.players[index]
  p.x = index ? 532 : 468
  p.y = 365
  p.vy = -120
  p.ground = false
  s.ball = {
    x: index ? 485 : 515,
    y: 337,
    vx: index ? 430 : -430,
    vy: 130,
    spin: 0,
    last: 1 - index,
    contact: 0,
  }
  return s
}

test('Timed blocks intercept incoming attacks for either player and send them down over the net', () => {
  for (const index of [0, 1]) {
    const s = attack(index),
      p = s.players[index],
      energy = p.energy
    volley.update(s, input([], [index ? 'l' : 'e']), 1 / 120)
    assert.equal(s.blocks, 1)
    assert.equal(s.ball.last, index)
    assert.equal(Math.sign(s.ball.vx), index ? -1 : 1)
    assert.ok(s.ball.vy > 0, 'A well-timed block stuffs the attack downward')
    assert.equal(s.ball.contact, 0.2)
    assert.ok(p.energy < energy - 24)
    assert.ok(p.blockFlash > 0)
    assert.equal(s.touches[index], 0)
    assert.ok(s.blockSpot)
    volley.update(s, input([index ? 'l' : 'e']), 0.01)
    assert.equal(s.blocks, 1, 'One collision produces one block')
  }
})

test('Leaning away softens a block, while its timing and cooldown prevent a permanent wall', () => {
  const s = attack()
  volley.update(s, input(['a'], ['e']), 1 / 120)
  assert.equal(s.blocks, 1)
  assert.ok(s.ball.vy < -200)
  assert.ok(s.ball.vx > 0)
  const early = attack()
  early.players[0].block = 0.12
  early.players[0].blockCooldown = 0.7
  volley.update(early, input(), 1 / 120)
  assert.equal(early.blocks, 1)
  assert.ok(
    early.ball.vy < 0,
    'Late contact gives a less aggressive deflection',
  )
  const tired = attack()
  tired.players[0].energy = 10
  volley.update(tired, input([], ['e']), 1 / 120)
  assert.equal(tired.blocks, 0)
  const cooling = attack()
  cooling.players[0].blockCooldown = 0.5
  volley.update(cooling, input([], ['e']), 1 / 120)
  assert.equal(cooling.blocks, 0)
  const distant = attack()
  distant.players[0].x = 230
  volley.update(distant, input([], ['e']), 1 / 120)
  assert.equal(distant.players[0].block, 0)
})

test('Blocking auto-jumps near the net but misses balls outside the hands and cannot block a friendly touch', () => {
  const s = volley.create()
  s.serve = 0
  s.players[0].x = 465
  s.ball = { x: 800, y: 100, vx: 0, vy: 0, spin: 0, last: 1, contact: 0 }
  volley.update(s, input([], ['e']), 0.01)
  assert.equal(s.players[0].ground, false)
  assert.ok(s.players[0].vy < 0)
  assert.ok(s.players[0].block > 0)
  for (let n = 0; n < 30; n++) volley.update(s, input(['e']), 0.02)
  assert.equal(s.players[0].block, 0, 'Holding does not rearm the block')
  const friendly = attack()
  friendly.ball.last = 0
  volley.update(friendly, input([], ['e']), 1 / 120)
  assert.equal(friendly.blocks, 0)
  const high = attack()
  high.ball.y = 240
  volley.update(high, input([], ['e']), 1 / 120)
  assert.equal(high.blocks, 0)
})

test('Receives set up an attack and four contacts concede a point; a block leaves all three touches available', () => {
  const s = volley.create()
  s.serve = 0
  const setBall = () => {
    s.ball = {
      x: s.players[0].x,
      y: s.players[0].y - 20,
      vx: 0,
      vy: 80,
      spin: 0,
      last: 0,
      contact: 0,
    }
  }
  setBall()
  volley.update(s, input(), 0)
  assert.ok(Math.abs(s.ball.vx) < 150)
  assert.equal(s.ball.vy, -540)
  assert.equal(s.touches[0], 1)
  for (let n = 0; n < 2; n++) {
    setBall()
    volley.update(s, input(), 0)
  }
  assert.equal(s.touches[0], 3)
  setBall()
  volley.update(s, input(), 0)
  assert.equal(s.pointCall, 'touches')
  assert.equal(s.points[1], 1)
  assert.equal(s.fault, 0)
  const hit = volley.create()
  hit.serve = 0
  hit.ball = { x: 230, y: 455, vx: 0, vy: 80, spin: 0, last: 1, contact: 0 }
  volley.update(hit, input([' ']), 0)
  assert.ok(hit.ball.vx >= 285)
  const block = attack()
  block.touches = [2, 1]
  volley.update(block, input([], ['e']), 1 / 120)
  assert.equal(block.blocks, 1)
  assert.deepEqual(block.touches, [0, 0])
  const saved = volley.create(volley.save(block))
  assert.equal(saved.blocks, 1)
  block.ball.x = volley.WIDTH + volley.BALL_RADIUS + 1
  volley.update(block, input(), 0)
  assert.equal(block.pointCall, 'out')
  assert.equal(
    block.points[1],
    1,
    'A blocker is responsible for an out deflection',
  )
})

test('Solo opponents use the same block action, reach, and stamina cost', () => {
  const s = attack(1)
  s.mode = 'expert'
  const energy = s.players[1].energy
  volley.update(s, input([], [], 'expert'), 1 / 120)
  assert.equal(s.blocks, 1)
  assert.equal(s.ball.last, 1)
  assert.ok(s.players[1].energy < energy - 24)
})

test('Blocking is available on touch and draws its stance and impact feedback', async () => {
  const game = await loadGame('volley-clash')
  game.start()
  game.advance(0.1)
  const scene = game.scene(),
    fixture = attack()
  Object.assign(scene, fixture)
  const button = game.find(
    (node) => node.type === 'button' && node.props['data-touch-key'] === 'e',
    true,
  )
  assert.ok(button)
  const captures = new Set(),
    event = {
      pointerId: 7,
      currentTarget: {
        dataset: {},
        setPointerCapture(id) {
          captures.add(id)
        },
        hasPointerCapture(id) {
          return captures.has(id)
        },
      },
      preventDefault() {},
    }
  game.act(() => button.props.onPointerDown(event))
  game.advance(0.03)
  assert.equal(scene.blocks, 1)
  assert.ok(game.drawnText.has('BLOCKED!'))
  game.act(() => button.props.onPointerUp(event))
  game.destroy()
})
