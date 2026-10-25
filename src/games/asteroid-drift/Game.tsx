import { planet, shadow, spacecraft } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, down, pressed, text } from '../kit/arcade.ts'
import type { ArcadeDefinition, ArcadeState, Progress } from '../kit/arcade.ts'
import {
  advance,
  chooseUpgrade,
  createScene,
  HEIGHT,
  radius,
  sectorFor,
  WIDTH,
} from './engine.ts'
import type { Mode, Scene, Upgrade } from './engine.ts'
import { readRun } from './storage.ts'

type State = ArcadeState & { world: Scene; flightMode: Mode }
function sync(s: State) {
  const w = s.world
  s.stage = w.wave
  s.score = w.score
  s.lives = w.lives
  s.elapsed = w.elapsed
  s.phase =
    w.phase === 'flying' ? 'play' : w.phase === 'upgrade' ? 'choice' : 'over'
  s.events = w.events
  w.events = []
}
function create(progress?: Progress): State {
  const saved =
    typeof progress?.carry.world === 'string'
      ? readRun(progress.carry.world)
      : null
  const world = saved?.scene ?? createScene()
  const s: State = {
    world,
    flightMode: saved?.mode ?? 'arcade',
    stage: world.wave,
    score: world.score,
    lives: world.lives,
    elapsed: world.elapsed,
    phase: 'play',
    seed: 1,
    events: [],
    startScore: world.score,
  }
  sync(s)
  return s
}
const upgrades = {
  rapid: {
    en: 'Quick loader',
    pl: 'Szybki magazynek',
    detailEn: 'Shorter pauses between volleys.',
    detailPl: 'Krótsza przerwa między seriami.',
  },
  spread: {
    en: 'Split fire',
    pl: 'Podwójny ogień',
    detailEn: 'Cover a wider angle with every shot.',
    detailPl: 'Szerszy ostrzał przy każdym strzale.',
  },
  engine: {
    en: 'Engine tuning',
    pl: 'Lepszy silnik',
    detailEn: 'More speed for dodging and collecting.',
    detailPl: 'Większa prędkość do uników i zbierania.',
  },
  shield: {
    en: 'Recharging shield',
    pl: 'Odnawialna tarcza',
    detailEn: 'Absorb a hit; recharge while you survive.',
    detailPl: 'Przejmij trafienie; tarcza odnowi się z czasem.',
  },
  repair: {
    en: 'Hull repair',
    pl: 'Naprawa kadłuba',
    detailEn: 'Recover one hull, up to five.',
    detailPl: 'Odzyskaj jedno życie, do pięciu.',
  },
}
function draw(
  ctx: CanvasRenderingContext2D,
  s: State,
  locale: 'en' | 'pl',
  motion: boolean,
) {
  const w = s.world,
    ship = w.ship,
    sector = sectorFor(w.wave)
  backdrop(ctx, WIDTH, HEIGHT, '#0b1720')
  planet(ctx, WIDTH - 150, HEIGHT - 110, 140, '#526f7d', true)
  for (let i = 0; i < 85; i++) {
    const x = (((i * 173 + 37 - ship.x * 0.04) % WIDTH) + WIDTH) % WIDTH,
      y = (((i * 97 + 19 - ship.y * 0.04) % HEIGHT) + HEIGHT) % HEIGHT
    circle(
      ctx,
      x,
      y,
      i % 9 === 0 ? 1.6 : 0.8,
      i % 5 === 0 ? '#708f99' : '#35515d',
    )
  }
  ctx.save()
  if (motion && w.shake > 0)
    ctx.translate(
      Math.sin(w.elapsed * 110) * w.shake * 14,
      Math.cos(w.elapsed * 120) * w.shake * 14,
    )
  for (const rock of w.rocks) {
    const r = radius(rock.size)
    for (const ox of rock.x < r
      ? [0, WIDTH]
      : rock.x > WIDTH - r
        ? [0, -WIDTH]
        : [0])
      for (const oy of rock.y < r
        ? [0, HEIGHT]
        : rock.y > HEIGHT - r
          ? [0, -HEIGHT]
          : [0]) {
        ctx.save()
        ctx.translate(rock.x + ox, rock.y + oy)
        ctx.rotate(rock.angle)
        ctx.beginPath()
        for (let i = 0; i < 11; i++) {
          const a = (i / 11) * Math.PI * 2,
            rr = r * (0.8 + Math.sin(i * 2.1 + rock.shape) * 0.15)
          if (i === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
          else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
        }
        ctx.closePath()
        ctx.fillStyle = '#26383d'
        ctx.fill()
        ctx.strokeStyle = sector.color
        ctx.lineWidth = rock.size === 3 ? 2.3 : 1.7
        ctx.stroke()
        ctx.strokeStyle = '#b5c3b31f'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(-r * 0.5, -r * 0.25)
        ctx.lineTo(-r * 0.1, r * 0.18)
        ctx.lineTo(r * 0.3, -r * 0.12)
        ctx.stroke()
        for (let pit = 0; pit < 3; pit++) {
          const angle = pit * 2.2 + rock.shape
          const px = Math.cos(angle) * r * 0.45,
            py = Math.sin(angle) * r * 0.45
          shadow(ctx, px, py, r * 0.15, r * 0.12, '#0d1e2c77')
          ctx.strokeStyle = '#d1ceb02a'
          ctx.beginPath()
          ctx.arc(px, py, r * 0.15, 0, Math.PI)
          ctx.stroke()
        }
        ctx.restore()
      }
  }
  for (const shot of w.shots) {
    ctx.strokeStyle = shot.enemy ? '#ff8c9b' : '#fff1ad'
    ctx.lineWidth = shot.enemy ? 3 : 2.4
    ctx.beginPath()
    ctx.moveTo(shot.x - shot.vx * 0.018, shot.y - shot.vy * 0.018)
    ctx.lineTo(shot.x, shot.y)
    ctx.stroke()
  }
  for (const enemy of w.saucers) {
    ctx.save()
    ctx.translate(enemy.x, enemy.y)
    ctx.strokeStyle = '#f29d9d'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(0, 0, enemy.elite ? 30 : 22, 10, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(0, -5, 13, Math.PI, 0)
    ctx.stroke()
    ctx.restore()
    if (enemy.timer < 0.3) {
      ctx.save()
      ctx.globalAlpha = 0.4
      ctx.strokeStyle = '#fa8a9a'
      ctx.setLineDash([4, 9])
      ctx.beginPath()
      ctx.moveTo(enemy.x, enemy.y)
      ctx.lineTo(ship.x, ship.y)
      ctx.stroke()
      ctx.restore()
    }
    ctx.fillStyle = '#f29d9d'
    ctx.fillRect(enemy.x - 24, enemy.y - 27, (48 * enemy.hp) / enemy.maxHP, 3)
  }
  for (const p of w.pickups) {
    circle(
      ctx,
      p.x,
      p.y,
      14,
      p.kind === 'repair'
        ? '#b1e8a4'
        : p.kind === 'shield'
          ? '#89dfe0'
          : '#f4d085',
    )
    text(
      ctx,
      p.kind === 'repair' ? '+' : p.kind === 'shield' ? 'S' : '⚡',
      p.x,
      p.y + 5,
      16,
      '#13252c',
      'center',
    )
  }
  for (const p of w.particles) {
    ctx.globalAlpha = p.life / p.total
    circle(ctx, p.x, p.y, 2.1, p.color)
  }
  ctx.globalAlpha = 1
  for (const p of w.floaters) {
    ctx.globalAlpha = Math.min(1, p.life * 2)
    text(ctx, `+${p.value}`, p.x, p.y, 14, '#f6d69e', 'center')
  }
  ctx.globalAlpha = 1
  if (w.phase !== 'over') {
    const alpha =
      ship.invulnerable > 0 && motion
        ? 0.35 + Math.abs(Math.sin(w.elapsed * 14)) * 0.6
        : 1
    ctx.globalAlpha = alpha
    for (const ox of ship.x < 25
      ? [0, WIDTH]
      : ship.x > WIDTH - 25
        ? [0, -WIDTH]
        : [0])
      for (const oy of ship.y < 25
        ? [0, HEIGHT]
        : ship.y > HEIGHT - 25
          ? [0, -HEIGHT]
          : [0]) {
        ctx.save()
        ctx.translate(ship.x + ox, ship.y + oy)
        ctx.rotate(ship.angle)
        if (ship.thrust > 0 || ship.dashTimer > 0) {
          ctx.fillStyle = '#72d6de'
          ctx.beginPath()
          ctx.moveTo(-14, -6)
          ctx.lineTo(-27 - (motion ? Math.sin(w.elapsed * 80) * 7 : 0), 0)
          ctx.lineTo(-14, 6)
          ctx.fill()
        }
        ctx.rotate(Math.PI / 2)
        spacecraft(ctx, 0, 0, 0.65, '#c3dbd6', false, motion ? w.elapsed : 0)
        ctx.restore()
      }
    ctx.globalAlpha = 1
    if (w.shield) {
      ctx.strokeStyle = '#91e5e1'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(ship.x, ship.y, 28, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
  ctx.restore()
  text(
    ctx,
    `${locale === 'pl' ? 'SEKTOR' : 'SECTOR'} ${w.wave} / ${sector[locale]}`,
    22,
    32,
    14,
    sector.color,
  )
  text(
    ctx,
    `${locale === 'pl' ? 'CELE' : 'TARGETS'} ${w.rocks.length + w.saucers.length}`,
    WIDTH - 22,
    32,
    13,
    '#91a6ac',
    'right',
  )
  if (w.combo > 1)
    text(
      ctx,
      `${w.combo} ${locale === 'pl' ? 'SERIA' : 'CHAIN'}  ×${Math.min(5, 1 + Math.floor((w.combo - 1) / 4))}`,
      WIDTH / 2,
      38,
      18,
      '#f3d598',
      'center',
    )
  if (w.overdrive > 0)
    text(
      ctx,
      `${locale === 'pl' ? 'DOPALACZ OGNIA' : 'OVERDRIVE'} ${Math.ceil(w.overdrive)}s`,
      22,
      HEIGHT - 25,
      13,
      '#f3d598',
    )
  ctx.fillStyle = '#ffffff19'
  ctx.fillRect(WIDTH - 183, HEIGHT - 35, 160, 7)
  ctx.fillStyle = ship.dashFuel >= 65 ? '#9be4d4' : '#5c8590'
  ctx.fillRect(WIDTH - 183, HEIGHT - 35, (160 * ship.dashFuel) / 100, 7)
  text(
    ctx,
    `${locale === 'pl' ? 'UNIK' : 'DASH'} · SHIFT`,
    WIDTH - 22,
    HEIGHT - 47,
    11,
    '#b5cdcf',
    'right',
  )
}
const definition: ArcadeDefinition<State> = {
  id: 'asteroid-drift',
  name: 'ASTEROID DRIFT',
  width: WIDTH,
  height: HEIGHT,
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['↑', 'arrowup'],
        ['↓', 'arrowdown'],
        ['→', 'arrowright'],
        [l === 'pl' ? 'Ogień' : 'Fire', ' '],
        [l === 'pl' ? 'Unik' : 'Dash', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'Break the belt. Build your ship.',
    pl: 'Rozbij pas. Rozwiń statek.',
  },
  help: {
    en: 'WASD / arrows move · Space / mouse fires · Shift / X dashes. Mouse aims; without it, steer your shots with movement.',
    pl: 'WASD / strzałki: ruch · spacja / mysz: ogień · Shift / X: unik. Mysz celuje; bez niej kierunek ruchu ustawia strzał.',
  },
  modes: [
    {
      id: 'arcade',
      title: { en: 'Direct flight', pl: 'Lot bezpośredni' },
      detail: {
        en: 'Responsive movement, optional mouse aim.',
        pl: 'Szybkie sterowanie, opcjonalny celownik myszy.',
      },
    },
    {
      id: 'classic',
      title: { en: 'Classic inertia', pl: 'Klasyczna bezwładność' },
      detail: {
        en: '← → rotate · ↑ thrust · ↓ brake · Space fires.',
        pl: '← → obrót · ↑ ciąg · ↓ hamulec · spacja: ogień.',
      },
    },
  ],
  create,
  draw,
  update(s, input, delta) {
    s.flightMode = input.mode === 'classic' ? 'classic' : 'arcade'
    advance(
      s.world,
      {
        left: down(input, 'a', 'arrowleft'),
        right: down(input, 'd', 'arrowright'),
        up: down(input, 'w', 'arrowup'),
        down: down(input, 's', 'arrowdown'),
        fire: down(input, ' ', 'j') || input.pointer.down,
        dash: pressed(input, 'shift', 'x'),
        aim: input.pointer.active ? input.pointer : null,
      },
      s.flightMode,
      delta,
    )
    sync(s)
  },
  choices(s, locale) {
    return s.world.options.map((id) => ({
      id,
      title: upgrades[id][locale],
      detail: locale === 'pl' ? upgrades[id].detailPl : upgrades[id].detailEn,
    }))
  },
  choose(s, id) {
    const candidate = s.world.options.find((option) => option === id)
    if (candidate) {
      chooseUpgrade(s.world, candidate)
      sync(s)
    }
  },
  checkpoint(s) {
    const world = {
      ...s.world,
      particles: [],
      floaters: [],
      events: [],
      shots: [],
      version: 1,
      mode: s.flightMode,
    }
    return {
      stage: s.stage,
      score: s.score,
      lives: s.lives,
      elapsed: s.elapsed,
      carry: { world: JSON.stringify(world) },
    }
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Sektor ${s.stage}. Rozbijaj duże skały z dystansu; unik przenosi przez niebezpieczne odłamki.`
      : `Sector ${s.stage}. Split big rocks from a distance; dash through the dangerous fragments.`
  },
  status(s, locale) {
    return `${sectorFor(s.stage)[locale]} · ${locale === 'pl' ? 'UNIK' : 'DASH'} ${Math.floor(s.world.ship.dashFuel)}%${s.world.shield ? ' · ◇' : ''}`
  },
  stats(s, locale) {
    return [
      { label: locale === 'pl' ? 'SEKTOR' : 'SECTOR', value: s.stage },
      {
        label: locale === 'pl' ? 'ROZBITE CELE' : 'TARGETS',
        value: s.world.kills,
      },
      {
        label: locale === 'pl' ? 'NAJLEPSZA SERIA' : 'BEST CHAIN',
        value: s.world.bestCombo,
      },
    ]
  },
}
export const Game = createArcadeGame(definition)
