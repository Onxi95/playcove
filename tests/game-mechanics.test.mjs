import assert from 'node:assert/strict'
import test from 'node:test'
import { queueTurn, snakeStep, fruitScore } from '../src/games/neon-snake/mechanics.ts'
import { createBricks, paddleReturn } from '../src/games/brick-breaker/mechanics.ts'
import { matchWon, returnVelocity } from '../src/games/paddle-duel/mechanics.ts'
import { makeSection, runnerSpeed } from '../src/games/rooftop-runner/mechanics.ts'
import { aimedShot, makeFormation } from '../src/games/star-patrol/mechanics.ts'
import { ballInKickRange, shotProfile } from '../src/games/soccer-duel/mechanics.ts'
import { collideGoalFrames, collidePlayer, goalScorer, integrateBall } from '../src/games/soccer-duel/ball-physics.ts'
import { createCareer, finishCareerMatch, opponentFor } from '../src/games/soccer-duel/career.ts'

test('Snake preserves a quick two-turn corner, rejects reversals, and permits moving into a vacating tail', () => {
  const queue = []
  queueTurn(queue, { x: 1, y: 0 }, { x: 0, y: -1 })
  queueTurn(queue, { x: 1, y: 0 }, { x: -1, y: 0 })
  queueTurn(queue, { x: 1, y: 0 }, { x: 0, y: 1 })
  assert.deepEqual(queue, [{ x: 0, y: -1 }, { x: -1, y: 0 }])
  const snake = [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 2 }]
  assert.equal(snakeStep(snake, { x: 1, y: 0 }, false, 24).crashed, false)
  assert.equal(snakeStep(snake, { x: 1, y: 0 }, true, 24).crashed, true)
  assert.equal(snakeStep([{ x: 0, y: 0 }], { x: -1, y: 0 }, false, 24).crashed, true)
  assert.equal(fruitScore(3, true, true), 300)
})

test('Brick Breaker keeps later layouts varied and breakable, with controllable returns', () => {
  const layouts = new Set()
  for (let wave = 1; wave <= 100; wave += 1) {
    const bricks = createBricks(wave).filter((brick) => brick.alive)
    assert.ok(bricks.length >= 15)
    assert.ok(bricks.every((brick) => brick.hits <= 2 && brick.y + 19 < 300 && brick.x >= 38 && brick.x + 62 <= 762))
    if (wave <= 4) layouts.add(JSON.stringify(bricks.map(({ x, y }) => [x, y])))
  }
  assert.equal(layouts.size, 4)
  for (const offset of [-1, -.5, 0, .5, 1]) {
    const velocity = paddleReturn(offset, 650, 0)
    assert.ok(velocity.vy < -300)
    assert.ok(Math.abs(Math.hypot(velocity.vx, velocity.vy) - 650) < 1e-8)
  }
  assert.ok(paddleReturn(.7, 400, 0).vx > paddleReturn(0, 400, 0).vx)
})

test('Paddle Duel supports deuce and spin without creating unreturnable vertical rallies', () => {
  assert.equal(matchWon(7, 6), false)
  assert.equal(matchWon(8, 6), true)
  assert.equal(matchWon(14, 13), false)
  assert.equal(matchWon(15, 13), true)
  for (const direction of [-1, 1]) for (const offset of [-1, 0, 1]) for (const movement of [-1, 0, 1]) {
    const velocity = returnVelocity(offset, movement, 720, direction, true)
    assert.ok(Math.sign(velocity.vx) === direction)
    assert.ok(Math.abs(velocity.vx) > 330)
    assert.ok(Math.abs(Math.hypot(velocity.vx, velocity.vy) - 720) < 1e-8)
  }
})

test('Runner sections retain landing and slide windows at maximum speed, and introduce roof gaps', () => {
  const kinds = new Set()
  for (const elapsed of [0, 30, 120, 1800]) for (let section = 0; section < 20; section += 1) for (let variant = 0; variant < 4; variant += 1) {
    const speed = runnerSpeed(elapsed)
    const layout = makeSection(840, speed, section, variant)
    for (const obstacle of layout.obstacles) {
      kinds.add(obstacle.kind)
      if (obstacle.kind === 'gap') assert.ok(obstacle.width / speed <= .45)
    }
    for (let index = 1; index < layout.obstacles.length; index += 1) {
      const previous = layout.obstacles[index - 1]
      const pairedJump = previous.kind === 'crate' && layout.obstacles[index].kind === 'crate'
      assert.ok((layout.obstacles[index].x - previous.x - previous.width) / speed >= (pairedJump ? .15 : .28))
    }
    assert.equal(layout.coins.length, layout.obstacles.length * 5)
    assert.ok(layout.length > layout.obstacles.at(-1).x - 840 + speed * .9)
  }
  assert.deepEqual([...kinds].sort(), ['crate', 'gap', 'sign', 'stack'])
  assert.ok(runnerSpeed(1800) <= 620)
})

test('Star Patrol schedules bosses and armored formations while keeping attacks dodgeable', () => {
  for (let wave = 1; wave <= 100; wave += 1) {
    const formation = makeFormation(wave)
    assert.ok(formation.every((enemy) => enemy.x > 35 && enemy.x < 765 && enemy.y < 300))
    if (wave % 4 === 0) assert.equal(formation.length, 1)
    else assert.ok(formation.length >= 10 && formation.every((enemy) => enemy.hits <= 2))
  }
  for (const target of [0, 400, 800]) {
    const shot = aimedShot(400, 100, target, 280)
    assert.ok(shot.vy > 230)
    assert.ok(Math.abs(Math.hypot(shot.vx, shot.vy) - 280) < 1e-8)
  }
})

test('Soccer offers distinct, bounded shot arcs and forgiving contact range', () => {
  const low = shotProfile({ aim: 'ground', vy: 0 })
  const drive = shotProfile({ aim: 'drive', vy: 0 })
  const lob = shotProfile({ aim: 'lob', vy: 0 })
  const charged = shotProfile({ aim: 'lob', vy: 0, charge: 1 })
  assert.ok(lob.vertical < drive.vertical && drive.vertical < low.vertical)
  assert.ok(low.horizontal > drive.horizontal && drive.horizontal > lob.horizontal)
  assert.ok(charged.horizontal > lob.horizontal && charged.vertical < lob.vertical)
  const player = { x: 300, y: 354, facing: 1 }
  assert.equal(ballInKickRange({ x: 300, y: 414 }, player), true)
  assert.equal(ballInKickRange({ x: 250, y: 414 }, player), false)
})

test('Soccer goals require crossing the mouth below the crossbar with the whole ball', () => {
  assert.equal(goalScorer({ x: 122, y: 380 }, { x: 118, y: 380, vx: -450, vy: 0 }), 1)
  assert.equal(goalScorer({ x: 778, y: 380 }, { x: 782, y: 380, vx: 450, vy: 0 }), 0)
  assert.equal(goalScorer({ x: 122, y: 200 }, { x: 118, y: 200, vx: -450, vy: 0 }), null)
  assert.equal(goalScorer({ x: 80, y: 190 }, { x: 80, y: 260, vx: 0, vy: 500 }), null)
  assert.equal(goalScorer({ x: 122, y: 380 }, { x: 121, y: 380, vx: -450, vy: 0 }), null)
})

test('Both goal roofs bounce a dropping ball instead of allowing a top-entry goal', () => {
  for (const x of [80, 820]) {
    const ball = { x, y: 160, vx: 0, vy: 350 }
    let bounced = false
    for (let step = 0; step < 60; step += 1) {
      const previous = integrateBall(ball, 1 / 120, 0)
      bounced ||= collideGoalFrames(ball)
      assert.equal(goalScorer(previous, ball), null)
      assert.ok(ball.y < 226)
    }
    assert.equal(bounced, true)
  }
})

test('Soccer dribbling carries the ball gently; settled balls stop; embedded contacts resolve', () => {
  const ball = { x: 225, y: 414, vx: 100, vy: 0 }
  collidePlayer(ball, { x: 200, y: 354, vx: 300, vy: 0 })
  assert.ok(ball.x > 228 && ball.vx > 280 && ball.vx < 340 && ball.vy === 0)
  const embedded = { x: 200, y: 385, vx: 0, vy: 0 }
  collidePlayer(embedded, { x: 200, y: 354, vx: 0, vy: 0 })
  assert.ok(embedded.x < 173 || embedded.x > 227 || embedded.y < 347 || embedded.y > 434)
  for (let index = 0; index < 2400; index += 1) integrateBall(ball, 1 / 120, 0)
  assert.ok(Math.abs(ball.vx) < .01 && ball.vy === 0 && ball.y === 414)
})

test('Soccer career links dozens of matches, varies opponents, grants cups, and ends only after three losses', () => {
  let career = createCareer()
  const styles = new Set()
  const arenas = new Set()
  for (let index = 0; index < 30; index += 1) {
    const opponent = opponentFor(career)
    styles.add(opponent.style)
    arenas.add(opponent.arena)
    assert.equal(opponent.number, index + 1)
    career = finishCareerMatch(career, [opponent.targetGoals, 2])
    assert.equal(career.losses, 0)
  }
  assert.equal(career.wins, 30)
  assert.equal(career.bestStreak, 30)
  assert.equal(styles.size, 5)
  assert.equal(arenas.size, 3)
  assert.ok(career.points > 20000)
  assert.equal(opponentFor(career).targetGoals, 7)
  for (let index = 0; index < 3; index += 1) career = finishCareerMatch(career, [4, 7])
  assert.equal(career.losses, 3)
  assert.equal(career.streak, 0)
  assert.equal(career.bestStreak, 30)
})
