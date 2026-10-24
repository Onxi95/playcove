import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type UpgradeKey = 'launcher' | 'fuel' | 'glider' | 'magnet' | 'hops'
type UpgradeLevels = Record<UpgradeKey, number>
type RampId = 'snowbank' | 'rocket-ridge' | 'spring-peak' | 'aurora-chute' | 'cloud-pier'
type Ramp = { id: RampId; unlock: number; angle: number; power: number; fuel: number; glide: number; wind: number; hops: number }
type ScoreEntry = { name: string; score: number; distance: number }
type Career = { coins: number; bestDistance: number; totalDistance: number; totalFish: number; nickname: string; ramp: string; upgrades: UpgradeLevels; records: ScoreEntry[]; milestones: number[] }
type Obstacle = { x: number; width: number; height: number; kind: 'ice' | 'snowman' | 'crate'; counted: boolean }
type Pickup = { x: number; y: number; kind: 'fish' | 'star' | 'fuel'; phase: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; color: string; size: number }
type Scene = { x: number; y: number; vx: number; vy: number; tilt: number; fuel: number; maxFuel: number; rampHeight: number; hopsLeft: number; bounces: number; hits: number; invulnerable: number; elapsed: number; distance: number; score: number; fish: number; stars: number; nearMisses: number; combo: number; comboTimer: number; bonusPoints: number; obstacles: Obstacle[]; pickups: Pickup[]; particles: Particle[]; nextFeatureX: number; hopQueued: boolean; launched: boolean; boosting: boolean; wind: number; finished: boolean }
type Hud = { distance: number; height: number; score: number; fuel: number; wind: number; combo: number }

const WIDTH = 960
const HEIGHT = 540
const LAUNCH_X = 300
const PLAYER_W = 50
const PLAYER_H = 48
const RAMP_LENGTH = 242
const START_RAMP_HEIGHT = 148
const GRAVITY = 360
const CAREER_KEY = 'playcove.penguin-launch.career.v1'
const EMPTY_UPGRADES: UpgradeLevels = { launcher: 0, fuel: 0, glider: 0, magnet: 0, hops: 0 }
const DEFAULT_CAREER: Career = { coins: 0, bestDistance: 0, totalDistance: 0, totalFish: 0, nickname: 'Player', ramp: 'snowbank', upgrades: EMPTY_UPGRADES, records: [], milestones: [] }
const RAMPS: Ramp[] = [
  { id: 'snowbank', unlock: 0, angle: 0, power: 0, fuel: 0, glide: 0, wind: 1, hops: 0 },
  { id: 'rocket-ridge', unlock: 550, angle: -2, power: 90, fuel: 10, glide: -0.03, wind: 1, hops: 0 },
  { id: 'spring-peak', unlock: 1700, angle: 5, power: 25, fuel: 0, glide: 0.02, wind: 0.96, hops: 1 },
  { id: 'aurora-chute', unlock: 4200, angle: 2, power: 65, fuel: 18, glide: 0.08, wind: 0.7, hops: 0 },
  { id: 'cloud-pier', unlock: 9000, angle: 7, power: 130, fuel: 25, glide: 0.1, wind: 0.8, hops: 1 },
]
const REGIONS = [
  { at: 0, en: 'Frost Flats', pl: 'Lodowe Pola', sky: ['#6ba9d3', '#d7f1eb'], far: '#91c3d5', near: '#c1e0e4', wind: 70 },
  { at: 550, en: 'Pine Coast', pl: 'Sosnowe Wybrzeże', sky: ['#62a8c0', '#bce7dc'], far: '#5e9c9c', near: '#a8d5c2', wind: 100 },
  { at: 1700, en: 'Aurora Cliffs', pl: 'Klify zorzy', sky: ['#314d8e', '#a7c7da'], far: '#566c9c', near: '#8caac1', wind: 135 },
  { at: 4200, en: 'Cloud Sea', pl: 'Morze chmur', sky: ['#745fae', '#e7b7c3'], far: '#8b7db5', near: '#d5c2d0', wind: 160 },
  { at: 9000, en: 'Starfall Reach', pl: 'Rubieże gwiazd', sky: ['#172754', '#536d9d'], far: '#44577d', near: '#8898ad', wind: 185 },
]
const UPGRADE_INFO: Record<UpgradeKey, { base: number; max: number }> = { launcher: { base: 40, max: 10 }, fuel: { base: 45, max: 10 }, glider: { base: 55, max: 10 }, magnet: { base: 65, max: 8 }, hops: { base: 85, max: 4 } }
const MILESTONES = [550, 1700, 4200, 9000]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readCareer(): Career {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(CAREER_KEY) ?? 'null')
    if (!isRecord(stored)) return { ...DEFAULT_CAREER, upgrades: { ...EMPTY_UPGRADES } }
    const savedUpgrades = isRecord(stored.upgrades) ? stored.upgrades : {}
    const upgrades: UpgradeLevels = {
      launcher: validLevel(savedUpgrades.launcher, 10),
      fuel: validLevel(savedUpgrades.fuel, 10),
      glider: validLevel(savedUpgrades.glider, 10),
      magnet: validLevel(savedUpgrades.magnet, 8),
      hops: validLevel(savedUpgrades.hops, 4),
    }
    const records = Array.isArray(stored.records) ? stored.records.filter((entry): entry is ScoreEntry => isRecord(entry) && typeof entry.name === 'string' && typeof entry.score === 'number' && typeof entry.distance === 'number').slice(0, 5) : []
    const milestones = Array.isArray(stored.milestones) ? stored.milestones.filter((entry): entry is number => typeof entry === 'number') : []
    const bestDistance = typeof stored.bestDistance === 'number' && Number.isFinite(stored.bestDistance) ? Math.max(0, stored.bestDistance) : 0
    const selectedRamp = RAMPS.find((ramp) => ramp.id === stored.ramp && ramp.unlock <= bestDistance)?.id ?? 'snowbank'
    return {
      coins: typeof stored.coins === 'number' && Number.isFinite(stored.coins) ? Math.max(0, stored.coins) : 0,
      bestDistance,
      totalDistance: typeof stored.totalDistance === 'number' && Number.isFinite(stored.totalDistance) ? Math.max(0, stored.totalDistance) : 0,
      totalFish: typeof stored.totalFish === 'number' && Number.isFinite(stored.totalFish) ? Math.max(0, stored.totalFish) : 0,
      nickname: typeof stored.nickname === 'string' ? stored.nickname.slice(0, 14) : 'Player',
      ramp: selectedRamp,
      upgrades,
      records: records.sort((first, second) => second.score - first.score),
      milestones,
    }
  } catch {
    return { ...DEFAULT_CAREER, upgrades: { ...EMPTY_UPGRADES } }
  }
}

function validLevel(value: unknown, max: number) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(0, Math.floor(value))) : 0
}

function groundAt(x: number) {
  return 418 + Math.sin(x * 0.0021) * 15 + Math.sin(x * 0.00073 + 1.2) * 10 + Math.sin(x * 0.006) * 3
}

function rampProgress(x: number) {
  return Math.max(0, Math.min(1, (x - (LAUNCH_X - RAMP_LENGTH)) / RAMP_LENGTH))
}

function rampSurfaceY(x: number, height: number) {
  return groundAt(x) - rampProgress(x) * height
}

function regionAt(distance: number) {
  let region = REGIONS[0]
  for (const candidate of REGIONS) if (distance >= candidate.at) region = candidate
  return region
}

function makeScene(): Scene {
  const x = LAUNCH_X - RAMP_LENGTH + 18
  const rampHeight = START_RAMP_HEIGHT
  return { x, y: rampSurfaceY(x, rampHeight) - PLAYER_H, vx: 0, vy: 0, tilt: 0.48, fuel: 0, maxFuel: 0, rampHeight, hopsLeft: 0, bounces: 0, hits: 0, invulnerable: 0, elapsed: 0, distance: 0, score: 0, fish: 0, stars: 0, nearMisses: 0, combo: 0, comboTimer: 0, bonusPoints: 0, obstacles: [], pickups: [], particles: [], nextFeatureX: LAUNCH_X + 700, hopQueued: false, launched: false, boosting: false, wind: 0, finished: false }
}

function addBurst(scene: Scene, x: number, y: number, color: string, count = 14) {
  for (let index = 0; index < count; index += 1) {
    const angle = Math.PI * 2 * index / count
    const speed = 70 + (index % 4) * 48
    scene.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.35 + (index % 3) * 0.12, color, size: 2 + index % 3 })
  }
}

function createFeatures(scene: Scene) {
  while (scene.nextFeatureX < scene.x + WIDTH * 1.6) {
    const obstacleX = scene.nextFeatureX
    if (Math.random() < 0.76) {
      const kind = Math.random() < 0.5 ? 'ice' : Math.random() < 0.55 ? 'snowman' : 'crate'
      scene.obstacles.push({ x: obstacleX, width: kind === 'ice' ? 48 : 42, height: kind === 'ice' ? 48 + Math.random() * 32 : kind === 'snowman' ? 58 : 52, kind, counted: false })
    }
    const fishY = groundAt(obstacleX + 260) - (200 + Math.random() * 85)
    const arc = Math.random() * Math.PI
    for (let index = 0; index < 6; index += 1) {
      const x = obstacleX + 165 + index * 42
      const y = fishY - Math.sin(arc * index / 5) * (45 + Math.random() * 15)
      scene.pickups.push({ x, y, kind: 'fish', phase: index })
    }
    if (Math.random() < 0.44) scene.pickups.push({ x: obstacleX + 340, y: groundAt(obstacleX + 340) - 205 - Math.random() * 85, kind: 'star', phase: Math.random() * 4 })
    if (Math.random() < 0.3) scene.pickups.push({ x: obstacleX + 480, y: groundAt(obstacleX + 480) - 135, kind: 'fuel', phase: 0 })
    scene.nextFeatureX += 430 + Math.random() * 370
  }
}

function drawPenguin(context: CanvasRenderingContext2D, x: number, y: number, tilt: number, time: number, boosting: boolean, damaged: boolean) {
  context.save()
  context.translate(x + PLAYER_W / 2, y + PLAYER_H / 2)
  context.rotate(-tilt)
  if (boosting) {
    context.shadowColor = '#ffd86e'
    context.shadowBlur = 26
    context.fillStyle = '#ffb45f'
    context.beginPath()
    context.moveTo(-25, 2)
    context.lineTo(-47 - Math.sin(time * 30) * 8, 0)
    context.lineTo(-26, 12)
    context.closePath()
    context.fill()
    context.shadowBlur = 0
  }
  context.fillStyle = damaged ? '#fff' : '#26384d'
  context.beginPath()
  context.ellipse(-2, 4, 21, 26, -0.12, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f8ffff'
  context.beginPath()
  context.ellipse(4, 10, 12, 18, -0.08, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = damaged ? '#fff' : '#26384d'
  context.beginPath()
  context.arc(8, -17, 17, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#fff'
  context.beginPath()
  context.arc(14, -20, 2.7, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#26384d'
  context.beginPath()
  context.arc(15, -20, 1.2, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = '#f1a353'
  context.beginPath()
  context.moveTo(23, -15)
  context.lineTo(39, -9)
  context.lineTo(23, -5)
  context.closePath()
  context.fill()
  context.fillStyle = '#314960'
  context.beginPath()
  context.ellipse(-19, 6 + Math.sin(time * 10) * 3, 8, 16, -0.4, 0, Math.PI * 2)
  context.fill()
  context.strokeStyle = '#f07e68'
  context.lineWidth = 6
  context.lineCap = 'round'
  context.beginPath()
  context.moveTo(-16, -2)
  context.quadraticCurveTo(0, 8, 16, 3)
  context.stroke()
  context.restore()
}

function renderScene(context: CanvasRenderingContext2D, scene: Scene, time: number, locale: 'en' | 'pl', labels: { wind: string; distance: string; boost: string; speed: string; height: string }) {
  const distance = Math.max(0, (scene.x - LAUNCH_X) / 5)
  const region = regionAt(distance)
  const cameraX = Math.max(0, scene.x - WIDTH * 0.27)
  const cameraY = scene.y < 225 ? scene.y - 225 : scene.y > 330 ? scene.y - 330 : 0
  const gradient = context.createLinearGradient(0, 0, 0, HEIGHT)
  gradient.addColorStop(0, region.sky[0])
  gradient.addColorStop(1, region.sky[1])
  context.fillStyle = gradient
  context.fillRect(0, 0, WIDTH, HEIGHT)

  const sunX = 760 - cameraX * 0.05 % 1060
  context.fillStyle = 'rgba(255,245,204,.7)'
  context.beginPath()
  context.arc(sunX, 90 - cameraY * 0.08, 38, 0, Math.PI * 2)
  context.fill()
  for (let layer = 0; layer < 3; layer += 1) {
    const parallax = 0.12 + layer * 0.11
    const shift = cameraX * parallax % 520
    context.fillStyle = layer === 0 ? region.far : region.near
    context.beginPath()
    context.moveTo(-30, HEIGHT)
    for (let point = -1; point <= 9; point += 1) {
      const px = point * 160 - shift
      const py = 285 + layer * 37 + Math.sin(point * 2.13 + layer) * (36 + layer * 8) - cameraY * (0.12 + layer * 0.12)
      context.lineTo(px, py)
      context.lineTo(px + 80, py - 72 + Math.sin(point * 4.5) * 18)
      context.lineTo(px + 160, py + 12)
    }
    context.lineTo(WIDTH + 20, HEIGHT)
    context.closePath()
    context.fill()
  }

  context.beginPath()
  context.moveTo(0, HEIGHT)
  for (let px = 0; px <= WIDTH; px += 24) context.lineTo(px, groundAt(cameraX + px) - cameraY)
  context.lineTo(WIDTH, HEIGHT)
  context.closePath()
  const snow = context.createLinearGradient(0, 350 - cameraY, 0, HEIGHT)
  snow.addColorStop(0, '#f7ffff')
  snow.addColorStop(1, '#add5df')
  context.fillStyle = snow
  context.fill()
  context.strokeStyle = 'rgba(255,255,255,.9)'
  context.lineWidth = 4
  context.beginPath()
  for (let px = 0; px <= WIDTH; px += 24) {
    const py = groundAt(cameraX + px) - cameraY
    if (px === 0) context.moveTo(px, py)
    else context.lineTo(px, py)
  }
  context.stroke()

  if (cameraX < LAUNCH_X) {
    const rampX = LAUNCH_X - RAMP_LENGTH - cameraX
    const rampY = groundAt(LAUNCH_X) - scene.rampHeight - cameraY
    const startY = groundAt(LAUNCH_X - RAMP_LENGTH) - cameraY
    context.fillStyle = '#ec805a'
    context.beginPath()
    context.moveTo(rampX, startY + 8)
    context.lineTo(rampX + RAMP_LENGTH, rampY)
    context.lineTo(rampX + RAMP_LENGTH, rampY + 11)
    context.lineTo(rampX + 12, startY + 21)
    context.closePath()
    context.fill()
    context.fillStyle = '#526b83'
    context.fillRect(rampX + 36, startY + 7, 14, 62)
    context.fillRect(rampX + RAMP_LENGTH - 60, rampY + 7, 14, 62)
  }

  for (const obstacle of scene.obstacles) {
    const x = obstacle.x - cameraX
    if (x < -100 || x > WIDTH + 100) continue
    const floor = groundAt(obstacle.x) - cameraY
    context.save()
    context.translate(x, floor)
    if (obstacle.kind === 'ice') {
      context.fillStyle = '#81b9d0'
      context.beginPath()
      context.moveTo(-obstacle.width / 2, 0)
      context.lineTo(-obstacle.width / 2 + 10, -obstacle.height * 0.65)
      context.lineTo(-4, -obstacle.height)
      context.lineTo(obstacle.width / 2, -obstacle.height * 0.72)
      context.lineTo(obstacle.width / 2 + 8, 0)
      context.closePath()
      context.fill()
      context.strokeStyle = 'rgba(255,255,255,.72)'
      context.lineWidth = 3
      context.beginPath()
      context.moveTo(-9, -obstacle.height * 0.72)
      context.lineTo(6, -obstacle.height * 0.42)
      context.stroke()
    } else if (obstacle.kind === 'snowman') {
      context.fillStyle = '#fff'
      context.beginPath()
      context.arc(0, -19, 20, 0, Math.PI * 2)
      context.arc(0, -48, 14, 0, Math.PI * 2)
      context.fill()
      context.fillStyle = '#ef8d61'
      context.beginPath()
      context.moveTo(12, -50)
      context.lineTo(30, -46)
      context.lineTo(12, -43)
      context.fill()
      context.fillStyle = '#26384d'
      context.fillRect(-12, -67, 25, 5)
      context.fillRect(-8, -82, 17, 16)
    } else {
      context.fillStyle = '#ba765b'
      context.beginPath()
      context.roundRect(-22, -obstacle.height, 44, obstacle.height, 7)
      context.fill()
      context.strokeStyle = '#f4c27d'
      context.lineWidth = 4
      context.strokeRect(-13, -obstacle.height + 10, 26, obstacle.height - 20)
    }
    context.restore()
  }

  for (const pickup of scene.pickups) {
    const x = pickup.x - cameraX
    const y = pickup.y - cameraY + Math.sin(time / 180 + pickup.phase) * 5
    if (x < -40 || x > WIDTH + 40) continue
    const color = pickup.kind === 'fish' ? '#ffd766' : pickup.kind === 'star' ? '#fff1a8' : '#91f0d0'
    context.save()
    context.shadowColor = color
    context.shadowBlur = pickup.kind === 'star' ? 20 : 10
    context.fillStyle = color
    context.beginPath()
    if (pickup.kind === 'fish') {
      context.ellipse(x, y, 12, 8, Math.sin(time / 240 + pickup.phase) * 0.18, 0, Math.PI * 2)
      context.moveTo(x + 10, y)
      context.lineTo(x + 20, y - 8)
      context.lineTo(x + 20, y + 8)
      context.closePath()
    } else {
      context.arc(x, y, pickup.kind === 'star' ? 12 : 13, 0, Math.PI * 2)
    }
    context.fill()
    context.shadowBlur = 0
    context.fillStyle = '#30465d'
    context.font = '900 12px system-ui, sans-serif'
    context.textAlign = 'center'
    context.fillText(pickup.kind === 'star' ? '✦' : pickup.kind === 'fuel' ? '⚡' : '', x, y + 4)
    context.restore()
  }

  for (const particle of scene.particles) {
    context.globalAlpha = Math.max(0, particle.life / 0.6)
    context.fillStyle = particle.color
    context.beginPath()
    context.arc(particle.x - cameraX, particle.y - cameraY, particle.size, 0, Math.PI * 2)
    context.fill()
  }
  context.globalAlpha = 1

  const playerX = scene.x - cameraX
  const playerY = scene.y - cameraY
  const invisible = scene.invulnerable > 0 && Math.floor(time / 80) % 2 === 0
  if (!invisible) drawPenguin(context, playerX, playerY, scene.tilt, time / 1000, scene.boosting, scene.invulnerable > 0)

  const regionLabel = region[locale].toUpperCase()
  context.fillStyle = 'rgba(28,48,69,.65)'
  context.beginPath()
  context.roundRect(18, 16, 162, 28, 14)
  context.fill()
  context.fillStyle = '#fff'
  context.font = '800 11px system-ui, sans-serif'
  context.textAlign = 'left'
  context.fillText(regionLabel, 32, 34)
  context.textAlign = 'right'
  context.fillStyle = 'rgba(28,48,69,.68)'
  context.font = '800 10px system-ui, sans-serif'
  context.fillText(`${labels.distance} ${Math.floor(distance).toLocaleString()}`, WIDTH - 20, 28)
  const wind = scene.wind
  context.fillStyle = '#fff'
  context.font = '700 9px system-ui, sans-serif'
  context.fillText(`${labels.speed} ${Math.round(Math.hypot(scene.vx, scene.vy) * 0.72)} km/h`, WIDTH - 20, 44)
  context.fillStyle = 'rgba(255,255,255,.35)'
  context.fillRect(WIDTH - 166, 58, 146, 6)
  context.fillStyle = '#ffd766'
  context.fillRect(WIDTH - 166, 58, 146 * Math.max(0, scene.fuel / Math.max(1, scene.maxFuel)), 6)
  context.fillStyle = '#fff'
  context.textAlign = 'right'
  context.fillText(`${labels.boost} ${Math.ceil(scene.fuel)}`, WIDTH - 20, 77)
  context.fillStyle = 'rgba(255,255,255,.84)'
  context.font = '700 9px system-ui, sans-serif'
  context.fillText(`${labels.wind} ${wind >= 0 ? '→' : '←'} ${Math.abs(Math.round(wind))}`, WIDTH - 20, 94)
  const altitude = Math.max(0, Math.round((groundAt(scene.x) - scene.y - PLAYER_H) / 5))
  context.fillText(`${labels.height} ${altitude} m`, WIDTH - 20, 112)
  context.textAlign = 'left'
  for (let heart = 0; heart < 3; heart += 1) {
    context.fillStyle = heart < 3 - scene.hits ? '#ff917b' : 'rgba(255,255,255,.28)'
    context.font = '900 17px system-ui, sans-serif'
    context.fillText('♥', 20 + heart * 24, 72)
  }
  if (scene.combo > 1) {
    context.textAlign = 'center'
    context.font = '900 21px system-ui, sans-serif'
    context.fillStyle = '#fff3b3'
    context.shadowColor = '#f3a95f'
    context.shadowBlur = 18
    context.fillText(`×${scene.combo} ${region.en === 'Frost Flats' ? 'COMBO' : 'STREAK'}`, WIDTH / 2, 50)
    context.shadowBlur = 0
  }
}

function upgradePrice(key: UpgradeKey, level: number) {
  return Math.round(UPGRADE_INFO[key].base * 1.62 ** level)
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    label: 'KARIERA LOTNICZA · PINGWIN', title: 'Jeszcze dalej.', score: 'WYNIK', best: 'REKORD M', distance: 'DYSTANS', coins: 'RYBKI', region: 'KRAINA', wind: 'WIATR', boost: 'DOPALACZ', speed: 'PRĘDKOŚĆ', height: 'WYSOKOŚĆ', combo: 'SERIA', launch: 'STARTUJ', next: 'NASTĘPNY START', ramp: 'RAMPA', noseUp: 'DZIOBEM W GÓRĘ', dive: 'NURKUJ', hop: 'ODBICIE', hopNow: 'TERAZ!',
    ready: 'Pingwin gotowy do startu', readyText: 'Rozbieg rozpędza się sam. Unieś dziób, by szybować; nurkuj, by odzyskać prędkość. Spacją uruchom rakietę. Wyrównaj lot nad śniegiem, by odbić się dalej. Naciśnij X tuż przed lądowaniem, aby wykonać mocniejsze odbicie.', paused: 'Lot wstrzymany', landed: 'Lot zakończony', again: 'Kolejny lot', resume: 'Wznów lot', newFlight: 'Nowy lot',
    upgradesTitle: 'WARSZTAT', wallet: 'ZAPAS RYBEK', max: 'MAKS.', buy: 'ULEPSZ', upgradeNames: { launcher: 'Rozbieg', fuel: 'Paliwo rakietowe', glider: 'Szybowiec', magnet: 'Opór powietrza', hops: 'Moc odbicia' }, upgradeDescriptions: { launcher: 'Szybciej nabiera prędkości na rampie.', fuel: 'Więcej paliwa do lotu.', glider: 'Większa siła nośna podczas szybowania.', magnet: 'Mniejszy opór i większy zasięg ryb.', hops: 'Silniejsze odbicia od śniegu.' },
    careerTitle: 'DZIENNIK LOTÓW', total: 'ŁĄCZNY LOT', fishTotal: 'ZŁOWIONE RYBY', ranks: 'NAJLEPSZE LOTY', nickname: 'PSEUDONIM', local: 'ZAPISANE NA TYM URZĄDZENIU', empty: 'Pierwszy lot czeka.', earned: 'ZDOBYTE RYBKI', flightScore: 'PUNKTY LOTU', newBest: 'NOWY REKORD', unlock: 'NOWA RAMPA', nextUnlock: 'NASTĘPNA RAMPA', summit: 'ODKRYTO WSZYSTKIE RAMPY',
    fish: 'RYBY', stars: 'GWIAZDKI', near: 'BLISKIE MINIĘCIA', hopsDone: 'ODBITKI', pause: 'PAUZA', steer: 'STERUJ', boostTouch: 'DOPALACZ',
    rampNames: { snowbank: 'Śnieżny rozbieg', 'rocket-ridge': 'Grzbiet rakietowy', 'spring-peak': 'Sprężysty szczyt', 'aurora-chute': 'Tunel zorzy', 'cloud-pier': 'Pomost w chmurach' }, rampBenefits: { snowbank: 'Równowaga', 'rocket-ridge': 'Mocny start', 'spring-peak': 'Więcej odbić', 'aurora-chute': 'Mniej wiatru', 'cloud-pier': 'Długi lot' },
  } : {
    label: 'PENGUIN FLIGHT CAREER', title: 'A little farther.', score: 'SCORE', best: 'BEST M', distance: 'DISTANCE', coins: 'FISH', region: 'REGION', wind: 'WIND', boost: 'BOOST', speed: 'SPEED', height: 'ALTITUDE', combo: 'STREAK', launch: 'LAUNCH', next: 'NEXT LAUNCH', ramp: 'RAMP', noseUp: 'NOSE UP', dive: 'DIVE', hop: 'BOUNCE', hopNow: 'NOW!',
    ready: 'Penguin ready for takeoff', readyText: 'The ramp accelerates on its own. Pull up to trade speed for lift; dive to build speed. Hold Space to fire rockets. Level out over the snow to bounce farther. Press X just before touchdown for a stronger hop.', paused: 'Flight paused', landed: 'Flight complete', again: 'Next flight', resume: 'Resume flight', newFlight: 'New flight',
    upgradesTitle: 'FLIGHT SHOP', wallet: 'FISH BANK', max: 'MAX', buy: 'UPGRADE', upgradeNames: { launcher: 'Ramp run-up', fuel: 'Rocket fuel', glider: 'Glider', magnet: 'Air resistance', hops: 'Bounce strength' }, upgradeDescriptions: { launcher: 'Build more speed on the ramp.', fuel: 'More rocket fuel per flight.', glider: 'More lift while gliding.', magnet: 'Less drag and a wider fish pull.', hops: 'Stronger snow bounces.' },
    careerTitle: 'FLIGHT LOG', total: 'TOTAL DISTANCE', fishTotal: 'FISH CAUGHT', ranks: 'TOP FLIGHTS', nickname: 'NICKNAME', local: 'SAVED ON THIS DEVICE', empty: 'Your first flight is waiting.', earned: 'FISH EARNED', flightScore: 'FLIGHT SCORE', newBest: 'NEW DISTANCE RECORD', unlock: 'RAMP UNLOCKED', nextUnlock: 'NEXT RAMP', summit: 'ALL RAMPS DISCOVERED',
    fish: 'FISH', stars: 'STARS', near: 'NEAR MISSES', hopsDone: 'BOUNCES', pause: 'Pause', steer: 'PITCH', boostTouch: 'BOOST',
    rampNames: { snowbank: 'Snowbank', 'rocket-ridge': 'Rocket Ridge', 'spring-peak': 'Spring Peak', 'aurora-chute': 'Aurora Chute', 'cloud-pier': 'Cloud Pier' }, rampBenefits: { snowbank: 'Balanced', 'rocket-ridge': 'More launch power', 'spring-peak': 'Extra bounce', 'aurora-chute': 'Calmer winds', 'cloud-pier': 'Longer glide' },
  }
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<Scene>(makeScene())
  const statusRef = useRef<'ready' | 'flying' | 'paused' | 'landed'>('ready')
  const resumeRef = useRef<'flying' | 'ready'>('flying')
  const inputRef = useRef({ pitchUp: false, pitchDown: false, boost: false, hopQueued: false })
  const careerRef = useRef<Career>({ ...DEFAULT_CAREER, upgrades: { ...EMPTY_UPGRADES } })
  const [career, setCareer] = useState<Career>({ ...DEFAULT_CAREER, upgrades: { ...EMPTY_UPGRADES } })
  const hydratedRef = useRef(false)
  const [status, setStatus] = useState<'ready' | 'flying' | 'paused' | 'landed'>('ready')
  const [hud, setHud] = useState<Hud>({ distance: 0, height: 0, score: 0, fuel: 0, wind: 0, combo: 0 })
  const [runReward, setRunReward] = useState(0)
  const [runNewBest, setRunNewBest] = useState(false)
  const [unlockedRamps, setUnlockedRamps] = useState<RampId[]>([])
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const region = regionAt(career.bestDistance)
  const nextRamp = RAMPS.find((ramp) => ramp.unlock > career.bestDistance)
  const nextDistance = nextRamp?.unlock ?? RAMPS[RAMPS.length - 1].unlock
  const nextLabel = nextRamp ? copy.rampNames[nextRamp.id] : copy.summit
  const progress = nextRamp ? Math.min(100, career.bestDistance / nextDistance * 100) : 100

  function setPhase(next: 'ready' | 'flying' | 'paused' | 'landed') {
    statusRef.current = next
    setStatus(next)
  }

  function storeCareer(next: Career) {
    careerRef.current = next
    setCareer(next)
    try { localStorage.setItem(CAREER_KEY, JSON.stringify(next)) } catch { }
  }

  function launchFlight() {
    if (!hydratedRef.current || (statusRef.current !== 'ready' && statusRef.current !== 'landed')) return
    const scene = makeScene()
    const ramp = RAMPS.find((candidate) => candidate.id === careerRef.current.ramp) ?? RAMPS[0]
    const upgrades = careerRef.current.upgrades
    scene.rampHeight = START_RAMP_HEIGHT + upgrades.launcher * 6 + ramp.power * 0.14
    scene.y = rampSurfaceY(scene.x, scene.rampHeight) - PLAYER_H
    scene.vx = 80 + upgrades.launcher * 8
    scene.fuel = 58 + upgrades.fuel * 15 + ramp.fuel
    scene.maxFuel = scene.fuel
    scene.hopsLeft = 1 + upgrades.hops + ramp.hops
    scene.wind = 0
    sceneRef.current = scene
    inputRef.current = { pitchUp: false, pitchDown: false, boost: false, hopQueued: false }
    setRunReward(0)
    setRunNewBest(false)
    setUnlockedRamps([])
    setHud({ distance: 0, height: 0, score: 0, fuel: scene.fuel, wind: 0, combo: 0 })
    setPhase('flying')
  }

  function requestHop() {
    const scene = sceneRef.current
    const clearance = groundAt(scene.x) - (scene.y + PLAYER_H)
    if (statusRef.current === 'flying' && scene.launched && scene.vy > 0 && clearance >= -4 && clearance < 145 && scene.hopsLeft > 0) inputRef.current.hopQueued = true
  }

  function finishFlight(scene: Scene) {
    if (scene.finished) return
    scene.finished = true
    scene.boosting = false
    const distance = Math.floor(Math.max(0, (scene.x - LAUNCH_X) / 5))
    const score = scene.score
    const careerNow = careerRef.current
    const isNewBest = distance > careerNow.bestDistance
    const crossed = MILESTONES.filter((milestone) => distance >= milestone && !careerNow.milestones.includes(milestone))
    const reward = Math.max(1, Math.floor(distance / 25) + scene.fish * 8 + scene.stars * 24 + scene.nearMisses * 4 + crossed.reduce((sum, milestone) => sum + Math.floor(milestone / 100), 0))
    const newlyUnlocked = RAMPS.filter((ramp) => ramp.unlock > careerNow.bestDistance && ramp.unlock <= distance).map((ramp) => ramp.id)
    const entry: ScoreEntry = { name: careerNow.nickname.trim() || fallbackName, score, distance }
    const next: Career = {
      ...careerNow,
      coins: careerNow.coins + reward,
      bestDistance: Math.max(careerNow.bestDistance, distance),
      totalDistance: careerNow.totalDistance + distance,
      totalFish: careerNow.totalFish + scene.fish,
      records: [...careerNow.records, entry].sort((first, second) => second.score - first.score).slice(0, 5),
      milestones: [...careerNow.milestones, ...crossed],
    }
    storeCareer(next)
    setRunReward(reward)
    setRunNewBest(isNewBest)
    setUnlockedRamps(newlyUnlocked)
    setHud({ distance, height: 0, score, fuel: scene.fuel, wind: Math.round(scene.wind), combo: scene.combo })
    setPhase('landed')
  }

  function buyUpgrade(key: UpgradeKey) {
    const current = careerRef.current
    const level = current.upgrades[key]
    const price = upgradePrice(key, level)
    if (statusRef.current === 'flying' || level >= UPGRADE_INFO[key].max || current.coins < price) return
    storeCareer({ ...current, coins: current.coins - price, upgrades: { ...current.upgrades, [key]: level + 1 } })
  }

  function chooseRamp(ramp: Ramp) {
    const current = careerRef.current
    if (statusRef.current === 'flying' || ramp.unlock > current.bestDistance) return
    storeCareer({ ...current, ramp: ramp.id })
  }

  function pauseFlight() {
    inputRef.current = { pitchUp: false, pitchDown: false, boost: false, hopQueued: false }
    sceneRef.current.boosting = false
    resumeRef.current = 'flying'
    setPhase('paused')
  }

  useEffect(() => {
    const saved = readCareer()
    saved.nickname = saved.nickname === 'Player' && locale === 'pl' ? 'Gracz' : saved.nickname
    careerRef.current = saved
    setCareer(saved)
    hydratedRef.current = true
  }, [locale])

  useEffect(() => {
    function keyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      const key = event.key.toLowerCase()
      const phase = statusRef.current
      if (key === ' ' && ['ready', 'landed'].includes(phase)) {
        event.preventDefault()
        launchFlight()
      } else if (phase === 'flying') {
        if (['arrowleft', 'arrowright', 'a', 'd', ' ', 'x'].includes(key)) event.preventDefault()
        if (key === 'arrowleft' || key === 'a') inputRef.current.pitchUp = true
        if (key === 'arrowright' || key === 'd') inputRef.current.pitchDown = true
        if (key === ' ') inputRef.current.boost = true
        if (key === 'x' && !event.repeat) requestHop()
        if (event.key === 'Escape') pauseFlight()
      }
    }
    function keyUp(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      if (key === 'arrowleft' || key === 'a') inputRef.current.pitchUp = false
      if (key === 'arrowright' || key === 'd') inputRef.current.pitchDown = false
      if (key === ' ' && statusRef.current === 'flying') inputRef.current.boost = false
    }
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
    }
  }, [])

  useEffect(() => {
    const context = canvasRef.current?.getContext('2d')
    if (!context) return
    const drawingContext = context
    const scene = sceneRef.current
    if (status !== 'flying') {
      renderScene(drawingContext, scene, performance.now(), locale, copy)
      return
    }

    let animationFrame = 0
    let previousTime = 0
    let hudTimer = 0
    const upgrades = careerRef.current.upgrades
    const ramp = RAMPS.find((candidate) => candidate.id === careerRef.current.ramp) ?? RAMPS[0]
    function frame(time: number) {
      const delta = Math.min((time - (previousTime || time)) / 1000, 0.04)
      previousTime = time
      scene.elapsed += delta
      scene.distance = Math.max(0, (scene.x - LAUNCH_X) / 5)
      scene.comboTimer = Math.max(0, scene.comboTimer - delta)
      if (scene.comboTimer === 0) scene.combo = 0
      scene.invulnerable = Math.max(0, scene.invulnerable - delta)
      const regionNow = regionAt(scene.distance)
      const wind = Math.sin(scene.x * 0.0009 + scene.elapsed * 1.4) * regionNow.wind * ramp.wind
      scene.wind = wind
      const boosting = scene.launched && inputRef.current.boost && scene.fuel > 0
      scene.boosting = boosting
      if (boosting) scene.fuel = Math.max(0, scene.fuel - 38 * delta)
      if (!scene.launched) {
        const rampAngle = Math.atan2(scene.rampHeight, RAMP_LENGTH)
        scene.tilt = rampAngle
        scene.vx = Math.min(470, scene.vx + (260 + upgrades.launcher * 28 + ramp.power * 0.45) * delta)
        scene.x = Math.min(LAUNCH_X, scene.x + scene.vx * delta)
        scene.y = rampSurfaceY(scene.x, scene.rampHeight) - PLAYER_H
        if (scene.x >= LAUNCH_X) {
          const takeoffAngle = Math.max(19, Math.min(39, 26 + ramp.angle)) * Math.PI / 180
          scene.vy = -scene.vx * Math.tan(takeoffAngle)
          scene.tilt = takeoffAngle
          scene.launched = true
          addBurst(scene, scene.x + 12, scene.y + PLAYER_H, '#fff', 16)
        }
      } else {
        const targetTilt = inputRef.current.pitchUp ? 0.52 : inputRef.current.pitchDown ? -0.26 : 0.12
        scene.tilt += (targetTilt - scene.tilt) * Math.min(1, delta * 3.6)
        const airSpeed = Math.hypot(scene.vx, scene.vy)
        const stall = Math.min(0.88, Math.max(0, (scene.tilt - 0.4) / 0.24))
        const lift = Math.max(-180, Math.min(GRAVITY + 250 + upgrades.glider * 28, airSpeed * (0.86 + upgrades.glider * 0.035 + ramp.glide) * Math.sin(scene.tilt * 2))) * (1 - stall)
        const dive = Math.max(0, -scene.tilt)
        const drag = Math.max(0.018, 0.075 - upgrades.magnet * 0.0045 + Math.max(0, scene.tilt - 0.28) * 0.13)
        scene.vx += (wind * 0.28 + (boosting ? 560 + upgrades.fuel * 13 : 0) + dive * 235 - airSpeed * drag) * delta
        scene.vy += (GRAVITY - lift + Math.sin(scene.elapsed * 1.8 + scene.x * 0.001) * 18 - (boosting ? 45 : 0)) * delta
        scene.vx = Math.max(100, Math.min(1720, scene.vx))
        scene.vy = Math.max(-1050, Math.min(1050, scene.vy))
        scene.x += scene.vx * delta
        scene.y += scene.vy * delta
        scene.distance = Math.max(0, (scene.x - LAUNCH_X) / 5)
        createFeatures(scene)
      }

      for (let index = scene.obstacles.length - 1; index >= 0; index -= 1) {
        const obstacle = scene.obstacles[index]
        const floor = groundAt(obstacle.x)
        const overlapsX = scene.x + PLAYER_W * 0.75 > obstacle.x - obstacle.width / 2 && scene.x + PLAYER_W * 0.2 < obstacle.x + obstacle.width / 2
        const collides = overlapsX && scene.y + PLAYER_H > floor - obstacle.height + 8 && scene.y < floor - 5
        if (collides && scene.invulnerable <= 0) {
          scene.obstacles.splice(index, 1)
          scene.hits += 1
          scene.invulnerable = 1.05
          scene.y = Math.min(scene.y, floor - obstacle.height - PLAYER_H - 2)
          scene.vx *= 0.68
          scene.vy = -255
          scene.combo = 0
          if (scene.hits >= 3) scene.hopsLeft = 0
          addBurst(scene, scene.x + PLAYER_W / 2, floor - obstacle.height / 2, '#e7f8ff', 18)
          continue
        }
        if (!obstacle.counted && scene.x > obstacle.x + obstacle.width / 2) {
          obstacle.counted = true
          const clearance = floor - (scene.y + PLAYER_H)
          if (!collides && clearance >= 0 && clearance < 78) {
            scene.nearMisses += 1
            scene.combo = Math.min(9, scene.combo + 1)
            scene.comboTimer = 2.6
            scene.bonusPoints += 85 * Math.min(4, scene.combo)
            addBurst(scene, obstacle.x, floor - obstacle.height, '#fff0a7', 7)
          }
        }
        if (obstacle.x < scene.x - WIDTH) scene.obstacles.splice(index, 1)
      }

      for (let index = scene.pickups.length - 1; index >= 0; index -= 1) {
        const pickup = scene.pickups[index]
        const magnetRadius = 28 + upgrades.magnet * 18
        const dx = scene.x + PLAYER_W / 2 - pickup.x
        const dy = scene.y + PLAYER_H / 2 - pickup.y
        if (upgrades.magnet > 0 && Math.hypot(dx, dy) < magnetRadius * 4) {
          pickup.x += dx * Math.min(1, delta * (1.3 + upgrades.magnet * 0.13))
          pickup.y += dy * Math.min(1, delta * (1.3 + upgrades.magnet * 0.13))
        }
        if (Math.hypot(dx, dy) < magnetRadius + 18) {
          if (pickup.kind === 'fish') {
            scene.fish += 1
            scene.combo = Math.min(9, scene.combo + 1)
            scene.comboTimer = 2.8
            scene.bonusPoints += 70 * Math.min(4, scene.combo)
            scene.fuel = Math.min(scene.maxFuel, scene.fuel + 3)
            addBurst(scene, pickup.x, pickup.y, '#ffd766', 9)
          } else if (pickup.kind === 'star') {
            scene.stars += 1
            scene.combo = Math.min(9, scene.combo + 2)
            scene.comboTimer = 3.2
            scene.bonusPoints += 420 * Math.min(4, scene.combo)
            addBurst(scene, pickup.x, pickup.y, '#fff1a8', 20)
          } else {
            scene.fuel = Math.min(scene.maxFuel, scene.fuel + 34)
            addBurst(scene, pickup.x, pickup.y, '#91f0d0', 15)
          }
          scene.pickups.splice(index, 1)
        } else if (pickup.x < scene.x - WIDTH) scene.pickups.splice(index, 1)
      }

      for (let index = scene.particles.length - 1; index >= 0; index -= 1) {
        const particle = scene.particles[index]
        particle.life -= delta
        particle.x += particle.vx * delta
        particle.y += particle.vy * delta
        particle.vy += 180 * delta
        if (particle.life <= 0) scene.particles.splice(index, 1)
      }

      const floor = groundAt(scene.x)
      if (scene.launched && scene.y + PLAYER_H >= floor && scene.vy > 0) {
        scene.y = floor - PLAYER_H
        const cleanLanding = scene.vx > 320 && Math.abs(scene.tilt) < 0.27 && scene.bounces < 10
        if (inputRef.current.hopQueued && scene.hopsLeft > 0 && scene.bounces < 12) {
          inputRef.current.hopQueued = false
          scene.hopsLeft -= 1
          scene.bounces += 1
          scene.vy = -(285 + Math.min(150, scene.vx * 0.26) + upgrades.hops * 14)
          scene.vx *= 0.98
          scene.bonusPoints += 240 + scene.combo * 55
          scene.combo = Math.min(9, scene.combo + 1)
          scene.comboTimer = 2.6
          addBurst(scene, scene.x + 12, floor - 5, '#fff', 22)
        } else if (cleanLanding) {
          scene.bounces += 1
          scene.vy = -(190 + Math.min(130, scene.vx * 0.2) + upgrades.hops * 8)
          scene.vx *= 0.9
          scene.bonusPoints += 110 + scene.combo * 28
          scene.combo = Math.min(9, scene.combo + 1)
          scene.comboTimer = 2.2
          addBurst(scene, scene.x + 12, floor - 5, '#b9f5ff', 16)
        } else {
          scene.score = Math.floor(scene.distance + scene.fish * 70 + scene.stars * 360 + scene.nearMisses * 55 + scene.bounces * 80 + scene.bonusPoints)
          finishFlight(scene)
          renderScene(drawingContext, scene, time, locale, copy)
          return
        }
      }

      scene.score = Math.floor(scene.distance + scene.fish * 70 + scene.stars * 360 + scene.nearMisses * 55 + scene.bounces * 80 + scene.bonusPoints)
      hudTimer += delta
      if (hudTimer >= 0.12) {
        hudTimer = 0
        setHud({ distance: Math.floor(scene.distance), height: Math.max(0, Math.floor((floor - scene.y - PLAYER_H) / 5)), score: scene.score, fuel: Math.ceil(scene.fuel), wind: Math.round(wind), combo: scene.combo })
      }
      renderScene(drawingContext, scene, time, locale, copy)
      animationFrame = requestAnimationFrame(frame)
    }
    animationFrame = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(animationFrame)
  }, [status, locale])

  const upgradeKeys: UpgradeKey[] = ['launcher', 'fuel', 'glider', 'magnet', 'hops']
  const scene = sceneRef.current
  const clearance = groundAt(scene.x) - (scene.y + PLAYER_H)
  const hopReady = status === 'flying' && scene.launched && scene.vy > 0 && clearance >= -4 && clearance < 145 && scene.hopsLeft > 0

  return (
    <div className={`module-game arcade-module penguin-module${status === 'flying' ? ' is-playing' : ''}`}>
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.label}</span><h2>{copy.title}</h2></div>
          <div className="arcade-game-stats"><div className="score-readout"><span>{copy.score}</span><strong>{hud.score.toLocaleString()}</strong></div><div className="score-readout"><span>{copy.best}</span><strong>{career.bestDistance.toLocaleString()}</strong></div></div>
        </div>
        <div className="penguin-ramp-picker">
          <div className="penguin-ramp-options">{RAMPS.map((ramp) => {
            const unlocked = ramp.unlock <= career.bestDistance
            return <button key={ramp.id} className={`penguin-ramp-option${career.ramp === ramp.id ? ' is-active' : ''}${unlocked ? '' : ' is-locked'}`} disabled={!unlocked || status === 'flying' || status === 'paused'} onClick={() => chooseRamp(ramp)}><strong>{copy.rampNames[ramp.id]}</strong><small>{unlocked ? copy.rampBenefits[ramp.id] : `${ramp.unlock.toLocaleString()} m`}</small></button>
          })}</div>
        </div>
        {status === 'flying' && <div className="arcade-livebar penguin-livebar"><span>← {copy.noseUp} · → {copy.dive} · X {hopReady ? copy.hopNow : copy.hop}{scene.hopsLeft > 0 ? ` ×${scene.hopsLeft}` : ''}</span><div className="arcade-live-actions"><span>{copy.distance} {hud.distance.toLocaleString()} m</span><button onClick={pauseFlight}>Ⅱ {copy.pause}</button></div></div>}
        <div className="canvas-wrap arcade-canvas-wrap penguin-canvas-wrap">
          <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} aria-label={locale === 'pl' ? 'Lot pingwina przez zaśnieżone krainy' : 'Penguin flight through snowy regions'} />
          {status !== 'flying' && <div className="game-overlay penguin-overlay"><span className="overlay-spark">{status === 'landed' ? '✦' : '❄'}</span><strong>{status === 'ready' ? copy.ready : status === 'paused' ? copy.paused : copy.landed}</strong>
            {status === 'landed' ? (
              <>
                <span>{copy.distance}: {hud.distance.toLocaleString()} m · {copy.flightScore}: {hud.score.toLocaleString()}</span>
                <div className="penguin-run-summary"><span>{copy.fish} <strong>{scene.fish}</strong></span><span>{copy.stars} <strong>{scene.stars}</strong></span><span>{copy.near} <strong>{scene.nearMisses}</strong></span><span>{copy.hopsDone} <strong>{scene.bounces}</strong></span></div>
                <b className="penguin-earned">+{runReward} {copy.earned}</b>
                {runNewBest && <b className="penguin-record-toast">✦ {copy.newBest}</b>}
                {unlockedRamps.map((rampId) => {
                  const unlockedRamp = RAMPS.find((ramp) => ramp.id === rampId)
                  return unlockedRamp ? <b className="penguin-record-toast" key={rampId}>✦ {copy.unlock}: {copy.rampNames[unlockedRamp.id]}</b> : null
                })}
              </>
            ) : <span>{status === 'paused' ? `${copy.distance}: ${hud.distance.toLocaleString()} m` : copy.readyText}</span>}
            <button className="game-button penguin-launch-button" onClick={() => { if (status === 'paused') setPhase(resumeRef.current); else launchFlight() }}>
              {status === 'paused' ? copy.resume : status === 'landed' ? copy.again : copy.launch}<span>→</span>
            </button>
          </div>}
        </div>
        {status === 'flying' && <div className="game-touch-controls penguin-touch-controls"><button onPointerDown={() => { inputRef.current.pitchUp = true }} onPointerUp={() => { inputRef.current.pitchUp = false }} onPointerCancel={() => { inputRef.current.pitchUp = false }} onPointerLeave={() => { inputRef.current.pitchUp = false }} aria-label={copy.noseUp}>← {copy.noseUp}</button><button onPointerDown={requestHop} disabled={!hopReady} aria-label={copy.hop}>✦ {hopReady ? copy.hopNow : copy.hop} · {scene.hopsLeft}</button><button onPointerDown={() => { inputRef.current.boost = true }} onPointerUp={() => { inputRef.current.boost = false }} onPointerCancel={() => { inputRef.current.boost = false }} onPointerLeave={() => { inputRef.current.boost = false }} aria-label={copy.boostTouch}>⚡ {copy.boostTouch}</button><button onPointerDown={() => { inputRef.current.pitchDown = true }} onPointerUp={() => { inputRef.current.pitchDown = false }} onPointerCancel={() => { inputRef.current.pitchDown = false }} onPointerLeave={() => { inputRef.current.pitchDown = false }} aria-label={copy.dive}>→ {copy.dive}</button></div>}
        <p className="arcade-controls-note"><span>{status === 'flying' ? <>{copy.noseUp} <kbd>←</kbd> · {copy.dive} <kbd>→</kbd></> : copy.launch}</span><span>{copy.boost} <kbd>SPACE</kbd></span><span>{copy.hop} <kbd>X</kbd></span></p>
        <div className="penguin-progress-card"><div><span>{copy.next}</span><strong>{nextLabel}</strong></div><span>{career.bestDistance.toLocaleString()} / {nextDistance.toLocaleString()} m</span><i><b style={{ width: `${progress}%` }} /></i></div>
      </div>
      <aside className="game-scoreboard arcade-scoreboard penguin-scoreboard">
        <div className="penguin-wallet"><span>{copy.wallet}</span><strong>🐟 {career.coins.toLocaleString()}</strong></div>
        <div className="scoreboard-heading"><span className="game-small-label">{copy.upgradesTitle}</span><span className="scoreboard-star">✳</span></div>
        <div className="penguin-upgrade-list">{upgradeKeys.map((key) => {
          const level = career.upgrades[key]
          const price = upgradePrice(key, level)
          const maxed = level >= UPGRADE_INFO[key].max
          return <div className="penguin-upgrade" key={key}><div><strong>{copy.upgradeNames[key]}</strong><small>{copy.upgradeDescriptions[key]}</small><small>LV {level} / {UPGRADE_INFO[key].max}</small></div><button disabled={maxed || career.coins < price || status === 'flying' || status === 'paused'} onClick={() => buyUpgrade(key)}>{maxed ? copy.max : `${price} 🐟`}</button></div>
        })}</div>
        <div className="penguin-career-stats"><span>{copy.total}<strong>{career.totalDistance.toLocaleString()} m</strong></span><span>{copy.fishTotal}<strong>{career.totalFish.toLocaleString()}</strong></span></div>
        <div className="scoreboard-rule" />
        <div className="scoreboard-heading"><span className="game-small-label">{copy.ranks}</span><span className="scoreboard-star">✦</span></div>
        <label className="game-field"><span>{copy.nickname}</span><input value={career.nickname} maxLength={14} onChange={(event) => storeCareer({ ...careerRef.current, nickname: event.target.value })} /></label>
        <div className="scoreboard-list">{career.records.length ? career.records.map((record, index) => <div className="scoreboard-row" key={`${record.name}-${record.distance}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name} · {record.distance.toLocaleString()}m</span><strong>{record.score.toLocaleString()}</strong></div>) : <p className="scoreboard-empty">{copy.empty}</p>}</div>
        <div className="scoreboard-foot">{copy.local} · {region[locale]}</div>
      </aside>
    </div>
  )
}
