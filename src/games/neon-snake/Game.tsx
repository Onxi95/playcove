import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { useCanvasResolution } from '../kit/use-canvas-resolution.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { GamePanel } from '../kit/GamePanel.tsx'
import { SoundToggle } from '../kit/SoundToggle.tsx'
import { useGameAudio } from '../kit/use-game-audio.ts'

import { fruitScore, queueTurn, snakeStep } from './mechanics.ts'
import type { Cell } from './mechanics.ts'
type Direction = { x: number; y: number }
type Food = Cell & { golden: boolean }
type Scene = { cleared: boolean; crash: 'wall' | 'body' | null; peakCombo: number; previousSnake: Cell[]; bonus: Food | null; flash: number; message: string; snake: Cell[]; direction: Direction; food: Food; score: number; eaten: number; elapsed: number; goldenTimer: number; combo: number; comboTimer: number; boostFuel: number }
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
  return { cleared: false, crash: null, peakCombo: 0, previousSnake: snake.map((part) => ({ ...part })), bonus: null, flash: 0, message: '', snake, direction: { x: 1, y: 0 }, food: randomFood(snake, false), score: 0, eaten: 0, elapsed: 0, goldenTimer: 0, combo: 0, comboTimer: 0, boostFuel: 35 }
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, time: number, progress = 1) {
  context.clearRect(0, 0, SIZE, SIZE)
  context.fillStyle = '#102b34'
  context.fillRect(0, 0, SIZE, SIZE)
  for (let index = 0; index < CELLS; index += 1) {
    context.fillStyle = index % 2 === 0 ? 'rgba(255,255,255,.018)' : 'rgba(255,255,255,.036)'
    context.fillRect((index % 2) * CELL, index * CELL, SIZE, CELL)
    context.fillRect(index * CELL, (index % 2) * CELL, CELL, SIZE)
  }

  if (scene.flash > 0) {
    context.fillStyle = `rgba(188,255,208,${scene.flash * 0.3})`
    context.fillRect(0, 0, SIZE, SIZE)
  }
  const pulse = 1 + Math.sin(time / 130) * 0.08
  context.save()
  context.shadowColor = scene.food.golden ? '#ffd36a' : '#ff6d81'
  context.shadowBlur = 20
  context.fillStyle = scene.food.golden ? '#ffd36a' : '#ff6d81'
  context.beginPath()
  context.arc((scene.food.x + 0.5) * CELL, (scene.food.y + 0.5) * CELL, CELL * 0.29 * pulse, 0, Math.PI * 2)
  context.fill()
  if (scene.bonus) {
    context.globalAlpha = Math.min(1, scene.goldenTimer / 1.4)
    context.fillStyle = '#ffd36a'
    context.shadowColor = '#ffd36a'
    context.strokeStyle = '#fff0b7'
    context.lineWidth = 2
    context.beginPath()
    context.arc((scene.bonus.x + 0.5) * CELL, (scene.bonus.y + 0.5) * CELL, CELL * 0.36 * pulse, 0, Math.PI * 2)
    context.fill()
    context.stroke()
    context.globalAlpha = 1
  }
  context.restore()

  for (let index = scene.snake.length - 1; index >= 0; index -= 1) {
    const current = scene.snake[index]
    const previous = scene.previousSnake[index] ?? current
    const part = { x: previous.x + (current.x - previous.x) * progress, y: previous.y + (current.y - previous.y) * progress }
    const inset = index === 0 ? 2 : 3 + Math.min(5, index * 0.04)
    context.fillStyle = index === 0 ? '#bcffd0' : `hsl(${145 + Math.min(25, index * 0.25)} 75% ${Math.max(43, 60 - index * 0.12)}%)`
    context.beginPath()
    context.roundRect(part.x * CELL + inset, part.y * CELL + inset, CELL - inset * 2, CELL - inset * 2, 7)
    context.fill()
  }

  const head = { x: scene.previousSnake[0].x + (scene.snake[0].x - scene.previousSnake[0].x) * progress, y: scene.previousSnake[0].y + (scene.snake[0].y - scene.previousSnake[0].y) * progress }
  const eyeX = head.x * CELL + CELL / 2 + scene.direction.x * 5
  const eyeY = head.y * CELL + CELL / 2 + scene.direction.y * 5
  context.fillStyle = '#123c35'
  context.beginPath()
  context.arc(eyeX - scene.direction.y * 4, eyeY + scene.direction.x * 4, 2, 0, Math.PI * 2)
  context.arc(eyeX + scene.direction.y * 4, eyeY - scene.direction.x * 4, 2, 0, Math.PI * 2)
  context.fill()
  const actualHead = scene.snake[0]
  if (actualHead.x < 2 || actualHead.y < 2 || actualHead.x > CELLS - 3 || actualHead.y > CELLS - 3) {
    context.strokeStyle = 'rgba(255,109,129,.65)'
    context.lineWidth = 4
    context.strokeRect(2, 2, SIZE - 4, SIZE - 4)
  }
  if (scene.flash > 0) {
    context.fillStyle = '#fff0b7'
    context.font = '800 22px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(scene.message, SIZE / 2, 34)
  }
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
    ready: 'Zaczynamy?', readyText: 'Zbieraj owoce i planuj zakręty. Spacja przyspiesza i podwaja punkty. Złote owoce to dodatkowe cele na 8 sekund.', over: 'Koniec gry', paused: 'Gra wstrzymana',
    start: 'Start', again: 'Jeszcze raz', resume: 'Wznów', controls: 'RUCH', touch: 'DOTKNIJ KIERUNKU', dash: '⚡ DOPALACZ',
  } : {
    label: 'ARCADE · ENDLESS', title: 'Find the rhythm. Chase the score.', score: 'SCORE', best: 'BEST', length: 'LENGTH', combo: 'STREAK', boost: 'BOOST', history: 'HIGH SCORES', pause: 'Pause', nickname: 'NICKNAME', save: 'Save score', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE',
    ready: 'Ready to grow?', readyText: 'Queue your turns and chain fruit. Hold Space for speed and double points. Golden fruit is an optional 8-second detour.', over: 'Run over', paused: 'Game paused',
    start: 'Start run', again: 'Play again', resume: 'Resume', controls: 'MOVE', touch: 'TAP A DIRECTION', dash: '⚡ BOOST',
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRevision = useCanvasResolution(canvasRef, SIZE, SIZE)
  const [initialScene] = useState(createScene)
  const sceneRef = useRef(initialScene)
  const directionRef = useRef<Direction[]>([])
  const boostRef = useRef(false)
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [runBest, setRunBest] = useState(0)
  const { audio, enabled: soundEnabled, toggle: toggleSound } = useGameAudio(status, score > runBest)
  useEffect(() => { if (status === 'over') saveScore() }, [status])
  useGameSession(status, setStatus, start, canvasRef)
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
    scene.previousSnake = scene.snake.map((part) => ({ ...part }))
    let animationFrame = 0
    let previousTime = 0
    let stepTimer = 0
    function turn(x: number, y: number) {
      queueTurn(directionRef.current, scene.direction, { x, y })
    }
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) event.preventDefault()
      if (key === 'arrowup' || key === 'w') turn(0, -1)
      if (key === 'arrowdown' || key === 's') turn(0, 1)
      if (key === 'arrowleft' || key === 'a') turn(-1, 0)
      if (key === 'arrowright' || key === 'd') turn(1, 0)
      if ((key === ' ' || key === 'shift') && !event.repeat) boostRef.current = true
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
      scene.flash = Math.max(0, scene.flash - delta)
      scene.comboTimer = Math.max(0, scene.comboTimer - delta)
      if (scene.comboTimer === 0) {
        scene.combo = 0
        setCombo(0)
      }
      if (scene.bonus) {
        scene.goldenTimer -= delta
        if (scene.goldenTimer <= 0) {
          scene.bonus = null
          scene.goldenTimer = 0
        }
      }
      const boosting = boostRef.current && scene.boostFuel > 0
      scene.boostFuel = Math.max(0, Math.min(100, scene.boostFuel + (boosting ? -42 : 8) * delta))
      if (scene.boostFuel === 0) boostRef.current = false
      setBoostFuel(Math.round(scene.boostFuel))
      stepTimer += delta
      const step = Math.max(0.09, 0.15 - scene.eaten * 0.0012) * (boosting ? 0.65 : 1)
      while (stepTimer >= step) {
        stepTimer -= step
        scene.direction = directionRef.current.shift() ?? scene.direction
        const nextHead = { x: scene.snake[0].x + scene.direction.x, y: scene.snake[0].y + scene.direction.y }
        const eats = nextHead.x === scene.food.x && nextHead.y === scene.food.y
        const eatsBonus = scene.bonus !== null && nextHead.x === scene.bonus.x && nextHead.y === scene.bonus.y
        const { head, crashed } = snakeStep(scene.snake, scene.direction, eats || eatsBonus, CELLS)
        if (crashed) {
          scene.crash = head.x < 0 || head.y < 0 || head.x >= CELLS || head.y >= CELLS ? 'wall' : 'body'
          finish()
          renderScene(drawingContext, scene, time)
          return
        }
        scene.previousSnake = scene.snake.map((part) => ({ ...part }))
        scene.snake.unshift(head)
        if (eats || eatsBonus) {
          audio.play(eatsBonus ? 'boost' : 'pickup')
          scene.combo = scene.comboTimer > 0 ? Math.min(8, scene.combo + 1) : 1
          scene.peakCombo = Math.max(scene.peakCombo, scene.combo)
          const earned = fruitScore(scene.combo, eatsBonus, boosting)
          scene.score += earned
          scene.flash = 0.65
          scene.message = `+${earned}${boosting ? '  ⚡ ×2' : ''}`
          scene.boostFuel = Math.min(100, scene.boostFuel + (eatsBonus ? 35 : 18))
          setCombo(scene.combo)
          setBoostFuel(Math.round(scene.boostFuel))
          if (scene.snake.length === CELLS * CELLS) {
            scene.cleared = true
            setScore(scene.score)
            finish()
            renderScene(drawingContext, scene, time)
            return
          }
          if (eatsBonus) {
            scene.bonus = null
            scene.goldenTimer = 0
          } else {
            scene.eaten += 1
            scene.food = randomFood([...scene.snake, ...(scene.bonus ? [scene.bonus] : [])], false)
            if (scene.eaten % 4 === 0 && !scene.bonus) {
              scene.bonus = randomFood([...scene.snake, scene.food], true)
              scene.goldenTimer = 8
            }
          }
          const travel = Math.abs(scene.food.x - head.x) + Math.abs(scene.food.y - head.y)
          scene.comboTimer = Math.max(4, travel * step + 2.5)
          setScore(scene.score)
        } else {
          scene.snake.pop()
        }
      }
      renderScene(drawingContext, scene, time, Math.min(1, stepTimer / step))
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
      directionRef.current = []
    }
  }, [status, locale, canvasRevision])

  function start() {
    setRunBest(records[0]?.score ?? 0)
    sceneRef.current = createScene()
    directionRef.current = []
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
    queueTurn(directionRef.current, scene.direction, { x, y })
  }

  return (
    <div className={`module-game arcade-module snake-module${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">

        <div className="canvas-wrap arcade-canvas-wrap snake-canvas-wrap">
        <div className="module-game-heading game-frame-bar"><div><span className="game-small-label">{copy.label}</span><h2>NEON SNAKE</h2></div><div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div><div className="score-readout"><span>{copy.best}</span><strong>{best.toString().padStart(3, '0')}</strong></div></div></div>
          <canvas tabIndex={0} ref={canvasRef} width={SIZE} height={SIZE} aria-label={locale === 'pl' ? 'Plansza Neon Snake' : 'Neon Snake board'} />
        {status === 'playing' && <div className="arcade-livebar"><span>{copy.controls} · {copy.combo} ×{combo || 1}</span><div className="arcade-live-actions"><label className="boost-meter"><span>{copy.boost}</span><span className="boost-meter-track"><i style={{ width: `${boostFuel}%` }} /></span></label></div></div>}
          <SoundToggle locale={locale} enabled={soundEnabled} onToggle={toggleSound} onPause={status === 'playing' ? () => setStatus('paused') : undefined} />
          <GamePanel locale={locale} onOpen={() => { if (status === 'playing') setStatus('paused') }}>
      <aside className="game-scoreboard arcade-scoreboard"><div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div><div className="arcade-record-number">{sceneRef.current.snake.length}</div><p className="scoreboard-foot">{copy.length}</p><label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label><div className="scoreboard-rule" /><div className="scoreboard-list">{records.length ? records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div><div className="scoreboard-foot">{copy.local}</div></aside>
          </GamePanel>
          <GameOverlay gameName="NEON SNAKE" onRestart={start} status={status} locale={locale} title={status === 'over' ? sceneRef.current.cleared ? locale === 'pl' ? 'Cała plansza zajęta!' : 'Board cleared!' : copy.over : status === 'paused' ? copy.paused : copy.ready} description={status === 'over' ? (sceneRef.current.cleared ? locale === 'pl' ? 'Perfekcyjny bieg. Każde pole planszy należy do Ciebie.' : 'A perfect run. Every cell is yours.' : sceneRef.current.crash === 'body' ? locale === 'pl' ? 'Wpadłeś na ogon. Zostaw sobie drogę odwrotu, zanim wybierzesz złoty owoc.' : 'Caught your own tail. Leave an exit before chasing the gold fruit.' : locale === 'pl' ? 'Koniec planszy. Zapisz dwa zakręty z wyprzedzeniem, by zacieśnić nawrót.' : 'Reached the wall. Queue two turns to make a tight escape.') : copy.readyText} actionLabel={status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start} onAction={status === 'paused' ? () => setStatus('playing') : start} result={{ value: score, label: copy.score, score, best: runBest, saved, stats: [{ label: copy.length, value: sceneRef.current.snake.length }, { label: locale === 'pl' ? 'OWOCE' : 'FRUIT', value: sceneRef.current.eaten }, { label: locale === 'pl' ? 'CZAS' : 'TIME', value: `${Math.floor(sceneRef.current.elapsed)}s` }] }} />
        </div>
        <div className="game-touch-controls snake-touch-controls"><button aria-label={locale === 'pl' ? 'W górę' : 'Up'} onPointerDown={() => holdDirection(0, -1)}>↑</button><div><button aria-label={locale === 'pl' ? 'W lewo' : 'Left'} onPointerDown={() => holdDirection(-1, 0)}>←</button><span>{copy.touch}</span><button aria-label={locale === 'pl' ? 'W prawo' : 'Right'} onPointerDown={() => holdDirection(1, 0)}>→</button></div><button aria-label={locale === 'pl' ? 'W dół' : 'Down'} onPointerDown={() => holdDirection(0, 1)}>↓</button><button className="snake-boost-button" onPointerDown={() => { boostRef.current = true }} onPointerUp={() => { boostRef.current = false }} onPointerCancel={() => { boostRef.current = false }} onPointerLeave={() => { boostRef.current = false }} aria-label={copy.dash}>⚡</button></div>
        <p className="arcade-controls-note"><span>{copy.controls}</span> <kbd>↑</kbd><kbd>←</kbd><kbd>↓</kbd><kbd>→</kbd> <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> <span>· {copy.dash} <kbd>SPACE</kbd></span></p>
      </div>

    </div>
  )
}
