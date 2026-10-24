import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type Mode = 'bot' | 'local'
type LevelId = 'practice' | 'coast' | 'rooftop'
type ShotAim = 'lob' | 'drive' | 'ground'
type Player = { x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean; kickTimer: number; kickCooldown: number; kickBuffer: number; aim: ShotAim }
type Ball = { x: number; y: number; vx: number; vy: number; rotation: number; kickFlash: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; duration: number; color: string }
type Match = { players: [Player, Player]; ball: Ball; score: [number, number]; resetTimer: number; particles: Particle[] }
type MatchRecord = { winner: string; final: string; level: string; mode: string }

const WIDTH = 900
const HEIGHT = 500
const GROUND = 426
const PLAYER_WIDTH = 32
const PLAYER_HEIGHT = 72
const BALL_RADIUS = 12
const WIN_SCORE = 3
const GRAVITY = 1450
const GOAL_INSET = 20
const GOAL_WIDTH = 112
const GOAL_TOP = 226
const LEVEL_IDS: LevelId[] = ['practice', 'coast', 'rooftop']

const arenas: Record<LevelId, { sky: string; ground: string; light: string; wind: number; gusts: boolean }> = {
  practice: { sky: '#b9e2f1', ground: '#7fbd5d', light: '#eff8dd', wind: 0, gusts: false },
  coast: { sky: '#9bd5df', ground: '#72b675', light: '#f5efcf', wind: 150, gusts: true },
  rooftop: { sky: '#64749c', ground: '#819063', light: '#f1d68e', wind: 235, gusts: true },
}

function createPlayer(x: number, facing: number): Player {
  return { x, y: GROUND - PLAYER_HEIGHT, vx: 0, vy: 0, facing, grounded: true, kickTimer: 0, kickCooldown: 0, kickBuffer: 0, aim: 'drive' }
}

function createMatch(): Match {
  return {
    players: [createPlayer(218, 1), createPlayer(682, -1)],
    ball: { x: WIDTH / 2, y: GROUND - 152, vx: 115, vy: -130, rotation: 0, kickFlash: 0 },
    score: [0, 0],
    resetTimer: 0,
    particles: [],
  }
}

function windAt(time: number, level: LevelId) {
  const arena = arenas[level]
  if (arena.wind === 0) return 0
  const gust = Math.sin(time / 1300) * 0.55 + Math.sin(time / 510) * 0.3
  return level === 'coast' ? gust * arena.wind : arena.wind * 0.55 + gust * arena.wind * 0.45
}

function shotProfile(player: Player) {
  return {
    horizontal: player.aim === 'lob' ? 610 : player.aim === 'ground' ? 780 : 665,
    vertical: player.aim === 'lob' ? -470 + Math.min(0, player.vy * 0.08) : player.aim === 'ground' ? -120 : -255,
  }
}

function drawGoal(context: CanvasRenderingContext2D, side: 'left' | 'right') {
  const x = side === 'left' ? GOAL_INSET : WIDTH - GOAL_INSET - GOAL_WIDTH
  const openingTop = GOAL_TOP
  context.fillStyle = 'rgba(255,255,255,.12)'
  context.fillRect(x, openingTop, GOAL_WIDTH, GROUND - openingTop)
  context.strokeStyle = 'rgba(255,255,255,.82)'
  context.lineWidth = 7
  context.beginPath()
  context.moveTo(x, openingTop)
  context.lineTo(x, GROUND)
  context.lineTo(x + GOAL_WIDTH, GROUND)
  context.moveTo(x, openingTop)
  context.lineTo(x + GOAL_WIDTH, openingTop)
  context.stroke()
  context.strokeStyle = 'rgba(255,255,255,.32)'
  context.lineWidth = 1
  for (let netX = x + 10; netX < x + GOAL_WIDTH; netX += 10) {
    context.beginPath()
    context.moveTo(netX, openingTop + 3)
    context.lineTo(netX, GROUND - 3)
    context.stroke()
  }
  for (let netY = openingTop + 14; netY < GROUND; netY += 14) {
    context.beginPath()
    context.moveTo(x + 2, netY)
    context.lineTo(x + GOAL_WIDTH - 2, netY)
    context.stroke()
  }
}

function drawPlayer(context: CanvasRenderingContext2D, player: Player, ball: Ball, color: string, time: number, wind: number) {
  const bob = player.grounded && Math.abs(player.vx) > 12 ? Math.sin(time / 55) * 2 : 0
  const x = player.x
  const y = player.y + bob
  const legSwing = player.grounded && Math.abs(player.vx) > 12 ? Math.sin(time / 45) * 7 : 0
  const footX = x + player.facing * (PLAYER_WIDTH / 2 + 12)
  const footY = y + 56
  const hasBallInRange = (ball.x - player.x) * player.facing >= 6 && Math.hypot(ball.x - footX, ball.y - footY) <= 62

  context.fillStyle = '#263447'
  context.beginPath()
  context.roundRect(x - 16, y + 46, 32, 15, 5)
  context.fill()
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x - 15, y + 25, 30, 30, 9)
  context.fill()

  if (player.aim !== 'drive' || hasBallInRange) {
    const startX = hasBallInRange ? player.x + player.facing * (PLAYER_WIDTH / 2 + BALL_RADIUS + 2) : footX
    const startY = hasBallInRange ? ball.y : footY
    const profile = shotProfile(player)
    const velocityX = player.facing * profile.horizontal + player.vx * 0.35
    const gravity = GRAVITY * 0.56
    context.fillStyle = player.aim === 'lob' ? 'rgba(255,255,255,.82)' : 'rgba(255,246,179,.82)'
    for (let index = 1; index <= 7; index += 1) {
      const flight = index * 0.11
      const projectedX = startX + velocityX * flight + wind * flight * flight * 0.5
      const projectedY = startY + profile.vertical * flight + gravity * flight * flight * 0.5
      context.globalAlpha = 1 - index * 0.085
      context.beginPath()
      context.arc(projectedX, projectedY, 2 + (7 - index) * 0.32, 0, Math.PI * 2)
      context.fill()
    }
    context.globalAlpha = 1
  }

  context.strokeStyle = '#e7b58b'
  context.lineWidth = 8
  context.beginPath()
  context.moveTo(x - 12, y + 31)
  context.lineTo(x - 19, y + 47)
  context.moveTo(x + 12, y + 31)
  context.lineTo(x + 19, y + 47)
  context.stroke()

  context.strokeStyle = '#263447'
  context.lineWidth = 9
  context.lineCap = 'round'
  context.beginPath()
  if (player.kickTimer > 0) {
    context.moveTo(x - player.facing * 5, y + 59)
    context.lineTo(x - player.facing * 7, y + 69)
    context.moveTo(x + player.facing * 5, y + 59)
    context.lineTo(x + player.facing * 14, y + 53)
    context.lineTo(x + player.facing * 28, y + 49)
  } else {
    context.moveTo(x - 5, y + 59)
    context.lineTo(x - 7 - legSwing, y + 69)
    context.moveTo(x + 5, y + 59)
    context.lineTo(x + 7 + legSwing, y + 69)
  }
  context.stroke()

  context.fillStyle = '#e7b58b'
  context.beginPath()
  context.arc(x, y + 13, 12, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#29354b'
  context.beginPath()
  context.arc(x, y + 7, 12, Math.PI, Math.PI * 2)
  context.fill()
  context.fillStyle = '#263447'
  context.beginPath()
  context.arc(x + player.facing * 4, y + 13, 1.6, 0, Math.PI * 2)
  context.fill()
}

function drawScene(context: CanvasRenderingContext2D, match: Match, level: LevelId, time: number, goalLabel: string) {
  const arena = arenas[level]
  const wind = windAt(time, level)
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = arena.sky
  context.fillRect(0, 0, WIDTH, GROUND)

  if (level === 'rooftop') {
    context.fillStyle = 'rgba(31,42,68,.3)'
    for (let index = 0; index < 10; index += 1) {
      const width = 36 + (index % 3) * 14
      const height = 45 + (index % 4) * 18
      context.fillRect(index * 98, GROUND - height, width, height)
    }
  } else {
    context.fillStyle = 'rgba(255,255,255,.55)'
    context.beginPath()
    context.ellipse(171, 102, 48, 12, 0, 0, Math.PI * 2)
    context.ellipse(205, 100, 36, 16, 0, 0, Math.PI * 2)
    context.ellipse(232, 105, 27, 10, 0, 0, Math.PI * 2)
    context.fill()
    context.beginPath()
    context.ellipse(713, 153, 42, 10, 0, 0, Math.PI * 2)
    context.ellipse(747, 151, 29, 15, 0, 0, Math.PI * 2)
    context.fill()
  }

  context.fillStyle = arena.light
  context.beginPath()
  context.arc(level === 'rooftop' ? 758 : 110, level === 'rooftop' ? 80 : 73, 27, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = arena.ground
  context.fillRect(0, GROUND, WIDTH, HEIGHT - GROUND)
  for (let stripe = 0; stripe < 9; stripe += 1) {
    context.fillStyle = stripe % 2 ? 'rgba(255,255,255,.035)' : 'rgba(28,78,44,.045)'
    context.fillRect(stripe * 100, GROUND, 100, HEIGHT - GROUND)
  }
  context.strokeStyle = 'rgba(255,255,255,.54)'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(0, GROUND)
  context.lineTo(WIDTH, GROUND)
  context.stroke()
  context.beginPath()
  context.moveTo(WIDTH / 2, GROUND + 2)
  context.lineTo(WIDTH / 2, HEIGHT)
  context.stroke()
  context.beginPath()
  context.arc(WIDTH / 2, GROUND + 2, 64, 0, Math.PI)
  context.stroke()

  drawGoal(context, 'left')
  drawGoal(context, 'right')

  if (Math.abs(wind) > 10) {
    context.strokeStyle = 'rgba(255,255,255,.58)'
    context.lineWidth = 2
    for (let index = 0; index < 7; index += 1) {
      const y = 155 + index * 22
      const drift = (time / 12 + index * 97) % 112
      const x = wind > 0 ? drift - 112 : WIDTH - drift
      const length = 22 + Math.abs(wind) * 0.12
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + Math.sign(wind) * length, y)
      context.stroke()
    }
  }

  const ballSpeed = Math.hypot(match.ball.vx, match.ball.vy)
  if (ballSpeed > 190) {
    context.save()
    for (let index = 4; index > 0; index -= 1) {
      const trail = index / 5
      context.globalAlpha = (1 - trail) * Math.min(0.5, ballSpeed / 1500)
      context.fillStyle = '#fffdf0'
      context.beginPath()
      context.arc(match.ball.x - match.ball.vx * trail * 0.014, match.ball.y - match.ball.vy * trail * 0.014, BALL_RADIUS * (1 - trail * 0.55), 0, Math.PI * 2)
      context.fill()
    }
    context.restore()
  }

  context.fillStyle = 'rgba(25,39,54,.2)'
  context.beginPath()
  context.ellipse(match.ball.x, GROUND - 2, 17, 4, 0, 0, Math.PI * 2)
  context.fill()

  drawPlayer(context, match.players[0], match.ball, '#f36d4e', time, wind)
  drawPlayer(context, match.players[1], match.ball, '#4f72dd', time, wind)

  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(match.ball.x, match.ball.y, BALL_RADIUS, 0, Math.PI * 2)
  context.fill()
  if (match.ball.kickFlash > 0) {
    context.strokeStyle = `rgba(255,255,255,${Math.min(1, match.ball.kickFlash * 7)})`
    context.lineWidth = 3
    context.beginPath()
    context.arc(match.ball.x, match.ball.y, BALL_RADIUS + (0.16 - match.ball.kickFlash) * 48, 0, Math.PI * 2)
    context.stroke()
  }
  context.strokeStyle = 'rgba(32,44,54,.48)'
  context.lineWidth = 1.5
  context.beginPath()
  context.arc(match.ball.x, match.ball.y, BALL_RADIUS, 0, Math.PI * 2)
  context.stroke()
  context.fillStyle = '#263446'
  context.beginPath()
  context.save()
  context.translate(match.ball.x, match.ball.y)
  context.rotate(match.ball.rotation)
  context.arc(0, 0, 4.2, 0, Math.PI * 2)
  context.fill()
  for (let index = 0; index < 5; index += 1) {
    const angle = index * Math.PI * 2 / 5
    context.beginPath()
    context.arc(Math.cos(angle) * 7.2, Math.sin(angle) * 7.2, 2.3, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()

  for (const particle of match.particles) {
    context.globalAlpha = Math.max(0, particle.life / particle.duration)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, 2.5 + 2 * particle.life / particle.duration, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1

  if (match.resetTimer > 0) {
    context.save()
    context.globalAlpha = Math.min(1, match.resetTimer * 2)
    context.fillStyle = '#fffdf0'
    context.shadowColor = 'rgba(31,48,36,.28)'
    context.shadowBlur = 16
    context.font = '900 48px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(goalLabel, WIDTH / 2, 202)
    context.restore()
  }
}

function addBurst(match: Match, x: number, y: number, color: string, count: number) {
  for (let index = 0; index < count; index += 1) {
    const angle = (Math.PI * 2 * index) / count
    const speed = 85 + (index % 3) * 45
    match.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 25, life: 0.34, duration: 0.34, color })
  }
}

function limitBallSpeed(ball: Ball) {
  const speed = Math.hypot(ball.vx, ball.vy)
  const maxSpeed = 1050
  if (speed <= maxSpeed) return
  ball.vx = ball.vx / speed * maxSpeed
  ball.vy = ball.vy / speed * maxSpeed
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
    const parsed: unknown = JSON.parse(localStorage.getItem('playcove.soccer-duel.scores') ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((record): record is MatchRecord => {
      return typeof record === 'object' && record !== null && 'winner' in record && typeof record.winner === 'string' && 'final' in record && typeof record.final === 'string' && 'level' in record && typeof record.level === 'string' && 'mode' in record && typeof record.mode === 'string'
    }).slice(0, 5)
  } catch {
    return []
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    mode: 'TRYB', botMode: 'Gra z botem', localMode: '2 graczy', level: 'WYBIERZ BOISKO', kickoff: 'ROZGRYWKA DO 3 GOLI',
    levels: {
      practice: { name: 'Boisko', detail: 'Spokojne powietrze', wind: 'BEZ WIATRU' },
      coast: { name: 'Wybrzeże', detail: 'Zmienne podmuchy', wind: 'PORYWY' },
      rooftop: { name: 'Dach', detail: 'Silny boczny wiatr', wind: 'SILNY WIATR' },
    },
    player: (number: number) => `Gracz ${number}`, bot: 'Bot', name: (number: number) => `IMIĘ GRACZA ${number}`,
    heading: 'Mecz do trzech goli', ready: 'Gotowi na mecz?', readyDetail: 'Przytrzymaj W dla loba lub S dla niskiego strzału. Kropki pokazują tor; strzał zapamięta się tuż przed kontaktem z piłką.', goal: 'GOL!',
    paused: 'Mecz wstrzymany', pause: 'Pauza', over: 'Koniec meczu', score: 'WYNIK', wind: 'WIATR',
    start: 'Rozpocznij mecz', resume: 'Wznów mecz', rematch: 'Rewanż', save: 'Zapisz wynik',
    history: 'HISTORIA MECZÓW', empty: 'Zapisane wyniki pojawią się tutaj.', local: 'ZAPISANO NA TYM URZĄDZENIU',
    p1Controls: 'GRACZ 1', p2Controls: 'GRACZ 2', move: 'RUCH', jump: 'SKOK', kick: 'STRZAŁ', low: 'NISKO',
    aimHintBot: 'W + SPACJA: LOB · S + SPACJA: NISKO · KROPKI POKAZUJĄ TOR', aimHintLocal: 'P1: W + SPACJA LOB · S + SPACJA NISKO  |  P2: ↑ + ENTER LOB · ↓ + ENTER NISKO',
    touchAimHintBot: 'Przytrzymaj ↑ dla loba lub ↓ dla niskiego strzału, potem STRZAŁ. Kropki pokazują tor.', touchAimHintLocal: 'P1 i P2: ↑ + STRZAŁ lobuje · ↓ + STRZAŁ uderza nisko. Kropki pokazują tor.',
  } : {
    mode: 'MODE', botMode: 'Vs bot', localMode: '2 players', level: 'CHOOSE AN ARENA', kickoff: 'FIRST TO 3 GOALS',
    levels: {
      practice: { name: 'Training Ground', detail: 'Calm air', wind: 'NO WIND' },
      coast: { name: 'Windy Coast', detail: 'Changing gusts', wind: 'GUSTY' },
      rooftop: { name: 'Rooftop', detail: 'Strong crosswind', wind: 'STRONG WIND' },
    },
    player: (number: number) => `Player ${number}`, bot: 'Bot', name: (number: number) => `PLAYER ${number} NAME`,
    heading: 'First to three goals', ready: 'Ready for kickoff?', readyDetail: 'Hold W for a lob or S for a low shot. Dots preview the flight; kicks buffer briefly before ball contact.', goal: 'GOAL!',
    paused: 'Match paused', pause: 'Pause', over: 'Full time', score: 'SCORE', wind: 'WIND',
    start: 'Start match', resume: 'Resume match', rematch: 'Rematch', save: 'Save result',
    history: 'MATCH HISTORY', empty: 'Saved results will show up here.', local: 'SAVED ON THIS DEVICE',
    p1Controls: 'PLAYER 1', p2Controls: 'PLAYER 2', move: 'MOVE', jump: 'JUMP', kick: 'KICK', low: 'LOW',
    aimHintBot: 'W + SPACE: LOB · S + SPACE: LOW · DOTS PREVIEW FLIGHT', aimHintLocal: 'P1: W + SPACE LOB · S + SPACE LOW  |  P2: ↑ + ENTER LOB · ↓ + ENTER LOW',
    touchAimHintBot: 'Hold ↑ for a lob or ↓ for a low shot, then tap KICK. Dots preview flight.', touchAimHintLocal: 'P1 and P2: hold ↑ + KICK for a lob · ↓ + KICK for low. Dots preview flight.',
  }

  const fallbackP1 = copy.player(1)
  const fallbackP2 = copy.player(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const matchRef = useRef<Match>(createMatch())
  const inputRef = useRef({ p1Left: false, p1Right: false, p1Jump: false, p1AimUp: false, p1AimDown: false, p1Kick: false, p2Left: false, p2Right: false, p2Jump: false, p2AimUp: false, p2AimDown: false, p2Kick: false })
  const [mode, setMode] = useState<Mode>('bot')
  const [level, setLevel] = useState<LevelId>('practice')
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState<[number, number]>([0, 0])
  const [wind, setWind] = useState(0)
  const [p1Name, setP1Name] = useState(fallbackP1)
  const [p2Name, setP2Name] = useState(fallbackP2)
  const [records, setRecords] = useState<MatchRecord[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setP1Name(readName('playcove.soccer-duel.player-1', fallbackP1))
    setP2Name(readName('playcove.soccer-duel.player-2', fallbackP2))
    setRecords(readRecords())
  }, [fallbackP1, fallbackP2])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!context) return
    const drawingContext = context
    const match = matchRef.current

    if (status !== 'playing') {
      drawScene(drawingContext, match, level, performance.now(), copy.goal)
      return
    }

    let animationFrame = 0
    let previousTime = 0
    let previousWindUpdate = 0

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (key.startsWith('arrow') || key === ' ' || ['a', 'd', 'w', 's'].includes(key)) event.preventDefault()
      if (key === 'a') inputRef.current.p1Left = true
      if (key === 'd') inputRef.current.p1Right = true
      if (key === 'w') inputRef.current.p1AimUp = true
      if (key === 's') inputRef.current.p1AimDown = true
      if (key === 'w' && !event.repeat) inputRef.current.p1Jump = true
      if (event.code === 'Space' && !event.repeat) inputRef.current.p1Kick = true
      if (mode === 'local') {
        if (key === 'arrowleft') inputRef.current.p2Left = true
        if (key === 'arrowright') inputRef.current.p2Right = true
        if (key === 'arrowup') inputRef.current.p2AimUp = true
        if (key === 'arrowdown') inputRef.current.p2AimDown = true
        if (key === 'arrowup' && !event.repeat) inputRef.current.p2Jump = true
        if (event.code === 'Enter' && !event.repeat) inputRef.current.p2Kick = true
      }
      if (event.key === 'Escape') setStatus('paused')
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'a') inputRef.current.p1Left = false
      if (key === 'd') inputRef.current.p1Right = false
      if (key === 'w') {
        inputRef.current.p1Jump = false
        inputRef.current.p1AimUp = false
      }
      if (key === 's') inputRef.current.p1AimDown = false
      if (key === 'arrowleft') inputRef.current.p2Left = false
      if (key === 'arrowright') inputRef.current.p2Right = false
      if (key === 'arrowup') {
        inputRef.current.p2Jump = false
        inputRef.current.p2AimUp = false
      }
      if (key === 'arrowdown') inputRef.current.p2AimDown = false
    }

    function applyPlayerInput(player: Player, left: boolean, right: boolean, jump: boolean, delta: number) {
      const direction = Number(right) - Number(left)
      const maxSpeed = 425
      if (direction !== 0) {
        player.facing = direction
        player.vx += (direction * maxSpeed - player.vx) * Math.min(1, 17 * delta)
      } else {
        player.vx *= Math.max(0, 1 - 11 * delta)
      }
      if (jump && player.grounded) {
        player.vy = -650
        player.grounded = false
      }
      player.x += player.vx * delta
      player.y += player.vy * delta
      player.vy += GRAVITY * delta
      if (player.y + PLAYER_HEIGHT >= GROUND) {
        player.y = GROUND - PLAYER_HEIGHT
        player.vy = 0
        player.grounded = true
      }
      player.x = Math.max(67, Math.min(WIDTH - 67, player.x))
    }

    function applyBotInput(player: Player, ball: Ball, delta: number) {
      const defendX = WIDTH * 0.73
      const chasing = ball.x > WIDTH * 0.43 || (ball.vx > 100 && ball.x > WIDTH * 0.34)
      const targetX = chasing ? Math.max(WIDTH * 0.54, Math.min(WIDTH * 0.9, ball.x + 44)) : defendX
      const direction = Math.abs(targetX - player.x) < 13 ? 0 : Math.sign(targetX - player.x)
      const jump = Math.abs(ball.x - player.x) < 138 && ball.y < player.y + 18 && ball.y > GROUND - 250
      player.aim = ball.y < player.y + 28 ? 'lob' : ball.y > GROUND - 62 ? 'ground' : 'drive'
      applyPlayerInput(player, direction < 0, direction > 0, jump && player.grounded, delta)
    }

    function collidePlayers(first: Player, second: Player) {
      const overlap = PLAYER_WIDTH - Math.abs(second.x - first.x)
      const verticalOverlap = Math.min(first.y + PLAYER_HEIGHT, second.y + PLAYER_HEIGHT) - Math.max(first.y, second.y)
      if (overlap <= 0 || verticalOverlap <= 0) return
      const direction = second.x >= first.x ? 1 : -1
      first.x -= overlap * 0.5 * direction
      second.x += overlap * 0.5 * direction
      const push = Math.max(26, Math.abs(first.vx - second.vx) * 0.24)
      first.vx -= direction * push
      second.vx += direction * push
      first.x = Math.max(67, first.x)
      second.x = Math.min(WIDTH - 67, second.x)
    }

    function collideBallWithPlayer(ball: Ball, player: Player) {
      const nearestX = Math.max(player.x - PLAYER_WIDTH / 2, Math.min(player.x + PLAYER_WIDTH / 2, ball.x))
      const nearestY = Math.max(player.y + 4, Math.min(player.y + PLAYER_HEIGHT - 3, ball.y))
      let dx = ball.x - nearestX
      let dy = ball.y - nearestY
      const distance = Math.hypot(dx, dy)
      if (distance >= BALL_RADIUS) return
      if (distance < 0.001) {
        dx = player.facing
        dy = -0.35
      }
      const normalLength = Math.hypot(dx, dy)
      const normalX = dx / normalLength
      const normalY = dy / normalLength
      ball.x = nearestX + normalX * (BALL_RADIUS + 0.5)
      ball.y = nearestY + normalY * (BALL_RADIUS + 0.5)
      const relativeVX = ball.vx - player.vx
      const relativeVY = ball.vy - player.vy
      const normalSpeed = relativeVX * normalX + relativeVY * normalY
      if (normalSpeed < 0) {
        ball.vx -= 1.65 * normalSpeed * normalX
        ball.vy -= 1.65 * normalSpeed * normalY
      }
      ball.vx += player.vx * 0.12
      ball.vy += player.vy * 0.12
      if (ball.vy > -75 && normalY < -0.25) ball.vy = -75
      limitBallSpeed(ball)
    }

    function kickBall(player: Player, ball: Ball, requested: boolean, color: string) {
      if (requested) player.kickBuffer = 0.16
      if (player.kickBuffer <= 0 || player.kickCooldown > 0) return

      const footX = player.x + player.facing * (PLAYER_WIDTH / 2 + 12)
      const footY = player.y + 56
      if ((ball.x - player.x) * player.facing < 6 || Math.hypot(ball.x - footX, ball.y - footY) > 62) return

      const profile = shotProfile(player)
      ball.x = player.x + player.facing * (PLAYER_WIDTH / 2 + BALL_RADIUS + 2)
      ball.vx = player.facing * profile.horizontal + player.vx * 0.35
      ball.vy = profile.vertical
      ball.kickFlash = 0.16
      player.kickTimer = 0.2
      player.kickCooldown = 0.32
      player.kickBuffer = 0
      addBurst(match, ball.x, ball.y, color, 12)
    }

    function resetKickoff(direction: number) {
      match.players[0] = createPlayer(218, 1)
      match.players[1] = createPlayer(682, -1)
      match.ball = { x: WIDTH / 2, y: GROUND - 140, vx: direction * 110, vy: -150, rotation: 0, kickFlash: 0 }
    }

    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.025)
      previousTime = time
      const ball = match.ball
      const [first, second] = match.players
      let matchEnded = false
      const p1Kick = inputRef.current.p1Kick
      const p2Kick = inputRef.current.p2Kick
      first.aim = inputRef.current.p1AimUp ? 'lob' : inputRef.current.p1AimDown ? 'ground' : 'drive'
      if (mode === 'local') second.aim = inputRef.current.p2AimUp ? 'lob' : inputRef.current.p2AimDown ? 'ground' : 'drive'
      inputRef.current.p1Kick = false
      inputRef.current.p2Kick = false
      match.ball.rotation += match.ball.vx * delta / 22
      match.ball.kickFlash = Math.max(0, match.ball.kickFlash - delta)
      for (let index = match.particles.length - 1; index >= 0; index -= 1) {
        const particle = match.particles[index]
        particle.life -= delta
        if (particle.life <= 0) {
          match.particles.splice(index, 1)
        } else {
          particle.x += particle.vx * delta
          particle.y += particle.vy * delta
          particle.vy += 400 * delta
          particle.vx *= Math.max(0, 1 - 2 * delta)
        }
      }

      if (match.resetTimer > 0) {
        match.resetTimer -= delta
      } else {
        for (const player of match.players) {
          player.kickTimer = Math.max(0, player.kickTimer - delta)
          player.kickCooldown = Math.max(0, player.kickCooldown - delta)
          player.kickBuffer = Math.max(0, player.kickBuffer - delta)
        }

        applyPlayerInput(first, inputRef.current.p1Left, inputRef.current.p1Right, inputRef.current.p1Jump, delta)
        inputRef.current.p1Jump = false

        if (mode === 'bot') {
          applyBotInput(second, ball, delta)
        } else {
          applyPlayerInput(second, inputRef.current.p2Left, inputRef.current.p2Right, inputRef.current.p2Jump, delta)
          inputRef.current.p2Jump = false
        }
        collidePlayers(first, second)

        const windForce = windAt(time, level)
        ball.vx += windForce * delta
        ball.vy += GRAVITY * 0.56 * delta
        ball.x += ball.vx * delta
        ball.y += ball.vy * delta

        if (ball.y < 24 + BALL_RADIUS) {
          ball.y = 24 + BALL_RADIUS
          ball.vy = Math.abs(ball.vy) * 0.72
        }
        if (ball.y + BALL_RADIUS > GROUND) {
          ball.y = GROUND - BALL_RADIUS
          if (Math.abs(ball.vy) > 95) ball.vy = -Math.abs(ball.vy) * 0.67
          else ball.vy = 0
          ball.vx *= 0.975
        }

        collideBallWithPlayer(ball, first)
        collideBallWithPlayer(ball, second)
        kickBall(first, ball, p1Kick, '#ffb08e')
        const botInKickRange = (ball.x - second.x) * second.facing >= 6 && Math.hypot(ball.x - (second.x + second.facing * (PLAYER_WIDTH / 2 + 12)), ball.y - (second.y + 56)) <= 48
        kickBall(second, ball, mode === 'bot' ? botInKickRange : p2Kick, '#b2c1ff')

        const insideGoalHeight = ball.y >= GOAL_TOP - BALL_RADIUS && ball.y < GROUND - BALL_RADIUS + 2
        const scoredOnLeft = ball.x < GOAL_INSET + GOAL_WIDTH && insideGoalHeight
        const scoredOnRight = ball.x > WIDTH - GOAL_INSET - GOAL_WIDTH && insideGoalHeight
        if (scoredOnLeft || scoredOnRight) {
          const scorer = scoredOnLeft ? 1 : 0
          match.score[scorer] += 1
          setScore([match.score[0], match.score[1]])
          addBurst(match, ball.x, ball.y, '#fff0a8', 24)
          if (match.score[scorer] >= WIN_SCORE) {
            setStatus('over')
            matchEnded = true
          } else {
            resetKickoff(scorer === 0 ? -1 : 1)
            match.resetTimer = 0.9
          }
        } else {
          if (ball.x < BALL_RADIUS + 12) {
            ball.x = BALL_RADIUS + 12
            ball.vx = Math.abs(ball.vx) * 0.78
          }
          if (ball.x > WIDTH - BALL_RADIUS - 12) {
            ball.x = WIDTH - BALL_RADIUS - 12
            ball.vx = -Math.abs(ball.vx) * 0.78
          }
        }
      }

      drawScene(drawingContext, match, level, time, copy.goal)
      if (time - previousWindUpdate > 180) {
        setWind(Math.round(windAt(time, level)))
        previousWindUpdate = time
      }
      if (!matchEnded) animationFrame = requestAnimationFrame(frame)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    animationFrame = requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      inputRef.current = { p1Left: false, p1Right: false, p1Jump: false, p1AimUp: false, p1AimDown: false, p1Kick: false, p2Left: false, p2Right: false, p2Jump: false, p2AimUp: false, p2AimDown: false, p2Kick: false }
    }
  }, [copy.goal, level, mode, status])

  function startMatch() {
    matchRef.current = createMatch()
    setScore([0, 0])
    setWind(0)
    setSaved(false)
    setStatus('playing')
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    matchRef.current = createMatch()
    setScore([0, 0])
    setSaved(false)
    setStatus('ready')
  }

  function selectLevel(nextLevel: LevelId) {
    setLevel(nextLevel)
    matchRef.current = createMatch()
    setScore([0, 0])
    setWind(0)
    setSaved(false)
    setStatus('ready')
  }

  function saveScore() {
    if (saved) return
    const firstName = p1Name.trim() || fallbackP1
    const secondName = mode === 'bot' ? copy.bot : p2Name.trim() || fallbackP2
    const winner = score[0] > score[1] ? firstName : secondName
    const next = [{ winner, final: `${score[0]}–${score[1]}`, level: copy.levels[level].name, mode: mode === 'bot' ? copy.botMode : copy.localMode }, ...records].slice(0, 5)
    try {
      localStorage.setItem('playcove.soccer-duel.player-1', firstName)
      localStorage.setItem('playcove.soccer-duel.player-2', p2Name.trim() || fallbackP2)
      localStorage.setItem('playcove.soccer-duel.scores', JSON.stringify(next))
    } catch {
      return
    }
    setRecords(next)
    setSaved(true)
  }

  function hold(control: keyof typeof inputRef.current, pressed: boolean) {
    inputRef.current[control] = pressed
  }

  const firstName = p1Name.trim() || fallbackP1
  const secondName = mode === 'bot' ? copy.bot : p2Name.trim() || fallbackP2
  const winner = score[0] > score[1] ? firstName : secondName
  const canChangeSetup = status !== 'playing' && status !== 'paused'
  const windText = wind === 0 ? copy.levels[level].wind : `${copy.wind} ${wind > 0 ? '→' : '←'} ${Math.abs(wind)}`

  return (
    <div className={`module-game soccer-game${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.kickoff}</span><h2>{copy.heading}</h2></div>
          <div className="soccer-scoreline"><span>{firstName}</span><strong>{score[0]} <i>:</i> {score[1]}</strong><span>{secondName}</span></div>
        </div>

        <section className="soccer-setup" aria-label={copy.level}>
          <div className="soccer-setup-row">
            <span className="soccer-setup-label">{copy.mode}</span>
            <div className="soccer-mode-options">
              <button className={mode === 'bot' ? 'soccer-choice is-active' : 'soccer-choice'} onClick={() => selectMode('bot')} disabled={!canChangeSetup} aria-pressed={mode === 'bot'}>{copy.botMode}</button>
              <button className={mode === 'local' ? 'soccer-choice is-active' : 'soccer-choice'} onClick={() => selectMode('local')} disabled={!canChangeSetup} aria-pressed={mode === 'local'}>{copy.localMode}</button>
            </div>
          </div>
          <div className="soccer-level-grid">
            {LEVEL_IDS.map((id) => (
              <button className={level === id ? 'soccer-level is-active' : 'soccer-level'} onClick={() => selectLevel(id)} disabled={!canChangeSetup} aria-pressed={level === id} key={id}>
                <strong>{copy.levels[id].name}</strong><span>{copy.levels[id].detail}</span><small>{copy.levels[id].wind}</small>
              </button>
            ))}
          </div>
        </section>

        <div className="soccer-matchbar"><span>{mode === 'bot' ? `${firstName} vs ${copy.bot}` : `${firstName} vs ${secondName}`}{status === 'playing' && <button onClick={() => setStatus('paused')}>{copy.pause}</button>}</span><strong>{windText}</strong></div>
        <div className="canvas-wrap soccer-canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Boisko do gry Soccer Duel' : 'Soccer Duel side-view arena'} />
          {status !== 'playing' && (
            <div className="game-overlay soccer-overlay">
              <span className="overlay-spark">{status === 'over' ? '✦' : '⚽'}</span>
              <strong>{status === 'over' ? `${winner} ${locale === 'pl' ? 'wygrywa!' : 'wins!'}` : status === 'paused' ? copy.paused : copy.ready}</strong>
              <span>{status === 'over' ? `${copy.score}: ${score[0]}–${score[1]}` : copy.readyDetail}</span>
              {status === 'over' && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}
              <button className="game-button" onClick={status === 'paused' ? () => setStatus('playing') : startMatch}>{status === 'paused' ? copy.resume : status === 'over' ? copy.rematch : copy.start}<span>→</span></button>
            </div>
          )}
        </div>

        <div className="module-controls-caption soccer-keyboard-controls">
          <span>{copy.p1Controls} {copy.move} <kbd>A</kbd><kbd>D</kbd> {copy.jump} <kbd>W</kbd> {copy.kick} <kbd>SPACE</kbd></span>
          <i />
          {mode === 'local' && <span>{copy.p2Controls} {copy.move} <kbd>←</kbd><kbd>→</kbd> {copy.jump} <kbd>↑</kbd> {copy.kick} <kbd>ENTER</kbd></span>}
        </div>
        <p className="soccer-aim-hint soccer-aim-hint-keyboard">{mode === 'local' ? copy.aimHintLocal : copy.aimHintBot}</p>
        <p className="soccer-aim-hint soccer-aim-hint-touch">{mode === 'local' ? copy.touchAimHintLocal : copy.touchAimHintBot}</p>
        <div className="soccer-touch-controls">
          <div className="soccer-touch-player">
            <span>{copy.p1Controls}</span>
            <button aria-label={locale === 'pl' ? 'Gracz 1 w lewo' : 'Player 1 left'} onPointerDown={() => hold('p1Left', true)} onPointerUp={() => hold('p1Left', false)} onPointerCancel={() => hold('p1Left', false)} onPointerLeave={() => hold('p1Left', false)}>←</button>
            <button aria-label={locale === 'pl' ? 'Gracz 1 w prawo' : 'Player 1 right'} onPointerDown={() => hold('p1Right', true)} onPointerUp={() => hold('p1Right', false)} onPointerCancel={() => hold('p1Right', false)} onPointerLeave={() => hold('p1Right', false)}>→</button>
            <button aria-label={locale === 'pl' ? 'Gracz 1 skok i lob' : 'Player 1 jump and lob aim'} onPointerDown={() => { hold('p1Jump', true); hold('p1AimUp', true) }} onPointerUp={() => { hold('p1Jump', false); hold('p1AimUp', false) }} onPointerCancel={() => { hold('p1Jump', false); hold('p1AimUp', false) }} onPointerLeave={() => { hold('p1Jump', false); hold('p1AimUp', false) }}>↑</button>
            <button className="soccer-aim-button" title={copy.low} aria-label={locale === 'pl' ? 'Gracz 1 niski strzał' : 'Player 1 low shot aim'} onPointerDown={() => hold('p1AimDown', true)} onPointerUp={() => hold('p1AimDown', false)} onPointerCancel={() => hold('p1AimDown', false)} onPointerLeave={() => hold('p1AimDown', false)}>↓</button>
            <button className="soccer-kick-button" aria-label={locale === 'pl' ? 'Gracz 1 strzał' : 'Player 1 kick'} onPointerDown={() => hold('p1Kick', true)}>{copy.kick}</button>
          </div>
          {mode === 'local' && <div className="soccer-touch-player">
            <span>{copy.p2Controls}</span>
            <button aria-label={locale === 'pl' ? 'Gracz 2 w lewo' : 'Player 2 left'} onPointerDown={() => hold('p2Left', true)} onPointerUp={() => hold('p2Left', false)} onPointerCancel={() => hold('p2Left', false)} onPointerLeave={() => hold('p2Left', false)}>←</button>
            <button aria-label={locale === 'pl' ? 'Gracz 2 w prawo' : 'Player 2 right'} onPointerDown={() => hold('p2Right', true)} onPointerUp={() => hold('p2Right', false)} onPointerCancel={() => hold('p2Right', false)} onPointerLeave={() => hold('p2Right', false)}>→</button>
            <button aria-label={locale === 'pl' ? 'Gracz 2 skok i lob' : 'Player 2 jump and lob aim'} onPointerDown={() => { hold('p2Jump', true); hold('p2AimUp', true) }} onPointerUp={() => { hold('p2Jump', false); hold('p2AimUp', false) }} onPointerCancel={() => { hold('p2Jump', false); hold('p2AimUp', false) }} onPointerLeave={() => { hold('p2Jump', false); hold('p2AimUp', false) }}>↑</button>
            <button className="soccer-aim-button" title={copy.low} aria-label={locale === 'pl' ? 'Gracz 2 niski strzał' : 'Player 2 low shot aim'} onPointerDown={() => hold('p2AimDown', true)} onPointerUp={() => hold('p2AimDown', false)} onPointerCancel={() => hold('p2AimDown', false)} onPointerLeave={() => hold('p2AimDown', false)}>↓</button>
            <button className="soccer-kick-button" aria-label={locale === 'pl' ? 'Gracz 2 strzał' : 'Player 2 kick'} onPointerDown={() => hold('p2Kick', true)}>{copy.kick}</button>
          </div>}
        </div>
      </div>

      <aside className="game-scoreboard soccer-scoreboard">
        <div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div>
        <label className="game-field"><span>{copy.name(1)}</span><input value={p1Name} maxLength={14} onChange={(event) => setP1Name(event.target.value)} /></label>
        {mode === 'local' && <label className="game-field"><span>{copy.name(2)}</span><input value={p2Name} maxLength={14} onChange={(event) => setP2Name(event.target.value)} /></label>}
        <div className="scoreboard-rule" />
        <div className="scoreboard-list">
          {records.length ? records.map((record, index) => (
            <div className="match-log-row" key={`${record.winner}-${record.final}-${index}`}><span className="match-log-rank">{String(index + 1).padStart(2, '0')}</span><span><strong>{record.winner}</strong><small>{record.level} · {record.mode}</small></span><b>{record.final}</b></div>
          )) : <p className="scoreboard-empty">{copy.empty}</p>}
        </div>
        <div className="scoreboard-foot">{copy.local}</div>
      </aside>
    </div>
  )
}
