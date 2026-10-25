import { TouchControls } from '../kit/TouchControls.tsx'
import { planet, spacecraft, bevel, orb, polygon } from '../kit/art.ts'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'
import { useGameSession } from '../kit/use-game-session.ts'
import { useCanvasResolution } from '../kit/use-canvas-resolution.ts'
import { GameOverlay } from '../kit/GameOverlay.tsx'
import { GamePanel } from '../kit/GamePanel.tsx'
import { SoundToggle } from '../kit/SoundToggle.tsx'
import { useGameAudio } from '../kit/use-game-audio.ts'
import { aimedShot, makeFormation } from './mechanics.ts'
import type { Enemy } from './mechanics.ts'

type Shot = { x: number; y: number; vx: number; vy: number; owner: 'player' | 'enemy' }
type Pickup = { x: number; y: number; kind: 'shield' | 'rapid' }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
type Scene = { kills: number; combo: number; comboTimer: number; pulseEnergy: number; pulseFlash: number; diveTimer: number; shipX: number; enemies: Enemy[]; shots: Shot[]; pickups: Pickup[]; particles: Particle[]; direction: number; wave: number; lives: number; score: number; shootTimer: number; enemyShotTimer: number; waveTimer: number; betweenWaves: boolean; invulnerable: number; shieldTimer: number; rapidTimer: number; elapsed: number }
type ScoreEntry = { name: string; score: number }

const WIDTH = 800
const HEIGHT = 500
const SHIP_Y = 438
const SCORES_KEY = 'playcove.star-patrol.scores'
const NAME_KEY = 'playcove.star-patrol.nickname'

function createScene(): Scene {
  return { kills: 0, combo: 0, comboTimer: 0, pulseEnergy: 100, pulseFlash: 0, diveTimer: 4, shipX: WIDTH / 2, enemies: makeFormation(1), shots: [], pickups: [], particles: [], direction: 1, wave: 1, lives: 3, score: 0, shootTimer: 0, enemyShotTimer: 1.4, waveTimer: 0, betweenWaves: false, invulnerable: 0, shieldTimer: 0, rapidTimer: 0, elapsed: 0 }
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

function burst(scene: Scene, x: number, y: number, color: string) {
  for (let index = 0; index < 12; index += 1) {
    const angle = Math.PI * 2 * index / 12
    const speed = 60 + (index % 4) * 24
    scene.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.36, color })
  }
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, time: number, waveLabel: string, shieldLabel: string, rapidLabel: string) {
  context.clearRect(0, 0, WIDTH, HEIGHT)
  context.fillStyle = '#11183e'
  context.fillRect(0, 0, WIDTH, HEIGHT)
  planet(context,WIDTH-120,HEIGHT*.48,110,'#657aa1',true)
  for (let index = 0; index < 68; index += 1) {
    const x = (index * 149 + 17) % WIDTH
    const baseY = (index * 83 + 31) % HEIGHT
    const y = (baseY + scene.elapsed * (8 + index % 17)) % HEIGHT
    context.globalAlpha = 0.34 + ((index % 4) * 0.14)
    context.fillStyle = index % 9 === 0 ? '#9bf3d0' : '#fff'
    context.fillRect(x, y, index % 8 === 0 ? 2 : 1, index % 8 === 0 ? 2 : 1)
  }
  context.globalAlpha = 1
  const nebula = context.createLinearGradient(0, 120, WIDTH, 360)
  nebula.addColorStop(0, 'rgba(89,67,143,.08)')
  nebula.addColorStop(0.5, 'rgba(116,82,174,.24)')
  nebula.addColorStop(1, 'rgba(54,73,146,.08)')
  context.fillStyle = nebula
  context.fillRect(0, 115, WIDTH, 255)

  for (const enemy of scene.enemies) {
    if (enemy.phase === 2) {
      context.fillStyle = enemy.hits < enemy.maxHits / 2 ? '#fa728c' : '#b69aff'
      context.beginPath()
      context.roundRect(enemy.x - 62, enemy.y - 26, 124, 50, 15)
      context.fill()
      bevel(context,enemy.x-62,enemy.y-26,124,50,enemy.hits<enemy.maxHits/2?'#df8899':'#b39edc',15);
      for(const side of[-1,1]){bevel(context,enemy.x+side*51-11,enemy.y+10,22,23,'#7c89b9',4);orb(context,enemy.x+side*51,enemy.y+27,5,'#d5e8c8')}
      context.fillStyle = '#ffe2a4'
      context.fillRect(enemy.x - 36, enemy.y - 11, 72, 8)
      context.fillStyle = '#ffffff25'
      context.fillRect(160, 18, WIDTH - 320, 6)
      context.fillStyle = '#b69aff'
      context.fillRect(160, 18, (WIDTH - 320) * enemy.hits / enemy.maxHits, 6)
      continue
    }
    if (enemy.dive < 0) {
      context.strokeStyle = '#ff8d9d'
      context.lineWidth = 2
      context.beginPath()
      context.arc(enemy.x, enemy.y, 26 + Math.sin(time / 65) * 4, 0, Math.PI * 2)
      context.stroke()
    }
    const color = enemy.phase ? '#f8a85e' : '#9bf3d0'
    context.fillStyle = color
    context.beginPath()
    context.moveTo(enemy.x - 19, enemy.y - 9)
    context.lineTo(enemy.x - 7, enemy.y - 17)
    context.lineTo(enemy.x + 7, enemy.y - 17)
    context.lineTo(enemy.x + 19, enemy.y - 9)
    context.lineTo(enemy.x + 15, enemy.y + 10)
    context.lineTo(enemy.x + 7, enemy.y + 6)
    context.lineTo(enemy.x, enemy.y + 14)
    context.lineTo(enemy.x - 7, enemy.y + 6)
    context.lineTo(enemy.x - 15, enemy.y + 10)
    context.closePath()
    context.fill()
    polygon(context,[enemy.x,enemy.y-14,enemy.x+6,enemy.y-4,enemy.x,enemy.y+9,enemy.x-6,enemy.y-4],'#ffffff44')
    context.fillStyle = '#1c264c'
    context.fillRect(enemy.x - 9, enemy.y - 6, 5, 4)
    context.fillRect(enemy.x + 4, enemy.y - 6, 5, 4)
    if (enemy.hits > 1) {
      context.fillStyle = '#fff2bc'
      context.fillRect(enemy.x - 13, enemy.y - 24, 26, 3)
    }
  }

  for (const shot of scene.shots) {
    context.fillStyle = shot.owner === 'player' ? '#ffe278' : '#ff7287'
    context.shadowColor = context.fillStyle
    context.shadowBlur = 10
    context.beginPath()
    context.roundRect(shot.x - 3, shot.y - 9, 6, 18, 3)
    context.fill()
    context.shadowBlur = 0
  }

  for (const pickup of scene.pickups) {
    const color = pickup.kind === 'shield' ? '#77d6ff' : '#b5f26d'
    context.fillStyle = color
    context.shadowColor = color
    context.shadowBlur = 14
    context.beginPath()
    context.arc(pickup.x, pickup.y, 12, 0, Math.PI * 2)
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#172047'
    context.font = '900 14px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(pickup.kind === 'shield' ? 'S' : '⚡', pickup.x, pickup.y + 5)
  }

  for (const particle of scene.particles) {
    context.globalAlpha = Math.max(0, particle.life / 0.36)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x, particle.y, 2.5, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1

  if (scene.pulseFlash > 0) {
    context.strokeStyle = `rgba(155,243,208,${scene.pulseFlash / 0.5})`
    context.lineWidth = 15
    context.beginPath()
    context.arc(scene.shipX, SHIP_Y, (1 - scene.pulseFlash / 0.5) * 850 + 30, 0, Math.PI * 2)
    context.stroke()
  }
  const blink = scene.invulnerable > 0 && Math.floor(time / 80) % 2 === 0
  if (!blink) {
    spacecraft(context,scene.shipX,SHIP_Y,.92,'#aecfe2',false,scene.elapsed)
    context.fillStyle = '#fff1ac'
    context.beginPath()
    context.moveTo(scene.shipX - 6, SHIP_Y + 17)
    context.lineTo(scene.shipX, SHIP_Y + 34 + Math.sin(time / 45) * 5)
    context.lineTo(scene.shipX + 6, SHIP_Y + 17)
    context.fill()
  }
  if (scene.shieldTimer > 0) {
    context.strokeStyle = `rgba(119,214,255,${0.45 + Math.sin(time / 70) * 0.16})`
    context.lineWidth = 3
    context.beginPath()
    context.arc(scene.shipX, SHIP_Y + 2, 31, 0, Math.PI * 2)
    context.stroke()
  }
  context.textAlign = 'right'
  context.font = '800 10px system-ui, sans-serif'
  if (scene.shieldTimer > 0) {
    context.fillStyle = '#77d6ff'
    context.fillText(`${shieldLabel} ${Math.ceil(scene.shieldTimer)}s`, WIDTH - 18, 24)
  }
  if (scene.rapidTimer > 0) {
    context.fillStyle = '#b5f26d'
    context.fillText(`${rapidLabel} ${Math.ceil(scene.rapidTimer)}s`, WIDTH - 18, scene.shieldTimer > 0 ? 40 : 24)
  }

  if (scene.betweenWaves) {
    context.fillStyle = '#fff'
    context.font = '900 26px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(`${(scene.wave + 1) % 4 === 0 ? 'BOSS · ' : ''}${waveLabel} ${scene.wave + 1}`, WIDTH / 2, HEIGHT / 2)
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    label: 'ARCADE · OBRONA KOSMOSU', title: 'Utrzymaj formację.', score: 'WYNIK', best: 'REKORD', wave: 'FALA', lives: 'ŻYCIA', history: 'NAJLEPSZE WYNIKI', pause: 'Pauza', nickname: 'PSEUDONIM', save: 'Zapisz wynik', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU', shield: 'TARCZA', rapid: 'SZYBKI OGIEŃ',
    ready: 'Statek gotowy.', readyText: 'Statek strzela automatycznie. Unikaj pocisków, łap ulepszenia. Spacja używa naładowanego impulsu. Co czwartą falę czeka boss.', over: 'Statek utracony', paused: 'Gra wstrzymana',
    start: 'Start', again: 'Jeszcze raz', resume: 'Wznów', move: 'RUCH', fire: 'IMPULS', upgrade: 'TARCZA · SZYBKOSTRZELNOŚĆ',
  } : {
    label: 'ARCADE · DEEP SPACE DEFENCE', title: 'Hold the formation.', score: 'SCORE', best: 'BEST', wave: 'WAVE', lives: 'LIVES', history: 'HIGH SCORES', pause: 'Pause', nickname: 'NICKNAME', save: 'Save score', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE', shield: 'SHIELD', rapid: 'RAPID FIRE',
    ready: 'Ship systems ready.', readyText: 'Your ship fires automatically. Dodge, collect upgrades, and press Space to clear bullets with a charged pulse. A boss guards every fourth wave.', over: 'Ship lost', paused: 'Game paused',
    start: 'Start patrol', again: 'Play again', resume: 'Resume', move: 'MOVE', fire: 'PULSE', upgrade: 'SHIELD · RAPID FIRE',
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const canvasRevision = useCanvasResolution(canvasRef, WIDTH, HEIGHT)
  const [initialScene] = useState(createScene)
  const sceneRef = useRef(initialScene)
  const inputRef = useRef({ left: false, right: false, fire: false })
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
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
  const [pulseEnergy, setPulseEnergy] = useState(100)
  const [combo, setCombo] = useState(0)
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
      renderScene(drawingContext, scene, performance.now(), copy.wave, copy.shield, copy.rapid)
      return
    }
    let animationFrame = 0
    let previousTime = 0
    let scoreUpdate = 0
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      if (['arrowleft', 'arrowright', ' ', 'a', 'd'].includes(key)) event.preventDefault()
      if (key === 'arrowleft' || key === 'a') inputRef.current.left = true
      if (key === 'arrowright' || key === 'd') inputRef.current.right = true
      if (event.code === 'Space' && !event.repeat) inputRef.current.fire = true
    }
    function keyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') inputRef.current.left = false
      if (key === 'arrowright' || key === 'd') inputRef.current.right = false
      if (event.code === 'Space') inputRef.current.fire = false
    }
    function finish() {
      setScore(scene.score)
      setStatus('over')
    }
    function damageEnemy(index: number, damage: number) {
      const enemy = scene.enemies[index]
      enemy.hits -= damage
      burst(scene, enemy.x, enemy.y, enemy.phase === 2 ? '#b69aff' : '#9bf3d0')
      scene.pulseEnergy = Math.min(100, scene.pulseEnergy + (enemy.phase === 2 ? 2 : 4))
      if (enemy.hits > 0) return
      audio.play('hit')
      scene.enemies.splice(index, 1)
      scene.kills += 1
      scene.combo = scene.comboTimer > 0 ? Math.min(5, scene.combo + 1) : 1
      scene.comboTimer = 2.5
      scene.score += (enemy.phase === 2 ? 300 : 10) * scene.wave * scene.combo
      scene.pulseEnergy = Math.min(100, scene.pulseEnergy + 10)
      if (scene.kills % 5 === 0 || enemy.phase === 2) {
        scene.pickups.push({ x: enemy.x, y: enemy.y, kind: scene.kills % 10 === 0 ? 'shield' : 'rapid' })
      }
    }
    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.034)
      previousTime = time
      scene.elapsed += delta
      scene.pulseFlash = Math.max(0, scene.pulseFlash - delta)
      scene.comboTimer = Math.max(0, scene.comboTimer - delta)
      if (scene.comboTimer === 0) scene.combo = 0
      if (inputRef.current.fire && scene.pulseEnergy >= 100 && !scene.betweenWaves) {
        audio.play('boost')
        scene.pulseEnergy = 0
        scene.pulseFlash = 0.5
        scene.shots = scene.shots.filter((shot) => shot.owner === 'player')
        for (let index = scene.enemies.length - 1; index >= 0; index -= 1) {
          const enemy = scene.enemies[index]
          if (Math.hypot(enemy.x - scene.shipX, enemy.y - SHIP_Y) < 210) damageEnemy(index, 1)
        }
        scene.invulnerable = Math.max(0.5, scene.invulnerable)
      }
      inputRef.current.fire = false
      scene.invulnerable = Math.max(0, scene.invulnerable - delta)
      scene.shieldTimer = Math.max(0, scene.shieldTimer - delta)
      scene.rapidTimer = Math.max(0, scene.rapidTimer - delta)
      scene.shootTimer = Math.max(0, scene.shootTimer - delta)

      if (inputRef.current.left) scene.shipX -= 410 * delta
      if (inputRef.current.right) scene.shipX += 410 * delta
      scene.shipX = Math.max(30, Math.min(WIDTH - 30, scene.shipX))
      if (scene.shootTimer === 0 && !scene.betweenWaves) {
        for (const offset of scene.rapidTimer > 0 ? [-9, 9] : [0]) scene.shots.push({ x: scene.shipX + offset, y: SHIP_Y - 21, vx: 0, vy: -640, owner: 'player' })
        scene.shootTimer = scene.rapidTimer > 0 ? 0.12 : 0.2
      }

      if (scene.betweenWaves) {
        scene.waveTimer -= delta
        if (scene.waveTimer <= 0) {
          scene.wave += 1
          scene.enemies = makeFormation(scene.wave)
          scene.betweenWaves = false
          scene.enemyShotTimer = 1
          setWave(scene.wave)
        }
      } else {
        const boss = scene.enemies.find((enemy) => enemy.phase === 2)
        const formationSpeed = Math.min(150, 40 + scene.wave * 6 + Math.max(0, 16 - scene.enemies.length) * 3)
        const formation = scene.enemies.filter((enemy) => enemy.phase !== 2 && enemy.dive === 0)
        for (const enemy of formation) { enemy.x += scene.direction * formationSpeed * delta; enemy.homeX = enemy.x }
        if (formation.some((enemy) => scene.direction > 0 ? enemy.x > WIDTH - 45 : enemy.x < 45)) {
          scene.direction *= -1
          for (const enemy of formation) { enemy.y += 10; enemy.homeY = enemy.y }
        }
        scene.diveTimer -= delta
        if (scene.wave >= 2 && scene.diveTimer <= 0 && formation.length > 0) {
          const diver = formation[Math.floor(Math.random() * formation.length)]
          diver.dive = -0.65
          scene.diveTimer = Math.max(1.5, 4.5 - scene.wave * 0.15)
        }
        for (const enemy of scene.enemies) {
          if (enemy.dive < 0) enemy.dive = enemy.dive + delta >= 0 ? 0.001 : enemy.dive + delta
          else if (enemy.dive > 0) {
            enemy.dive += delta * 0.48
            if (enemy.dive >= 1) { enemy.dive = 0; enemy.x = enemy.homeX; enemy.y = enemy.homeY }
            else {
              enemy.x = enemy.homeX + Math.sin(enemy.dive * Math.PI * 2) * 110
              enemy.y = enemy.homeY + Math.sin(enemy.dive * Math.PI) * (SHIP_Y - enemy.homeY - 12)
            }
          }
        }
        if (boss) { boss.x = WIDTH / 2 + Math.sin(scene.elapsed * 0.8) * 240; boss.y = 90 + Math.sin(scene.elapsed * 1.4) * 18 }
        scene.enemyShotTimer -= delta
        if (scene.enemyShotTimer <= 0 && scene.enemies.length) {
          const shooter = boss ?? scene.enemies[Math.floor(Math.random() * scene.enemies.length)]
          const velocity = aimedShot(shooter.x, shooter.y, scene.shipX, 220 + Math.min(100, scene.wave * 8))
          if (boss) {
            const count = boss.hits < boss.maxHits / 2 ? 7 : 5
            for (let index = 0; index < count; index += 1) {
              const angle = (index - (count - 1) / 2) * 0.2
              scene.shots.push({ x: shooter.x, y: shooter.y + 28, vx: Math.sin(angle) * 265, vy: Math.cos(angle) * 265, owner: 'enemy' })
            }
          } else scene.shots.push({ x: shooter.x, y: shooter.y + 18, ...velocity, owner: 'enemy' })
          scene.enemyShotTimer = boss ? (boss.hits < boss.maxHits / 2 ? 0.65 : 0.95) : Math.max(0.35, 1.15 - scene.wave * 0.055)
        }
      }

      for (let index = scene.shots.length - 1; index >= 0; index -= 1) {
        const shot = scene.shots[index]
        shot.x += shot.vx * delta
        shot.y += shot.vy * delta
        if (shot.y < -20 || shot.y > HEIGHT + 20) {
          scene.shots.splice(index, 1)
          continue
        }
        if (shot.owner === 'player') {
          const hitIndex = scene.enemies.findIndex((enemy) => Math.abs(enemy.x - shot.x) < (enemy.phase === 2 ? 65 : 23) && Math.abs(enemy.y - shot.y) < (enemy.phase === 2 ? 29 : 21))
          if (hitIndex >= 0) {
            scene.shots.splice(index, 1)
            damageEnemy(hitIndex, 1)
            continue
          }
        } else if (Math.abs(shot.x - scene.shipX) < 19 && shot.y > SHIP_Y - 18 && shot.y < SHIP_Y + 25) {
          scene.shots.splice(index, 1)
          if (scene.shieldTimer > 0) {
            burst(scene, scene.shipX, SHIP_Y, '#77d6ff')
          } else if (scene.invulnerable === 0) {
            scene.lives -= 1
            scene.invulnerable = 1.25
            setLives(scene.lives)
            burst(scene, scene.shipX, SHIP_Y, '#ff7287')
            if (scene.lives <= 0) {
              finish()
              renderScene(drawingContext, scene, time, copy.wave, copy.shield, copy.rapid)
              return
            }
          }
        }
      }

      if (scene.invulnerable === 0 && scene.shieldTimer === 0 && scene.enemies.some((enemy) => enemy.dive > 0 && Math.abs(enemy.x - scene.shipX) < 33 && Math.abs(enemy.y - SHIP_Y) < 30)) {
        scene.lives -= 1
        scene.invulnerable = 1.5
        setLives(scene.lives)
        burst(scene, scene.shipX, SHIP_Y, '#ff7287')
        if (scene.lives <= 0) { finish(); return }
      }
      for (let index = scene.pickups.length - 1; index >= 0; index -= 1) {
        const pickup = scene.pickups[index]
        pickup.y += 94 * delta
        if (pickup.y > HEIGHT + 15) {
          scene.pickups.splice(index, 1)
        } else if (Math.abs(pickup.x - scene.shipX) < 24 && Math.abs(pickup.y - SHIP_Y) < 30) {
          if (pickup.kind === 'shield') scene.shieldTimer = 5
          else scene.rapidTimer = 6
          scene.pickups.splice(index, 1)
          burst(scene, scene.shipX, SHIP_Y, pickup.kind === 'shield' ? '#77d6ff' : '#b5f26d')
        }
      }

      for (let index = scene.particles.length - 1; index >= 0; index -= 1) {
        const particle = scene.particles[index]
        particle.life -= delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.vy += 100 * delta
        if (particle.life <= 0) scene.particles.splice(index, 1)
      }

      if (!scene.betweenWaves && scene.enemies.length === 0) {
        audio.play('point')
        scene.score += 100 * scene.wave
        scene.betweenWaves = true
        scene.waveTimer = 1
        scene.shots = scene.shots.filter((shot) => shot.owner === 'player')
        setScore(scene.score)
      }
      if (!scene.betweenWaves && scene.enemies.some((enemy) => enemy.dive === 0 && enemy.y > SHIP_Y - 38)) {
        finish()
        renderScene(drawingContext, scene, time, copy.wave, copy.shield, copy.rapid)
        return
      }
      scoreUpdate += delta
      if (scoreUpdate > 0.15) {
        scoreUpdate = 0
        setScore(scene.score)
        setPulseEnergy(Math.floor(scene.pulseEnergy))
        setCombo(scene.combo)
      }
      renderScene(drawingContext, scene, time, copy.wave, copy.shield, copy.rapid)
      animationFrame = requestAnimationFrame(frame)
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    animationFrame = requestAnimationFrame(frame)
    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      inputRef.current = { left: false, right: false, fire: false }
    }
  }, [status, locale, canvasRevision])

  function start() {
    setRunBest(records[0]?.score ?? 0)
    sceneRef.current = createScene()
    inputRef.current = { left: false, right: false, fire: false }
    setScore(0)
    setWave(1)
    setLives(3)
    setPulseEnergy(100)
    setCombo(0)
    setSaved(false)
    setStatus('playing')
  }
  function hold(key: 'left' | 'right' | 'fire', pressed: boolean) { inputRef.current[key] = pressed }
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
    <div className={`module-game arcade-module star-module${status === 'playing' ? ' is-playing' : ''}`}>
      <div className="module-game-main">

        <div className="canvas-wrap arcade-canvas-wrap star-canvas-wrap">
        <div className="module-game-heading game-frame-bar"><div><span className="game-small-label">{copy.label}</span><h2>STAR PATROL</h2></div><div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div><div className="score-readout"><span>{copy.wave}</span><strong>{wave.toString().padStart(2, '0')}</strong></div><div className="score-readout"><span>{copy.lives}</span><strong>{'♥'.repeat(Math.max(0, lives))}</strong></div></div></div>
          <canvas tabIndex={0} ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Pole gry Star Patrol' : 'Star Patrol play field'} />
        {status === 'playing' && <div className="arcade-livebar"><span>{locale === 'pl' ? 'AUTO OGIEŃ' : 'AUTO FIRE'}{combo > 1 ? ` · ×${combo}` : ''}</span><label className="boost-meter"><span>{copy.fire}</span><span className="boost-meter-track"><i style={{ width: `${pulseEnergy}%` }} /></span><span>{pulseEnergy}%</span></label></div>}
          <SoundToggle locale={locale} enabled={soundEnabled} onToggle={toggleSound} onPause={status === 'playing' ? () => setStatus('paused') : undefined} />
          <GamePanel locale={locale} onOpen={() => { if (status === 'playing') setStatus('paused') }}>
      <aside className="game-scoreboard arcade-scoreboard"><div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div><p className="scoreboard-foot">{copy.upgrade}</p><label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label><div className="scoreboard-rule" /><div className="scoreboard-list">{records.length ? records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div><div className="scoreboard-foot">{copy.local} · {copy.best}: {best.toLocaleString(locale)}</div></aside>
          </GamePanel>
          <GameOverlay gameName="STAR PATROL" onRestart={start} status={status} locale={locale} title={status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready} description={status === 'over' ? (locale === 'pl' ? 'Zmieniaj pozycję po salwie. Zostaw sobie drogę ucieczki.' : 'Move after each volley. Keep an escape route open.') : copy.readyText} actionLabel={status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start} onAction={status === 'paused' ? () => setStatus('playing') : start} result={{ value: score, label: copy.score, score, best: runBest, saved, stats: [{ label: copy.wave, value: wave }, { label: locale === 'pl' ? 'CZAS' : 'TIME', value: `${Math.floor(sceneRef.current.elapsed)}s` }, { label: locale === 'pl' ? 'ZESTRZELENIA' : 'DESTROYED', value: sceneRef.current.kills }] }} />
        </div>
        <TouchControls locale={locale} enabled={status==='playing'} groups={[{label:locale==='pl'?'Automatyczny ostrzał':'Automatic fire',buttons:[['←','left'],['✦ '+copy.fire,'fire'],['→','right']]}]} onCancel={()=>setStatus('paused')} onKey={(key,pressed)=>{if(key==='left'||key==='right'||key==='fire')hold(key,pressed)}} />
      </div>

    </div>
  )
}
