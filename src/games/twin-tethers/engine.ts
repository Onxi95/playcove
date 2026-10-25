import {
  base,
  clamp,
  down,
  numberCarry,
  pressed,
  loseLife,
} from '../kit/arcade.ts'
import type { ArcadeInput, ArcadeState, Progress } from '../kit/arcade.ts'
export type Platform = { x: number; y: number; w: number }
export const ROOMS = [
  {
    en: 'MOSS BRIDGE',
    pl: 'MSZYSTY MOST',
    platforms: [
      { x: 150, y: 460, w: 150 },
      { x: 340, y: 380, w: 160 },
      { x: 540, y: 380, w: 160 },
      { x: 730, y: 460, w: 140 },
    ],
  },
  {
    en: 'HANGING GARDENS',
    pl: 'WISZĄCE OGRODY',
    platforms: [
      { x: 150, y: 450, w: 160 },
      { x: 330, y: 365, w: 170 },
      { x: 535, y: 365, w: 165 },
      { x: 740, y: 450, w: 140 },
    ],
  },
  {
    en: 'TWIN SPIRES',
    pl: 'BLIŹNIACZE WIEŻE',
    platforms: [
      { x: 150, y: 455, w: 160 },
      { x: 330, y: 370, w: 170 },
      { x: 540, y: 345, w: 170 },
      { x: 740, y: 435, w: 140 },
    ],
  },
  {
    en: 'SKY SCAFFOLD',
    pl: 'PODNIEBNE RUSZTOWANIE',
    platforms: [
      { x: 150, y: 460, w: 160 },
      { x: 340, y: 380, w: 160 },
      { x: 530, y: 300, w: 170 },
      { x: 720, y: 380, w: 140 },
      { x: 835, y: 460, w: 130 },
    ],
  },
]
export type Player = {
  x: number
  y: number
  vx: number
  vy: number
  ground: boolean
  energy: number
  invulnerable: number
  buffer: number
  coyote: number
  tug: number
  drop: number
}
export type State = ArcadeState & {
  players: Player[]
  room: number
  platforms: Platform[]
  stars: Array<{ x: number; y: number; owner: number; taken: boolean }>
  pads: Array<{ x: number; y: number; owner: number; active: boolean }>
  checkpoint: number
  laser: number
  roomTime: number
  wind: number
  reason: string
  rescues: number
  deaths: number
  checkpointFlash: number
  success: number
}
function player(x: number, y = 506): Player {
  return {
    x,
    y,
    vx: 0,
    vy: 0,
    ground: true,
    energy: 100,
    invulnerable: 1.5,
    buffer: 0,
    coyote: 0.1,
    tug: 0,
    drop: 0,
  }
}
export function create(p?: Progress): State {
  const stage = p?.stage ?? 1,
    room = Math.floor(numberCarry(p, 'room', (stage - 1) % ROOMS.length, 0, 3)),
    platforms = ROOMS[room].platforms.map((p) => ({ ...p })),
    last = platforms[platforms.length - 1],
    s: State = {
      ...base(p),
      lives: p?.lives ?? 5,
      players: [player(70), player(125)],
      room,
      platforms,
      stars: [
        {
          x: platforms[1].x + 55,
          y: platforms[1].y - 22,
          owner: 0,
          taken: false,
        },
        {
          x: platforms[2].x + 70,
          y: platforms[2].y - 22,
          owner: 1,
          taken: false,
        },
        ...(stage >= 7
          ? [
              {
                x: platforms[0].x + 90,
                y: platforms[0].y - 22,
                owner: 1,
                taken: false,
              },
              { x: last.x + 50, y: last.y - 22, owner: 0, taken: false },
            ]
          : []),
      ],
      pads: [
        { x: platforms[0].x + 45, y: platforms[0].y, owner: 0, active: false },
        { x: last.x + 70, y: last.y, owner: 1, active: false },
      ],
      checkpoint: numberCarry(p, 'checkpoint', 0, 0, 1),
      laser: 0,
      roomTime: numberCarry(p, 'roomTime', 0),
      wind: 0,
      reason: '',
      rescues: numberCarry(p, 'rescues', 0),
      deaths: numberCarry(p, 'deaths', 0),
      checkpointFlash: 0,
      success: 0,
    }
  const stars = p?.carry.stars,
    pads = p?.carry.pads
  if (typeof stars === 'string' && stars.length === s.stars.length)
    s.stars.forEach((star, index) => (star.taken = stars[index] === '1'))
  if (typeof pads === 'string' && pads.length === 2)
    s.pads.forEach((pad, index) => (pad.active = pads[index] === '1'))
  if (s.checkpoint) respawn(s)
  return s
}
export function respawn(s: State) {
  const p = s.platforms[2]
  s.players = s.checkpoint
    ? [player(p.x + 35, p.y - 34), player(p.x + 90, p.y - 34)]
    : [player(70), player(125)]
}
export function fail(s: State, reason: string) {
  if (s.players.some((p) => p.invulnerable > 0) || s.phase !== 'play') return
  loseLife(s)
  s.reason = reason
  s.deaths++
  if (s.lives > 0) respawn(s)
}
export function platforms(s: State) {
  return [
    { x: 0, y: 540, w: 350 },
    { x: 650, y: 540, w: 350 },
    ...s.platforms,
    ...(s.stage >= 6
      ? [{ x: 440, y: 470 - Math.sin(s.roomTime * 0.75) * 40, w: 95 }]
      : []),
  ]
}
export function update(s: State, i: ArcadeInput, seconds: number) {
  if (s.phase !== 'play') return
  s.events = []
  const steps = Math.max(1, Math.ceil(seconds * 120)),
    dt = Math.min(0.1, seconds) / steps
  for (let n = 0; n < steps && s.phase === 'play'; n++) tick(s, i, dt, n === 0)
}
function tick(s: State, i: ArcadeInput, dt: number, first: boolean) {
  s.elapsed += dt
  s.roomTime += dt
  s.checkpointFlash = Math.max(0, s.checkpointFlash - dt)
  s.wind = s.stage >= 10 ? Math.sin(s.roomTime * 0.9) * 45 : 0
  const phase = s.roomTime % 4.8
  s.laser = s.stage >= 4 ? (phase < 2.1 ? 0 : phase < 2.8 ? 1 : 2) : 0
  const surfaces = platforms(s)
  for (let index = 0; index < 2; index++) {
    const p = s.players[index],
      dx =
        Number(down(i, index ? 'arrowright' : 'd')) -
        Number(down(i, index ? 'arrowleft' : 'a')),
      jump = down(i, index ? 'arrowup' : 'w')
    p.invulnerable = Math.max(0, p.invulnerable - dt)
    p.energy = Math.min(100, p.energy + dt * 20)
    p.buffer =
      first && pressed(i, index ? 'arrowup' : 'w')
        ? 0.14
        : Math.max(0, p.buffer - dt)
    p.coyote = p.ground ? 0.1 : Math.max(0, p.coyote - dt)
    p.tug = Math.max(0, p.tug - dt)
    p.drop = Math.max(0, p.drop - dt)
    if (down(i, index ? 'arrowdown' : 's') && p.ground && p.y < 506) {
      p.drop = 0.24
      p.ground = false
      p.y += 4
    }
    if (first && pressed(i, index ? 'enter' : ' ') && p.energy >= 65) {
      const other = s.players[1 - index],
        distance = Math.max(1, Math.hypot(other.x - p.x, other.y - p.y))
      p.vx = ((other.x - p.x) / distance) * 420
      p.vy = Math.min(-270, (other.y - p.y) * 3)
      p.energy -= 65
      p.tug = 0.25
      p.ground = false
      s.rescues++
      s.events.push('boost')
    }
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -520
      p.ground = false
      p.coyote = 0
      p.buffer = 0
      s.events.push('hit')
    }
    if (!jump && p.vy < -180 && p.tug === 0) p.vy += dt * 1150
    if (p.tug === 0)
      p.vx += (dx * 245 - p.vx) * (1 - Math.exp(-dt * (p.ground ? 18 : 9)))
    if (!p.ground) p.vx += s.wind * dt
    const previous = p.y
    p.x = clamp(p.x + p.vx * dt, 18, 982)
    p.y += p.vy * dt
    p.vy += 1300 * dt
    p.ground = false
    if (p.vy >= 0) {
      for (const surface of [...surfaces].sort((a, b) => a.y - b.y))
        if (
          (p.drop === 0 || surface.y === 540) &&
          p.x > surface.x - 10 &&
          p.x < surface.x + surface.w + 10 &&
          previous + 34 <= surface.y + 3 &&
          p.y + 34 >= surface.y
        ) {
          p.y = surface.y - 34
          p.vy = 0
          p.ground = true
          break
        }
    }
    const open = s.pads.every((pad) => pad.active)
    if (!open && p.x > 866 && p.x < 904 && p.y + 34 > 410) {
      p.x = p.vx >= 0 ? 866 : 904
      p.vx = 0
    }
    if (p.y > 650) {
      fail(s, 'fall')
      return
    }
    if (s.laser === 2 && Math.abs(p.x - 520) < 13 && p.y + 34 > 250) {
      fail(s, 'laser')
      return
    }
  }
  const a = s.players[0],
    b = s.players[1],
    dx = b.x - a.x,
    dy = b.y - a.y,
    distance = Math.hypot(dx, dy)
  if (distance > 200) {
    const force = (distance - 200) * dt * 10,
      nx = dx / distance,
      ny = dy / distance
    a.vx += nx * force * 7
    a.vy += ny * force * 7
    b.vx -= nx * force * 7
    b.vy -= ny * force * 7
    if (ny > 0 && distance > 215) b.ground = false
    if (ny < 0 && distance > 215) a.ground = false
    if (distance > 275) {
      const correction = (distance - 275) * 0.5
      a.x += nx * correction
      a.y += ny * correction
      b.x -= nx * correction
      b.y -= ny * correction
    }
  }
  for (const star of s.stars) {
    const p = s.players[star.owner]
    if (!star.taken && Math.hypot(p.x - star.x, p.y + 17 - star.y) < 27) {
      star.taken = true
      s.score += 250 * s.stage
      p.energy = 100
      s.events.push('pickup')
    }
  }
  for (const pad of s.pads) {
    const p = s.players[pad.owner]
    if (
      !pad.active &&
      Math.abs(p.x - pad.x) < 24 &&
      Math.abs(p.y + 34 - pad.y) < 5
    ) {
      pad.active = true
      s.events.push('point')
      s.score += 100
    }
  }
  if (!s.checkpoint && s.players.every((p) => p.x > 700)) {
    s.checkpoint = 1
    s.checkpointFlash = 2
    s.events.push('point')
  }
  if (
    s.stars.every((star) => star.taken) &&
    s.pads.every((pad) => pad.active) &&
    s.players.every((p) => p.x > 922 && p.y > 475)
  ) {
    s.success += dt
    if (s.success > 0.3) {
      s.score += 800 * s.stage
      s.phase = 'choice'
      s.events.push('point')
    }
  } else s.success = 0
}
export function choose(s: State, id: string) {
  if (s.phase !== 'choice') return
  const stage = s.stage + 1
  Object.assign(
    s,
    create({
      stage,
      score: s.score,
      lives: Math.min(7, s.lives + (stage % 3 === 0 ? 1 : 0)),
      elapsed: s.elapsed,
      carry: {
        room:
          id === 'spires' ? 2 : id === 'sky' ? 3 : (s.room + 1) % ROOMS.length,
        rescues: s.rescues,
        deaths: s.deaths,
      },
    }),
  )
}
export function save(s: State): Progress {
  return {
    stage: s.stage,
    score: s.score,
    lives: s.lives,
    elapsed: s.elapsed,
    carry: {
      room: s.room,
      checkpoint: s.checkpoint,
      roomTime: s.roomTime,
      stars: s.stars.map((p) => (p.taken ? '1' : '0')).join(''),
      pads: s.pads.map((p) => (p.active ? '1' : '0')).join(''),
      rescues: s.rescues,
      deaths: s.deaths,
    },
  }
}
