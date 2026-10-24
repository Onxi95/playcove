import assert from 'node:assert/strict'
import test from 'node:test'
import { loadGame } from './game-harness.mjs'
import { runnerSpeed } from '../src/games/rooftop-runner/mechanics.ts'
import { makeFormation } from '../src/games/star-patrol/mechanics.ts'

const games = ['brick-breaker', 'neon-snake', 'rooftop-runner', 'star-patrol', 'paddle-duel', 'soccer-duel']
const progressKey = 'playcove.soccer-duel.arcade.progress.v1'

function forceSoccerGoal(run, side, current = [4, 0]) {
  const match = run.scene()
  match.score = [...current]
  match.resetTimer = 0
  match.ball = { x: side === 0 ? 778 : 122, y: 350, vx: side === 0 ? 600 : -600, vy: 0, rotation: 0, kickFlash: 0 }
  run.advance(.05)
}

for (const game of games) {
  test(`${game}: large and high-DPI displays get a full-resolution buffer, including after resize`, async () => {
    const run = await loadGame(game, 'en', {}, { width: 1200, ratio: 2 })
    try {
      assert.equal(run.canvas.width, 2400)
      assert.ok(run.canvas.height >= 1320)
      run.start()
      const scene = run.scene()
      run.advance(.1)
      run.resize(900, 3)
      assert.equal(run.canvas.width, 2700)
      assert.equal(run.scene(), scene)
      assert.equal(run.status, 'playing')
      run.advance(.1)
      run.resize(900, 4)
      assert.equal(run.canvas.width, 3600)
      run.resize(600, 1)
      assert.equal(run.canvas.width, 600)
      assert.equal(run.status, 'playing')
    } finally { run.destroy() }
  })

  test(`${game}: full round, automatic result save, one-key retry, and clean repeat`, async () => {
    const run = await loadGame(game)
    try {
      assert.equal(run.status, 'ready')
      run.key('Enter')
      assert.equal(run.status, 'playing')
      const first = run.scene()
      run.advance(120)
      assert.equal(run.status, 'over')
      assert.ok(run.drawCalls > 0)
      if (run.overlay().result.score > 0 || game.endsWith('duel')) assert.equal(run.overlay().result.saved, true)
      const records = run.storage.get(`playcove.${game}.scores`)
      run.advance(1)
      assert.equal(run.storage.get(`playcove.${game}.scores`), records)
      run.key(' ', true, { repeat: true })
      assert.equal(run.status, 'over')
      run.key(' ')
      assert.equal(run.status, 'playing')
      assert.notEqual(run.scene(), first)
      assert.equal(run.overlay().result.value, game.endsWith('duel') ? '0–0' : 0)
      run.advance(120)
      assert.equal(run.status, 'over')
    } finally { run.destroy() }
  })

  test(`${game}: blur pauses safely, time freezes, and held movement clears`, async () => {
    const run = await loadGame(game)
    try {
      run.start()
      run.key(game === 'paddle-duel' ? 'w' : 'd')
      run.advance(.2)
      run.emit('window', 'blur')
      assert.equal(run.status, 'paused')
      const snapshot = JSON.stringify(run.scene())
      run.advance(5)
      assert.equal(JSON.stringify(run.scene()), snapshot)
      run.key('Escape')
      assert.equal(run.status, 'playing')
      if (game === 'brick-breaker') {
        const x = run.scene().paddleX
        run.advance(.1)
        assert.equal(run.scene().paddleX, x)
      }
      if (game === 'paddle-duel') {
        const y = run.scene().leftY
        run.advance(.1)
        assert.equal(run.scene().leftY, y)
      }
      const panel = run.find((node) => node.type?.name === 'GamePanel')
      run.act(panel.props.onOpen)
      assert.equal(run.status, 'paused')
    } finally { run.destroy() }
  })
}

test('All games render an integrated menu and records panel in both languages', async () => {
  for (const game of games) for (const locale of ['en', 'pl']) {
    const run = await loadGame(game, locale)
    try {
      assert.ok(run.overlay().gameName.length > 3)
      assert.ok(run.find((node) => node.type === 'details', true))
      assert.ok(run.find((node) => node.type === 'button' && node.props['aria-label'] === (locale === 'pl' ? 'Przełącz pełny ekran' : 'Toggle fullscreen'), true))
      assert.ok(run.find((node) => node.type === 'input', true))
      if (game === 'soccer-duel') assert.ok(run.overlay().settings)
    } finally { run.destroy() }
  }
})

test('Snake consumes a fast corner, scores boosted fruit, and leaves normal food when a bonus expires', async () => {
  const run = await loadGame('neon-snake')
  try {
    run.start()
    run.scene().food = { x: 9, y: 11, golden: false }
    run.key('w')
    run.key('a')
    run.key(' ')
    run.advance(.12)
    assert.equal(run.scene().score, 20)
    run.advance(.1)
    assert.deepEqual({ ...run.scene().direction }, { x: -1, y: 0 })
    const food = { ...run.scene().food }
    run.scene().bonus = { x: 20, y: 20, golden: true }
    run.scene().goldenTimer = .01
    run.advance(.05)
    assert.equal(run.scene().bonus, null)
    assert.deepEqual({ ...run.scene().food }, food)
  } finally { run.destroy() }
})

test('Snake celebrates a full board instead of generating unreachable food', async () => {
  const run = await loadGame('neon-snake')
  try {
    run.start()
    const scene = run.scene()
    scene.snake = [{ x: 0, y: 0 }]
    for (let y = 0; y < 24; y += 1) for (let x = 0; x < 24; x += 1) {
      if (y === 0 && (x === 0 || x === 1)) continue
      scene.snake.push({ x, y })
    }
    scene.food = { x: 1, y: 0, golden: false }
    run.advance(.2)
    assert.equal(scene.snake.length, 576)
    assert.equal(run.status, 'over')
    assert.equal(run.overlay().title, 'Board cleared!')
    assert.equal(run.overlay().result.saved, true)
  } finally { run.destroy() }
})

test('A fresh retry key works on the first frame after a loss; a held key cannot restart', async () => {
  const run = await loadGame('neon-snake')
  try {
    run.start()
    run.scene().snake = [{ x: 23, y: 12 }, { x: 22, y: 12 }, { x: 21, y: 12 }]
    for (let frame = 0; frame < 20 && run.status === 'playing'; frame += 1) run.advance(1 / 60)
    assert.equal(run.status, 'over')
    run.key(' ', true, { repeat: true })
    assert.equal(run.status, 'over')
    run.key(' ')
    assert.equal(run.status, 'playing')
    assert.equal(run.scene().snake.length, 3)
  } finally { run.destroy() }
})

test('Brick Breaker offers laser cleanup and continues to new waves without a time limit', async () => {
  const run = await loadGame('brick-breaker')
  try {
    run.start()
    const scene = run.scene()
    scene.serveTimer = 0
    scene.bricks.forEach((brick, index) => { brick.alive = index < 4 })
    run.advance(.05)
    assert.equal(scene.laserFuel, 100)
    run.key(' ')
    run.advance(.1)
    assert.ok(scene.laserTimer > 0 && scene.lasers.length > 0)
    for (let wave = 1; wave <= 30; wave += 1) {
      scene.serveTimer = 0
      for (const brick of scene.bricks) brick.alive = false
      run.advance(.05)
      assert.equal(scene.wave, wave + 1)
      assert.equal(run.status, 'playing')
      assert.ok(scene.ballSpeed <= 650)
    }
    assert.equal(scene.lives, 5)
  } finally { run.destroy() }
})

test('Runner supports fifteen-minute skilled runs through precision jumps, signs, stacks, and roof gaps', async () => {
  const run = await loadGame('rooftop-runner')
  let jump = false
  let slide = false
  let crossedGaps = 0
  try {
    run.start()
    run.advance(900, 60, (game) => {
      if (game.status !== 'playing') return
      const scene = game.scene()
      const upcoming = scene.obstacles.filter((item) => item.x + item.width > 112).sort((a, b) => a.x - b.x)
      const obstacle = upcoming[0]
      const speed = runnerSpeed(scene.elapsed)
      const distance = obstacle ? obstacle.x - 130 : Infinity
      const paired = obstacle?.kind === 'crate' && upcoming[1]?.kind === 'crate' && (upcoming[1].x - obstacle.x) / speed < .5
      const jumpWindow = paired ? .14 : obstacle?.kind === 'gap' ? .18 : obstacle?.kind === 'stack' ? .27 : .25
      const jumping = Boolean(obstacle && obstacle.kind !== 'sign' && distance < speed * jumpWindow && distance > -(obstacle.width + 15))
      const sliding = Boolean(obstacle?.kind === 'sign' && distance < speed * .45 && distance > -(obstacle.width + 15))
      if (jumping !== jump) game.key('w', jumping)
      if (sliding !== slide) game.key('s', sliding)
      if (jumping && !jump && obstacle.kind === 'gap') crossedGaps += 1
      jump = jumping
      slide = sliding
    })
    assert.equal(run.status, 'playing')
    assert.ok(run.scene().cleared > 600)
    assert.ok(crossedGaps > 30)
    assert.ok(run.scene().coinsCollected > 1000)
  } finally { run.destroy() }
})

test('Star Patrol pulse clears dangerous bullets, boss damage has phases, and clearing a boss continues the run', async () => {
  const run = await loadGame('star-patrol')
  try {
    run.start()
    const scene = run.scene()
    scene.shots.push({ x: scene.shipX, y: 390, vx: 0, vy: 250, owner: 'enemy' })
    run.key(' ')
    run.advance(.05)
    assert.equal(scene.shots.some((shot) => shot.owner === 'enemy'), false)
    assert.ok(scene.enemies.length > 0)
    scene.wave = 4
    scene.enemies = makeFormation(4)
    scene.shots = []
    scene.enemyShotTimer = 0
    run.advance(.05)
    assert.equal(scene.shots.filter((shot) => shot.owner === 'enemy').length, 5)
    scene.enemies[0].hits = 1
    scene.enemyShotTimer = 0
    scene.shots = []
    run.advance(.05)
    assert.equal(scene.shots.filter((shot) => shot.owner === 'enemy').length, 7)
    const boss = scene.enemies[0]
    scene.shots.push({ x: boss.x, y: boss.y + 12, vx: 0, vy: -640, owner: 'player' })
    run.advance(.05)
    assert.equal(scene.betweenWaves, true)
    run.advance(1.1)
    assert.equal(scene.wave, 5)
    assert.equal(run.status, 'playing')
  } finally { run.destroy() }
})

test('Soccer visibly updates pitch scores, advances a career, and resumes a partial match after reload', async () => {
  const run = await loadGame('soccer-duel')
  let stored
  try {
    run.start()
    forceSoccerGoal(run, 0)
    assert.equal(run.status, 'over')
    assert.equal(run.overlay().actionLabel, 'Next match')
    assert.ok(run.drawnText.has('5  :  0'))
    const checkpoint = JSON.parse(run.storage.get(progressKey))
    assert.equal(checkpoint.career.wins, 1)
    assert.equal(checkpoint.career.losses, 0)
    run.advance(.4)
    run.key(' ')
    assert.equal(run.status, 'playing')
    forceSoccerGoal(run, 0, [1, 1])
    assert.equal(run.status, 'playing')
    assert.deepEqual(JSON.parse(run.storage.get(progressKey)).score, [2, 1])
    stored = Object.fromEntries(run.storage)
  } finally { run.destroy() }
  const resumed = await loadGame('soccer-duel', 'en', stored)
  try {
    assert.equal(resumed.overlay().actionLabel, 'Continue run')
    resumed.start()
    assert.deepEqual([...resumed.scene().score], [2, 1])
    assert.equal(JSON.parse(resumed.storage.get(progressKey)).career.wins, 1)
  } finally { resumed.destroy() }
})

test('Soccer arcade lasts beyond a short match, ends after three losses, and restarts a fresh career', async () => {
  const run = await loadGame('soccer-duel')
  try {
    run.start()
    for (let loss = 1; loss <= 3; loss += 1) {
      forceSoccerGoal(run, 1, [1, 4])
      assert.equal(run.status, 'over')
      if (loss < 3) {
        assert.equal(run.overlay().actionLabel, 'Next match')
        run.advance(.4)
        run.key('Enter')
        assert.equal(run.status, 'playing')
      }
    }
    assert.equal(run.overlay().actionLabel, 'New run')
    assert.equal(run.storage.has(progressKey), false)
    const records = JSON.parse(run.storage.get('playcove.soccer-duel.arcade.scores'))
    assert.equal(records.length, 1)
    assert.equal(records[0].goals, 3)
    run.advance(.4)
    run.key(' ')
    assert.equal(run.status, 'playing')
    assert.equal(JSON.parse(run.storage.get(progressKey)).career.losses, 0)
  } finally { run.destroy() }
})

test('Soccer quick/local menus live inside the screen and preserve selectable match lengths', async () => {
  const run = await loadGame('soccer-duel')
  try {
    const quick = run.find((node) => node.type === 'button' && node.props.children === 'Quick match', true)
    run.act(quick.props.onClick)
    const target = run.find((node) => node.type === 'button' && node.props.children === 7, true)
    run.act(target.props.onClick)
    run.start()
    forceSoccerGoal(run, 0)
    assert.equal(run.status, 'playing')
    run.scene().resetTimer = 0
    forceSoccerGoal(run, 0, [6, 0])
    assert.equal(run.status, 'over')
    assert.equal(run.overlay().actionLabel, 'Rematch')
  } finally { run.destroy() }
})
