import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { useCanvasResolution } from '../kit/use-canvas-resolution.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { GamePanel } from '../kit/GamePanel.tsx'
import { SoundToggle } from '../kit/SoundToggle.tsx'
import { useGameAudio } from '../kit/use-game-audio.ts'
import { makeSection, runnerSpeed } from './mechanics.ts'
import type { RunnerCoin, RunnerObstacle } from './mechanics.ts'

type Obstacle = RunnerObstacle
type Coin = RunnerCoin
type Pickup = { x: number; y: number; kind: 'magnet' | 'shield' }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
type Scene = { coyoteTimer: number; cleared: number; death: 'crate' | 'stack' | 'sign' | 'gap' | null; section: number; message: string; messageTimer: number; playerY: number; playerVY: number; grounded: boolean; jumpBuffer: number; obstacles: Obstacle[]; coins: Coin[]; pickups: Pickup[]; particles: Particle[]; elapsed: number; distance: number; coinsCollected: number; bonusScore: number; spawnTimer: number; coinTimer: number; pickupTimer: number; score: number; flash: number; dashFuel: number; dashTimer: number; shieldCharges: number; magnetTimer: number; coinStreak: number; streakTimer: number }
type ScoreEntry = { name: string; score: number }

const WIDTH = 800
const HEIGHT = 440
const GROUND = 356
const PLAYER_X = 130
const PLAYER_WIDTH = 31
const PLAYER_HEIGHT = 54
const GRAVITY = 1850
const SCORES_KEY = 'playcove.rooftop-runner.scores'
const NAME_KEY = 'playcove.rooftop-runner.nickname'

function createScene(): Scene {
  return { coyoteTimer: 0.1, cleared: 0, death: null, section: 0, message: '', messageTimer: 0, playerY: GROUND - PLAYER_HEIGHT, playerVY: 0, grounded: true, jumpBuffer: 0, obstacles: [], coins: [], pickups: [], particles: [], elapsed: 0, distance: 0, coinsCollected: 0, bonusScore: 0, spawnTimer: 0.9, coinTimer: 1.4, pickupTimer: 6, score: 0, flash: 0, dashFuel: 65, dashTimer: 0, shieldCharges: 0, magnetTimer: 0, coinStreak: 0, streakTimer: 0 }
}

function readRecords() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SCORES_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is ScoreEntry => typeof entry === 'object' && entry !== null && 'name' in entry && typeof entry.name === 'string' && 'score' in entry && typeof entry.score === 'number').sort((first, second) => second.score - first.score).slice(0, 5)
  } catch { return [] }
}

function readNickname(fallback: string) {
  try { return localStorage.getItem(NAME_KEY) || fallback } catch { return fallback }
}

function addBurst(scene: Scene, x: number, y: number, color: string) {
  for (let index = 0; index < 10; index += 1) {
    const angle = Math.PI * 2 * index / 10
    const speed = 65 + (index % 3) * 30
    scene.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.32, color })
  }
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, time: number, active: boolean, sliding: boolean) {
  const phase = scene.elapsed * 0.08
  context.clearRect(0, 0, WIDTH, HEIGHT)
  const sky = context.createLinearGradient(0, 0, 0, GROUND)
  sky.addColorStop(0, '#f8a87a')
  sky.addColorStop(1, '#f9d79a')
  context.fillStyle = sky
  context.fillRect(0, 0, WIDTH, GROUND)
  context.fillStyle = 'rgba(255,246,207,.8)'
  context.beginPath()
  context.arc(664, 76, 36, 0, Math.PI * 2)
  context.fill()

  for (let index = 0; index < 12; index += 1) {
    const width = 38 + (index % 3) * 16
    const height = 60 + (index % 5) * 19
    const x = ((index * 97 - phase * 80) % (WIDTH + 100) + WIDTH + 100) % (WIDTH + 100) - 50
    context.fillStyle = index % 2 ? '#b56f74' : '#9a6279'
    context.fillRect(x, GROUND - height, width, height)
    context.fillStyle = 'rgba(255,226,163,.46)'
    for (let windowY = GROUND - height + 13; windowY < GROUND - 8; windowY += 18) context.fillRect(x + 8, windowY, 5, 7)
  }

  context.fillStyle = '#303b4e'
  context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND)
  context.fillStyle = '#f8d36f'
  context.fillRect(0, GROUND, WIDTH, 4)
  const stripeOffset = -(scene.distance * 20) % 76
  context.fillStyle = 'rgba(255,255,255,.68)'
  for (let x = -76 + stripeOffset; x < WIDTH; x += 76) context.fillRect(x, GROUND + 42, 42, 4)

  for (const coin of scene.coins) {
    const pulse = 1 + Math.sin(time / 105 + coin.phase) * 0.1
    context.save()
    context.shadowColor = '#ffe17a'
    context.shadowBlur = 12
    context.fillStyle = '#ffe17a'
    context.beginPath()
    context.ellipse(coin.x, coin.y, 9 * pulse, 12 / pulse, 0, 0, Math.PI * 2)
    context.fill()
    context.restore()
  }

  for (const pickup of scene.pickups) {
    const color = pickup.kind === 'magnet' ? '#9bf3d0' : '#9bc8ff'
    context.save()
    context.shadowColor = color
    context.shadowBlur = 16
    context.fillStyle = color
    context.beginPath()
    context.arc(pickup.x, pickup.y, 13 + Math.sin(time / 120) * 2, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#29394d'
    context.font = '900 15px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(pickup.kind === 'magnet' ? '↯' : '+', pickup.x, pickup.y + 5)
    context.restore()
  }

  for (const obstacle of scene.obstacles) {
    if (obstacle.kind === 'gap') {
      context.fillStyle = '#171f35'
      context.fillRect(obstacle.x, GROUND, obstacle.width, HEIGHT - GROUND)
      context.fillStyle = '#e98460'
      context.fillRect(obstacle.x - 5, GROUND, 5, 13)
      context.fillRect(obstacle.x + obstacle.width, GROUND, 5, 13)
      continue
    }
    if (obstacle.kind === 'crate' || obstacle.kind === 'stack') {
      context.fillStyle = '#e97456'
      context.beginPath()
      const height = obstacle.kind === 'stack' ? 72 : 38
      context.roundRect(obstacle.x, GROUND - height, obstacle.width, height, 5)
      context.fill()
      context.strokeStyle = '#ffbe79'
      context.lineWidth = 4
      context.beginPath()
      context.moveTo(obstacle.x + 7, GROUND - 31)
      context.lineTo(obstacle.x + 27, GROUND - 7)
      context.moveTo(obstacle.x + 27, GROUND - 31)
      context.lineTo(obstacle.x + 7, GROUND - 7)
      context.stroke()
      if (obstacle.kind === 'stack') {
        context.fillStyle = '#ffbe79'
        context.fillRect(obstacle.x + 3, GROUND - 39, obstacle.width - 6, 3)
        context.fillStyle = '#fff0b7'
        context.font = '900 17px system-ui, sans-serif'
        context.textAlign = 'center'
        context.fillText('↑', obstacle.x + obstacle.width / 2, GROUND - 48)
      }
    } else {
      context.fillStyle = '#e97456'
      context.fillRect(obstacle.x, GROUND - 78, 58, 34)
      context.fillStyle = '#ffe5b0'
      context.fillRect(obstacle.x + 8, GROUND - 70, 42, 4)
      context.fillRect(obstacle.x + 12, GROUND - 61, 34, 3)
      context.fillStyle = 'rgba(41,57,77,.35)'
      context.fillRect(obstacle.x + 8, 0, 2, GROUND - 78)
      context.fillRect(obstacle.x + 48, 0, 2, GROUND - 78)
    }
  }

  context.fillStyle = 'rgba(20,30,45,.22)'
  context.beginPath()
  context.ellipse(PLAYER_X, GROUND + 4, 22, 5, 0, 0, Math.PI * 2)
  context.fill()
  const isSliding = active && scene.grounded && sliding
  const height = isSliding ? 29 : PLAYER_HEIGHT
  const playerY = GROUND - (scene.grounded ? height : PLAYER_HEIGHT) + (scene.grounded ? 0 : scene.playerY - (GROUND - PLAYER_HEIGHT))
  const run = scene.grounded && !isSliding ? Math.sin(time / 55) * 4 : 0
  context.fillStyle = scene.flash > 0 ? '#fff' : '#f6f0d3'
  if (scene.dashTimer > 0) {
    context.save()
    context.shadowColor = '#9bf3d0'
    context.shadowBlur = 24
  }
  context.beginPath()
  context.roundRect(PLAYER_X - PLAYER_WIDTH / 2, playerY + run, PLAYER_WIDTH, height, 10)
  context.fill()
  context.fillStyle = '#e87957'
  context.beginPath()
  context.arc(PLAYER_X + 5, playerY + 11 + run, 3, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#26364c'
  context.beginPath()
  context.roundRect(PLAYER_X - 19 - run, playerY + height - 7, 20, 8, 4)
  context.roundRect(PLAYER_X + run, playerY + height - 7, 20, 8, 4)
  context.fill()
  if (scene.dashTimer > 0) context.restore()

  for (const particle of scene.particles) {
    context.globalAlpha = Math.max(0, particle.life / 0.32)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1
  if (scene.messageTimer > 0) {
    context.fillStyle = '#fff3bb'
    context.font = '900 22px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(scene.message, WIDTH / 2, 54)
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    label: 'ARCADE · BIEG BEZ KOŃCA', title: 'Skacz, ślizgaj się, pędź.', score: 'WYNIK', best: 'REKORD', coins: 'MONETY', streak: 'SERIA', dash: 'DOPALACZ', history: 'NAJLEPSZE WYNIKI', pause: 'Pauza', nickname: 'PSEUDONIM', save: 'Zapisz wynik', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU',
    ready: 'Gotowy do biegu?', readyText: 'Przytrzymaj skok, by skoczyć wysoko; dotknij, by podskoczyć. Monety prowadzą nad skrzyniami i pod znakami. Przytrzymaj skok nad lukami. Shift zużywa 65% dopalacza.', over: 'Koniec biegu', paused: 'Bieg wstrzymany', magnet: 'MAGNES', shield: 'TARCZA',
    start: 'Start', again: 'Jeszcze raz', resume: 'Wznów', jump: 'SKOK', slide: 'ŚLIZG',
  } : {
    label: 'ARCADE · ENDLESS RUN', title: 'Jump, slide, hit the boost.', score: 'SCORE', best: 'BEST', coins: 'COINS', streak: 'STREAK', dash: 'BOOST', history: 'HIGH SCORES', pause: 'Pause', nickname: 'NICKNAME', save: 'Save score', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE',
    ready: 'Ready to run?', readyText: 'Hold jump for height; tap for a short hop. Follow coin trails over crates and under signs. Hold jump across roof gaps. Shift spends 65% charge to smash hazards.', over: 'Run over', paused: 'Run paused', magnet: 'MAGNET', shield: 'SHIELD',
    start: 'Start run', again: 'Play again', resume: 'Resume', jump: 'JUMP', slide: 'SLIDE',
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRevision = useCanvasResolution(canvasRef, WIDTH, HEIGHT)
  const [initialScene] = useState(createScene)
  const sceneRef = useRef(initialScene)
  const inputRef = useRef({ jump: false, jumpHeld: false, slide: false, dash: false })
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [coins, setCoins] = useState(0)
  const [streak, setStreak] = useState(0)
  const [dashFuel, setDashFuel] = useState(65)
  const [powerState, setPowerState] = useState('')
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [runBest, setRunBest] = useState(0)
  const { audio, enabled: soundEnabled, toggle: toggleSound } = useGameAudio(status, score > runBest)
  useEffect(() => { if (status === 'over') saveScore() }, [status])
  useGameSession(status, setStatus, start, canvasRef)
  const best = records[0]?.score ?? 0

  useEffect(() => {
    setRecords(readRecords())
    setNickname(readNickname(fallbackName))
  }, [fallbackName])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    const drawingContext = context
    const scene = sceneRef.current
    if (status !== 'playing') {
      renderScene(drawingContext, scene, performance.now(), false, false)
      return
    }
    let animationFrame = 0
    let previousTime = 0
    let scoreUpdate = 0

    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if ([' ', 'arrowup', 'arrowdown', 'w', 's', 'shift', 'x'].includes(key)) event.preventDefault()
      if ([' ', 'arrowup', 'w'].includes(key) && !event.repeat) { inputRef.current.jump = true; inputRef.current.jumpHeld = true }
      if (['arrowdown', 's'].includes(key)) inputRef.current.slide = true
      if ((key === 'shift' || key === 'x') && !event.repeat) inputRef.current.dash = true
    }
    function keyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (['arrowdown', 's'].includes(key)) inputRef.current.slide = false
      if ([' ', 'arrowup', 'w'].includes(key)) inputRef.current.jumpHeld = false
    }
    function finish(death: 'crate' | 'stack' | 'sign' | 'gap') {
      scene.death = death;
      setScore(scene.score)
      setCoins(scene.coinsCollected)
      setStatus('over')
    }
    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.034)
      previousTime = time
      scene.elapsed += delta
      scene.flash = Math.max(0, scene.flash - delta)
      const speed = runnerSpeed(scene.elapsed) * (scene.dashTimer > 0 ? 1.28 : 1)
      scene.messageTimer = Math.max(0, scene.messageTimer - delta)
      scene.dashFuel = Math.min(100, scene.dashFuel + delta * 1.4)
      scene.dashTimer = Math.max(0, scene.dashTimer - delta)
      scene.magnetTimer = Math.max(0, scene.magnetTimer - delta)
      scene.streakTimer = Math.max(0, scene.streakTimer - delta)
      if (scene.streakTimer === 0 && scene.coinStreak > 0) {
        scene.coinStreak = 0
        setStreak(0)
      }
      if (inputRef.current.dash) {
        if (scene.dashFuel >= 65 && scene.dashTimer <= 0) {
          audio.play('boost')
          scene.dashFuel -= 65
          scene.dashTimer = 0.48
          scene.flash = 0.12
          addBurst(scene, PLAYER_X, scene.playerY + PLAYER_HEIGHT / 2, '#9bf3d0')
        }
        inputRef.current.dash = false
      }
      setDashFuel(Math.floor(scene.dashFuel))
      if (inputRef.current.jump) scene.jumpBuffer = 0.13
      inputRef.current.jump = false
      scene.jumpBuffer = Math.max(0, scene.jumpBuffer - delta)
      const overGap = scene.obstacles.some((obstacle) => obstacle.kind === 'gap' && PLAYER_X > obstacle.x + 6 && PLAYER_X < obstacle.x + obstacle.width - 6)
      scene.coyoteTimer = scene.grounded && !overGap ? 0.1 : Math.max(0, scene.coyoteTimer - delta)
      if (overGap && scene.grounded) scene.grounded = false
      if (scene.jumpBuffer > 0 && (scene.grounded || scene.coyoteTimer > 0)) {
        scene.coyoteTimer = 0
        scene.playerVY = -650
        scene.grounded = false
        scene.jumpBuffer = 0
        addBurst(scene, PLAYER_X, scene.playerY + PLAYER_HEIGHT, '#ffe17a')
      }
      if (!scene.grounded) {
        if (!inputRef.current.jumpHeld && scene.playerVY < -280) scene.playerVY = -280
        if (inputRef.current.slide && scene.playerVY > 0) scene.playerVY += GRAVITY * delta
        scene.playerY += scene.playerVY * delta
        scene.playerVY += GRAVITY * delta
        if (scene.playerY + PLAYER_HEIGHT >= GROUND && !overGap && scene.playerVY >= 0) {
          scene.playerY = GROUND - PLAYER_HEIGHT
          scene.playerVY = 0
          scene.grounded = true
          scene.flash = 0.08
        }
      }
      if (scene.dashTimer > 0 && overGap && scene.playerY > GROUND - PLAYER_HEIGHT - 8) {
        scene.playerY = GROUND - PLAYER_HEIGHT - 8
        scene.playerVY = 0
      }
      if (scene.playerY > HEIGHT + 25) { finish('gap'); return }
      const playerHeight = inputRef.current.slide && scene.grounded ? 29 : PLAYER_HEIGHT
      scene.distance += speed * delta * 0.05
      scene.spawnTimer -= delta
      if (scene.spawnTimer <= 0) {
        const section = makeSection(WIDTH + 40, runnerSpeed(scene.elapsed), scene.section, Math.floor(Math.random() * 4))
        scene.obstacles.push(...section.obstacles)
        scene.coins.push(...section.coins)
        scene.spawnTimer = section.length / runnerSpeed(scene.elapsed)
        scene.section += 1
      }
      scene.pickupTimer -= delta
      if (scene.pickupTimer <= 0) {
        scene.pickups.push({ x: WIDTH + 35, y: GROUND - 60, kind: Math.random() < 0.62 ? 'magnet' : 'shield' })
        scene.pickupTimer = 8 + Math.random() * 5
      }
      for (let index = scene.obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = scene.obstacles[index]
        obstacle.x -= speed * delta
        if (obstacle.x + obstacle.width < -20) { scene.obstacles.splice(index, 1); continue }
        if (!obstacle.passed && obstacle.x + obstacle.width < PLAYER_X - PLAYER_WIDTH / 2) {
          obstacle.passed = true
          scene.cleared += 1
          scene.bonusScore += 20
          scene.dashFuel = Math.min(100, scene.dashFuel + 3)
        }
        if (obstacle.kind === 'gap') continue
        const obstacleY = obstacle.kind === 'stack' ? GROUND - 72 : obstacle.kind === 'crate' ? GROUND - 38 : GROUND - 78
        const obstacleWidth = obstacle.width
        const obstacleHeight = obstacle.kind === 'stack' ? 72 : obstacle.kind === 'crate' ? 38 : 34
        const playerY = scene.grounded ? GROUND - playerHeight : scene.playerY
        if (PLAYER_X + PLAYER_WIDTH / 2 - 3 > obstacle.x && PLAYER_X - PLAYER_WIDTH / 2 + 3 < obstacle.x + obstacleWidth && playerY + playerHeight > obstacleY && playerY < obstacleY + obstacleHeight) {
          if (scene.dashTimer > 0) {
            scene.bonusScore += 75
            scene.message = '+75 ⚡'
            scene.messageTimer = 0.7
            addBurst(scene, obstacle.x + obstacleWidth / 2, obstacleY + obstacleHeight / 2, '#9bf3d0')
            scene.obstacles.splice(index, 1)
          } else if (scene.shieldCharges > 0) {
            scene.shieldCharges -= 1
            addBurst(scene, PLAYER_X, playerY + playerHeight / 2, '#9bc8ff')
            scene.obstacles.splice(index, 1)
            setPowerState(scene.magnetTimer > 0 ? copy.magnet : '')
          } else {
            finish(obstacle.kind)
            renderScene(drawingContext, scene, time, true, inputRef.current.slide)
            return
          }
        }
      }
      for (let index = scene.coins.length - 1; index >= 0; index -= 1) {
        const coin = scene.coins[index]
        coin.x -= speed * delta
        if (scene.magnetTimer > 0 && Math.abs(coin.x - PLAYER_X) < 210) {
          coin.x += (PLAYER_X - coin.x) * Math.min(1, delta * 3.4)
          const targetY = (scene.grounded ? GROUND - playerHeight : scene.playerY) + playerHeight / 2
          coin.y += (targetY - coin.y) * Math.min(1, delta * 3.4)
        }
        if (coin.x < -20) {
          scene.coins.splice(index, 1)
          continue
        }
        const playerY = scene.grounded ? GROUND - playerHeight : scene.playerY
        if (Math.abs(coin.x - PLAYER_X) < (scene.magnetTimer > 0 ? 30 : 26) && coin.y >= playerY - 8 && coin.y <= playerY + playerHeight + 10) {
          audio.play('pickup')
          scene.coinsCollected += 1
          scene.coinStreak = scene.streakTimer > 0 ? scene.coinStreak + 1 : 1
          scene.streakTimer = 4.5
          scene.dashFuel = Math.min(100, scene.dashFuel + 6)
          scene.bonusScore += Math.min(5, scene.coinStreak - 1) * 5
          if (scene.dashTimer > 0) scene.bonusScore += 25
          setStreak(scene.coinStreak)
          setDashFuel(Math.floor(scene.dashFuel))
          scene.coins.splice(index, 1)
          addBurst(scene, coin.x, coin.y, '#ffe17a')
          setCoins(scene.coinsCollected)
        }
      }
      for (let index = scene.pickups.length - 1; index >= 0; index -= 1) {
        const pickup = scene.pickups[index]
        pickup.x -= speed * delta
        if (pickup.x < -25) {
          scene.pickups.splice(index, 1)
        } else if (Math.abs(pickup.x - PLAYER_X) < 30 && Math.abs(pickup.y - (scene.grounded ? GROUND - playerHeight / 2 : scene.playerY + PLAYER_HEIGHT / 2)) < 42) {
          if (pickup.kind === 'magnet') scene.magnetTimer = 7
          else scene.shieldCharges = Math.min(1, scene.shieldCharges + 1)
          setPowerState([scene.magnetTimer > 0 ? copy.magnet : '', scene.shieldCharges > 0 ? copy.shield : ''].filter(Boolean).join(' · '))
          addBurst(scene, pickup.x, pickup.y, pickup.kind === 'magnet' ? '#9bf3d0' : '#9bc8ff')
          scene.pickups.splice(index, 1)
        }
      }
      for (let index = scene.particles.length - 1; index >= 0; index -= 1) {
        const particle = scene.particles[index]
        particle.life -= delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.vy += 270 * delta
        if (particle.life <= 0) scene.particles.splice(index, 1)
      }
      scene.score = Math.floor(scene.distance) + scene.coinsCollected * 25 + scene.bonusScore
      const activePowerState = [scene.magnetTimer > 0 ? copy.magnet : '', scene.shieldCharges > 0 ? copy.shield : ''].filter(Boolean).join(' · ')
      setPowerState((current) => current === activePowerState ? current : activePowerState)
      scoreUpdate += delta
      if (scoreUpdate >= 0.15) {
        scoreUpdate = 0
        setScore(scene.score)
      }
      renderScene(drawingContext, scene, time, true, inputRef.current.slide)
      animationFrame = requestAnimationFrame(frame)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    animationFrame = requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      inputRef.current = { jump: false, jumpHeld: false, slide: false, dash: false }
    }
  }, [status, locale, canvasRevision])

  function start() {
    setRunBest(records[0]?.score ?? 0)
    sceneRef.current = createScene()
    inputRef.current = { jump: false, jumpHeld: false, slide: false, dash: false }
    setScore(0)
    setCoins(0)
    setStreak(0)
    setDashFuel(65)
    setPowerState('')
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

  return (
    <div className={`module-game arcade-module runner-module${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">

        <div className="canvas-wrap arcade-canvas-wrap runner-canvas-wrap">
        <div className="module-game-heading game-frame-bar"><div><span className="game-small-label">{copy.label}</span><h2>ROOFTOP RUNNER</h2></div><div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div><div className="score-readout"><span>{copy.best}</span><strong>{best.toString().padStart(3, '0')}</strong></div></div></div>
          <canvas tabIndex={0} ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Trasa Rooftop Runner' : 'Rooftop Runner course'} />
        {status === 'playing' && <div className="arcade-livebar"><span>{copy.jump} · {copy.slide}{streak > 1 ? ` · ${copy.streak} ×${streak}` : ''}{powerState ? ` · ${powerState}` : ''}</span><div className="arcade-live-actions"><label className="boost-meter"><span>{copy.dash}</span><span className="boost-meter-track"><i style={{ width: `${dashFuel}%` }} /></span><span>{dashFuel}%</span></label></div></div>}
          <SoundToggle locale={locale} enabled={soundEnabled} onToggle={toggleSound} onPause={status === 'playing' ? () => setStatus('paused') : undefined} />
          <GamePanel locale={locale} onOpen={() => { if (status === 'playing') setStatus('paused') }}>
      <aside className="game-scoreboard arcade-scoreboard"><div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div><div className="arcade-record-number">{coins.toString().padStart(2, '0')}</div><p className="scoreboard-foot">{copy.coins}</p><label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label><div className="scoreboard-rule" /><div className="scoreboard-list">{records.length ? records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div><div className="scoreboard-foot">{copy.local}</div></aside>
          </GamePanel>
          <GameOverlay gameName="ROOFTOP RUNNER" onRestart={start} status={status} locale={locale} title={status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready} description={status === 'over' ? (sceneRef.current.death === 'gap' ? locale === 'pl' ? 'Upadek między dachami. Przytrzymaj skok albo użyj dopalacza nad luką.' : 'Fell between rooftops. Hold your jump, or boost across the gap.' : sceneRef.current.death === 'stack' ? locale === 'pl' ? 'Wysoka skrzynia. Przytrzymaj skok; krótki podskok jej nie minie.' : 'A tall stack. Hold your jump; a short hop will not clear it.' : sceneRef.current.death === 'sign' ? locale === 'pl' ? 'Znak zablokował drogę. Przytrzymaj dół, by prześlizgnąć się pod nim.' : 'Caught by a sign. Hold Down to slide beneath it.' : locale === 'pl' ? 'Potknięcie o skrzynię. Skocz przed śladem monet lub przebij się dopalaczem.' : 'Clipped a crate. Jump into the coin trail or boost through it.') : copy.readyText} actionLabel={status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start} onAction={status === 'paused' ? () => setStatus('playing') : start} result={{ value: score, label: copy.score, score, best: runBest, saved, stats: [{ label: copy.coins, value: coins }, { label: locale === 'pl' ? 'DYSTANS' : 'DISTANCE', value: `${Math.floor(sceneRef.current.distance)}m` }, { label: locale === 'pl' ? 'PRZESZKODY' : 'CLEARED', value: sceneRef.current.cleared }] }} />
        </div>
        <div className="game-touch-controls runner-touch-controls"><button onPointerDown={() => { inputRef.current.jump = true; inputRef.current.jumpHeld = true }} onPointerUp={() => { inputRef.current.jumpHeld = false }} onPointerCancel={() => { inputRef.current.jumpHeld = false }} onPointerLeave={() => { inputRef.current.jumpHeld = false }} aria-label={copy.jump}>↑ {copy.jump}</button><button onPointerDown={() => { inputRef.current.slide = true }} onPointerUp={() => { inputRef.current.slide = false }} onPointerCancel={() => { inputRef.current.slide = false }} onPointerLeave={() => { inputRef.current.slide = false }} aria-label={copy.slide}>↓ {copy.slide}</button><button disabled={status !== 'playing' || dashFuel < 65} onPointerDown={() => { inputRef.current.dash = true }} aria-label={copy.dash}>⚡ {copy.dash}</button></div>
        <p className="arcade-controls-note"><span>{copy.jump} <kbd>SPACE</kbd> <kbd>↑</kbd> <kbd>W</kbd></span><span>{copy.slide} <kbd>↓</kbd> <kbd>S</kbd></span><span>{copy.dash} <kbd>SHIFT</kbd> <kbd>X</kbd></span></p>
      </div>

    </div>
  )
}
