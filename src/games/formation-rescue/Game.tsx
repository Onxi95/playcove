import { planet, spacecraft } from '../kit/art.ts'
import { createArcadeGame } from '../kit/ArcadeHost.tsx'
import { backdrop, circle, rect, text } from '../kit/arcade.ts'
import type { ArcadeDefinition } from '../kit/arcade.ts'
import { choose, create, save, update } from './engine.ts'
import type { State } from './engine.ts'
const def: ArcadeDefinition<State> = {
  id: 'formation-rescue',
  name: 'FORMATION RESCUE',
  width: 900,
  height: 620,
  create,
  update,
  choose,
  checkpoint: save,
  touchGroups: (_, l) => [
    {
      label: '',
      buttons: [
        ['←', 'arrowleft'],
        ['→', 'arrowright'],
        [l === 'pl' ? 'Ogień' : 'Fire', ' '],
        [l === 'pl' ? 'Unik' : 'Roll', 'x'],
      ],
    },
  ],
  tagline: {
    en: 'Rescue your wingman. Double your fire.',
    pl: 'Uratuj skrzydłowego. Podwój ogień.',
  },
  help: {
    en: '← → / A D steer · Space fires · X / Shift rolls through danger. Avoid tractor beams; destroy a captor and collect the released fighter for dual fire.',
    pl: '← → / A D ruch · spacja: ogień · X / Shift: unik. Unikaj promieni chwytających; zniszcz porywacza i odzyskaj myśliwiec, by strzelać podwójnie.',
  },
  choices: (_, locale) =>
    locale === 'pl'
      ? [
          {
            id: 'rapid',
            title: 'Szybszy magazynek',
            detail: 'Krótsza przerwa między strzałami.',
          },
          {
            id: 'guard',
            title: 'Lepszy unik',
            detail: 'Energia uniku odnawia się szybciej.',
          },
          {
            id: 'repair',
            title: 'Rezerwowy pilot',
            detail: 'Odzyskaj jedną szansę.',
          },
        ]
      : [
          {
            id: 'rapid',
            title: 'Quick loader',
            detail: 'Shorter delays between volleys.',
          },
          {
            id: 'guard',
            title: 'Evasive tuning',
            detail: 'Your roll energy recovers faster.',
          },
          {
            id: 'repair',
            title: 'Reserve pilot',
            detail: 'Recover one chance.',
          },
        ],
  draw(ctx, s, locale, motion) {
    backdrop(ctx, 900, 620, '#111b32')
    planet(ctx, 720, 365, 150, '#617a94', true)
    for (let i = 0; i < 80; i++)
      circle(
        ctx,
        (i * 137 + 51) % 900,
        (i * 79 + s.elapsed * (8 + (i % 17))) % 620,
        i % 11 === 0 ? 1.5 : 0.7,
        '#87a0b166',
      )
    for (const e of s.enemies) {
      if (!e.alive || e.y < 0) continue
      const color =
        e.kind === 2 ? '#abbbef' : e.kind === 1 ? '#e9bc82' : '#9dd1b3'
      spacecraft(ctx, e.x, e.y, 0.7, color, true, s.elapsed)
      if (e.captive) rect(ctx, e.x - 5, e.y + 17, 10, 10, '#c6ecf0', 2)
      if (e.state === 'beam') {
        ctx.fillStyle = e.timer > 1.1 ? '#f1cd7c22' : '#a8d9e455'
        ctx.beginPath()
        ctx.moveTo(e.x - 10, e.y + 15)
        ctx.lineTo(e.x - 48, 575)
        ctx.lineTo(e.x + 48, 575)
        ctx.lineTo(e.x + 10, e.y + 15)
        ctx.fill()
        text(
          ctx,
          e.timer > 1.1 ? '!' : '↓',
          e.x,
          e.y - 29,
          20,
          '#f5d29a',
          'center',
        )
      }
    }
    for (const b of s.shots)
      rect(ctx, b.x - 2, b.y - 8, 4, 16, b.enemy ? '#ef98a4' : '#ffdf90', 2)
    const fighter = (x: number, y: number, color: string) =>
      spacecraft(ctx, x, y, 0.8, color, false, s.elapsed)
    if (s.rescue) fighter(s.rescue.x, s.rescue.y, '#bce7e8')
    ctx.globalAlpha =
      s.invulnerable > 0 && motion
        ? 0.35 + Math.abs(Math.sin(s.elapsed * 13)) * 0.65
        : 1
    if (s.dual) {
      fighter(s.x - 15, 550, '#bed8e9')
      fighter(s.x + 15, 550, '#bed8e9')
    } else fighter(s.x, 550, '#bed8e9')
    ctx.globalAlpha = 1
    if (s.roll > 0) {
      ctx.strokeStyle = '#96dbd4'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.ellipse(s.x, 550, 35, 25, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    text(
      ctx,
      s.challenge
        ? locale === 'pl'
          ? 'PRÓBA CELOWANIA'
          : 'FLIGHT CHALLENGE'
        : `${locale === 'pl' ? 'FALA' : 'WAVE'} ${s.stage}`,
      450,
      27,
      15,
      '#e4d3aa',
      'center',
    )
    rect(ctx, 700, 590, 160, 5, '#ffffff22')
    rect(ctx, 700, 590, (160 * s.guard) / 100, 5, '#91d4d1')
  },
  endMessage(s, l) {
    return l === 'pl'
      ? `Fala ${s.stage}. Uratowani piloci: ${s.rescued}. Zniszcz porywacza, by odzyskać drugie działo; X pozwala unikać ostrzału.`
      : `Wave ${s.stage}. Pilots rescued: ${s.rescued}. Destroy a captor to recover dual fire; X rolls through danger.`
  },
  status(s, locale) {
    return `${s.challenge ? (locale === 'pl' ? 'PRÓBA' : 'CHALLENGE') : locale === 'pl' ? 'FORMACJA' : 'FORMATION'} · ${locale === 'pl' ? 'CELE' : 'TARGETS'} ${s.enemies.filter((e) => e.alive).length} · ${s.dual ? 'DUAL' : locale === 'pl' ? 'POJEDYNCZY' : 'SINGLE'} · ${Math.floor(s.guard)}%`
  },
  stats(s, locale) {
    return [
      { label: locale === 'pl' ? 'FALA' : 'WAVE', value: s.stage },
      { label: locale === 'pl' ? 'TRAFIENIA' : 'HITS', value: s.hits },
      { label: locale === 'pl' ? 'URATOWANI' : 'RESCUED', value: s.rescued },
    ]
  },
}
export const Game = createArcadeGame(def)
