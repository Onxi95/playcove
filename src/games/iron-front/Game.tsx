import { bevel, polygon, worker } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { create, update, choose, save, platforms } from './engine.ts'
import type { State } from './engine.ts'
const def: ArcadeDefinition<State> = {
  id: 'iron-front',
  name: 'IRON FRONT',
  width: 900,
  height: 560,
  touch: [
    ['←', 'arrowleft'],
    ['↑', 'arrowup'],
    ['↓', 'arrowdown'],
    ['→', 'arrowright'],
    ['↟', ' '],
    ['●', 'j'],
    ['✦', 'x'],
  ],
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['↑', 'arrowup'],
        ['↓', 'arrowdown'],
        ['→', 'arrowright'],
        [l === 'pl' ? 'Skok' : 'Jump', ' '],
        [l === 'pl' ? 'Ogień' : 'Fire', 'j'],
        [l === 'pl' ? 'Granat' : 'Grenade', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'Break the line. Bring everyone home.',
    pl: 'Przełam linię. Uratuj załogę.',
  },
  help: {
    en: 'A D / ← → move · Space jumps · J / Z fires · X / K grenades · ↓ crouches. Hold ↑ to aim up. Rescue engineers for supplies. Every third mission puts you in an armored rover.',
    pl: 'A D / ← → ruch · spacja: skok · J / Z: strzał · X / K: granat · ↓ kucanie. ↑: celowanie w górę. Ratuj inżynierów. Co trzecia misja: pojazd pancerny.',
  },
  choices: (_, l) =>
    l === 'pl'
      ? [
          {
            id: 'supply',
            title: 'Ładunki',
            detail: 'Pięć granatów na następną misję.',
          },
          {
            id: 'weapon',
            title: 'Rozrzut',
            detail: 'Broń strzelająca trzema pociskami.',
          },
          { id: 'medic', title: 'Medyk', detail: 'Odzyskaj jedno życie.' },
        ]
      : [
          {
            id: 'supply',
            title: 'Demolition kit',
            detail: 'Five grenades for the next mission.',
          },
          {
            id: 'weapon',
            title: 'Spread weapon',
            detail: 'Start with three-shot volleys.',
          },
          { id: 'medic', title: 'Field medic', detail: 'Recover one life.' },
        ],
  draw(ctx, s, l, motion) {
    backdrop(ctx, 900, 560, s.stage % 2 ? '#aac1bd' : '#bcb0a2')
    const sky = ctx.createLinearGradient(0, 0, 0, 500)
    sky.addColorStop(0, s.stage % 2 ? '#8baeb1' : '#8f8790')
    sky.addColorStop(1, '#d7d0ad')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, 900, 500)
    circle(ctx, 730, 110, 47, '#e7d6ab')
    for (let layer = 0; layer < 2; layer++) {
      const points = [0, 500]
      for (let x = 0; x <= 920; x += 30)
        points.push(
          x,
          180 +
            layer * 75 -
            Math.sin((x + s.camera * 0.1) / 150 + layer) * 44 -
            Math.sin(x / 59) * 13,
        )
      points.push(920, 500)
      polygon(ctx, points, layer ? '#738f87' : '#9eafa0')
    }

    for (let n = 0; n < 12; n++) {
      const x = ((n * 130 - s.camera * 0.2) % 1100) - 100
      rect(ctx, x, 160 + (n % 3) * 25, 80, 360, '#637e7c')
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 3; col++)
          rect(
            ctx,
            x + 10 + col * 20,
            180 + (n % 3) * 25 + row * 32,
            11,
            14,
            '#b1bca144',
          )
      rect(ctx, x - 4, 160 + (n % 3) * 25, 88, 5, '#425f5b')
    }
    rect(ctx, 0, 500, 900, 60, '#3d4d47')
    rect(ctx, 0, 500, 900, 5, '#b5ac7e')
    ctx.save()
    ctx.translate(-s.camera, 0)
    for (const p of platforms(s.stage)) {
      bevel(ctx, p.x, p.y, p.w, 15, '#7e8b75', 2)
      for (let x = p.x + 7; x < p.x + p.w - 5; x += 20)
        circle(ctx, x, p.y + 7, 1.5, '#c6c9a0')
      rect(ctx, p.x + 15, p.y + 15, 12, 500 - p.y, '#657268')
      rect(ctx, p.x + p.w - 27, p.y + 15, 12, 500 - p.y, '#657268')
    }
    for (const p of s.pickups)
      if (!p.taken) {
        circle(
          ctx,
          p.x,
          474,
          17,
          p.kind === 0 ? '#ecd490' : p.kind === 1 ? '#b0d4bf' : '#eab2a2',
        )
        text(
          ctx,
          p.kind === 0 ? 'W' : p.kind === 1 ? '!' : '+',
          p.x,
          480,
          19,
          '#354940',
          'center',
        )
      }
    for (const e of s.enemies)
      if (e.alive) {
        rect(
          ctx,
          e.x - 13,
          e.y,
          26,
          29,
          e.kind === 2 ? '#9a6a59' : '#59695b',
          4,
        )
        rect(ctx, e.x - 15, e.y - 7, 30, 10, '#394f48', 3)
        rect(ctx, e.x - 8, e.y + 5, 16, 8, '#d6b58d', 2)
        rect(ctx, e.x - 17, e.y + 30, 10, 5, '#303e3a')
        rect(ctx, e.x + 6, e.y + 30, 10, 5, '#303e3a')
        if (e.warning) text(ctx, '!', e.x, e.y - 16, 22, '#ffe4a1', 'center')
      }
    const b = s.boss
    if (b.hp > 0) {
      rect(ctx, b.x - 62, 420, 124, 70, '#657b76', 12)
      rect(ctx, b.x - 75, 445, 65, 13, '#3c5554', 3)
      rect(ctx, b.x - 48, 402, 96, 32, '#768d7a', 7)
      for (let n = 0; n < 5; n++)
        circle(ctx, b.x - 45 + n * 22, 490, 12, '#273d3c')
      if (b.warning) text(ctx, '!', b.x, 385, 32, '#ffe5a4', 'center')
      rect(ctx, b.x - 65, 367, 130, 5, '#405752')
      rect(ctx, b.x - 65, 367, 130 * Math.max(0, b.hp / b.max), 5, '#e8b17e')
    }
    ctx.globalAlpha =
      s.invulnerable > 0 && motion
        ? 0.4 + Math.abs(Math.sin(s.elapsed * 14)) * 0.6
        : 1
    if (s.vehicle) {
      rect(ctx, s.x - 34, s.y + 5, 68, 29, '#d7bb75', 7)
      circle(ctx, s.x - 23, s.y + 32, 12, '#304741')
      circle(ctx, s.x + 23, s.y + 32, 12, '#304741')
    } else {
      ctx.save()
      ctx.translate(s.x, s.y + (s.crouching ? 12 : 0))
      if (s.crouching) ctx.scale(1, 0.65)
      worker(
        ctx,
        0,
        0,
        '#c5cda3',
        s.facing,
        s.elapsed,
        Math.abs(s.vx) > 10,
        false,
      )
      ctx.restore()
    }
    if (s.aimUp) rect(ctx, s.x + s.facing * 15, s.y - 6, 6, 25, '#3c5750', 2)
    else
      rect(
        ctx,
        s.x + s.facing * 6,
        s.y + (s.crouching ? 25 : 14),
        s.facing * 25,
        7,
        '#3c5750',
        2,
      )
    ctx.globalAlpha = 1
    for (const grenade of s.grenadeShots) {
      circle(ctx, grenade.x, grenade.y, 6, '#d9dba1')
      circle(ctx, grenade.x + 2, grenade.y - 5, 2, '#edac79')
    }
    for (const shot of s.shots)
      rect(
        ctx,
        shot.x - 4,
        shot.y - 2,
        shot.enemy ? 9 : 14,
        4,
        shot.enemy ? '#f0b18b' : '#fff0af',
        2,
      )
    for (const e of s.explosions) {
      circle(ctx, e.x, e.y, 130 * e.life, '#edb35e88')
      circle(ctx, e.x, e.y, 90 * e.life, '#fbe4a2')
    }
    ctx.restore()
    text(
      ctx,
      `${l === 'pl' ? 'MISJA' : 'MISSION'} ${s.stage}${s.vehicle ? ' · ROVER' : ''}`,
      25,
      33,
      16,
      '#29443f',
    )
    text(
      ctx,
      `${l === 'pl' ? 'GRANATY' : 'GRENADES'} ${s.grenades} · ${s.ammo ? `${l === 'pl' ? 'AMUNICJA' : 'AMMO'} ${s.ammo}` : l === 'pl' ? 'KARABIN ∞' : 'RIFLE ∞'}`,
      875,
      33,
      14,
      '#29443f',
      'right',
    )
    if (s.x > 2850)
      text(
        ctx,
        l === 'pl' ? 'DZIAŁO OBLĘŻNICZE' : 'SIEGE WALKER',
        450,
        60,
        16,
        '#29443f',
        'center',
      )
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Misja ${s.stage}. Uratowani inżynierowie: ${s.rescued}. Obserwuj ostrzeżenia, korzystaj z osłon wysokości i rzucaj granaty pod działo.`
      : `Mission ${s.stage}. Engineers rescued: ${s.rescued}. Read firing warnings, use the platforms, and throw grenades under the siege walker.`
  },
  status(s, l) {
    return `${l === 'pl' ? 'PUNKT KONTROLNY' : 'CHECKPOINT'} ${s.checkpointX / 900} / 3 · ${l === 'pl' ? 'URATOWANI' : 'RESCUED'} ${s.rescued} · ${l === 'pl' ? 'CEL: ZNISZCZ DZIAŁO' : 'OBJECTIVE: BREAK THE SIEGE WALKER'}`
  },
}
export const Game = createArcadeGame(def)
