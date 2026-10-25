import { TouchControls } from '../kit/TouchControls.tsx'
import type { TouchGroup } from '../kit/TouchControls.tsx'
import { polygon, shadow, orb } from '../kit/art.ts'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { useCanvasResolution } from '../kit/use-canvas-resolution.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { GamePanel } from '../kit/GamePanel.tsx'
import { SoundToggle } from '../kit/SoundToggle.tsx'
import { useGameAudio } from '../kit/use-game-audio.ts'
import { ballInKickRange, botSettings, shotProfile } from './mechanics.ts'
import type { BotDifficulty, ShotAim } from './mechanics.ts'
import { clearCareerCheckpoint, createCareer, finishCareerMatch, opponentFor, readCareerCheckpoint, readCareerRecords, writeCareerCheckpoint, writeCareerRecords } from './career.ts'
import type { CareerCheckpoint, CareerRecord } from './career.ts'
import { collideGoalFrames, collidePlayer, goalScorer, integrateBall } from './ball-physics.ts'

type Mode = 'bot' | 'local'
type LevelId = 'practice' | 'coast' | 'rooftop'
type Player = { jumpBuffer: number; charge: number; x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean; kickTimer: number; kickCooldown: number; kickBuffer: number; aim: ShotAim }
type Ball = { x: number; y: number; vx: number; vy: number; rotation: number; kickFlash: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; duration: number; color: string }
type Match = { elapsed: number; players: [Player, Player]; ball: Ball; score: [number, number]; resetTimer: number; particles: Particle[] }
type MatchRecord = { winner: string; final: string; level: string; mode: string }

const WIDTH = 900
const HEIGHT = 500
const GROUND = 426
const PLAYER_WIDTH = 32
const PLAYER_HEIGHT = 72
const BALL_RADIUS = 12
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
  return { jumpBuffer: 0, charge: 0, x, y: GROUND - PLAYER_HEIGHT, vx: 0, vy: 0, facing, grounded: true, kickTimer: 0, kickCooldown: 0, kickBuffer: 0, aim: 'drive' }
}

function createMatch(): Match {
  return {
    elapsed: 0,
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
  const hasBallInRange = ballInKickRange(ball, player)

  if (player.charge > 0) {
    context.fillStyle = '#ffffff55'
    context.fillRect(x - 20, y - 12, 40, 4)
    context.fillStyle = player.charge >= 1 ? '#ffe17a' : '#fff'
    context.fillRect(x - 20, y - 12, 40 * player.charge, 4)
  }
  context.fillStyle = '#263447'
  context.beginPath()
  context.roundRect(x - 16, y + 46, 32, 15, 5)
  context.fill()
  context.fillStyle = color
  context.beginPath()
  context.roundRect(x - 15, y + 25, 30, 30, 9)
  context.fill()

  context.fillStyle='#fff2d7bb';context.fillRect(x-2,y+31,4,11);context.fillRect(x-5,y+32,10,2);
  context.strokeStyle='#fff0d088';context.lineWidth=2;context.beginPath();context.moveTo(x-12,y+30);context.lineTo(x-6,y+27);context.lineTo(x,y+31);context.lineTo(x+6,y+27);context.lineTo(x+12,y+30);context.stroke();
  shadow(context,x,GROUND+2,20,4,'#12372b33');
  if (player.aim !== 'drive' || hasBallInRange) {
    const startX = hasBallInRange ? player.x + player.facing * (PLAYER_WIDTH / 2 + BALL_RADIUS + 2) : footX
    const startY = hasBallInRange ? ball.y : footY
    const profile = shotProfile(player)
    const velocityX = player.facing * profile.horizontal + player.vx * 0.18
    const preview = { x: startX, y: startY, vx: velocityX, vy: profile.vertical }
    context.fillStyle = player.aim === 'lob' ? 'rgba(255,255,255,.82)' : 'rgba(255,246,179,.82)'
    for (let step = 1; step <= 42; step += 1) {
      const previous = integrateBall(preview, 1 / 60, wind)
      collideGoalFrames(preview)
      if (step % 6 === 0) {
        const index = step / 6
        context.globalAlpha = 1 - index * 0.085
        context.beginPath()
        context.arc(preview.x, preview.y, 2 + (7 - index) * 0.32, 0, Math.PI * 2)
        context.fill()
      }
      if (goalScorer(previous, preview) !== null) break
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

function drawScene(context: CanvasRenderingContext2D, match: Match, level: LevelId, time: number, goalLabel: string, matchLabel: string) {
  const arena = arenas[level]
  const wind = windAt(match.elapsed * 1000, level)
  context.clearRect(0, 0, WIDTH, HEIGHT)
  const sky=context.createLinearGradient(0,0,0,GROUND);sky.addColorStop(0,arena.sky);sky.addColorStop(1,level==='rooftop'?'#80758d':'#d2ded0');context.fillStyle=sky;context.fillRect(0,0,WIDTH,GROUND);
  for(let layer=0;layer<2;layer++){const points=[0,GROUND];for(let x=0;x<=WIDTH+30;x+=30)points.push(x,GROUND-100+layer*30-Math.sin(x/140+layer)*27);points.push(WIDTH+30,GROUND);polygon(context,points,level==='rooftop'?(layer?'#566178':'#6b758a'):(layer?'#8aa99d':'#a1bbb1'))}


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

  if(level!=='rooftop'){
    for(let tier=0;tier<3;tier++){const y=GROUND-78+tier*21;context.fillStyle=tier%2?'#526f7333':'#36545f33';context.fillRect(0,y,WIDTH,20);for(let i=0;i<75;i++){const x=i*13+3;context.fillStyle=['#dbc59b','#8ea9b5','#c29589','#a0b7a2'][(i+tier*3)%4];context.beginPath();context.arc(x,y+9,2.5,0,Math.PI*2);context.fill();context.fillStyle='#40586755';context.fillRect(x-3,y+12,6,6)}}
    context.fillStyle='#45665f';context.fillRect(0,GROUND-18,WIDTH,18);for(let i=0;i<10;i++){context.fillStyle=i%2?'#d8d4b4':'#6f9391';context.fillRect(i*100+8,GROUND-14,84,9)}
  }
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

  for(let i=0;i<90;i++){const x=(i*139)%WIDTH;context.strokeStyle='#e5e3bc22';context.lineWidth=1;context.beginPath();context.moveTo(x,GROUND+2);context.lineTo(x+2,GROUND+6+(i%4));context.stroke()}
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
  orb(context,match.ball.x,match.ball.y,BALL_RADIUS,'#e9e9d5','#fffdf0');
  context.save();context.translate(match.ball.x,match.ball.y);context.rotate(match.elapsed*match.ball.vx*.003);const patches:number[]=[];for(let i=0;i<5;i++){const angle=-Math.PI/2+i*Math.PI*2/5;patches.push(Math.cos(angle)*4.3,Math.sin(angle)*4.3)}polygon(context,patches,'#344c55');context.restore();
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

  context.fillStyle = 'rgba(24,39,55,.88)'
  context.beginPath()
  context.roundRect(WIDTH / 2 - 105, 12, 210, 82, 13)
  context.fill()
  context.fillStyle = '#ffffff'
  context.font = '900 44px system-ui, sans-serif'
  context.textAlign = 'center'
  context.fillText(`${match.score[0]}  :  ${match.score[1]}`, WIDTH / 2, 61)
  context.fillStyle = '#cbdfbd'
  context.font = '750 10px system-ui, sans-serif'
  context.fillText(matchLabel, WIDTH / 2, 81)

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
    heading: 'Mecz do trzech goli', ready: 'Gotowi na mecz?', readyDetail: 'W skacze, Q celuje lobem, S nisko. Dotknij strzału albo przytrzymaj i puść dla większej mocy. Kropki pokazują cel.', goal: 'GOL!',
    paused: 'Mecz wstrzymany', pause: 'Pauza', over: 'Koniec meczu', score: 'WYNIK', wind: 'WIATR',
    start: 'Rozpocznij mecz', resume: 'Wznów mecz', rematch: 'Rewanż', save: 'Zapisz wynik',
    history: 'HISTORIA MECZÓW', empty: 'Zapisane wyniki pojawią się tutaj.', local: 'ZAPISANO NA TYM URZĄDZENIU',
    p1Controls: 'GRACZ 1', p2Controls: 'GRACZ 2', move: 'RUCH', jump: 'SKOK', kick: 'STRZAŁ', low: 'NISKO',
    aimHintBot: 'Q: LOB · S: NISKO · PRZYTRZYMAJ STRZAŁ DLA MOCY, PUŚĆ BY UDERZYĆ', aimHintLocal: 'P1: Q LOB · S NISKO | P2: SHIFT LOB · ↓ NISKO · PUŚĆ STRZAŁ BY UDERZYĆ',
    touchAimHintBot: '↑ skacze · ⌒ celuje lobem · ↓ nisko. Przytrzymaj i puść STRZAŁ dla mocy.', touchAimHintLocal: '↑ skacze · ⌒ celuje lobem · ↓ nisko. Przytrzymaj i puść STRZAŁ dla mocy.',
  } : {
    mode: 'MODE', botMode: 'Vs bot', localMode: '2 players', level: 'CHOOSE AN ARENA', kickoff: 'FIRST TO 3 GOALS',
    levels: {
      practice: { name: 'Training Ground', detail: 'Calm air', wind: 'NO WIND' },
      coast: { name: 'Windy Coast', detail: 'Changing gusts', wind: 'GUSTY' },
      rooftop: { name: 'Rooftop', detail: 'Strong crosswind', wind: 'STRONG WIND' },
    },
    player: (number: number) => `Player ${number}`, bot: 'Bot', name: (number: number) => `PLAYER ${number} NAME`,
    heading: 'First to three goals', ready: 'Ready for kickoff?', readyDetail: 'W jumps, Q aims a lob, S aims low. Tap kick for a quick shot or hold and release for power. Dots show your aim.', goal: 'GOAL!',
    paused: 'Match paused', pause: 'Pause', over: 'Full time', score: 'SCORE', wind: 'WIND',
    start: 'Start match', resume: 'Resume match', rematch: 'Rematch', save: 'Save result',
    history: 'MATCH HISTORY', empty: 'Saved results will show up here.', local: 'SAVED ON THIS DEVICE',
    p1Controls: 'PLAYER 1', p2Controls: 'PLAYER 2', move: 'MOVE', jump: 'JUMP', kick: 'KICK', low: 'LOW',
    aimHintBot: 'Q: LOB · S: LOW · HOLD KICK FOR POWER, RELEASE TO SHOOT', aimHintLocal: 'P1: Q LOB · S LOW | P2: SHIFT LOB · ↓ LOW · RELEASE KICK TO SHOOT',
    touchAimHintBot: '↑ jumps · ⌒ aims a lob · ↓ aims low. Hold and release KICK for power.', touchAimHintLocal: '↑ jumps · ⌒ aims a lob · ↓ aims low. Hold and release KICK for power.',
  }

  const fallbackP1 = copy.player(1)
  const fallbackP2 = copy.player(2)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRevision = useCanvasResolution(canvasRef, WIDTH, HEIGHT)
  const [initialScene] = useState(createMatch)
  const matchRef = useRef(initialScene)
  const inputRef = useRef({ p1Left: false, p1Right: false, p1Jump: false, p1AimUp: false, p1AimDown: false, p1Kick: false, p1KickHeld: false, p2Left: false, p2Right: false, p2Jump: false, p2AimUp: false, p2AimDown: false, p2Kick: false, p2KickHeld: false })
  const [mode, setMode] = useState<Mode>('bot')
  const [selectedLevel, setLevel] = useState<LevelId>('practice')
  const [selectedDifficulty, setDifficulty] = useState<BotDifficulty>('club')
  const [format, setFormat] = useState<'arcade' | 'quick'>('arcade')
  const [career, setCareer] = useState(createCareer)
  const [roundProfile, setRoundProfile] = useState(() => opponentFor(createCareer()))
  const [resumeAvailable, setResumeAvailable] = useState(false)
  const checkpointRef = useRef<CareerCheckpoint | null>(null)
  const [arcadeRecords, setArcadeRecords] = useState<CareerRecord[]>([])
  const [runBest, setRunBest] = useState(0)
  const [matchTarget, setMatchTarget] = useState(5)
  const arcade = mode === 'bot' && format === 'arcade'
  const level = arcade ? roundProfile.arena : selectedLevel
  const difficulty = arcade ? roundProfile.difficulty : selectedDifficulty
  const targetGoals = arcade ? roundProfile.targetGoals : matchTarget
  const matchLabel = `${arcade ? `${locale === 'pl' ? 'MECZ' : 'MATCH'} ${roundProfile.number} · ` : ''}${locale === 'pl' ? 'DO' : 'FIRST TO'} ${targetGoals}`
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState<[number, number]>([0, 0])
  const [wind, setWind] = useState(0)
  const [p1Name, setP1Name] = useState(fallbackP1)
  const [p2Name, setP2Name] = useState(fallbackP2)
  const [records, setRecords] = useState<MatchRecord[]>([])
  const [saved, setSaved] = useState(false)
  const [series, setSeries] = useState<[number, number]>([0, 0])
  const { audio, enabled: soundEnabled, toggle: toggleSound } = useGameAudio(status)
  useEffect(() => {
    if (status !== 'over') return
    saveScore()
    setSeries((current) => score[0] > score[1] ? [current[0] + 1, current[1]] : [current[0], current[1] + 1])
    if (!arcade) return
    const next = finishCareerMatch(career, score)
    setCareer(next)
    const checkpoint: CareerCheckpoint = { career: next, score, completed: true }
    checkpointRef.current = checkpoint
    if (next.losses < 3) writeCareerCheckpoint(checkpoint)
    else {
      clearCareerCheckpoint()
      checkpointRef.current = null
      const name = p1Name.trim() || fallbackP1
      const records = [...arcadeRecords, { name, score: next.points, wins: next.wins, goals: next.goalsFor }].sort((first, second) => second.score - first.score).slice(0, 5)
      if (writeCareerRecords(records)) { setArcadeRecords(records); setSaved(true) }
    }
  }, [status])
  useEffect(() => {
    if (!arcade || (status !== 'playing' && status !== 'paused')) return
    const checkpoint: CareerCheckpoint = { career, score, completed: false }
    checkpointRef.current = checkpoint
    writeCareerCheckpoint(checkpoint)
  }, [arcade, career, score, status])
  useGameSession(status, setStatus, startMatch, canvasRef)

  useEffect(() => {
    if (!arcade) return
    const checkpoint = readCareerCheckpoint()
    const records = readCareerRecords()
    setArcadeRecords(records)
    setRunBest(records[0]?.score ?? 0)
    checkpointRef.current = checkpoint
    setResumeAvailable(checkpoint !== null)
    if (checkpoint) {
      setCareer(checkpoint.career)
      setRoundProfile(opponentFor(checkpoint.career))
      if (!checkpoint.completed) {
        matchRef.current = createMatch()
        matchRef.current.score = [...checkpoint.score]
        setScore([...checkpoint.score])
      }
    }
  }, [arcade])

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
      drawScene(drawingContext, match, level, performance.now(), copy.goal, matchLabel)
      return
    }

    let animationFrame = 0
    let previousTime = 0
    let previousWindUpdate = 0
    let botTimer = 0
    let botTarget = WIDTH * 0.73
    let botJump = false

    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (key.startsWith('arrow') || key === ' ' || ['a', 'd', 'w', 's', 'q'].includes(key)) event.preventDefault()
      if (key === 'a') inputRef.current.p1Left = true
      if (key === 'd') inputRef.current.p1Right = true
      if (key === 'q') inputRef.current.p1AimUp = true
      if (key === 's') inputRef.current.p1AimDown = true
      if (key === 'w' && !event.repeat) inputRef.current.p1Jump = true
      if (event.code === 'Space' && !event.repeat) inputRef.current.p1KickHeld = true
      if (mode === 'local') {
        if (key === 'arrowleft') inputRef.current.p2Left = true
        if (key === 'arrowright') inputRef.current.p2Right = true
        if (key === 'shift') { event.preventDefault(); inputRef.current.p2AimUp = true }
        if (key === 'arrowdown') inputRef.current.p2AimDown = true
        if (key === 'arrowup' && !event.repeat) inputRef.current.p2Jump = true
        if (event.code === 'Enter' && !event.repeat) { event.preventDefault(); inputRef.current.p2KickHeld = true }
      }
    }

    function handleKeyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'a') inputRef.current.p1Left = false
      if (key === 'd') inputRef.current.p1Right = false
      if (key === 'w') {
        inputRef.current.p1Jump = false
      }
      if (key === 'q') inputRef.current.p1AimUp = false
      if (key === 's') inputRef.current.p1AimDown = false
      if (event.code === 'Space' && inputRef.current.p1KickHeld) { inputRef.current.p1KickHeld = false; inputRef.current.p1Kick = true }
      if (event.code === 'Enter' && inputRef.current.p2KickHeld) { inputRef.current.p2KickHeld = false; inputRef.current.p2Kick = true }
      if (key === 'shift') inputRef.current.p2AimUp = false
      if (key === 'arrowleft') inputRef.current.p2Left = false
      if (key === 'arrowright') inputRef.current.p2Right = false
      if (key === 'arrowup') {
        inputRef.current.p2Jump = false
      }
      if (key === 'arrowdown') inputRef.current.p2AimDown = false
    }

    function applyPlayerInput(player: Player, left: boolean, right: boolean, jump: boolean, delta: number, maxSpeed = 425) {
      const direction = Number(right) - Number(left)
      if (direction !== 0) {
        player.facing = direction
        player.vx += (direction * maxSpeed - player.vx) * Math.min(1, 17 * delta)
      } else {
        player.vx *= Math.max(0, 1 - 11 * delta)
      }
      player.jumpBuffer = jump ? 0.14 : Math.max(0, player.jumpBuffer - delta)
      if (player.jumpBuffer > 0 && player.grounded) {
        player.jumpBuffer = 0
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
      const settings = botSettings[difficulty]
      botTimer -= delta
      let kick = false
      if (botTimer <= 0) {
        botTimer = settings.reaction
        const predicted = ball.x + ball.vx * settings.reaction * 0.5
        const error = Math.sin(match.elapsed * 2.3) * settings.accuracy
        const defending = arcade && roundProfile.style === 'keeper' && ball.x < WIDTH * 0.58
        botTarget = defending ? WIDTH * 0.8 : Math.max(WIDTH * 0.25, Math.min(WIDTH - 76, predicted + 52 + error))
        botJump = Math.abs(ball.x - player.x) < 110 && ball.y < GROUND - 100 && ball.y > GROUND - 260
        const opponent = match.players[0]
        player.aim = arcade && roundProfile.style === 'lobber' ? 'lob' : arcade && roundProfile.style === 'striker' && !opponent.grounded ? 'ground' : opponent.x < player.x && player.x - opponent.x < 180 && opponent.grounded ? 'lob' : !opponent.grounded ? 'ground' : 'drive'
        kick = ball.x < player.x + 5 && ballInKickRange(ball, player)
        if (kick) player.charge = difficulty === 'pro' ? 0.8 : 0.3
      }
      const direction = Math.abs(botTarget - player.x) < 12 ? 0 : Math.sign(botTarget - player.x)
      applyPlayerInput(player, direction < 0, direction > 0, botJump && player.grounded, delta, settings.speed * (arcade && roundProfile.style === 'chaser' ? 1.06 : 1))
      player.facing = ball.x < player.x ? -1 : 1
      return kick

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

    function kickBall(player: Player, ball: Ball, requested: boolean, color: string) {
      if (requested) player.kickBuffer = 0.2
      if (player.kickBuffer <= 0 || player.kickCooldown > 0) return

      const footX = player.x + player.facing * (PLAYER_WIDTH / 2 + 12)
      const footY = player.y + 56
      if (!ballInKickRange(ball, player)) return

      audio.play('hit')
      const profile = shotProfile(player)
      ball.x = player.x + player.facing * (PLAYER_WIDTH / 2 + BALL_RADIUS + 2)
      ball.vx = player.facing * profile.horizontal + player.vx * 0.18
      ball.vy = profile.vertical
      ball.kickFlash = 0.16
      player.kickTimer = 0.2
      player.kickCooldown = 0.32
      player.kickBuffer = 0
      player.charge = 0
      addBurst(match, ball.x, ball.y, color, 12)
    }

    function resetKickoff(direction: number) {
      match.players[0] = createPlayer(218, 1)
      match.players[1] = createPlayer(682, -1)
      match.ball = { x: WIDTH / 2, y: GROUND - 140, vx: direction * 110, vy: -150, rotation: 0, kickFlash: 0 }
    }

    function frame(time: number) {
      const frameDelta = Math.min((time - (previousTime || time)) / 1000, 0.05)
      previousTime = time
      const steps = Math.max(1, Math.ceil(frameDelta * 120))
      const delta = frameDelta / steps
      let matchEnded = false
      for (let step = 0; step < steps; step += 1) {
      match.elapsed += delta
      const ball = match.ball
      const [first, second] = match.players
      const p1Kick = inputRef.current.p1Kick
      const p2Kick = inputRef.current.p2Kick
      first.aim = inputRef.current.p1AimUp ? 'lob' : inputRef.current.p1AimDown ? 'ground' : 'drive'
      if (mode === 'local') second.aim = inputRef.current.p2AimUp ? 'lob' : inputRef.current.p2AimDown ? 'ground' : 'drive'
      first.charge = inputRef.current.p1KickHeld ? Math.min(1, first.charge + delta * 1.4) : first.charge
      if (mode === 'local') second.charge = inputRef.current.p2KickHeld ? Math.min(1, second.charge + delta * 1.4) : second.charge
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

        let botKick = false
        if (mode === 'bot') {
          botKick = applyBotInput(second, ball, delta)
        } else {
          applyPlayerInput(second, inputRef.current.p2Left, inputRef.current.p2Right, inputRef.current.p2Jump, delta)
          inputRef.current.p2Jump = false
        }
        collidePlayers(first, second)

        const previousBall = integrateBall(ball, delta, windAt(match.elapsed * 1000, level))
        collidePlayer(ball, first)
        collidePlayer(ball, second)
        if (collideGoalFrames(ball)) audio.play('hit')
        kickBall(first, ball, p1Kick, '#ffb08e')
        kickBall(second, ball, mode === 'bot' ? botKick : p2Kick, '#b2c1ff')
        if (!inputRef.current.p1KickHeld && first.kickBuffer === 0) first.charge = 0
        if (!inputRef.current.p2KickHeld && second.kickBuffer === 0) second.charge = 0

        const scorer = goalScorer(previousBall, ball)
        if (scorer !== null) {
          audio.play('point')
          match.score[scorer] += 1
          setScore([match.score[0], match.score[1]])
          addBurst(match, ball.x, ball.y, '#fff0a8', 24)
          if (match.score[scorer] >= targetGoals) {
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

      if (matchEnded) break
      }
      drawScene(drawingContext, match, level, time, copy.goal, matchLabel)
      if (time - previousWindUpdate > 180) {
        setWind(Math.round(windAt(match.elapsed * 1000, level)))
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
      inputRef.current = { p1Left: false, p1Right: false, p1Jump: false, p1AimUp: false, p1AimDown: false, p1Kick: false, p1KickHeld: false, p2Left: false, p2Right: false, p2Jump: false, p2AimUp: false, p2AimDown: false, p2Kick: false, p2KickHeld: false }
    }
  }, [arcade, copy.goal, difficulty, level, mode, roundProfile.style, status, targetGoals, matchLabel, canvasRevision])

  function startMatch() {
    const match = createMatch()
    if (arcade) {
      const checkpoint = status === 'ready' && resumeAvailable ? checkpointRef.current : null
      const next = checkpoint ? checkpoint.career : status === 'over' && career.losses < 3 ? career : createCareer()
      setCareer(next)
      setRoundProfile(opponentFor(next))
      if (checkpoint && !checkpoint.completed) match.score = [...checkpoint.score]
      if (next.wins + next.losses === 0) setRunBest(arcadeRecords[0]?.score ?? 0)
      setResumeAvailable(false)
    }
    matchRef.current = match
    setScore([...match.score])
    setWind(0)
    setSaved(false)
    setStatus('playing')
  }

  function chooseFormat(next: 'arcade' | 'quick') {
    setFormat(next)
    selectMode('bot')
  }

  function selectMode(nextMode: Mode) {
    setMode(nextMode)
    setResumeAvailable(nextMode === 'bot' && format === 'arcade' && checkpointRef.current !== null)
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
    const secondName = mode === 'bot' ? arcade ? roundProfile.names[locale] : copy.bot : p2Name.trim() || fallbackP2
    const winner = score[0] > score[1] ? firstName : secondName
    const next = [{ winner, final: `${score[0]}–${score[1]}`, level: copy.levels[level].name, mode: arcade ? locale === 'pl' ? 'Bieg arcade' : 'Arcade run' : mode === 'bot' ? copy.botMode : copy.localMode }, ...records].slice(0, 5)
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
  const secondName = mode === 'bot' ? arcade ? roundProfile.names[locale] : copy.bot : p2Name.trim() || fallbackP2
  const winner = score[0] > score[1] ? firstName : secondName
  const canChangeSetup = status !== 'playing' && status !== 'paused'
  const windText = wind === 0 ? copy.levels[level].wind : `${copy.wind} ${wind > 0 ? '→' : '←'} ${Math.abs(wind)}`
  const nextOpponent = opponentFor(career)
  const runOver = arcade && career.losses >= 3
  const roundWon = score[0] > score[1]
  const resultTitle = arcade ? runOver ? locale === 'pl' ? 'Koniec biegu arcade' : 'Arcade run complete' : locale === 'pl' ? roundWon ? 'Mecz wygrany!' : 'Mecz przegrany' : roundWon ? 'Match won!' : 'Match lost' : `${winner} ${locale === 'pl' ? 'wygrywa!' : 'wins!'}`
  const readyTitle = arcade ? locale === 'pl' ? resumeAvailable ? 'Kontynuować bieg?' : 'Ile pucharów zdobędziesz?' : resumeAvailable ? 'Continue your run?' : 'How many cups can you win?' : copy.ready
  const readyDetail = arcade ? locale === 'pl' ? 'Kolejne drużyny, zmienne boiska, silniejsi rywale. Co 5 zwycięstw puchar. Bieg kończy się po 3 porażkach; postęp zapisuje się po każdym golu.' : 'New teams, changing arenas, tougher opponents. Every 5 wins earns a cup. Three match losses end the run; every goal is saved locally.' : copy.readyDetail
  const resultDetail = arcade ? runOver ? locale === 'pl' ? `${career.goalsFor} goli, ${career.wins} zwycięstw. Najlepsza seria: ${career.bestStreak}.` : `${career.goalsFor} goals, ${career.wins} wins. Best winning streak: ${career.bestStreak}.` : locale === 'pl' ? `Pozostałe szanse: ${3 - career.losses}. Następny rywal: ${nextOpponent.names.pl} · ${copy.levels[nextOpponent.arena].name}.` : `${3 - career.losses} losses left. Next: ${nextOpponent.names.en} · ${copy.levels[nextOpponent.arena].name}.` : locale === 'pl' ? 'Rewanż zachowuje wynik serii. Lobuj nad obrońcą albo strzelaj nisko pod wyskokiem.' : 'A rematch keeps the series tally. Lob over a defender or drive low under a jump.'
  const actionLabel = status === 'paused' ? copy.resume : arcade ? status === 'over' ? runOver ? locale === 'pl' ? 'Nowy bieg' : 'New run' : locale === 'pl' ? 'Następny mecz' : 'Next match' : resumeAvailable ? locale === 'pl' ? 'Kontynuuj bieg' : 'Continue run' : locale === 'pl' ? 'Rozpocznij bieg' : 'Start arcade run' : status === 'over' ? copy.rematch : copy.start

  const setup = (
        <section className="soccer-setup" aria-label={copy.level}>
          <div className="soccer-setup-row">
            <span className="soccer-setup-label">{copy.mode}</span>
            <div className="soccer-mode-options">
              <button className={arcade ? 'soccer-choice is-active' : 'soccer-choice'} onClick={() => chooseFormat('arcade')} disabled={!canChangeSetup} aria-pressed={arcade}>{locale === 'pl' ? 'Bieg arcade' : 'Arcade run'}</button>
              <button className={mode === 'bot' && !arcade ? 'soccer-choice is-active' : 'soccer-choice'} onClick={() => chooseFormat('quick')} disabled={!canChangeSetup} aria-pressed={mode === 'bot' && !arcade}>{locale === 'pl' ? 'Szybki mecz' : 'Quick match'}</button>
              <button className={mode === 'local' ? 'soccer-choice is-active' : 'soccer-choice'} onClick={() => selectMode('local')} disabled={!canChangeSetup} aria-pressed={mode === 'local'}>{copy.localMode}</button>
            </div>
          </div>
          {mode === 'bot' && !arcade && <div className="soccer-setup-row"><span className="soccer-setup-label">{locale === 'pl' ? 'POZIOM BOTA' : 'BOT LEVEL'}</span><div className="soccer-mode-options">{(['casual', 'club', 'pro'] satisfies BotDifficulty[]).map((id) => <button key={id} className={difficulty === id ? 'soccer-choice is-active' : 'soccer-choice'} disabled={!canChangeSetup} aria-pressed={difficulty === id} onClick={() => setDifficulty(id)}>{id === 'casual' ? locale === 'pl' ? 'Spokojny' : 'Casual' : id === 'club' ? locale === 'pl' ? 'Klubowy' : 'Club' : 'Pro'}</button>)}</div></div>}
          {arcade ? <div className="soccer-campaign-panel">
            <div><span>{locale === 'pl' ? 'PUCHAR' : 'CUP'} {Math.floor(career.wins / 5) + 1}</span><strong>{career.points.toLocaleString(locale)} {locale === 'pl' ? 'PKT' : 'PTS'}</strong><b aria-label={locale === 'pl' ? 'Pozostałe szanse' : 'Losses remaining'}>{'♥'.repeat(Math.max(0, 3 - career.losses))}{'♡'.repeat(Math.min(3, career.losses))}</b></div>
            <div className="soccer-cup-progress" aria-label={locale === 'pl' ? 'Zwycięstwa do pucharu' : 'Wins toward next cup'}>{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < career.wins % 5 ? 'is-earned' : ''} />)}</div>
            <p>{career.wins} {locale === 'pl' ? 'zwycięstw · kolejne zmiany' : 'wins · next challenge'}: {copy.levels[(status === 'over' ? nextOpponent : roundProfile).arena].name} · {locale === 'pl' ? 'postęp zapisuje się automatycznie' : 'progress saves automatically'}</p>
          </div> : <>
          <div className="soccer-setup-row"><span className="soccer-setup-label">{locale === 'pl' ? 'GOLE DO WYGRANEJ' : 'GOALS TO WIN'}</span><div className="soccer-mode-options">{[3, 5, 7].map((target) => <button key={target} className={matchTarget === target ? 'soccer-choice is-active' : 'soccer-choice'} disabled={!canChangeSetup} aria-pressed={matchTarget === target} onClick={() => { setMatchTarget(target); setStatus('ready'); setScore([0, 0]); matchRef.current = createMatch() }}>{target}</button>)}</div></div>
          <div className="soccer-level-grid">
            {LEVEL_IDS.map((id) => (
              <button className={level === id ? 'soccer-level is-active' : 'soccer-level'} onClick={() => selectLevel(id)} disabled={!canChangeSetup} aria-pressed={level === id} key={id}>
                <strong>{copy.levels[id].name}</strong><span>{copy.levels[id].detail}</span><small>{copy.levels[id].wind}</small>
              </button>
            ))}
          </div>
          </>}
          <div className="soccer-menu-controls"><span><kbd>A</kbd><kbd>D</kbd> {copy.move} · <kbd>W</kbd> {copy.jump}</span><span><kbd>Q</kbd> LOB · <kbd>S</kbd> {copy.low} · <kbd>SPACE</kbd> {copy.kick}</span></div>
        </section>
  )

  return (
    <div className={`module-game soccer-game${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">




        <div className="canvas-wrap soccer-canvas-wrap">
        <div className="module-game-heading game-frame-bar">
          <div><span className="game-small-label">{arcade ? `${locale === 'pl' ? 'MECZ' : 'MATCH'} ${roundProfile.number} · ${targetGoals} ${locale === 'pl' ? 'GOLI' : 'GOALS'}` : `${targetGoals} ${locale === 'pl' ? 'GOLI' : 'GOALS'}`}</span><h2>SOCCER DUEL</h2></div>
          <div className="soccer-scoreline"><span>{firstName}</span><strong>{score[0]} <i>:</i> {score[1]}</strong><span>{secondName}</span><small className="game-series-score">{locale === 'pl' ? 'SERIA' : 'SERIES'} {series[0]}–{series[1]}</small></div>
        </div>
          <canvas tabIndex={0} ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Boisko do gry Soccer Duel' : 'Soccer Duel side-view arena'} />
        <div className="soccer-matchbar"><span>{`${firstName} vs ${secondName}`}</span><strong>{windText}</strong></div>
          <SoundToggle locale={locale} enabled={soundEnabled} onToggle={toggleSound} onPause={status === 'playing' ? () => setStatus('paused') : undefined} />
          <GamePanel locale={locale} onOpen={() => { if (status === 'playing') setStatus('paused') }}>
      <aside className="game-scoreboard soccer-scoreboard">
        <div className="scoreboard-heading"><span className="game-small-label">{arcade ? locale === 'pl' ? 'NAJLEPSZE BIEGI' : 'BEST ARCADE RUNS' : copy.history}</span><span className="scoreboard-star">✳</span></div>
        <label className="game-field"><span>{copy.name(1)}</span><input value={p1Name} maxLength={14} onChange={(event) => setP1Name(event.target.value)} /></label>
        {mode === 'local' && <label className="game-field"><span>{copy.name(2)}</span><input value={p2Name} maxLength={14} onChange={(event) => setP2Name(event.target.value)} /></label>}
        <div className="scoreboard-rule" />
        <div className="scoreboard-list">
          {arcade ? arcadeRecords.length ? arcadeRecords.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{index + 1}</span><span className="score-name">{record.name}<small>{record.wins} {locale === 'pl' ? 'zwycięstw' : 'wins'}</small></span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{locale === 'pl' ? 'Ukończ bieg, by zapisać pierwszy wynik.' : 'Complete a run to set the first record.'}</p> : records.length ? records.map((record, index) => (
            <div className="match-log-row" key={`${record.winner}-${record.final}-${index}`}><span className="match-log-rank">{String(index + 1).padStart(2, '0')}</span><span><strong>{record.winner}</strong><small>{record.level} · {record.mode}</small></span><b>{record.final}</b></div>
          )) : <p className="scoreboard-empty">{copy.empty}</p>}
        </div>
        <div className="scoreboard-foot">{copy.local}</div>
      </aside>
          </GamePanel>
          <GameOverlay settings={status === 'ready' || (status === 'paused' && !arcade) ? setup : undefined} gameName="SOCCER DUEL" onRestart={arcade ? undefined : startMatch} status={status} locale={locale} title={status === 'over' ? resultTitle : status === 'paused' ? copy.paused : readyTitle} description={status === 'over' ? resultDetail : readyDetail} actionLabel={actionLabel} onAction={status === 'paused' ? () => setStatus('playing') : startMatch} actionHint={arcade && status === 'over' && !runOver ? locale === 'pl' ? 'SPACJA / ENTER · następny mecz' : 'SPACE / ENTER · next match' : undefined} result={{ value: runOver ? career.points : `${score[0]}–${score[1]}`, label: runOver ? locale === 'pl' ? 'PUNKTY BIEGU' : 'RUN POINTS' : resultTitle, ...(runOver ? { score: career.points, best: runBest } : {}), saved, stats: arcade ? [{ label: locale === 'pl' ? 'ZWYCIĘSTWA' : 'WINS', value: career.wins }, { label: locale === 'pl' ? 'PUNKTY BIEGU' : 'RUN POINTS', value: career.points }, { label: locale === 'pl' ? 'SZANSE' : 'LIVES', value: Math.max(0, 3 - career.losses) }] : [{ label: locale === 'pl' ? 'BOISKO' : 'ARENA', value: copy.levels[level].name }, { label: locale === 'pl' ? 'CZAS' : 'TIME', value: `${Math.floor(matchRef.current.elapsed)}s` }, { label: locale === 'pl' ? 'SERIA' : 'SERIES', value: `${series[0]}–${series[1]}` }] }} />
        </div>

        <div className="module-controls-caption soccer-keyboard-controls">
          <span>{copy.p1Controls} {copy.move} <kbd>A</kbd><kbd>D</kbd> {copy.jump} <kbd>W</kbd> {copy.kick} <kbd>SPACE</kbd></span>
          <i />
          {mode === 'local' && <span>{copy.p2Controls} {copy.move} <kbd>←</kbd><kbd>→</kbd> {copy.jump} <kbd>↑</kbd> {copy.kick} <kbd>ENTER</kbd></span>}
        </div>
        <p className="soccer-aim-hint soccer-aim-hint-keyboard">{mode === 'local' ? copy.aimHintLocal : copy.aimHintBot}</p>
        <p className="soccer-aim-hint soccer-aim-hint-touch">{mode === 'local' ? copy.touchAimHintLocal : copy.touchAimHintBot}</p>
        <TouchControls locale={locale} enabled={status==='playing'} groups={(()=>{const groups:TouchGroup[]=[{label:copy.p1Controls,buttons:[['←','p1Left'],['→','p1Right'],['↑','p1Jump'],['⌒','p1AimUp'],['↓','p1AimDown'],[copy.kick,'p1Kick']]}];if(mode==='local')groups.push({label:copy.p2Controls,buttons:[['←','p2Left'],['→','p2Right'],['↑','p2Jump'],['⌒','p2AimUp'],['↓','p2AimDown'],[copy.kick,'p2Kick']]});return groups})()} onCancel={()=>setStatus('paused')} onKey={(key,pressed)=>{
          if(key==='p1Left')hold('p1Left',pressed);if(key==='p1Right')hold('p1Right',pressed);if(key==='p1Jump'&&pressed)hold('p1Jump',true);if(key==='p1AimUp')hold('p1AimUp',pressed);if(key==='p1AimDown')hold('p1AimDown',pressed);if(key==='p1Kick'){hold('p1KickHeld',pressed);if(!pressed)hold('p1Kick',true)}
          if(key==='p2Left')hold('p2Left',pressed);if(key==='p2Right')hold('p2Right',pressed);if(key==='p2Jump'&&pressed)hold('p2Jump',true);if(key==='p2AimUp')hold('p2AimUp',pressed);if(key==='p2AimDown')hold('p2AimDown',pressed);if(key==='p2Kick'){hold('p2KickHeld',pressed);if(!pressed)hold('p2Kick',true)}
        }} />
      </div>


    </div>
  )
}
