import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type Brick = { x: number; y: number; color: string; alive: boolean }
type Scene = { ballX: number; ballY: number; ballVX: number; ballVY: number; paddleX: number; bricks: Brick[] }
type ScoreEntry = { name: string; score: number }

const WIDTH = 800
const HEIGHT = 440
const PADDLE_WIDTH = 118
const PADDLE_HEIGHT = 13
const BRICK_WIDTH = 62
const BRICK_HEIGHT = 19
const BRICK_GAP = 8
const BRICK_COLORS = ['#f0785d', '#f3a34a', '#c8d867', '#75b8ad', '#718be5']

function createScene(): Scene {
  const bricks = Array.from({ length: 50 }, (_, index) => {
    const row = Math.floor(index / 10)
    const column = index % 10
    return {
      x: 78 + column * (BRICK_WIDTH + BRICK_GAP),
      y: 46 + row * (BRICK_HEIGHT + 9),
      color: BRICK_COLORS[row],
      alive: true,
    }
  })

  return {
    ballX: WIDTH / 2,
    ballY: HEIGHT - 76,
    ballVX: 190,
    ballVY: -235,
    paddleX: WIDTH / 2 - PADDLE_WIDTH / 2,
    bricks,
  }
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene) {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#f6f4e9'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#e8e5d9'
  context.fillRect(30, 28, WIDTH - 60, HEIGHT - 48)
  context.fillStyle = '#a7aa92'
  context.fillRect(30, 28, WIDTH - 60, 2)

  for (const brick of scene.bricks) {
    if (!brick.alive) continue
    context.fillStyle = brick.color
    context.beginPath()
    context.roundRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT, 5)
    context.fill()
    context.fillStyle = 'rgba(255,255,255,.26)'
    context.fillRect(brick.x + 7, brick.y + 4, BRICK_WIDTH - 14, 2)
  }

  context.fillStyle = '#34342d'
  context.beginPath()
  context.roundRect(scene.paddleX, HEIGHT - 39, PADDLE_WIDTH, PADDLE_HEIGHT, 7)
  context.fill()
  context.fillStyle = '#ef745b'
  context.beginPath()
  context.arc(scene.ballX, scene.ballY, 8, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(239,116,91,.18)'
  context.beginPath()
  context.arc(scene.ballX, scene.ballY, 15, 0, Math.PI * 2)
  context.fill()
}

function readNickname(fallback: string) {
  try {
    return localStorage.getItem('playcove.brick-breaker.nickname') || fallback
  } catch {
    return fallback
  }
}

function readRecords() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('playcove.brick-breaker.scores') ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((record): record is ScoreEntry => {
      return typeof record === 'object' && record !== null && 'name' in record && typeof record.name === 'string' && 'score' in record && typeof record.score === 'number'
    }).slice(0, 5)
  } catch {
    return []
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    headline: 'Zbij wszystkie klocki.', score: 'WYNIK', ready: 'Gotowy na rundę?', paused: 'Gra wstrzymana', over: 'Koniec gry',
    goal: 'Zbij klocki. Nie zgub piłki.', resume: 'Wznów grę', again: 'Zagraj ponownie', start: 'Start', save: 'Zapisz wynik',
    highScores: 'NAJLEPSZE WYNIKI', nickname: 'PSEUDONIM', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU', move: 'STERUJ PAŁKĄ', left: 'Przesuń pałkę w lewo', right: 'Przesuń pałkę w prawo',
  } : {
    headline: 'Keep it bouncing.', score: 'SCORE', ready: 'Ready to break out?', paused: 'Game paused', over: 'Game over',
    goal: 'Clear the bricks. Keep the ball.', resume: 'Resume game', again: 'Play again', start: 'Start game', save: 'Save score',
    highScores: 'HIGH SCORES', nickname: 'NICKNAME', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE', move: 'MOVE PADDLE', left: 'Move paddle left', right: 'Move paddle right',
  }
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene>(createScene())
  const keysRef = useRef({ left: false, right: false })
  const scoreRef = useRef(0)
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setNickname(readNickname(fallbackName))
    setRecords(readRecords())
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const drawingContext = context

    if (status !== 'playing') {
      renderScene(drawingContext, sceneRef.current)
      return
    }

    let animationFrame = 0
    let previousTime = 0
    const scene = sceneRef.current

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) event.preventDefault()
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keysRef.current.left = true
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keysRef.current.right = true
      if (event.key === 'Escape') setStatus('paused')
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keysRef.current.left = false
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keysRef.current.right = false
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.034)
      previousTime = time
      const speed = 450
      if (keysRef.current.left) scene.paddleX -= speed * delta
      if (keysRef.current.right) scene.paddleX += speed * delta
      scene.paddleX = Math.max(38, Math.min(WIDTH - 38 - PADDLE_WIDTH, scene.paddleX))

      scene.ballX += scene.ballVX * delta
      scene.ballY += scene.ballVY * delta
      if (scene.ballX < 39 || scene.ballX > WIDTH - 39) scene.ballVX *= -1
      if (scene.ballY < 38) scene.ballVY = Math.abs(scene.ballVY)

      const paddleY = HEIGHT - 39
      if (
        scene.ballVY > 0 &&
        scene.ballY + 8 >= paddleY &&
        scene.ballY < paddleY + PADDLE_HEIGHT &&
        scene.ballX >= scene.paddleX - 7 &&
        scene.ballX <= scene.paddleX + PADDLE_WIDTH + 7
      ) {
        const hitOffset = (scene.ballX - (scene.paddleX + PADDLE_WIDTH / 2)) / (PADDLE_WIDTH / 2)
        scene.ballVY = -Math.abs(scene.ballVY)
        scene.ballVX = hitOffset * 275
      }

      for (const brick of scene.bricks) {
        if (!brick.alive) continue
        if (scene.ballX + 7 > brick.x && scene.ballX - 7 < brick.x + BRICK_WIDTH && scene.ballY + 7 > brick.y && scene.ballY - 7 < brick.y + BRICK_HEIGHT) {
          brick.alive = false
          scene.ballVY *= -1
          scoreRef.current += 10
          setScore(scoreRef.current)
          break
        }
      }

      renderScene(drawingContext, scene)
      if (scene.ballY > HEIGHT + 6 || scene.bricks.every((brick) => !brick.alive)) {
        setStatus('over')
        return
      }
      animationFrame = requestAnimationFrame(frame)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = requestAnimationFrame(frame)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keysRef.current = { left: false, right: false }
    }
  }, [status])

  function startGame() {
    scoreRef.current = 0
    setScore(0)
    setSaved(false)
    sceneRef.current = createScene()
    setStatus('playing')
  }

  function saveScore() {
    if (saved || score < 1) return
    const next = [...records, { name: nickname.trim() || fallbackName, score }]
      .sort((first, second) => second.score - first.score)
      .slice(0, 5)
    localStorage.setItem('playcove.brick-breaker.nickname', nickname.trim() || fallbackName)
    localStorage.setItem('playcove.brick-breaker.scores', JSON.stringify(next))
    setRecords(next)
    setSaved(true)
  }

  function hold(direction: 'left' | 'right', pressed: boolean) {
    keysRef.current[direction] = pressed
  }

  return (
    <div className="module-game brick-game">
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">BRICK BREAKER</span><h2>{copy.headline}</h2></div>
          <div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div>
        </div>
        <div className="canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label="Brick Breaker play field" />
          {status !== 'playing' && (
            <div className="game-overlay">
              <span className="overlay-spark">{status === 'over' ? '✦' : '✳'}</span>
              <strong>{status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready}</strong>
              <span>{status === 'over' ? `${copy.score}: ${score}` : copy.goal}</span>
              {status === 'over' && score > 0 && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}
              <button className="game-button" onClick={status === 'paused' ? () => setStatus('playing') : startGame}>{status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start} <span>→</span></button>
            </div>
          )}
        </div>
        <div className="game-touch-controls">
          <button aria-label={copy.left} onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerCancel={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>←</button>
          <span>{copy.move}</span>
          <button aria-label={copy.right} onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerCancel={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>→</button>
        </div>
      </div>
      <aside className="game-scoreboard">
        <div className="scoreboard-heading"><span className="game-small-label">{copy.highScores}</span><span className="scoreboard-star">✳</span></div>
        <label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label>
        <div className="scoreboard-rule" />
        <div className="scoreboard-list">
          {records.length ? records.map((record, index) => (
            <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>
          )) : <p className="scoreboard-empty">{copy.empty}</p>}
        </div>
        <div className="scoreboard-foot">{copy.local}</div>
      </aside>
    </div>
  )
}
