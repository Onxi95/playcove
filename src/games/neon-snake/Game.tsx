import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type Cell = { x: number; y: number }
type Direction = { x: number; y: number }
type Food = Cell & { golden: boolean }
type Scene = { snake: Cell[]; direction: Direction; food: Food; score: number; eaten: number; elapsed: number; goldenTimer: number; combo: number; comboTimer: number; boostFuel: number }
type ScoreEntry = { name: string; score: number }

const CELLS = 24
const SIZE = 576
const CELL = SIZE / CELLS
const SCORES_KEY = 'playcove.neon-snake.scores'
const NAME_KEY = 'playcove.neon-snake.nickname'

function randomFood(snake: Cell[], golden: boolean): Food {
  const available: Cell[] = []
  for (let y = 0; y < CELLS; y += 1) {
    for (let x = 0; x < CELLS; x += 1) {
      if (!snake.some((part) => part.x === x && part.y === y)) available.push({ x, y })
    }
  }
  if (available.length === 0) return { x: -1, y: -1, golden: false }
  return { ...available[Math.floor(Math.random() * available.length)], golden }
}

function createScene(): Scene {
  const snake = [{ x: 9, y: 12 }, { x: 8, y: 12 }, { x: 7, y: 12 }]
  return { snake, direction: { x: 1, y: 0 }, food: randomFood(snake, false), score: 0, eaten: 0, elapsed: 0, goldenTimer: 0, combo: 0, comboTimer: 0, boostFuel: 35 }
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, time: number) {
  context.clearRect(0, 0, SIZE, SIZE)
  context.fillStyle = '#102b34'
  context.fillRect(0, 0, SIZE, SIZE)
  for (let index = 0; index < CELLS; index += 1) {
    context.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,.018)' : 'rgba(255,255,255,.036)'
    context.fillRect((index % 2) * CELL, index * CELL, SIZE, CELL)
    context.fillRect(index * CELL, (index % 2) * CELL, CELL, SIZE)
  }

  const pulse = 1 + Math.sin(time / 130) * 0.08
  context.save()
  context.shadowColor = scene.food.golden ? '#ffd36a' : '#ff6d81'
  context.shadowBlur = 20
  context.fillStyle = scene.food.golden ? '#ffd36a' : '#ff6d81'
  context.beginPath()
  context.arc((scene.food.x + 0.5) * CELL, (scene.food.y + 0.5) * CELL, CELL * 0.29 * pulse, 0, Math.PI * 2)
  context.fill()
  if (scene.food.golden) {
    context.globalAlpha = Math.min(1, scene.goldenTimer / 1.4)
    context.strokeStyle = '#fff0b7'
    context.lineWidth = 2
    context.beginPath()
    context.arc((scene.food.x + 0.5) * CELL, (scene.food.y + 0.5) * CELL, CELL * (0.39 + Math.sin(time / 95) * 0.04), 0, Math.PI * 2)
    context.stroke()
    context.globalAlpha = 1
  }
  context.restore()

  for (let index = scene.snake.length - 1; index >= 0; index -= 1) {
    const part = scene.snake[index]
    const inset = index === 0 ? 2 : 3 + Math.min(5, index * 0.04)
    context.fillStyle = index === 0 ? '#bcffd0' : `hsl(${145 + Math.min(25, index * 0.25)} 75% ${Math.max(43, 60 - index * 0.12)}%)`
    context.beginPath()
    context.roundRect(part.x * CELL + inset, part.y * CELL + inset, CELL - inset * 2, CELL - inset * 2, 7)
    context.fill()
  }

  const head = scene.snake[0]
  const eyeX = head.x * CELL + CELL / 2 + scene.direction.x * 5
  const eyeY = head.y * CELL + CELL / 2 + scene.direction.y * 5
  context.fillStyle = '#123c35'
  context.beginPath()
  context.arc(eyeX - scene.direction.y * 4, eyeY + scene.direction.x * 4, 2, 0, Math.PI * 2)
  context.arc(eyeX + scene.direction.y * 4, eyeY - scene.direction.x * 4, 2, 0, Math.PI * 2)
  context.fill()
}

function readRecords() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is ScoreEntry => typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string' && 'score' in entry && typeof entry.score === 'number').sort((first, second) => second.score - first.score).slice(0, 5)
  } catch {
    return []
  }
}

function readNickname(fallback: string) {
  try { return localStorage.getItem(NAME_KEY) || fallback } catch { return fallback }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    label: 'ARCADE · BEZ KOŃCA', title: 'Łap rytm. Zgarniaj punkty.', score: 'WYNIK', best: 'REKORD', length: 'DŁUGOŚĆ', combo: 'SERIA', boost: 'DOPALACZ', history: 'NAJLEPSZE WYNIKI', pause: 'Pauza', nickname: 'PSEUDONIM', save: 'Zapisz wynik', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU',
    ready: 'Zaczynamy?', readyText: 'Zbieraj owoce, utrzymuj serię i przytrzymaj spację, by przyspieszyć. Złoty owoc znika po chwili.', over: 'Koniec gry', paused: 'Gra wstrzymana',
    start: 'Start', again: 'Jeszcze raz', resume: 'Wznów', controls: 'RUCH', touch: 'DOTKNIJ KIERUNKU', dash: '⚡ DOPALACZ',
  } : {
    label: 'ARCADE · ENDLESS', title: 'Find the rhythm. Chase the score.', score: 'SCORE', best: 'BEST', length: 'LENGTH', combo: 'STREAK', boost: 'BOOST', history: 'HIGH SCORES', pause: 'Pause', nickname: 'NICKNAME', save: 'Save score', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE',
    ready: 'Ready to grow?', readyText: 'Collect fruit to build a streak and charge your boost. Hold Space to speed up. Golden fruit vanishes quickly.', over: 'Run over', paused: 'Game paused',
    start: 'Start run', again: 'Play again', resume: 'Resume', controls: 'MOVE', touch: 'TAP A DIRECTION', dash: '⚡ BOOST',
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene>(createScene())
  const directionRef = useRef<Direction | null>(null)
  const boostRef = useRef(false)
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [combo, setCombo] = useState(0)
  const [boostFuel, setBoostFuel] = useState(35)
  const best = records[0]?.score ?? 0

  useEffect(() => {
    setRecords(readRecords())
    setNickname(readNickname(fallbackName))
  }, [fallbackName])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    const drawingContext = context
    if (status !== 'playing') {
      renderScene(drawingContext, sceneRef.current, performance.now())
      return
    }

    const scene = sceneRef.current
    let animationFrame = 0
    let previousTime = 0
    let stepTimer = 0
    function turn(x: number, y: number) {
      const proposed = directionRef.current ?? scene.direction
      if ((x === -proposed.x && y === -proposed.y) || (x === -scene.direction.x && y === -scene.direction.y)) return
      directionRef.current = { x, y }
    }
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) event.preventDefault()
      if (key === 'arrowup' || key === 'w') turn(0, -1)
      if (key === 'arrowdown' || key === 's') turn(0, 1)
      if (key === 'arrowleft' || key === 'a') turn(-1, 0)
      if (key === 'arrowright' || key === 'd') turn(1, 0)
      if (key === ' ' || key === 'shift') boostRef.current = true
      if (event.key === 'Escape') setStatus('paused')
    }
    function keyUp(event: KeyboardEvent) {
      if (event.code === 'Space' || event.key === 'Shift') boostRef.current = false
    }

    function finish() {
      setScore(scene.score)
      setStatus('over')
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.05)
      previousTime = time
      scene.elapsed += delta
      scene.comboTimer = Math.max(0, scene.comboTimer - delta)
      if (scene.comboTimer === 0) {
        scene.combo = 0
        setCombo(0)
      }
      if (scene.food.golden) {
        scene.goldenTimer -= delta
        if (scene.goldenTimer <= 0) {
          scene.food = randomFood(scene.snake, false)
          scene.goldenTimer = 0
        }
      }
      const boosting = boostRef.current && scene.boostFuel > 0
      scene.boostFuel = Math.max(0, Math.min(100, scene.boostFuel + (boosting ? -42 : 8) * delta))
      setBoostFuel(Math.round(scene.boostFuel))
      stepTimer += delta
      const step = Math.max(0.085, 0.145 - scene.score * 0.00028) * (boosting ? 0.62 : 1)
      while (stepTimer >= step) {
        stepTimer -= step
        scene.direction = directionRef.current ?? scene.direction
        const head = { x: scene.snake[0].x + scene.direction.x, y: scene.snake[0].y + scene.direction.y }
        const eats = head.x === scene.food.x && head.y === scene.food.y
        const bodyToCheck = eats ? scene.snake : scene.snake.slice(0, -1)
        if (head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS || bodyToCheck.some((part) => part.x === head.x && part.y === head.y)) {
          finish()
          renderScene(drawingContext, scene, time)
          return
        }
        scene.snake.unshift(head)
        if (eats) {
          scene.combo = scene.comboTimer > 0 ? Math.min(8, scene.combo + 1) : 1
          scene.comboTimer = 3.2
          scene.score += (scene.food.golden ? 50 : 10) * scene.combo
          scene.boostFuel = Math.min(100, scene.boostFuel + (scene.food.golden ? 35 : 18))
          setCombo(scene.combo)
          setBoostFuel(Math.round(scene.boostFuel))
          scene.eaten += 1
          const golden = scene.eaten % 4 === 0 || Math.random() < 0.15
          scene.food = randomFood(scene.snake, golden)
          scene.goldenTimer = golden ? 5.5 : 0
          setScore(scene.score)
        } else {
          scene.snake.pop()
        }
      }
      renderScene(drawingContext, scene, time)
      animationFrame = requestAnimationFrame(frame)
    }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    animationFrame = requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      boostRef.current = false
    }
  }, [status])

  function start() {
    sceneRef.current = createScene()
    directionRef.current = null
    boostRef.current = false
    setScore(0)
    setCombo(0)
    setBoostFuel(35)
    setSaved(false)
    setStatus('playing')
  }

  function saveScore() {
    if (saved || score < 1) return
    const name = nickname.trim() || fallbackName
    const next = [...records, { name, score }].sort((first, second) => second.score - first.score).slice(0, 5)
    try {
      localStorage.setItem(NAME_KEY, name)
      localStorage.setItem(SCORES_KEY, JSON.stringify(next))
    } catch {
      return
    }
    setRecords(next)
    setSaved(true)
  }

  function holdDirection(x: number, y: number) {
    const scene = sceneRef.current
    const current = directionRef.current ?? scene.direction
    if ((x === -current.x && y === -current.y) || (x === -scene.direction.x && y === -scene.direction.y)) return
    directionRef.current = { x, y }
  }

  return (
    <div className={`module-game arcade-module snake-module${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">
        <div className="module-game-heading"><div><span className="game-small-label">{copy.label}</span><h2>{copy.title}</h2></div><div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div><div className="score-readout"><span>{copy.best}</span><strong>{best.toString().padStart(3, '0')}</strong></div></div></div>
        {status === 'playing' && <div className="arcade-livebar"><span>{copy.controls} · {copy.combo} ×{combo || 1}</span><div className="arcade-live-actions"><label className="boost-meter"><span>{copy.boost}</span><span className="boost-meter-track"><i style={{ width: `${boostFuel}%` }} /></span></label><button onClick={() => setStatus('paused')}>Ⅱ {copy.pause}</button></div></div>}
        <div className="canvas-wrap arcade-canvas-wrap snake-canvas-wrap">
          <canvas ref={canvasRef} width={SIZE} height={SIZE} aria-label={locale === 'pl' ? 'Plansza Neon Snake' : 'Neon Snake board'} />
          {status !== 'playing' && <div className="game-overlay"><span className="overlay-spark">{status === 'over' ? '✦' : '◉'}</span><strong>{status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready}</strong><span>{status === 'over' ? `${copy.score}: ${score}` : copy.readyText}</span>{status === 'over' && score > 0 && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}<button className="game-button" onClick={status === 'paused' ? () => setStatus('playing') : start}>{status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start}<span>→</span></button></div>}
        </div>
        <div className="game-touch-controls snake-touch-controls"><button aria-label={locale === 'pl' ? 'W górę' : 'Up'} onPointerDown={() => holdDirection(0, -1)}>↑</button><div><button aria-label={locale === 'pl' ? 'W lewo' : 'Left'} onPointerDown={() => holdDirection(-1, 0)}>←</button><span>{copy.touch}</span><button aria-label={locale === 'pl' ? 'W prawo' : 'Right'} onPointerDown={() => holdDirection(1, 0)}>→</button></div><button aria-label={locale === 'pl' ? 'W dół' : 'Down'} onPointerDown={() => holdDirection(0, 1)}>↓</button><button className="snake-boost-button" onPointerDown={() => { boostRef.current = true }} onPointerUp={() => { boostRef.current = false }} onPointerCancel={() => { boostRef.current = false }} onPointerLeave={() => { boostRef.current = false }} aria-label={copy.dash}>⚡</button></div>
        <p className="arcade-controls-note"><span>{copy.controls}</span> <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span>· {copy.dash} <kbd>SPACE</kbd></span></p>
      </div>
      <aside className="game-scoreboard arcade-scoreboard"><div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div><div className="arcade-record-number">{sceneRef.current.snake.length}</div><p className="scoreboard-foot">{copy.length}</p><label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label><div className="scoreboard-rule" /><div className="scoreboard-list">{records.length ? records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div><div className="scoreboard-foot">{copy.local}</div></aside>
    </div>
  )
}
