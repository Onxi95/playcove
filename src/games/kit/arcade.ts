import type { TouchGroup } from './TouchControls.tsx'
export type Language = 'en' | 'pl'
export type Text = Record<Language, string>
export type Feedback = 'hit' | 'pickup' | 'boost' | 'point'
export type Progress = {
  stage: number
  score: number
  lives: number
  elapsed: number
  carry: Record<string, string | number | boolean>
}
export type ArcadeState = {
  stage: number
  score: number
  lives: number
  elapsed: number
  phase: 'play' | 'choice' | 'over'
  seed: number
  events: Feedback[]
  startScore: number
}
export type ArcadeInput = {
  held: Set<string>
  pressed: Set<string>
  pointer: { x: number; y: number; active: boolean; down: boolean }
  mode: string
}
export type Choice = { id: string; title: string; detail: string }
export type ArcadeDefinition<S extends ArcadeState> = {
  id: string
  name: string
  width: number
  height: number
  help: Text
  tagline: Text
  touch?: Array<[label: string, key: string]>
  touchGroups?: (scene: S, locale: Language) => TouchGroup[]
  modes?: Array<{ id: string; title: Text; detail: Text }>
  configure?: (scene: S, mode: string) => void
  create: (progress?: Progress) => S
  update: (scene: S, input: ArcadeInput, delta: number) => void
  draw: (
    context: CanvasRenderingContext2D,
    scene: S,
    locale: Language,
    motion: boolean,
  ) => void
  choices: (scene: S, locale: Language) => Choice[]
  choose: (scene: S, id: string) => void
  checkpoint?: (scene: S) => Progress
  endMessage?: (scene: S, locale: Language) => string
  meter?: (
    scene: S,
    locale: Language,
  ) => { label: string; value: string | number }
  status?: (scene: S, locale: Language) => string
  stats?: (
    scene: S,
    locale: Language,
  ) => Array<{ label: string; value: string | number }>
}
export function down(input: ArcadeInput, ...keys: string[]) {
  return keys.some((key) => input.held.has(key))
}
export function pressed(input: ArcadeInput, ...keys: string[]) {
  return keys.some((key) => input.pressed.has(key))
}
export function random(scene: { seed: number }) {
  scene.seed = (Math.imul(scene.seed, 1664525) + 1013904223) >>> 0
  return scene.seed / 4294967296
}
export function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
export function base(progress?: Progress): ArcadeState {
  return {
    stage: progress?.stage ?? 1,
    score: progress?.score ?? 0,
    lives: progress?.lives ?? 3,
    elapsed: progress?.elapsed ?? 0,
    phase: 'play',
    seed: 17389 + (progress?.stage ?? 1) * 7919,
    events: [],
    startScore: progress?.score ?? 0,
  }
}
export function checkpoint(scene: ArcadeState): Progress {
  return {
    stage: scene.stage,
    score: scene.startScore,
    lives: scene.lives,
    elapsed: scene.elapsed,
    carry: {},
  }
}
export function nextStage(scene: ArcadeState) {
  scene.stage += 1
  scene.startScore = scene.score
  scene.phase = 'play'
}
export function loseLife(scene: ArcadeState) {
  scene.lives -= 1
  if (scene.lives <= 0) scene.phase = 'over'
  scene.events.push('boost')
}
export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  size = 16,
  color = '#e7efe8',
  align: CanvasTextAlign = 'left',
) {
  ctx.fillStyle = color
  ctx.font = `700 ${size}px system-ui,sans-serif`
  ctx.textAlign = align
  ctx.fillText(value, x, y)
}
export function rect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  radius = 0,
) {
  ctx.fillStyle = color
  if (radius) {
    ctx.beginPath()
    ctx.roundRect(x, y, w, h, radius)
    ctx.fill()
  } else ctx.fillRect(x, y, w, h)
}
export function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string | CanvasGradient,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
}
export function backdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  color = '#10202c',
) {
  ctx.clearRect(0, 0, w, h)
  rect(ctx, 0, 0, w, h, color)
}
export function numberCarry(
  progress: Progress | undefined,
  key: string,
  fallback: number,
  min = 0,
  max = 1e8,
) {
  const value = progress?.carry[key]
  return typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : fallback
}
