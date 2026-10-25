import assert from 'node:assert/strict'
import test from 'node:test'
import { loadGame } from './game-harness.mjs'
const slugs = [
  'brick-breaker',
  'neon-snake',
  'paddle-duel',
  'rooftop-runner',
  'soccer-duel',
  'star-patrol',
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
  'volley-clash',
  'tank-tactics',
  'ricochet-rivals',
  'circuit-clash',
  'twin-tethers',
]
function pointer(pointerId = 1) {
  const captures = new Set()
  return {
    pointerId,
    currentTarget: {
      dataset: {},
      setPointerCapture(id) {
        captures.add(id)
      },
      hasPointerCapture(id) {
        return captures.has(id)
      },
    },
    preventDefault() {
      this.defaultPrevented = true
    },
  }
}
function button(game, key) {
  return game.find(
    (node) => node.type === 'button' && node.props['data-touch-key'] === key,
    true,
  )
}
function touch(game, key, held = true, event = pointer()) {
  const control = button(game, key)
  assert.ok(control, `${key} control exists`)
  game.act(() =>
    held
      ? control.props.onPointerDown(event)
      : control.props.onPointerUp(event),
  )
  return event
}

test('Every game exposes a usable touch pad at phone width with captured pointers and a high-DPI canvas', async () => {
  for (const slug of slugs) {
    const game = await loadGame(slug, 'en', {}, { width: 360, ratio: 3 })
    game.start()
    game.advance(0.2)
    const pad = game.find((node) => node.type?.name === 'TouchControls')
    assert.ok(pad, slug)
    assert.ok(
      pad.props.groups.reduce(
        (total, group) => total + group.buttons.length,
        0,
      ) >= 3,
      slug,
    )
    assert.equal(pad.props.enabled, true, slug)
    assert.equal(game.canvas.width, 1080, slug)
    const key = pad.props.groups[0].buttons[0][1],
      event = pointer(11)
    touch(game, key, true, event)
    assert.equal(event.defaultPrevented, true)
    assert.equal(event.currentTarget.hasPointerCapture(11), true)
    game.advance(0.12)
    touch(game, key, false, event)
    game.advance(0.12)
    assert.equal(game.status, 'playing', slug)
    game.destroy()
  }
})

test('Multiple fingers can hold movement and charge independently; final release fires a disc once', async () => {
  const game = await loadGame('ricochet-rivals')
  game.start()
  game.advance(1.6)
  const movement = pointer(1),
    charge = pointer(2)
  const x = game.scene().players[0].x
  touch(game, 'd', true, movement)
  touch(game, ' ', true, charge)
  game.advance(0.35)
  assert.ok(game.scene().players[0].x > x)
  assert.ok(game.scene().players[0].charge > 0.4)
  assert.equal(game.scene().discs.filter((d) => d.owner === 0).length, 0)
  touch(game, 'd', false, movement)
  touch(game, ' ', false, charge)
  game.advance(0.05)
  assert.equal(game.scene().discs.filter((d) => d.owner === 0).length, 1)
  const control = button(game, ' ')
  game.act(() => control.props.onLostPointerCapture(charge))
  game.advance(0.05)
  assert.equal(game.scene().discs.filter((d) => d.owner === 0).length, 1)
  game.destroy()
})

test('Touch cancellation pauses and clears movement, and two fingers on one button release independently', async () => {
  const game = await loadGame('brick-breaker')
  game.start()
  game.advance(0.2)
  const event = pointer(1),
    second = { ...event, pointerId: 2 }
  touch(game, 'left', true, event)
  touch(game, 'left', true, second)
  touch(game, 'left', false, event)
  const x = game.scene().paddleX
  game.advance(0.1)
  assert.ok(game.scene().paddleX < x, 'Second pointer still holds left')
  touch(game, 'left', false, second)
  game.advance(0.1)
  const stopped = game.scene().paddleX
  game.advance(0.1)
  assert.equal(game.scene().paddleX, stopped)
  const cancel = pointer(3)
  touch(game, 'right', true, cancel)
  game.advance(0.1)
  const control = button(game, 'right')
  game.act(() => control.props.onPointerCancel(cancel))
  assert.equal(game.status, 'paused')
  game.key('Escape')
  game.advance(0.1)
  const resumed = game.scene().paddleX
  game.advance(0.1)
  assert.equal(game.scene().paddleX, resumed)
  game.destroy()
})

test('Co-op touch pads move separate players and local-versus pads can replace a keyboard', async () => {
  for (const slug of [
    'twin-tethers',
    'bubble-tower',
    'blast-arena',
    'volley-clash',
    'ricochet-rivals',
    'circuit-clash',
  ]) {
    const game = await loadGame(slug)
    const mode = slug === 'bubble-tower' ? 'coop' : 'local',
      option = game.find(
        (node) =>
          node.type === 'button' &&
          node.props.onClick &&
          node.props.children?.some?.(
            (child) =>
              child?.props?.children ===
              (mode === 'coop'
                ? 'Two-player co-op'
                : 'Two players · one keyboard'),
          ),
        true,
      )
    if (option) game.act(() => option.props.onClick())
    else if (slug === 'blast-arena') {
      const choice = game.find(
        (node) =>
          node.type === 'button' &&
          node.props.onClick &&
          node.props.children?.some?.(
            (child) => child?.props?.children === 'Local duel',
          ),
        true,
      )
      if (choice) game.act(() => choice.props.onClick())
    }
    game.start()
    game.advance(2.6)
    const pad = game.find((node) => node.type?.name === 'TouchControls')
    assert.equal(pad.props.groups.length, 2, slug)
    assert.ok(button(game, 'a'))
    assert.ok(button(game, 'arrowright'))
    const p1 = pointer(1),
      p2 = pointer(2)
    touch(game, 'd', true, p1)
    touch(game, 'arrowleft', true, p2)
    game.advance(0.15)
    touch(game, 'd', false, p1)
    touch(game, 'arrowleft', false, p2)
    assert.equal(game.status, 'playing', slug)
    game.destroy()
  }
})

test('Paddle Duel offers a computer opponent and a single phone control pad', async () => {
  const game = await loadGame('paddle-duel')
  const mode = game.find(
    (node) =>
      node.type === 'button' &&
      node.props.children?.some?.(
        (child) => child?.props?.children === 'Solo · club opponent',
      ),
    true,
  )
  assert.ok(mode)
  game.act(() => mode.props.onClick())
  game.start()
  game.advance(0.1)
  const before = game.scene().rightY
  game.advance(0.5)
  assert.notEqual(game.scene().rightY, before)
  const controls = game.find((node) => node.type?.name === 'TouchControls')
  assert.equal(controls.props.groups.length, 1)
  assert.equal(game.storage.get('playcove.paddle-duel.mode'), 'solo')
  game.destroy()
})
