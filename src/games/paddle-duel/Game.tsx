import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { matchWon, returnVelocity } from './mechanics.ts'

type MatchRecord = { winner: string; final: string; p1: string; p2: string }
type BoostType = 'stretch' | 'dash' | 'curve'
type BoostOrb = { x: number; y: number; type: BoostType }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; duration: number; color: string }
type Match = {
  ballX: number; ballY: number; ballVX: number; ballVY: number; leftY: number; rightY: number; p1: number; p2: number
  speed: number; rally: number; lastHitter: 0 | 1; leftFlash: number; rightFlash: number; particles: Particle[]
  serveTimer: number; pointTimer: number; lastPoint: 0 | 1 | null; boostOrb: BoostOrb | null
  p1Boost: BoostType | null; p2Boost: BoostType | null; p1BoostTimer: number; p2BoostTimer: number
}

const WIDTH = 800
const HEIGHT = 440
const PADDLE_W = 13
const PADDLE_H = 86
const BALL_RADIUS = 9

function createMatch(): Match {
  return {
    ballX: WIDTH / 2,
    ballY: HEIGHT / 2,
    ballVX: 250,
    ballVY: 135,
    leftY: HEIGHT / 2 - PADDLE_H / 2,
    rightY: HEIGHT / 2 - PADDLE_H / 2,
    p1: 0,
    p2: 0,
    speed: 250,
    rally: 0,
    lastHitter: 0,
    leftFlash: 0,
    rightFlash: 0,
    particles: [],
    serveTimer: 0.8,
    pointTimer: 0,
    lastPoint: null,
    boostOrb: null,
    p1Boost: null,
    p2Boost: null,
    p1BoostTimer: 0,
    p2BoostTimer: 0,
  }
}

function addBurst(match: Match, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const speed = 75 + (index % 3) * 40
    match.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.28, duration: 0.28, color })
  }
}

function paddleHeight(boost: BoostType | null) {
  return PADDLE_H + (boost === 'stretch' ? 42 : 0)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function grantBoost(match: Match, player: 0 | 1, boost: BoostType) {
  if (player === 0) {
    match.p1Boost = boost
    match.p1BoostTimer = 8
  } else {
    match.p2Boost = boost
    match.p2BoostTimer = 8
  }
}

function drawMatch(context: CanvasRenderingContext2D, match: Match, pointLabel: string, rallyLabel: string, boostLabels: Record<BoostType, string>) {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#e8edf5'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = 'rgba(255,255,255,.47)'
  context.fillRect(20, 18, WIDTH - 40, HEIGHT - 36)
  context.strokeStyle = 'rgba(75,105,169,.25)'
  context.setLineDash([8, 12])
  context.lineWidth = 3
  context.beginPath()
  context.moveTo(WIDTH / 2, 34)
  context.lineTo(WIDTH / 2, HEIGHT - 34)
  context.stroke()
  context.setLineDash([])

  context.font = '700 43px sans-serif'
  context.textAlign = 'center'
  context.fillStyle = 'rgba(75,105,169,.2)'
  context.fillText(String(match.p1).padStart(2, '0'), WIDTH / 2 - 75, 88)
  context.fillText(String(match.p2).padStart(2, '0'), WIDTH / 2 + 75, 88)

  const ballSpeed = Math.hypot(match.ballVX, match.ballVY)
  if (ballSpeed > 180) {
    context.save()
    for (let index = 4; index > 0; index -= 1) {
      const trail = index / 5
      context.globalAlpha = (1 - trail) * Math.min(0.5, ballSpeed / 1100)
      context.fillStyle = '#d7b653'
      context.beginPath()
      context.arc(match.ballX - match.ballVX * trail * 0.014, match.ballY - match.ballVY * trail * 0.014, BALL_RADIUS * (1 - trail * 0.55), 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  context.fillStyle = match.leftFlash > 0 ? '#ffb08e' : '#ed705a'
  context.beginPath()
  context.roundRect(37, match.leftY, PADDLE_W, paddleHeight(match.p1Boost), 7)
  context.fill()
  context.fillStyle = match.rightFlash > 0 ? '#b5c7ff' : '#557de2'
  context.beginPath()
  context.roundRect(WIDTH - 37 - PADDLE_W, match.rightY, PADDLE_W, paddleHeight(match.p2Boost), 7)
  context.fill()

  if (match.p1Boost) {
    context.fillStyle = '#ed705a'
    context.font = '800 9px system-ui, sans-serif'
    context.textAlign = 'left'
    context.fillText(`${boostLabels[match.p1Boost]} ${Math.ceil(match.p1BoostTimer)}s`, 57, 36)
  }
  if (match.p2Boost) {
    context.fillStyle = '#557de2'
    context.font = '800 9px system-ui, sans-serif'
    context.textAlign = 'right'
    context.fillText(`${boostLabels[match.p2Boost]} ${Math.ceil(match.p2BoostTimer)}s`, WIDTH - 57, 36)
  }

  if (match.boostOrb) {
    const icon = match.boostOrb.type === 'stretch' ? '↕' : match.boostOrb.type === 'dash' ? '⚡' : '↝'
    context.save()
    context.shadowColor = '#b8f26d'
    context.shadowBlur = 18
    context.fillStyle = '#b8f26d'
    context.beginPath()
    context.arc(match.boostOrb.x, match.boostOrb.y, 14, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#25334a'
    context.font = '900 15px system-ui, sans-serif'
    context.fillText(icon, match.boostOrb.x, match.boostOrb.y + 5)
    context.restore()
  }

  if (match.rally >= 2) {
    context.fillStyle = '#557de2'
    context.font = '800 10px system-ui, sans-serif'
    context.fillText(`${rallyLabel} ×${match.rally}`, WIDTH / 2, HEIGHT - 22)
  }

  context.fillStyle = '#d7b653'
  context.beginPath()
  context.arc(match.ballX, match.ballY, BALL_RADIUS, 0, Math.PI * 2)
  context.fill()

  for (const particle of match.particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.duration)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, 2 + 2 * particle.life / particle.duration, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1

  if (match.pointTimer > 0 && match.lastPoint !== null) {
    context.save()
    context.globalAlpha = Math.min(1, match.pointTimer * 2)
    context.fillStyle = match.lastPoint === 0 ? '#ed705a' : '#557de2'
    context.font = '900 38px system-ui, sans-serif'
    context.fillText(pointLabel, WIDTH / 2, HEIGHT / 2 - 25)
    context.restore()
  }
}

function readName(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

function readRecords() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('playcove.paddle-duel.scores') ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((record): record is MatchRecord => {
      return typeof record === 'object' && record !== null && 'winner' in record && typeof record.winner === 'string' && 'final' in record && typeof record.final === 'string' && 'p1' in record && typeof record.p1 === 'string' && 'p2' in record && typeof record.p2 === 'string'
    }).slice(0, 5)
  } catch {
    return []
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    matchRule: 'DO 7 · PRZEWAGA 2', title: 'Zaczynamy mecz.', paused: 'Mecz wstrzymany',
    startTitle: 'Zagrajcie przy jednej klawiaturze.', winSuffix: 'wygrywa!', final: 'Wynik końcowy', goal: 'Do siedmiu punktów, z przewagą dwóch. Celuj krawędzią pałki; ruch przy odbiciu dodaje rotacji.',
    save: 'Zapisz wynik', resume: 'Wznów mecz', rematch: 'Rewanż', start: 'Rozpocznij mecz',
    player: (number: number) => `Gracz ${number}`, up: 'w górę', down: 'w dół',
    scoreboard: 'HISTORIA MECZÓW', playerName: (number: number) => `IMIĘ GRACZA ${number}`,
    empty: 'Pierwszy mecz pojawi się tutaj.', local: 'ZAPISANO NA TYM URZĄDZENIU',
    point: 'PUNKT!', rally: 'SERIA', boostHelp: 'Uderz piłkę przez środek kortu, by zebrać bonus. Ruch pałki nadaje piłce rotację.',
    boosts: { stretch: 'DŁUGA', dash: 'SZYBKA', curve: 'ROTACJA' },
  } : {
    matchRule: 'FIRST TO 7 · WIN BY 2', title: 'Ready, set, rally.', paused: 'Match paused',
    startTitle: 'Two players. One keyboard.', winSuffix: 'wins!', final: 'Final score', goal: 'First to seven, win by two. Aim with the paddle edges; move at contact to add spin.',
    save: 'Save result', resume: 'Resume match', rematch: 'Rematch', start: 'Start match',
    player: (number: number) => `Player ${number}`, up: 'move up', down: 'move down',
    scoreboard: 'MATCH HISTORY', playerName: (number: number) => `PLAYER ${number} NAME`,
    empty: 'Your first match will show up here.', local: 'SAVED ON THIS DEVICE',
    point: 'POINT!', rally: 'RALLY', boostHelp: 'Send the ball through the center to collect a boost. Paddle movement adds spin to your return.',
    boosts: { stretch: 'STRETCH', dash: 'DASH', curve: 'CURVE' },
  }
  const p1Fallback = copy.player(1)
  const p2Fallback = copy.player(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [initialScene] = useState(createMatch)
  const matchRef = useRef(initialScene)
  const keysRef = useRef({ p1Up: false, p1Down: false, p2Up: false, p2Down: false })
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState({ p1: 0, p2: 0 })
  const [p1Name, setP1Name] = useState(p1Fallback)
  const [p2Name, setP2Name] = useState(p2Fallback)
  const [records, setRecords] = useState<MatchRecord[]>([])
  const [saved, setSaved] = useState(false)
  useEffect(() => { if (status === 'over') saveScore() }, [status])
  useGameSession(status, setStatus, startGame)

  useEffect(() => {
    setP1Name(readName('playcove.paddle-duel.player-1', p1Fallback))
    setP2Name(readName('playcove.paddle-duel.player-2', p2Fallback))
    setRecords(readRecords())
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const drawingContext = context

    if (status !== 'playing') {
      drawMatch(drawingContext, matchRef.current, copy.point, copy.rally, copy.boosts)
      return
    }

    const match = matchRef.current
    let animationFrame = 0
    let previousTime = 0

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) event.preventDefault()
      if (key === 'w') keysRef.current.p1Up = true
      if (key === 's') keysRef.current.p1Down = true
      if (key === 'arrowup') keysRef.current.p2Up = true
      if (key === 'arrowdown') keysRef.current.p2Down = true
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'w') keysRef.current.p1Up = false
      if (key === 's') keysRef.current.p1Down = false
      if (key === 'arrowup') keysRef.current.p2Up = false
      if (key === 'arrowdown') keysRef.current.p2Down = false
    }

    function resetBall(direction: number) {
      match.ballX = WIDTH / 2
      match.ballY = HEIGHT / 2
      match.speed = 250
      const angle = Math.random() > .5 ? 0.22 : -0.22
      match.ballVX = direction * match.speed * Math.cos(angle)
      match.ballVY = match.speed * Math.sin(angle)
      match.rally = 0
      match.p1Boost = null
      match.p2Boost = null
      match.p1BoostTimer = 0
      match.p2BoostTimer = 0
      match.lastHitter = direction < 0 ? 1 : 0
      match.boostOrb = null
      match.serveTimer = 0.62
      match.pointTimer = 0.78
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, .034)
      previousTime = time
      match.serveTimer = Math.max(0, match.serveTimer - delta)
      match.pointTimer = Math.max(0, match.pointTimer - delta)
      match.p1BoostTimer = Math.max(0, match.p1BoostTimer - delta)
      match.p2BoostTimer = Math.max(0, match.p2BoostTimer - delta)
      if (match.p1BoostTimer === 0) match.p1Boost = null
      if (match.p2BoostTimer === 0) match.p2Boost = null

      for (let index = match.particles.length - 1; index >= 0; index -= 1) {
        const particle = match.particles[index]
        particle.life -= delta
        if (particle.life <= 0) {
          match.particles.splice(index, 1)
        } else {
          particle.x += particle.vx * delta
          particle.y += particle.vy * delta
          particle.vx *= Math.max(0, 1 - 2.2 * delta)
          particle.vy *= Math.max(0, 1 - 2.2 * delta)
        }
      }
      match.leftFlash = Math.max(0, match.leftFlash - delta)
      match.rightFlash = Math.max(0, match.rightFlash - delta)

      const p1Height = paddleHeight(match.p1Boost)
      const p2Height = paddleHeight(match.p2Boost)
      const p1Speed = 385 * (match.p1Boost === 'dash' ? 1.5 : 1)
      const p2Speed = 385 * (match.p2Boost === 'dash' ? 1.5 : 1)
      const previousLeftY = match.leftY
      const previousRightY = match.rightY
      if (keysRef.current.p1Up) match.leftY -= p1Speed * delta
      if (keysRef.current.p1Down) match.leftY += p1Speed * delta
      if (keysRef.current.p2Up) match.rightY -= p2Speed * delta
      if (keysRef.current.p2Down) match.rightY += p2Speed * delta
      match.leftY = clamp(match.leftY, 32, HEIGHT - 32 - p1Height)
      match.rightY = clamp(match.rightY, 32, HEIGHT - 32 - p2Height)
      const p1Velocity = delta > 0 ? (match.leftY - previousLeftY) / delta : 0
      const p2Velocity = delta > 0 ? (match.rightY - previousRightY) / delta : 0

      if (match.serveTimer === 0) {
        const previousBallX = match.ballX
        match.ballX += match.ballVX * delta
        match.ballY += match.ballVY * delta
        if (match.ballY < 30 + BALL_RADIUS) {
          match.ballY = 30 + BALL_RADIUS
          match.ballVY = Math.abs(match.ballVY)
          addBurst(match, match.ballX, match.ballY, '#ffffff', 4)
        } else if (match.ballY > HEIGHT - 30 - BALL_RADIUS) {
          match.ballY = HEIGHT - 30 - BALL_RADIUS
          match.ballVY = -Math.abs(match.ballVY)
          addBurst(match, match.ballX, match.ballY, '#ffffff', 4)
        }

        if (match.boostOrb && Math.hypot(match.ballX - match.boostOrb.x, match.ballY - match.boostOrb.y) < BALL_RADIUS + 16) {
          grantBoost(match, match.lastHitter, match.boostOrb.type)
          addBurst(match, match.boostOrb.x, match.boostOrb.y, '#b8f26d', 12)
          match.boostOrb = null
        }

        const hitPaddle = (player: 0 | 1, paddleY: number, height: number, paddleVelocity: number, paddleSpeed: number) => {
          const offset = clamp((match.ballY - (paddleY + height / 2)) / (height / 2), -1, 1)
          const movement = clamp(paddleVelocity / paddleSpeed, -1, 1)
          const curve = player === 0 ? match.p1Boost === 'curve' : match.p2Boost === 'curve'
          match.speed = Math.min(720, match.speed + 22)
          const rebound = returnVelocity(offset, movement, match.speed, player === 0 ? 1 : -1, curve)
          match.ballVX = rebound.vx
          match.ballVY = rebound.vy
          match.rally += 1
          match.lastHitter = player
          if (player === 0) {
            match.ballX = 37 + PADDLE_W + BALL_RADIUS + 1
            match.leftFlash = 0.14
            addBurst(match, match.ballX - BALL_RADIUS, match.ballY, '#ffb08e', 7)
          } else {
            match.ballX = WIDTH - 37 - PADDLE_W - BALL_RADIUS - 1
            match.rightFlash = 0.14
            addBurst(match, match.ballX + BALL_RADIUS, match.ballY, '#b5c7ff', 7)
          }
          if (match.rally >= 2 && match.rally % 3 === 2 && !match.boostOrb) {
            const types: BoostType[] = ['stretch', 'dash', 'curve']
            match.boostOrb = { x: WIDTH / 2, y: [HEIGHT / 2 - 64, HEIGHT / 2, HEIGHT / 2 + 64][Math.floor((match.rally - 2) / 3) % 3], type: types[Math.floor((match.rally - 2) / 3) % types.length] }
          }
        }

        const leftPaddleX = 37 + PADDLE_W
        if (match.ballVX < 0 && match.ballX - BALL_RADIUS <= leftPaddleX && previousBallX - BALL_RADIUS >= leftPaddleX && match.ballY > match.leftY - BALL_RADIUS && match.ballY < match.leftY + p1Height + BALL_RADIUS) {
          hitPaddle(0, match.leftY, p1Height, p1Velocity, p1Speed)
        }
        const rightPaddleX = WIDTH - 37 - PADDLE_W
        if (match.ballVX > 0 && match.ballX + BALL_RADIUS >= rightPaddleX && previousBallX + BALL_RADIUS <= rightPaddleX && match.ballY > match.rightY - BALL_RADIUS && match.ballY < match.rightY + p2Height + BALL_RADIUS) {
          hitPaddle(1, match.rightY, p2Height, p2Velocity, p2Speed)
        }
      }

      if (match.ballX < 15) {
        match.p2 += 1
        match.lastPoint = 1
        match.pointTimer = 0.78
        match.serveTimer = 0.62
        match.boostOrb = null
        match.rally = 0
        match.speed = 250
        addBurst(match, 24, match.ballY, '#557de2', 18)
        setScore({ p1: match.p1, p2: match.p2 })
        if (matchWon(match.p2, match.p1)) {
          setStatus('over')
          drawMatch(drawingContext, match, copy.point, copy.rally, copy.boosts)
          return
        }
        resetBall(-1)
      } else if (match.ballX > WIDTH - 15) {
        match.p1 += 1
        match.lastPoint = 0
        match.pointTimer = 0.78
        match.serveTimer = 0.62
        match.boostOrb = null
        match.rally = 0
        match.speed = 250
        addBurst(match, WIDTH - 24, match.ballY, '#ed705a', 18)
        setScore({ p1: match.p1, p2: match.p2 })
        if (matchWon(match.p1, match.p2)) {
          setStatus('over')
          drawMatch(drawingContext, match, copy.point, copy.rally, copy.boosts)
          return
        }
        resetBall(1)
      }

      drawMatch(drawingContext, match, copy.point, copy.rally, copy.boosts)
      animationFrame = requestAnimationFrame(frame)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      keysRef.current = { p1Up: false, p1Down: false, p2Up: false, p2Down: false }
    }
  }, [status, locale])

  function startGame() {
    matchRef.current = createMatch()
    setScore({ p1: 0, p2: 0 })
    setSaved(false)
    setStatus('playing')
  }

  function saveScore() {
    if (saved) return
    const winner = score.p1 > score.p2 ? (p1Name.trim() || p1Fallback) : (p2Name.trim() || p2Fallback)
    const next = [{ winner, final: `${score.p1}–${score.p2}`, p1: p1Name.trim() || p1Fallback, p2: p2Name.trim() || p2Fallback }, ...records].slice(0, 5)
    try {
      localStorage.setItem('playcove.paddle-duel.player-1', p1Name.trim() || p1Fallback)
      localStorage.setItem('playcove.paddle-duel.player-2', p2Name.trim() || p2Fallback)
      localStorage.setItem('playcove.paddle-duel.scores', JSON.stringify(next))
    } catch { return }
    setRecords(next)
    setSaved(true)
  }

  function hold(player: 'p1' | 'p2', direction: 'up' | 'down', pressed: boolean) {
    if (player === 'p1' && direction === 'up') keysRef.current.p1Up = pressed
    if (player === 'p1' && direction === 'down') keysRef.current.p1Down = pressed
    if (player === 'p2' && direction === 'up') keysRef.current.p2Up = pressed
    if (player === 'p2' && direction === 'down') keysRef.current.p2Down = pressed
  }

  const winner = score.p1 > score.p2 ? (p1Name.trim() || p1Fallback) : (p2Name.trim() || p2Fallback)

  return (
    <div className={`module-game paddle-game${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.matchRule}</span><h2>{copy.title}</h2></div>
          <div className="paddle-scoreline"><span>{p1Name || p1Fallback}</span><strong>{score.p1} <i>:</i> {score.p2}</strong><span>{p2Name || p2Fallback}</span></div>
        </div>
        <div className="canvas-wrap paddle-canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Boisko Paddle Duel' : 'Paddle Duel play field'} />
          <GameOverlay status={status} locale={locale} title={status === 'over' ? `${winner} ${copy.winSuffix}` : status === 'paused' ? copy.paused : copy.startTitle} description={status === 'over' ? (locale === 'pl' ? 'Rewanż? Serwis zaczyna nową wymianę, bonusy zdobywacie od nowa.' : 'Rematch? A fresh serve, fresh boosts, and another chance to settle it.') : copy.goal} actionLabel={status === 'paused' ? copy.resume : status === 'over' ? copy.rematch : copy.start} onAction={status === 'paused' ? () => setStatus('playing') : startGame} result={{ value: `${score.p1}–${score.p2}`, label: `${winner} ${copy.winSuffix}`, saved, stats: [{ label: p1Name || p1Fallback, value: score.p1 }, { label: p2Name || p2Fallback, value: score.p2 }] }} />
        </div>
        <div className="paddle-touch-controls">
          <div className="touch-player touch-p1"><span>{copy.player(1).toUpperCase()}</span><button aria-label={`${copy.player(1)} ${copy.up}`} onPointerDown={() => hold('p1', 'up', true)} onPointerUp={() => hold('p1', 'up', false)} onPointerCancel={() => hold('p1', 'up', false)} onPointerLeave={() => hold('p1', 'up', false)}>↑</button><button aria-label={`${copy.player(1)} ${copy.down}`} onPointerDown={() => hold('p1', 'down', true)} onPointerUp={() => hold('p1', 'down', false)} onPointerCancel={() => hold('p1', 'down', false)} onPointerLeave={() => hold('p1', 'down', false)}>↓</button></div>
          <span className="touch-vs">VS</span>
          <div className="touch-player touch-p2"><span>{copy.player(2).toUpperCase()}</span><button aria-label={`${copy.player(2)} ${copy.up}`} onPointerDown={() => hold('p2', 'up', true)} onPointerUp={() => hold('p2', 'up', false)} onPointerCancel={() => hold('p2', 'up', false)} onPointerLeave={() => hold('p2', 'up', false)}>↑</button><button aria-label={`${copy.player(2)} ${copy.down}`} onPointerDown={() => hold('p2', 'down', true)} onPointerUp={() => hold('p2', 'down', false)} onPointerCancel={() => hold('p2', 'down', false)} onPointerLeave={() => hold('p2', 'down', false)}>↓</button></div>
        </div>
        <div className="module-controls-caption"><span>{copy.player(1).toUpperCase()} <kbd>W</kbd> <kbd>S</kbd></span><i /> <span>{copy.player(2).toUpperCase()} <kbd>↑</kbd> <kbd>↓</kbd></span></div>
        <p className="game-boost-note">{copy.boostHelp}</p>
      </div>
      <aside className="game-scoreboard">
        <div className="scoreboard-heading"><span className="game-small-label">{copy.scoreboard}</span><span className="scoreboard-star">✳</span></div>
        <label className="game-field"><span>{copy.playerName(1)}</span><input value={p1Name} maxLength={14} onChange={(event) => setP1Name(event.target.value)} /></label>
        <label className="game-field"><span>{copy.playerName(2)}</span><input value={p2Name} maxLength={14} onChange={(event) => setP2Name(event.target.value)} /></label>
        <div className="scoreboard-rule" />
        <div className="scoreboard-list">
          {records.length ? records.map((record, index) => (
            <div className="match-log-row" key={`${record.winner}-${record.final}-${index}`}><span className="match-log-rank">{String(index + 1).padStart(2, '0')}</span><span><strong>{record.winner}</strong><small>{record.p1} vs {record.p2}</small></span><b>{record.final}</b></div>
          )) : <p className="scoreboard-empty">{copy.empty}</p>}
        </div>
        <div className="scoreboard-foot">{copy.local}</div>
      </aside>
    </div>
  )
}
