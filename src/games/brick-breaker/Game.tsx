import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { createBricks, paddleReturn } from './mechanics.ts'

type Brick = { x: number; y: number; color: string; hits: number; alive: boolean }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; duration: number; color: string }
type BoostType = 'wide' | 'slow' | 'fire'
type BoostDrop = { x: number; y: number; vy: number; type: BoostType }
type Scene = { serveTimer: number; pointerX: number | null; ballX: number; ballY: number; ballVX: number; ballVY: number; ballSpeed: number; paddleX: number; paddleWidth: number; paddleBaseWidth: number; bricks: Brick[]; wave: number; lives: number; combo: number; paddleFlash: number; particles: Particle[]; drops: BoostDrop[]; boost: BoostType | null; boostTimer: number }
type ScoreEntry = { name: string; score: number }

const WIDTH = 800
const HEIGHT = 440
const PADDLE_HEIGHT = 13
const BRICK_WIDTH = 62
const BRICK_HEIGHT = 19
const START_LIVES = 3
const MIN_PADDLE_WIDTH = 72
const WIDE_FACTOR = 1.65
const SLOW_FACTOR = 0.78
const BOOST_DURATION = 8
const DROP_CHANCE = 0.2

function createScene(): Scene {
  const wave = 1
  const paddleBaseWidth = 104
  const paddleWidth = paddleBaseWidth
  const ballSpeed = 350

  return {
    serveTimer: 1.1,
    pointerX: null,
    ballX: WIDTH / 2,
    ballY: HEIGHT - 76,
    ballVX: ballSpeed * 0.61,
    ballVY: -ballSpeed * 0.79,
    ballSpeed,
    paddleX: WIDTH / 2 - paddleWidth / 2,
    paddleWidth,
    paddleBaseWidth,
    bricks: createBricks(wave),
    wave,
    lives: START_LIVES,
    combo: 0,
    paddleFlash: 0,
    particles: [],
    drops: [],
    boost: null,
    boostTimer: 0,
  }
}

function addBurst(scene: Scene, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const speed = 75 + (index % 3) * 45
    scene.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.28, duration: 0.28, color })
  }
}

function resizePaddle(scene: Scene, width: number) {
  const center = scene.paddleX + scene.paddleWidth / 2
  scene.paddleWidth = width
  scene.paddleX = Math.max(38, Math.min(WIDTH - 38 - width, center - width / 2))
}

function applyBoost(scene: Scene, boost: BoostType) {
  if (scene.boost === 'slow' && boost !== 'slow') {
    scene.ballVX /= SLOW_FACTOR
    scene.ballVY /= SLOW_FACTOR
  }
  if (scene.boost !== 'slow' && boost === 'slow') {
    scene.ballVX *= SLOW_FACTOR
    scene.ballVY *= SLOW_FACTOR
  }
  scene.boost = boost
  scene.boostTimer = BOOST_DURATION
  resizePaddle(scene, scene.paddleBaseWidth * (boost === 'wide' ? WIDE_FACTOR : 1))
}

function clearBoost(scene: Scene) {
  if (scene.boost === 'slow') {
    scene.ballVX /= SLOW_FACTOR
    scene.ballVY /= SLOW_FACTOR
  }
  scene.boost = null
  scene.boostTimer = 0
  resizePaddle(scene, scene.paddleBaseWidth)
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, boostLabels: Record<BoostType, string>, streakLabel: string) {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#f6f4e9'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#e8e5d9'
  context.fillRect(30, 28, WIDTH - 60, HEIGHT - 48)
  context.fillStyle = '#a7aa92'
  context.fillRect(30, 28, WIDTH - 60, 2)

  for (const brick of scene.bricks) {
    if (!brick.alive) continue
    context.fillStyle = brick.hits > 1 ? '#545b65' : brick.color
    context.beginPath()
    context.roundRect(brick.x, brick.y, BRICK_WIDTH, BRICK_HEIGHT, 5)
    context.fill()
    context.fillStyle = 'rgba(255,255,255,.26)'
    context.fillRect(brick.x + 7, brick.y + 4, BRICK_WIDTH - 14, 2)
    if (brick.hits > 1) {
      context.fillStyle = '#fff'
      context.font = 'bold 11px system-ui, sans-serif'
      context.textAlign = 'center'
      context.fillText(String(brick.hits), brick.x + BRICK_WIDTH / 2, brick.y + 15)
    }
  }

  for (const drop of scene.drops) {
    const color = drop.type === 'wide' ? '#5c8ee8' : drop.type === 'slow' ? '#75b8ad' : '#ef745b'
    const icon = drop.type === 'wide' ? '↔' : drop.type === 'slow' ? 'Ⅱ' : '✦'
    context.fillStyle = color
    context.beginPath()
    context.roundRect(drop.x - 11, drop.y - 11, 22, 22, 7)
    context.fill()
    context.fillStyle = '#fff'
    context.font = '900 14px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(icon, drop.x, drop.y + 5)
  }

  const ballSpeed = Math.hypot(scene.ballVX, scene.ballVY)
  if (ballSpeed > 190) {
    context.save()
    for (let index = 4; index > 0; index -= 1) {
      const trail = index / 5
      context.globalAlpha = (1 - trail) * Math.min(0.48, ballSpeed / 1450)
      context.fillStyle = '#ef745b'
      context.beginPath()
      context.arc(scene.ballX - scene.ballVX * trail * 0.014, scene.ballY - scene.ballVY * trail * 0.014, 8 * (1 - trail * 0.55), 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  context.fillStyle = scene.paddleFlash > 0 ? '#f0785d' : '#34342d'
  context.beginPath()
  context.roundRect(scene.paddleX, HEIGHT - 39, scene.paddleWidth, PADDLE_HEIGHT, 7)
  context.fill()
  context.fillStyle = scene.boost === 'fire' ? '#ffc64c' : '#ef745b'
  context.beginPath()
  context.arc(scene.ballX, scene.ballY, 8, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = 'rgba(239,116,91,.18)'
  context.beginPath()
  context.arc(scene.ballX, scene.ballY, 15, 0, Math.PI * 2)
  context.fill()

  for (const particle of scene.particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.duration)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, 2 + 2 * particle.life / particle.duration, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1

  if (scene.boost && scene.boostTimer > 0) {
    const title = boostLabels[scene.boost]
    context.fillStyle = '#34342d'
    context.beginPath()
    context.roundRect(42, HEIGHT - 66, 130, 22, 7)
    context.fill()
    context.fillStyle = '#fff'
    context.font = '800 9px system-ui, sans-serif'
    context.textAlign = 'left'
    context.fillText(title, 51, HEIGHT - 51)
    context.fillStyle = '#ef745b'
    context.fillRect(42, HEIGHT - 43, 130 * Math.max(0, scene.boostTimer / BOOST_DURATION), 3)
  }

  if (scene.serveTimer > 0) {
    context.strokeStyle = 'rgba(239,116,91,.6)'
    context.setLineDash([4, 5])
    context.beginPath()
    context.moveTo(scene.ballX, scene.ballY)
    context.lineTo(scene.ballX + scene.ballVX * 0.16, scene.ballY + scene.ballVY * 0.16)
    context.stroke()
    context.setLineDash([])
  }

  if (scene.combo >= 2) {
    const multiplier = Math.min(5, 1 + Math.floor((scene.combo - 1) / 3))
    context.fillStyle = '#55574d'
    context.font = '800 13px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillText(`${scene.combo} ${streakLabel}  ×${multiplier}`, WIDTH - 45, HEIGHT - 54)
  }
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
    }).sort((first, second) => second.score - first.score).slice(0, 5)
  } catch {
    return []
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    headline: 'Jak długo dasz radę?', mode: 'TRYB BEZ KOŃCA', score: 'WYNIK', wave: 'FALA', lives: 'ŻYCIA', ready: 'Gotowy na pierwszą falę?', paused: 'Gra wstrzymana', over: 'Koniec gry',
    goal: 'Krawędzie pałki zmieniają kąt odbicia. Rozbijaj cegły seriami; kolejne fale mają nowe układy i szybszą piłkę.', boostHelp: 'Złap spadające bonusy: szersza pałka, wolniejsza piłka lub ognista kula.', boostLabels: { wide: 'SZERSZA PAŁKA', slow: 'WOLNIEJSZA PIŁKA', fire: 'OGNISTA KULA' }, streak: 'SERIA TRAFIEŃ', combo: 'SERIA', resume: 'Wznów grę', again: 'Zagraj ponownie', start: 'Zacznij grę', save: 'Zapisz wynik',
    highScores: 'NAJLEPSZE WYNIKI', nickname: 'PSEUDONIM', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU', move: 'STERUJ PAŁKĄ', left: 'Przesuń pałkę w lewo', right: 'Przesuń pałkę w prawo',
  } : {
    headline: 'How long can you last?', mode: 'ENDLESS MODE', score: 'SCORE', wave: 'WAVE', lives: 'LIVES', ready: 'Ready for the first wave?', paused: 'Game paused', over: 'Run over',
    goal: 'Steer with the paddle edges. Chain bricks for multipliers; new layouts and faster returns follow each clear.', boostHelp: 'Catch falling boosts: a wider paddle, slower ball, or fireball.', boostLabels: { wide: 'WIDE PADDLE', slow: 'SLOW BALL', fire: 'FIREBALL' }, streak: 'HIT STREAK', combo: 'STREAK', resume: 'Resume game', again: 'Play again', start: 'Start endless run', save: 'Save score',
    highScores: 'HIGH SCORES', nickname: 'NICKNAME', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE', move: 'MOVE PADDLE', left: 'Move paddle left', right: 'Move paddle right',
  }
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [initialScene] = useState(createScene)
  const sceneRef = useRef(initialScene)
  const keysRef = useRef({ left: false, right: false })
  const scoreRef = useRef(0)
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(START_LIVES)
  const [combo, setCombo] = useState(0)
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [runBest, setRunBest] = useState(0)
  useEffect(() => { if (status === 'over') saveScore() }, [status])
  useGameSession(status, setStatus, startGame)

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
      renderScene(drawingContext, sceneRef.current, copy.boostLabels, copy.streak)
      return
    }

    let animationFrame = 0
    let previousTime = 0
    const scene = sceneRef.current

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D'].includes(event.key)) event.preventDefault()
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') { keysRef.current.left = true; scene.pointerX = null }
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') { keysRef.current.right = true; scene.pointerX = null }
    }

    function handleKeyUp(event: KeyboardEvent) {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keysRef.current.left = false
      if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keysRef.current.right = false
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.034)
      previousTime = time
      const previousPaddleX = scene.paddleX
      const speed = 640
      if (scene.pointerX !== null) scene.paddleX = scene.pointerX - scene.paddleWidth / 2
      if (keysRef.current.left) scene.paddleX -= speed * delta
      if (keysRef.current.right) scene.paddleX += speed * delta
      scene.paddleX = Math.max(38, Math.min(WIDTH - 38 - scene.paddleWidth, scene.paddleX))

      scene.paddleFlash = Math.max(0, scene.paddleFlash - delta)
      if (scene.boostTimer > 0) {
        scene.boostTimer -= delta
        if (scene.boostTimer <= 0) {
          clearBoost(scene)
        }
      }

      for (let index = scene.drops.length - 1; index >= 0; index -= 1) {
        const drop = scene.drops[index]
        drop.y += drop.vy * delta
        if (drop.y + 11 >= HEIGHT - 39 && drop.y - 11 <= HEIGHT - 26 && drop.x >= scene.paddleX - 11 && drop.x <= scene.paddleX + scene.paddleWidth + 11) {
          applyBoost(scene, drop.type)
          addBurst(scene, drop.x, drop.y, drop.type === 'wide' ? '#5c8ee8' : drop.type === 'slow' ? '#75b8ad' : '#ef745b', 10)
          scene.drops.splice(index, 1)
        } else if (drop.y > HEIGHT + 12) {
          scene.drops.splice(index, 1)
        }
      }
      for (let index = scene.particles.length - 1; index >= 0; index -= 1) {
        const particle = scene.particles[index]
        particle.life -= delta
        if (particle.life <= 0) {
          scene.particles.splice(index, 1)
        } else {
          particle.x += particle.vx * delta
          particle.y += particle.vy * delta
          particle.vy += 320 * delta
          particle.vx *= Math.max(0, 1 - 2.5 * delta)
        }
      }

      if (scene.serveTimer > 0) {
        scene.serveTimer = Math.max(0, scene.serveTimer - delta)
        scene.ballX = scene.paddleX + scene.paddleWidth / 2
        scene.ballY = HEIGHT - 55
        renderScene(drawingContext, scene, copy.boostLabels, copy.streak)
        animationFrame = requestAnimationFrame(frame)
        return
      }
      const previousBallX = scene.ballX
      const previousBallY = scene.ballY
      scene.ballX += scene.ballVX * delta
      scene.ballY += scene.ballVY * delta
      if (scene.ballX < 39) {
        scene.ballX = 39
        scene.ballVX = Math.abs(scene.ballVX)
      } else if (scene.ballX > WIDTH - 39) {
        scene.ballX = WIDTH - 39
        scene.ballVX = -Math.abs(scene.ballVX)
      }
      if (scene.ballY < 38) {
        scene.ballY = 38
        scene.ballVY = Math.abs(scene.ballVY)
      }

      const paddleY = HEIGHT - 39
      if (
        scene.ballVY > 0 &&
        scene.ballY + 8 >= paddleY &&
        scene.ballY < paddleY + PADDLE_HEIGHT &&
        scene.ballX >= scene.paddleX - 7 &&
        scene.ballX <= scene.paddleX + scene.paddleWidth + 7
      ) {
        const hitOffset = Math.max(-0.84, Math.min(0.84, (scene.ballX - (scene.paddleX + scene.paddleWidth / 2)) / (scene.paddleWidth / 2)))
        scene.ballSpeed = Math.min(650, scene.ballSpeed * 1.008)
        const speed = scene.ballSpeed * (scene.boost === 'slow' ? SLOW_FACTOR : 1)
        const movement = Math.max(-1, Math.min(1, (scene.paddleX - previousPaddleX) / Math.max(1, 640 * delta)))
        const rebound = paddleReturn(hitOffset, speed, movement)
        scene.ballVX = Math.abs(rebound.vx) < speed * 0.12 ? Math.sign(rebound.vx || scene.ballVX || 1) * speed * 0.12 : rebound.vx
        scene.ballVY = -Math.sqrt(speed ** 2 - scene.ballVX ** 2)
        scene.combo = 0
        setCombo(0)
        scene.ballY = paddleY - 8
        scene.paddleFlash = 0.12
        addBurst(scene, scene.ballX, scene.ballY + 7, '#fffdf0', 5)
      }

      for (const brick of scene.bricks) {
        if (!brick.alive) continue
        const overlaps = scene.ballX + 7 > brick.x && scene.ballX - 7 < brick.x + BRICK_WIDTH && scene.ballY + 7 > brick.y && scene.ballY - 7 < brick.y + BRICK_HEIGHT
        const overlappedBefore = previousBallX + 7 > brick.x && previousBallX - 7 < brick.x + BRICK_WIDTH && previousBallY + 7 > brick.y && previousBallY - 7 < brick.y + BRICK_HEIGHT
        if (overlaps && !(scene.boost === 'fire' && overlappedBefore)) {
          brick.hits -= 1
          brick.alive = brick.hits > 0
          if (scene.boost !== 'fire') {
            if (previousBallY + 7 <= brick.y || previousBallY - 7 >= brick.y + BRICK_HEIGHT) {
              scene.ballVY *= -1
              scene.ballY = previousBallY < brick.y ? brick.y - 7 : brick.y + BRICK_HEIGHT + 7
            } else {
              scene.ballVX *= -1
              scene.ballX = previousBallX < brick.x ? brick.x - 7 : brick.x + BRICK_WIDTH + 7
            }
          }
          scene.combo += 1
          setCombo(scene.combo)
          const multiplier = Math.min(5, 1 + Math.floor((scene.combo - 1) / 3))
          scoreRef.current += 10 * multiplier
          setScore(scoreRef.current)
          addBurst(scene, scene.ballX, scene.ballY, brick.color, brick.alive ? 4 : 9)
          if (!brick.alive && Math.random() < DROP_CHANCE) {
            const types: BoostType[] = ['wide', 'slow', 'fire']
            const type = types[Math.floor(Math.random() * types.length)]
            scene.drops.push({ x: brick.x + BRICK_WIDTH / 2, y: brick.y + BRICK_HEIGHT / 2, vy: 145, type })
          }
          break
        }
      }

      if (scene.ballY > HEIGHT + 6) {
        scene.lives -= 1
        setLives(scene.lives)
        scene.combo = 0
        setCombo(0)
        if (scene.lives === 0) {
          setStatus('over')
          return
        }
        scene.serveTimer = 0.95
        scene.drops = []
        clearBoost(scene)
        scene.ballX = WIDTH / 2
        scene.ballY = HEIGHT - 76
        const speed = scene.ballSpeed * (scene.boost === 'slow' ? SLOW_FACTOR : 1)
        scene.ballVX = speed * 0.61
        scene.ballVY = -speed * 0.79
        scene.paddleX = WIDTH / 2 - scene.paddleWidth / 2
      }

      if (scene.bricks.every((brick) => !brick.alive)) {
        scene.wave += 1
        scene.serveTimer = 1.25
        scene.drops = []
        if (scene.wave % 3 === 0) {
          scene.lives = Math.min(5, scene.lives + 1)
          setLives(scene.lives)
        }
        scene.ballSpeed = Math.min(650, 350 + (scene.wave - 1) * 24)
        scene.paddleBaseWidth = Math.max(MIN_PADDLE_WIDTH, scene.paddleBaseWidth - 3)
        resizePaddle(scene, scene.paddleBaseWidth * (scene.boost === 'wide' ? WIDE_FACTOR : 1))
        scene.bricks = createBricks(scene.wave)
        scene.combo = 0
        setCombo(0)
        scene.ballX = WIDTH / 2
        scene.ballY = HEIGHT - 76
        const speed = scene.ballSpeed * (scene.boost === 'slow' ? SLOW_FACTOR : 1)
        scene.ballVX = speed * 0.61
        scene.ballVY = -speed * 0.79
        scene.paddleX = WIDTH / 2 - scene.paddleWidth / 2
        scoreRef.current += 100 * (scene.wave - 1)
        setScore(scoreRef.current)
        setWave(scene.wave)
      }

      renderScene(drawingContext, scene, copy.boostLabels, copy.streak)
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
  }, [status, locale])

  function startGame() {
    setRunBest(records[0]?.score ?? 0)
    scoreRef.current = 0
    setScore(0)
    setWave(1)
    setLives(START_LIVES)
    setCombo(0)
    setSaved(false)
    sceneRef.current = createScene()
    setStatus('playing')
  }

  function saveScore() {
    if (saved || score < 1) return
    const next = [...records, { name: nickname.trim() || fallbackName, score }]
      .sort((first, second) => second.score - first.score)
      .slice(0, 5)
    try {
      localStorage.setItem('playcove.brick-breaker.nickname', nickname.trim() || fallbackName)
      localStorage.setItem('playcove.brick-breaker.scores', JSON.stringify(next))
    } catch { return }
    setRecords(next)
    setSaved(true)
  }

  function hold(direction: 'left' | 'right', pressed: boolean) {
    keysRef.current[direction] = pressed
    if (pressed) sceneRef.current.pointerX = null
  }

  return (
    <div className={`module-game brick-game${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.mode}</span><h2>{copy.headline}</h2></div>
          <div className="brick-run-stats">
            <div className="score-readout"><span>{copy.wave}</span><strong>{wave.toString().padStart(2, '0')}</strong></div>
            <div className="score-readout"><span>{copy.lives}</span><strong>{lives}</strong></div>
            <div className="score-readout"><span>{copy.combo}</span><strong>×{Math.min(5, 1 + Math.floor(Math.max(0, combo - 1) / 3))}</strong></div>
            <div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div>
          </div>
        </div>
        <div className="arcade-livebar"><span>{locale === 'pl' ? 'KRAWĘDŹ PAŁKI ZMIENIA KĄT · CO 3 FALE +1 ŻYCIE' : 'PADDLE EDGES STEER · EVERY 3 WAVES +1 LIFE'}</span>{status === 'playing' && <button onClick={() => setStatus('paused')}>Ⅱ {locale === 'pl' ? 'Pauza' : 'Pause'}</button>}</div>
        <div className="canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Plansza Brick Breaker' : 'Brick Breaker play field'} onPointerMove={(event) => { if (status !== 'playing') return; const bounds = event.currentTarget.getBoundingClientRect(); sceneRef.current.pointerX = (event.clientX - bounds.left) * WIDTH / bounds.width }} onPointerDown={(event) => { if (status !== 'playing') return; event.currentTarget.setPointerCapture(event.pointerId); const bounds = event.currentTarget.getBoundingClientRect(); sceneRef.current.pointerX = (event.clientX - bounds.left) * WIDTH / bounds.width }} />
          <GameOverlay status={status} locale={locale} title={status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready} description={status === 'over' ? (locale === 'pl' ? 'Trafienie krawędzią pałki otwiera drogę za cegły.' : 'An edge return opens a route behind the bricks.') : copy.goal} actionLabel={status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start} onAction={status === 'paused' ? () => setStatus('playing') : startGame} result={{ value: score, label: copy.score, score, best: runBest, saved, stats: [{ label: copy.wave, value: wave }, { label: locale === 'pl' ? 'POPRZEDNI REKORD' : 'PREVIOUS BEST', value: runBest }] }} />
        </div>
        <div className="game-touch-controls">
          <button aria-label={copy.left} onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerCancel={() => hold('left', false)} onPointerLeave={() => hold('left', false)}>←</button>
          <span>{copy.move}</span>
          <button aria-label={copy.right} onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerCancel={() => hold('right', false)} onPointerLeave={() => hold('right', false)}>→</button>
        </div>
        <p className="game-boost-note">{copy.boostHelp}</p>
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
