import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { loadGame } from './game-harness.mjs'

function luminance(hex) {
  const channels = hex
    .match(/[a-f\d]{2}/gi)
    .map((value) => parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    )
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

test('Saved-run restart is a visible, directly actionable button beside Continue', async () => {
  const first = await loadGame('block-cascade')
  first.start()
  first.advance(0.2)
  first.key('Escape')
  const stored = Object.fromEntries(first.storage)
  first.destroy()
  const resumed = await loadGame('block-cascade', 'en', stored)
  assert.equal(resumed.status, 'ready')
  assert.equal(resumed.overlay().actionLabel, 'Continue')
  const restart = resumed.find(
    (node) =>
      node.type === 'button' &&
      JSON.stringify(node.props.children).includes('Start a new run'),
    true,
  )
  assert.ok(restart)
  assert.ok(
    restart.props.className?.includes('game-secondary-button'),
    'Saved-run restart needs a visible action style',
  )
  resumed.act(() => restart.props.onClick())
  assert.equal(resumed.status, 'playing', 'Start a new run starts immediately')
  resumed.key('Escape')
  const paused = resumed.find(
    (node) =>
      node.type === 'button' &&
      JSON.stringify(node.props.children).includes('Start a fresh round'),
    true,
  )
  assert.ok(paused?.props.className?.includes('game-secondary-button'))
  resumed.destroy()
})

test('Secondary game action has an explicit high-contrast surface and a touch-sized target', async () => {
  const css = await readFile('src/game-styles.css', 'utf8')
  const rule = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/g)].find(
    ([, selector]) => selector.trim() === '.module-game .game-secondary-button',
  )
  assert.ok(rule, 'Shared restart action style exists')
  const declaration = rule[2],
    foreground = declaration.match(
      /(?:^|;)\s*color:\s*(#[\da-f]{6})\s*;/i,
    )?.[1],
    background = declaration.match(
      /(?:^|;)\s*background:\s*(#[\da-f]{6})\s*;/i,
    )?.[1]
  assert.ok(
    foreground && background,
    'Color must not depend on inheritance or a transparent background',
  )
  const a = luminance(foreground),
    b = luminance(background)
  assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5)
  assert.ok(Number(declaration.match(/min-height:\s*(\d+)px/)?.[1]) >= 44)
})
