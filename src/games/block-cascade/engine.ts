import { base, down, numberCarry, pressed, random } from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export const COLS = 10,
  ROWS = 20
export const SHAPES = [
  [
    [0, 1],
    [1, 1],
    [2, 1],
    [3, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [1, 1],
    [2, 1],
  ],
  [
    [1, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [0, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [2, 0],
    [0, 1],
    [1, 1],
    [2, 1],
  ],
  [
    [1, 0],
    [2, 0],
    [0, 1],
    [1, 1],
  ],
  [
    [0, 0],
    [1, 0],
    [1, 1],
    [2, 1],
  ],
]
export type Piece = { kind: number; x: number; y: number; rotation: number }
export type State = ArcadeState & {
  board: number[][]
  piece: Piece
  queue: number[]
  hold: number
  canHold: boolean
  lines: number
  combo: number
  bestCombo: number
  backToBack: boolean
  gravity: number
  lock: number
  resets: number
  horizontal: number
  das: number
  repeat: number
  clearing: number[]
  clearTime: number
  rescue: number
  goal: number
  goalProgress: number
  flash: number
}
export function cells(piece: Piece) {
  return SHAPES[piece.kind].map(([ox, oy]) => {
    let x = ox,
      y = oy
    for (let r = 0; r < piece.rotation; r++) {
      if (piece.kind === 1) break
      const last = x
      x = (piece.kind === 0 ? 3 : 2) - y
      y = last
    }
    return { x: piece.x + x, y: piece.y + y }
  })
}
export function fits(s: State, piece: Piece) {
  return cells(piece).every(
    ({ x, y }) =>
      x >= 0 && x < COLS && y < ROWS && (y < 0 || s.board[y][x] === 0),
  )
}
function refill(s: State) {
  while (s.queue.length < 7) {
    const bag = [0, 1, 2, 3, 4, 5, 6]
    for (let i = bag.length - 1; i > 0; i--) {
      const j = Math.floor(random(s) * (i + 1))
      ;[bag[i], bag[j]] = [bag[j], bag[i]]
    }
    s.queue.push(...bag)
  }
}
export function spawn(s: State, kind?: number) {
  refill(s)
  s.piece = { kind: kind ?? s.queue.shift() ?? 0, x: 3, y: 0, rotation: 0 }
  s.gravity = 0
  s.lock = 0
  s.resets = 0
  s.canHold = true
  if (!fits(s, s.piece)) {
    s.phase = 'over'
    s.lives = 0
  }
}
export function create(progress?: Progress): State {
  const s: State = {
    ...base(progress),
    lives: 1,
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(0)),
    piece: { kind: 0, x: 3, y: 0, rotation: 0 },
    queue: [],
    hold: -1,
    canHold: true,
    lines: 0,
    combo: -1,
    bestCombo: 0,
    backToBack: false,
    gravity: 0,
    lock: 0,
    resets: 0,
    horizontal: 0,
    das: 0,
    repeat: 0,
    clearing: [],
    clearTime: 0,
    rescue: 0,
    goal: 0,
    goalProgress: 0,
    flash: 0,
  }
  s.lines = numberCarry(progress, 'lines', 0)
  s.stage = 1 + Math.floor(s.lines / 10)
  s.rescue = numberCarry(progress, 'rescue', 0, 0, 2)
  s.goal = numberCarry(progress, 'goal', 0, 0, 100000)
  const board = progress?.carry.board
  if (
    typeof board === 'string' &&
    board.length === 200 &&
    /^[0-7]+$/.test(board)
  )
    s.board = Array.from({ length: 20 }, (_, y) =>
      Array.from({ length: 10 }, (_, x) => Number(board[y * 10 + x])),
    )
  spawn(s)
  const queue = progress?.carry.queue
  if (
    typeof queue === 'string' &&
    queue.length >= 7 &&
    queue.length < 21 &&
    /^[0-6]+$/.test(queue)
  )
    s.queue = queue.split('').map(Number)
  s.hold = numberCarry(progress, 'hold', -1, -1, 6)
  const piece = {
    kind: Math.floor(numberCarry(progress, 'kind', s.piece.kind, 0, 6)),
    x: Math.floor(numberCarry(progress, 'x', 3, -2, 9)),
    y: Math.floor(numberCarry(progress, 'y', 0, -3, 19)),
    rotation: Math.floor(numberCarry(progress, 'rotation', 0, 0, 3)),
  }
  if (fits(s, piece)) {
    s.piece = piece
    s.phase = 'play'
    s.lives = 1
  }
  s.clearing = s.board.flatMap((row, i) => (row.every(Boolean) ? [i] : []))
  if (s.clearing.length) {
    s.clearTime = 0.18
    s.phase = 'play'
    s.lives = 1
  }
  s.canHold = progress?.carry.canHold !== false
  s.combo = numberCarry(progress, 'combo', -1, -1, 100000)
  s.bestCombo = numberCarry(progress, 'bestCombo', 0)
  s.backToBack = progress?.carry.backToBack === true
  s.goalProgress = numberCarry(progress, 'goalProgress', 0)
  s.seed = numberCarry(progress, 'seed', s.seed, 0, 4294967295)
  return s
}
function move(s: State, dx: number, dy: number) {
  const p = { ...s.piece, x: s.piece.x + dx, y: s.piece.y + dy }
  if (!fits(s, p)) return false
  s.piece = p
  if (dy === 0 && s.resets < 10) {
    s.lock = 0
    s.resets++
  }
  return true
}
export function rotate(s: State, direction: number) {
  const p = { ...s.piece, rotation: (s.piece.rotation + direction + 4) % 4 }
  for (const [x, y] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [-2, 0],
    [2, 0],
    [0, -1],
    [-1, -1],
    [1, -1],
    [0, -2],
  ])
    if (fits(s, { ...p, x: p.x + x, y: p.y + y })) {
      s.piece = { ...p, x: p.x + x, y: p.y + y }
      if (s.resets < 10) {
        s.lock = 0
        s.resets++
      }
      return true
    }
  return false
}
export function ghost(s: State) {
  const p = { ...s.piece }
  while (fits(s, { ...p, y: p.y + 1 })) p.y++
  return p
}
function resolveLines(s: State) {
  const count = s.clearing.length
  s.board = s.board.filter((_, index) => !s.clearing.includes(index))
  while (s.board.length < ROWS) s.board.unshift(Array(COLS).fill(0))
  s.lines += count
  s.stage = 1 + Math.floor(s.lines / 10)
  s.combo++
  s.bestCombo = Math.max(s.bestCombo, s.combo + 1)
  const bonus = [0, 100, 300, 500, 800][count]
  s.score += Math.round(
    (bonus * (count === 4 && s.backToBack ? 1.5 : 1) +
      Math.max(0, s.combo) * 50) *
      s.stage,
  )
  s.backToBack = count === 4
  const goal = s.goal % 3
  if (
    (goal === 0 && count >= 2) ||
    (goal === 1 && count === 4) ||
    (goal === 2 && s.combo >= 1)
  ) {
    s.score += 500 * s.stage
    s.goal++
    s.rescue = Math.min(2, s.rescue + 1)
  }
  if (Math.floor((s.lines - count) / 20) < Math.floor(s.lines / 20))
    s.rescue = Math.min(2, s.rescue + 1)
  s.events.push(count === 4 ? 'point' : 'pickup')
  s.clearing = []
  s.clearTime = 0
  spawn(s)
}
export function lock(s: State) {
  for (const { x, y } of cells(s.piece)) {
    if (y < 0) {
      s.phase = 'over'
      s.lives = 0
      return
    }
    s.board[y][x] = s.piece.kind + 1
  }
  s.clearing = s.board.flatMap((row, i) => (row.every(Boolean) ? [i] : []))
  s.events.push('hit')
  if (s.clearing.length) {
    s.clearTime = 0.18
    s.flash = 0.25
  } else {
    s.combo = -1
    spawn(s)
  }
}
export function update(s: State, input: ArcadeInput, dt: number) {
  s.events = []
  s.elapsed += dt
  s.flash = Math.max(0, s.flash - dt)
  if (s.clearTime > 0) {
    s.clearTime -= dt
    if (s.clearTime <= 0) resolveLines(s)
    return
  }
  if (pressed(input, 'c', 'shift') && s.canHold) {
    const previous = s.hold
    s.hold = s.piece.kind
    spawn(s, previous < 0 ? undefined : previous)
    s.canHold = false
    s.events.push('boost')
  }
  if (pressed(input, 'arrowup', 'w', 'x')) rotate(s, 1)
  if (pressed(input, 'z')) rotate(s, -1)
  const direction =
    Number(down(input, 'arrowright', 'd')) -
    Number(down(input, 'arrowleft', 'a'))
  if (direction !== s.horizontal) {
    s.horizontal = direction
    s.das = 0
    s.repeat = 0
    if (direction) move(s, direction, 0)
  } else if (direction) {
    s.das += dt
    if (s.das > 0.15) {
      s.repeat += dt
      while (s.repeat > 0.045) {
        s.repeat -= 0.045
        move(s, direction, 0)
      }
    }
  }
  if (pressed(input, 'v') && s.rescue > 0) {
    s.rescue--
    s.board.splice(18, 2)
    s.board.unshift(Array(COLS).fill(0), Array(COLS).fill(0))
    s.combo = -1
    s.events.push('boost')
  }
  if (pressed(input, ' ')) {
    const landing = ghost(s)
    s.score += (landing.y - s.piece.y) * 2
    s.piece = landing
    lock(s)
    return
  }
  const soft = down(input, 'arrowdown', 's'),
    interval = soft ? 0.025 : Math.max(0.065, 0.78 * Math.pow(0.8, s.stage - 1))
  s.gravity += dt
  while (s.gravity >= interval && s.phase === 'play') {
    s.gravity -= interval
    if (move(s, 0, 1)) {
      if (soft) s.score++
    } else break
  }
  if (!fits(s, { ...s.piece, y: s.piece.y + 1 })) {
    s.lock += dt
    if (s.lock >= 0.48) lock(s)
  } else s.lock = 0
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: 1,
    elapsed: s.elapsed,
    carry: {
      board: s.board.map((r) => r.join('')).join(''),
      queue: s.queue.join(''),
      kind: s.piece.kind,
      x: s.piece.x,
      y: s.piece.y,
      rotation: s.piece.rotation,
      hold: s.hold,
      lines: s.lines,
      rescue: s.rescue,
      goal: s.goal,
      canHold: s.canHold,
      combo: s.combo,
      bestCombo: s.bestCombo,
      backToBack: s.backToBack,
      goalProgress: s.goalProgress,
      seed: s.seed,
    },
  }
}
