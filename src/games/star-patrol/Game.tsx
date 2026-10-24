import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type Enemy = { x: number; y: number; phase: number }
type Shot = { x: number; y: number; vy: number; owner: 'player' | 'enemy' }
type Pickup = { x: number; y: number; kind: 'shield' | 'rapid' }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string }
type Scene = { shipX: number; enemies: Enemy[]; shots: Shot[]; pickups: Pickup[]; particles: Particle[]; direction: number; wave: number; lives: number; score: number; shootTimer: number; enemyShotTimer: number; waveTimer: number; betweenWaves: boolean; invulnerable: number; shieldTimer: number; rapidTimer: number; elapsed: number }
type ScoreEntry = { name: string; score: number }

const WIDTH = 800
const HEIGHT = 500
const SHIP_Y = 438
const SCORES_KEY = 'playcove.star-patrol.scores'
const NAME_KEY = 'playcove.star-patrol.nickname'

function makeFormation(wave: number) {
  const enemies: Enemy[] = []
  const rows = Math.min(5, 3 + Math.floor((wave - 1) / 3))
  const columns = Math.min(7, 5 + Math.floor((wave - 1) / 2))
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      enemies.push({ x: (WIDTH - (columns - 1) * 72) / 2 + column * 72, y: 76 + row * 45, phase: (row + column) % 2 })
    }
  }
  return enemies
}

function createScene(): Scene {
  return { shipX: WIDTH / 2, enemies: makeFormation(1), shots: [], pickups: [], particles: [], direction: 1, wave: 1, lives: 3, score: 0, shootTimer: 0, enemyShotTimer: 1.4, waveTimer: 0, betweenWaves: false, invulnerable: 0, shieldTimer: 0, rapidTimer: 0, elapsed: 0 }
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
    context.fillStyle = '#1c264c'
    context.fillRect(enemy.x - 9, enemy.y - 6, 5, 4)
    context.fillRect(enemy.x + 4, enemy.y - 6, 5, 4)
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

  const blink = scene.invulnerable > 0 && Math.floor(time / 80) % 2 === 0
  if (!blink) {
    context.fillStyle = '#8ac9ff'
    context.beginPath()
    context.moveTo(scene.shipX, SHIP_Y - 20)
    context.lineTo(scene.shipX + 22, SHIP_Y + 17)
    context.lineTo(scene.shipX + 9, SHIP_Y + 13)
    context.lineTo(scene.shipX, SHIP_Y + 21)
    context.lineTo(scene.shipX - 9, SHIP_Y + 13)
    context.lineTo(scene.shipX - 22, SHIP_Y + 17)
    context.closePath()
    context.fill()
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
    context.fillText(`${waveLabel} ${scene.wave + 1}`, WIDTH / 2, HEIGHT / 2)
  }
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    label: 'ARCADE · OBRONA KOSMOSU', title: 'Utrzymaj formację.', score: 'WYNIK', best: 'REKORD', wave: 'FALA', lives: 'ŻYCIA', history: 'NAJLEPSZE WYNIKI', pause: 'Pauza', nickname: 'PSEUDONIM', save: 'Zapisz wynik', empty: 'Zagraj i zapisz pierwszy wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU', shield: 'TARCZA', rapid: 'SZYBKI OGIEŃ',
    ready: 'Statek gotowy.', readyText: 'Unikaj pocisków i strzelaj w formacje. Zbieraj tarczę oraz szybkostrzelność.', over: 'Statek utracony', paused: 'Gra wstrzymana',
    start: 'Start', again: 'Jeszcze raz', resume: 'Wznów', move: 'RUCH', fire: 'STRZAŁ', upgrade: 'TARCZA · SZYBKOSTRZELNOŚĆ',
  } : {
    label: 'ARCADE · DEEP SPACE DEFENCE', title: 'Hold the formation.', score: 'SCORE', best: 'BEST', wave: 'WAVE', lives: 'LIVES', history: 'HIGH SCORES', pause: 'Pause', nickname: 'NICKNAME', save: 'Save score', empty: 'Play a round and save your first score.', local: 'SAVED ON THIS DEVICE', shield: 'SHIELD', rapid: 'RAPID FIRE',
    ready: 'Ship systems ready.', readyText: 'Dodge incoming fire and clear each formation. Pick up shield and rapid-fire upgrades.', over: 'Ship lost', paused: 'Game paused',
    start: 'Start patrol', again: 'Play again', resume: 'Resume', move: 'MOVE', fire: 'FIRE', upgrade: 'SHIELD · RAPID FIRE',
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene>(createScene())
  const inputRef = useRef({ left: false, right: false, fire: false })
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const [status, setStatus] = useState<'ready' | 'playing' | 'paused' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<ScoreEntry[]>([])
  const [saved, setSaved] = useState(false)
  const [wave, setWave] = useState(1)
  const [lives, setLives] = useState(3)
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
      if (event.code === 'Space') inputRef.current.fire = true
      if (event.key === 'Escape') setStatus('paused')
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
    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.034)
      previousTime = time
      scene.elapsed += delta
      scene.invulnerable = Math.max(0, scene.invulnerable - delta)
      scene.shieldTimer = Math.max(0, scene.shieldTimer - delta)
      scene.rapidTimer = Math.max(0, scene.rapidTimer - delta)
      scene.shootTimer = Math.max(0, scene.shootTimer - delta)

      if (inputRef.current.left) scene.shipX -= 410 * delta
      if (inputRef.current.right) scene.shipX += 410 * delta
      scene.shipX = Math.max(30, Math.min(WIDTH - 30, scene.shipX))
      if (inputRef.current.fire && scene.shootTimer === 0 && !scene.betweenWaves) {
        scene.shots.push({ x: scene.shipX, y: SHIP_Y - 21, vy: -560, owner: 'player' })
        scene.shootTimer = scene.rapidTimer > 0 ? 0.14 : 0.28
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
        const formationSpeed = 35 + scene.wave * 7 + (20 - scene.enemies.length) * 1.8
        for (const enemy of scene.enemies) enemy.x += scene.direction * formationSpeed * delta
        const minX = Math.min(...scene.enemies.map((enemy) => enemy.x))
        const maxX = Math.max(...scene.enemies.map((enemy) => enemy.x))
        if ((scene.direction > 0 && maxX > WIDTH - 58) || (scene.direction < 0 && minX < 58)) {
          scene.direction *= -1
          for (const enemy of scene.enemies) enemy.y += 16
        }
        scene.enemyShotTimer -= delta
        if (scene.enemyShotTimer <= 0 && scene.enemies.length) {
          const shooter = scene.enemies[Math.floor(Math.random() * scene.enemies.length)]
          scene.shots.push({ x: shooter.x, y: shooter.y + 18, vy: 260 + Math.min(100, scene.wave * 8), owner: 'enemy' })
          scene.enemyShotTimer = Math.max(0.38, 1.1 - scene.wave * 0.045) + Math.random() * 0.45
        }
      }

      for (let index = scene.shots.length - 1; index >= 0; index -= 1) {
        const shot = scene.shots[index]
        shot.y += shot.vy * delta
        if (shot.y < -20 || shot.y > HEIGHT + 20) {
          scene.shots.splice(index, 1)
          continue
        }
        if (shot.owner === 'player') {
          const hitIndex = scene.enemies.findIndex((enemy) => Math.abs(enemy.x - shot.x) < 23 && Math.abs(enemy.y - shot.y) < 21)
          if (hitIndex >= 0) {
            const [enemy] = scene.enemies.splice(hitIndex, 1)
            scene.shots.splice(index, 1)
            scene.score += 10 * scene.wave
            burst(scene, enemy.x, enemy.y, enemy.phase ? '#f8a85e' : '#9bf3d0')
            if (Math.random() < 0.13) scene.pickups.push({ x: enemy.x, y: enemy.y, kind: Math.random() < 0.5 ? 'shield' : 'rapid' })
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
        scene.score += 100 * scene.wave
        scene.betweenWaves = true
        scene.waveTimer = 1
        scene.shots = scene.shots.filter((shot) => shot.owner === 'player')
        setScore(scene.score)
      }
      if (!scene.betweenWaves && scene.enemies.some((enemy) => enemy.y > SHIP_Y - 38)) {
        finish()
        renderScene(drawingContext, scene, time, copy.wave, copy.shield, copy.rapid)
        return
      }
      scoreUpdate += delta
      if (scoreUpdate > 0.15) {
        scoreUpdate = 0
        setScore(scene.score)
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
  }, [status])

  function start() {
    sceneRef.current = createScene()
    inputRef.current = { left: false, right: false, fire: false }
    setScore(0)
    setWave(1)
    setLives(3)
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
        <div className="module-game-heading"><div><span className="game-small-label">{copy.label}</span><h2>{copy.title}</h2></div><div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{score.toString().padStart(3, '0')}</strong></div><div className="score-readout"><span>{copy.wave}</span><strong>{wave.toString().padStart(2, '0')}</strong></div><div className="score-readout"><span>{copy.lives}</span><strong>{'♥'.repeat(Math.max(0, lives))}</strong></div></div></div>
        {status === 'playing' && <div className="arcade-livebar"><span>{copy.move} · {copy.fire}</span><button onClick={() => setStatus('paused')}>Ⅱ {copy.pause}</button></div>}
        <div className="canvas-wrap arcade-canvas-wrap star-canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Pole gry Star Patrol' : 'Star Patrol play field'} />
          {status !== 'playing' && <div className="game-overlay"><span className="overlay-spark">{status === 'over' ? '✦' : '✧'}</span><strong>{status === 'over' ? copy.over : status === 'paused' ? copy.paused : copy.ready}</strong><span>{status === 'over' ? `${copy.score}: ${score} · ${copy.wave}: ${wave}` : copy.readyText}</span>{status === 'over' && score > 0 && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}<button className="game-button" onClick={status === 'paused' ? () => setStatus('playing') : start}>{status === 'paused' ? copy.resume : status === 'over' ? copy.again : copy.start}<span>→</span></button></div>}
        </div>
        <div className="game-touch-controls star-touch-controls"><button onPointerDown={() => hold('left', true)} onPointerUp={() => hold('left', false)} onPointerCancel={() => hold('left', false)} onPointerLeave={() => hold('left', false)} aria-label={locale === 'pl' ? 'W lewo' : 'Move left'}>←</button><button onPointerDown={() => hold('fire', true)} onPointerUp={() => hold('fire', false)} onPointerCancel={() => hold('fire', false)} onPointerLeave={() => hold('fire', false)} aria-label={copy.fire}>✦</button><button onPointerDown={() => hold('right', true)} onPointerUp={() => hold('right', false)} onPointerCancel={() => hold('right', false)} onPointerLeave={() => hold('right', false)} aria-label={locale === 'pl' ? 'W prawo' : 'Move right'}>→</button></div>
        <p className="arcade-controls-note"><span>{copy.move} <kbd>←</kbd> <kbd>→</kbd> <kbd>A</kbd> <kbd>D</kbd></span><span>{copy.fire} <kbd>SPACE</kbd></span></p>
      </div>
      <aside className="game-scoreboard arcade-scoreboard"><div className="scoreboard-heading"><span className="game-small-label">{copy.history}</span><span className="scoreboard-star">✳</span></div><p className="scoreboard-foot">{copy.upgrade}</p><label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label><div className="scoreboard-rule" /><div className="scoreboard-list">{records.length ? records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.score}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.score}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div><div className="scoreboard-foot">{copy.local} · {copy.best}: {best.toLocaleString(locale)}</div></aside>
    </div>
  )
}
