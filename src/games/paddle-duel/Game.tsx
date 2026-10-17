import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type MatchRecord = { winner: string; final: string; p1: string; p2: string }
type Match = { ballX: number; ballY: number; ballVX: number; ballVY: number; leftY: number; rightY: number; p1: number; p2: number }

const WIDTH = 800
const HEIGHT = 440
const PADDLE_W = 13
const PADDLE_H = 86
const WIN_SCORE = 5

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
  }
}

function drawMatch(context: CanvasRenderingContext2D, match: Match) {
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

  context.fillStyle = '#ed705a'
  context.beginPath()
  context.roundRect(37, match.leftY, PADDLE_W, PADDLE_H, 7)
  context.fill()
  context.fillStyle = '#557de2'
  context.beginPath()
  context.roundRect(WIDTH - 37 - PADDLE_W, match.rightY, PADDLE_W, PADDLE_H, 7)
  context.fill()
  context.fillStyle = '#d7b653'
  context.beginPath()
  context.arc(match.ballX, match.ballY, 9, 0, Math.PI * 2)
  context.fill()
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
    firstToFive: 'DO PIĘCIU PUNKTÓW', title: 'Zaczynamy mecz.', paused: 'Mecz wstrzymany',
    startTitle: 'Zagrajcie przy jednej klawiaturze.', winSuffix: 'wygrywa!', final: 'Wynik końcowy', goal: 'Wygrywa osoba, która pierwsza zdobędzie pięć punktów.',
    save: 'Zapisz wynik', resume: 'Wznów mecz', rematch: 'Rewanż', start: 'Rozpocznij mecz',
    player: (number: number) => `Gracz ${number}`, up: 'w górę', down: 'w dół',
    scoreboard: 'HISTORIA MECZÓW', playerName: (number: number) => `IMIĘ GRACZA ${number}`,
    empty: 'Pierwszy mecz pojawi się tutaj.', local: 'ZAPISANO NA TYM URZĄDZENIU',
  } : {
    firstToFive: 'FIRST TO FIVE', title: 'Ready, set, rally.', paused: 'Match paused',
    startTitle: 'Two players. One keyboard.', winSuffix: 'wins!', final: 'Final score', goal: 'First player to five points wins.',
    save: 'Save result', resume: 'Resume match', rematch: 'Rematch', start: 'Start match',
    player: (number: number) => `Player ${number}`, up: 'move up', down: 'move down',
    scoreboard: 'MATCH HISTORY', playerName: (number: number) => `PLAYER ${number} NAME`,
    empty: 'Your first match will show up here.', local: 'SAVED ON THIS DEVICE',
  }
  const p1Fallback = copy.player(1)
  const p2Fallback = copy.player(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const matchRef = useRef<Match>(createMatch())
  const keysRef = useRef({ p1Up: false, p1Down: false, p2Up: false, p2Down: false })
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState({ p1: 0, p2: 0 })
  const [p1Name, setP1Name] = useState(p1Fallback)
  const [p2Name, setP2Name] = useState(p2Fallback)
  const [records, setRecords] = useState<MatchRecord[]>([])
  const [saved, setSaved] = useState(false)

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
      drawMatch(drawingContext, matchRef.current)
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
      if (event.key === 'Escape') setStatus('paused')
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
      match.ballVX = direction * 250
      match.ballVY = Math.random() > .5 ? 130 : -130
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, .034)
      previousTime = time
      const paddleSpeed = 385
      if (keysRef.current.p1Up) match.leftY -= paddleSpeed * delta
      if (keysRef.current.p1Down) match.leftY += paddleSpeed * delta
      if (keysRef.current.p2Up) match.rightY -= paddleSpeed * delta
      if (keysRef.current.p2Down) match.rightY += paddleSpeed * delta
      match.leftY = Math.max(32, Math.min(HEIGHT - 32 - PADDLE_H, match.leftY))
      match.rightY = Math.max(32, Math.min(HEIGHT - 32 - PADDLE_H, match.rightY))

      match.ballX += match.ballVX * delta
      match.ballY += match.ballVY * delta
      if (match.ballY < 30 || match.ballY > HEIGHT - 30) match.ballVY *= -1

      const leftPaddleX = 37 + PADDLE_W
      if (match.ballVX < 0 && match.ballX - 9 < leftPaddleX && match.ballX > leftPaddleX - 18 && match.ballY > match.leftY - 6 && match.ballY < match.leftY + PADDLE_H + 6) {
        const offset = (match.ballY - (match.leftY + PADDLE_H / 2)) / (PADDLE_H / 2)
        match.ballVX = Math.abs(match.ballVX) * 1.045
        match.ballVY = offset * 285
      }
      const rightPaddleX = WIDTH - 37 - PADDLE_W
      if (match.ballVX > 0 && match.ballX + 9 > rightPaddleX && match.ballX < rightPaddleX + PADDLE_W + 18 && match.ballY > match.rightY - 6 && match.ballY < match.rightY + PADDLE_H + 6) {
        const offset = (match.ballY - (match.rightY + PADDLE_H / 2)) / (PADDLE_H / 2)
        match.ballVX = -Math.abs(match.ballVX) * 1.045
        match.ballVY = offset * 285
      }

      if (match.ballX < 15) {
        match.p2 += 1
        setScore({ p1: match.p1, p2: match.p2 })
        if (match.p2 >= WIN_SCORE) {
          setStatus('over')
          drawMatch(drawingContext, match)
          return
        }
        resetBall(-1)
      } else if (match.ballX > WIDTH - 15) {
        match.p1 += 1
        setScore({ p1: match.p1, p2: match.p2 })
        if (match.p1 >= WIN_SCORE) {
          setStatus('over')
          drawMatch(drawingContext, match)
          return
        }
        resetBall(1)
      }

      drawMatch(drawingContext, match)
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
  }, [status])

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
    localStorage.setItem('playcove.paddle-duel.player-1', p1Name.trim() || p1Fallback)
    localStorage.setItem('playcove.paddle-duel.player-2', p2Name.trim() || p2Fallback)
    localStorage.setItem('playcove.paddle-duel.scores', JSON.stringify(next))
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
    <div className="module-game paddle-game">
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.firstToFive}</span><h2>{copy.title}</h2></div>
          <div className="paddle-scoreline"><span>{p1Name || p1Fallback}</span><strong>{score.p1} <i>:</i> {score.p2}</strong><span>{p2Name || p2Fallback}</span></div>
        </div>
        <div className="canvas-wrap paddle-canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Boisko Paddle Duel' : 'Paddle Duel play field'} />
          {status !== 'playing' && (
            <div className="game-overlay">
              <span className="overlay-spark">{status === 'over' ? '✦' : '↔'}</span>
              <strong>{status === 'over' ? `${winner} ${copy.winSuffix}` : status === 'paused' ? copy.paused : copy.startTitle}</strong>
              <span>{status === 'over' ? `${copy.final}: ${score.p1}–${score.p2}` : copy.goal}</span>
              {status === 'over' && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}
              <button className="game-button" onClick={status === 'paused' ? () => setStatus('playing') : startGame}>{status === 'paused' ? copy.resume : status === 'over' ? copy.rematch : copy.start} <span>→</span></button>
            </div>
          )}
        </div>
        <div className="paddle-touch-controls">
          <div className="touch-player touch-p1"><span>{copy.player(1).toUpperCase()}</span><button aria-label={`${copy.player(1)} ${copy.up}`} onPointerDown={() => hold('p1', 'up', true)} onPointerUp={() => hold('p1', 'up', false)} onPointerCancel={() => hold('p1', 'up', false)} onPointerLeave={() => hold('p1', 'up', false)}>↑</button><button aria-label={`${copy.player(1)} ${copy.down}`} onPointerDown={() => hold('p1', 'down', true)} onPointerUp={() => hold('p1', 'down', false)} onPointerCancel={() => hold('p1', 'down', false)} onPointerLeave={() => hold('p1', 'down', false)}>↓</button></div>
          <span className="touch-vs">VS</span>
          <div className="touch-player touch-p2"><span>{copy.player(2).toUpperCase()}</span><button aria-label={`${copy.player(2)} ${copy.up}`} onPointerDown={() => hold('p2', 'up', true)} onPointerUp={() => hold('p2', 'up', false)} onPointerCancel={() => hold('p2', 'up', false)} onPointerLeave={() => hold('p2', 'up', false)}>↑</button><button aria-label={`${copy.player(2)} ${copy.down}`} onPointerDown={() => hold('p2', 'down', true)} onPointerUp={() => hold('p2', 'down', false)} onPointerCancel={() => hold('p2', 'down', false)} onPointerLeave={() => hold('p2', 'down', false)}>↓</button></div>
        </div>
        <div className="module-controls-caption"><span>{copy.player(1).toUpperCase()} <kbd>W</kbd> <kbd>S</kbd></span><i /> <span>{copy.player(2).toUpperCase()} <kbd>↑</kbd> <kbd>↓</kbd></span></div>
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
