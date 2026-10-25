import { circle, clamp, rect, text } from '../kit/arcade.ts'
import { curve, GATE, LENGTH, ROUTES, VIEW } from './engine.ts'
import type { State } from './engine.ts'
import type { Language } from '../kit/arcade.ts'
export const WIDTH = 1100,
  HEIGHT = 680
function polygon(
  ctx: CanvasRenderingContext2D,
  points: number[],
  fill: string | CanvasGradient,
) {
  ctx.fillStyle = fill
  ctx.beginPath()
  for (let n = 0; n < points.length; n += 2) {
    if (n === 0) ctx.moveTo(points[n], points[n + 1])
    else ctx.lineTo(points[n], points[n + 1])
  }
  ctx.closePath()
  ctx.fill()
  ctx.strokeStyle = fill
  ctx.lineWidth = 0.65
  ctx.stroke()
}
function ellipse(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}
export function project(s: State, z: number) {
  const scale = 700 / (Math.max(-120, z) + 700),
    bend = curve(s.distance, s.route),
    ahead = curve(s.distance + Math.max(0, z) * 0.75, s.route),
    horizon = 205 + Math.sin(s.distance / 2400) * 12
  return {
    x:
      WIDTH / 2 -
      s.x * (620 * scale - 30) +
      (ahead - bend) * scale * 360 +
      bend * (1 - scale) * 210,
    y:
      horizon +
      (HEIGHT - 54 - horizon) * scale +
      Math.sin(z / 1800) * Math.sin(s.distance / 3200) * 25 * scale,
    half: 620 * scale,
    scale,
  }
}
function car(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
  kind: number,
  steer = 0,
  braking = false,
  boost = false,
  time = 0,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.rotate(steer * 0.035)
  ellipse(ctx, 0, -6, 76, 15, '#071f3166')
  if (kind === 1) {
    rect(ctx, -52, -126, 104, 111, '#d9d9c6', 5)
    polygon(ctx, [-52, -126, -37, -139, 52, -139, 52, -126], '#f0ecdb')
    rect(ctx, -43, -111, 86, 67, color, 2)
    for (let n = 0; n < 7; n++) rect(ctx, -40, -104 + n * 8, 80, 2, '#203a3c22')
    rect(ctx, -57, -17, 114, 15, '#293c43', 3)
    rect(ctx, -49, -15, 16, 6, '#f1aa8c')
    rect(ctx, 33, -15, 16, 6, '#f1aa8c')
    rect(ctx, -48, -43, 96, 5, '#b4bbae')
    rect(ctx, -45, -3, 16, 11, '#172833')
    rect(ctx, 29, -3, 16, 11, '#172833')
  } else if (kind === 2) {
    rect(ctx, -14, -43, 28, 39, '#20323a', 6)
    ellipse(ctx, 0, -35, 19, 26, color)
    circle(ctx, 0, -65, 12, '#d3ded8')
    rect(ctx, -21, -39, 42, 4, '#d2d8bf', 2)
    rect(ctx, -7, -12, 14, 5, '#f9a58c', 2)
  } else {
    ctx.scale(1, 0.84)
    rect(ctx, -62, -38, 14, 34, '#132530', 5)
    rect(ctx, 48, -38, 14, 34, '#132530', 5)
    const paint = ctx.createLinearGradient(-55, -80, 45, 0)
    paint.addColorStop(0, '#fff0c655')
    paint.addColorStop(0.3, color)
    paint.addColorStop(1, color)
    polygon(
      ctx,
      [
        -54, -13, -57, -53, -42, -88, -30, -103, 30, -103, 42, -88, 57, -53, 54,
        -13, 43, -2, -43, -2,
      ],
      color,
    )
    polygon(
      ctx,
      [
        -54, -13, -57, -53, -42, -88, -30, -103, 30, -103, 42, -88, 57, -53, 54,
        -13, 43, -2, -43, -2,
      ],
      paint,
    )
    polygon(
      ctx,
      [-34, -89, -25, -98, 25, -98, 34, -89, 41, -53, -41, -53],
      '#243f50',
    )
    polygon(
      ctx,
      [-29, -87, -23, -94, 22, -94, 31, -86, 35, -61, -34, -61],
      '#7babad',
    )
    polygon(
      ctx,
      [-29, -87, -23, -94, 22, -94, 31, -86, 35, -61, -34, -61],
      '#b1c9be44',
    )
    polygon(ctx, [-42, -50, 42, -50, 49, -27, -49, -27], color)
    rect(ctx, -47, -26, 94, 16, '#273640', 3)
    rect(ctx, -43, -23, 29, 6, braking ? '#ffddaf' : '#e99a88', 2)
    rect(ctx, 14, -23, 29, 6, braking ? '#ffddaf' : '#e99a88', 2)
    if (braking) {
      ellipse(ctx, -29, -20, 24, 12, '#ff876633')
      ellipse(ctx, 29, -20, 24, 12, '#ff876633')
    }
    rect(ctx, -11, -21, 22, 8, '#e3d8bd', 1)
    rect(ctx, -52, -40, 104, 6, '#192b35', 2)
    rect(ctx, -43, -42, 86, 3, '#58646a')
    for (let n = 0; n < 6; n++) rect(ctx, -27 + n * 10, -46, 5, 7, '#172c3377')
    rect(ctx, -46, -8, 92, 5, '#172b32', 2)
    ellipse(ctx, -34, -5, 5, 3, '#b4c0ba')
    ellipse(ctx, 34, -5, 5, 3, '#b4c0ba')
    if (boost) {
      for (const side of [-1, 1]) {
        const flame = 24 + Math.sin(time * 58 + side) * 9
        polygon(
          ctx,
          [side * 34 - 6, -3, side * 34, flame, side * 34 + 6, -3],
          '#83dce9',
        )
        polygon(
          ctx,
          [side * 34 - 3, -3, side * 34, flame * 0.65, side * 34 + 3, -3],
          '#e3faf2',
        )
      }
    }
  }
  ctx.restore()
}
function palm(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  flip: number,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale * flip, scale)
  ctx.strokeStyle = '#8c775d'
  ctx.lineWidth = 12
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-14, -75, 5, -160)
  ctx.stroke()
  ctx.strokeStyle = '#405e4d'
  ctx.lineWidth = 9
  for (let n = 0; n < 7; n++) {
    const angle = -Math.PI + (n / 6) * Math.PI * 1.7
    ctx.beginPath()
    ctx.moveTo(5, -155)
    ctx.quadraticCurveTo(
      5 + Math.cos(angle) * 55,
      -155 + Math.sin(angle) * 45,
      5 + Math.cos(angle) * 90,
      -130 + Math.sin(angle) * 40,
    )
    ctx.stroke()
  }
  circle(ctx, 5, -153, 12, '#64784d')
  ctx.restore()
}
function pine(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
) {
  rect(ctx, x - 5 * scale, y - 55 * scale, 10 * scale, 55 * scale, '#605e50')
  for (let n = 0; n < 3; n++)
    polygon(
      ctx,
      [
        x,
        y - (160 - n * 35) * scale,
        x + (55 - n * 8) * scale,
        y - (35 + n * 10) * scale,
        x - (55 - n * 8) * scale,
        y - (35 + n * 10) * scale,
      ],
      n % 2 ? '#355b56' : '#476b5b',
    )
}
function scenery(ctx: CanvasRenderingContext2D, s: State) {
  const night = s.route === 3,
    mountain = s.route === 2
  const sky = ctx.createLinearGradient(0, 0, 0, 250)
  sky.addColorStop(0, night ? '#111c37' : mountain ? '#8ab1bb' : '#d68d84')
  sky.addColorStop(0.75, night ? '#53415d' : mountain ? '#c5d2c1' : '#f4c5a2')
  sky.addColorStop(1, night ? '#bd7b76' : '#f3dbc1')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, WIDTH, HEIGHT)
  const parallax = curve(s.distance, s.route) * 90 + s.x * 10
  if (night) {
    for (let n = 0; n < 50; n++)
      circle(
        ctx,
        (n * 157 + 21) % WIDTH,
        (n * 73 + 10) % 165,
        n % 6 === 0 ? 1.5 : 0.7,
        '#e6dfc1aa',
      )
    circle(ctx, 840 - parallax * 0.2, 80, 29, '#ead6b4')
    circle(ctx, 851 - parallax * 0.2, 70, 27, '#1b2540')
  } else {
    circle(ctx, 790 - parallax * 0.25, 115, 62, '#ffe1b755')
    circle(ctx, 790 - parallax * 0.25, 115, 44, '#ffe7b9')
    for (let n = 0; n < 4; n++)
      rect(ctx, 720 - parallax * 0.25, 132 + n * 13, 145, 4, '#eeb49b77')
  }
  for (let layer = 0; layer < 3; layer++) {
    const points = [-30, 270]
    for (let x = -30; x <= WIDTH + 40; x += 25) {
      const world = x + parallax * (layer + 1) * 0.35
      points.push(
        x,
        185 +
          layer * 22 -
          Math.sin(world / (130 - layer * 25) + layer) * 27 -
          Math.sin(world / 61 + layer) * 10,
      )
    }
    points.push(WIDTH + 40, 330, -30, 330)
    polygon(
      ctx,
      points,
      night
        ? ['#494359', '#634c5c', '#7c5e65'][layer]
        : mountain
          ? ['#738c94', '#6b8b89', '#719a8a'][layer]
          : ['#9d9e9a', '#92a39a', '#83a899'][layer],
    )
  }
  if (!night && !mountain) {
    const sea = ctx.createLinearGradient(0, 210, 0, HEIGHT)
    sea.addColorStop(0, '#83b5b1')
    sea.addColorStop(0.5, '#4a9e9f')
    sea.addColorStop(1, '#297b87')
    ctx.fillStyle = sea
    ctx.fillRect(0, 225, WIDTH, HEIGHT - 225)
    for (let n = 0; n < 28; n++) {
      const y = 238 + (n / 28) ** 2 * 400
      rect(
        ctx,
        (n * 119 + s.distance * 0.06) % WIDTH,
        y,
        25 + n * 6,
        1 + n / 12,
        '#d4d4b733',
      )
    }
  } else rect(ctx, 0, 240, WIDTH, HEIGHT - 240, night ? '#3c3f46' : '#6f8d75')
  if (night)
    for (let n = 0; n < 20; n++) {
      const x =
          ((((n * 113 - parallax * 0.8) % (WIDTH + 160)) + WIDTH + 160) %
            (WIDTH + 160)) -
          80,
        h = 55 + ((n * 71) % 100)
      rect(ctx, x, 250 - h, 52, h, '#243947')
      rect(ctx, x + 5, 250 - h + 8, 42, 2, n % 3 === 0 ? '#cf8a88' : '#7ba5a1')
      for (let row = 0; row < 5; row++)
        for (let col = 0; col < 4; col++)
          if ((row + col + n) % 3)
            rect(ctx, x + 7 + col * 11, 260 - h + row * 14, 4, 5, '#d8bc8c88')
    }
}
function road(ctx: CanvasRenderingContext2D, s: State) {
  const night = s.route === 3,
    mountain = s.route === 2
  const strips = 150
  for (let n = strips; n >= 0; n--) {
    const z = (n / strips) ** 2.5 * 18000 - 110,
      next = ((n + 1) / strips) ** 2.5 * 18000 - 110,
      a = project(s, z),
      b = project(s, next),
      stripe = Math.floor((s.distance + z) / 120) % 2
    polygon(
      ctx,
      [
        night || mountain ? 0 : a.x - a.half * 1.2,
        a.y,
        WIDTH,
        a.y,
        WIDTH,
        b.y,
        night || mountain ? 0 : b.x - b.half * 1.2,
        b.y,
      ],
      night
        ? stripe
          ? '#45434a'
          : '#424149'
        : mountain
          ? stripe
            ? '#83926d'
            : '#7f8e68'
          : stripe
            ? '#d4b992'
            : '#cfb48c',
    )
    const quad = (width: number, color: string) =>
      polygon(
        ctx,
        [
          a.x - a.half * width,
          a.y,
          b.x - b.half * width,
          b.y,
          b.x + b.half * width,
          b.y,
          a.x + a.half * width,
          a.y,
        ],
        color,
      )
    quad(1.15, night ? '#6a6469' : '#e1c7a0')
    quad(1.045, stripe ? '#efe0c3' : '#c97c6b')
    quad(
      1,
      night ? (stripe ? '#333946' : '#353b48') : stripe ? '#53616b' : '#56636d',
    )
    for (const side of [-1, 1]) {
      polygon(
        ctx,
        [
          a.x + side * a.half * 0.96,
          a.y,
          b.x + side * b.half * 0.96,
          b.y,
          b.x + side * b.half * 0.965,
          b.y,
          a.x + side * a.half * 0.965,
          a.y,
        ],
        night ? '#cab895' : '#e4d7bd',
      )
    }
    if (stripe)
      for (const lane of [-1 / 3, 1 / 3])
        polygon(
          ctx,
          [
            a.x + a.half * (lane - 0.007),
            a.y,
            b.x + b.half * (lane - 0.007),
            b.y,
            b.x + b.half * (lane + 0.007),
            b.y,
            a.x + a.half * (lane + 0.007),
            a.y,
          ],
          '#e8dfc1',
        )
  }
  for (const mark of s.marks) {
    const z = mark.z - s.distance
    if (z < -110 || z > VIEW) continue
    const p = project(s, z),
      x = p.x + mark.x * p.half
    for (const side of [-1, 1])
      rect(
        ctx,
        x + side * 43 * p.scale,
        p.y,
        5 * p.scale,
        8 * p.scale,
        '#182c3544',
      )
  }
}
function roadside(ctx: CanvasRenderingContext2D, s: State) {
  const base = Math.floor(s.distance / 180) * 180,
    objects: Array<{ z: number; side: number; kind: number; id: number }> = []
  for (let n = 0; n < 29; n++) {
    const world = base + n * 180,
      z = world - s.distance
    if (z < -90 || z > VIEW) continue
    objects.push({ z, side: 1, kind: Math.floor(world / 180) % 4, id: world })
    if (n % 2 === 0)
      objects.push({
        z: z + 30,
        side: -1,
        kind: Math.floor(world / 360) % 4,
        id: world + 30,
      })
  }
  const cars = s.traffic
    .filter((c) => c.z - s.distance > -90 && c.z - s.distance < VIEW)
    .map((c) => ({ z: c.z - s.distance, car: c }))
  const all = [...objects.map((o) => ({ z: o.z, scenery: o })), ...cars].sort(
    (a, b) => b.z - a.z,
  )
  for (const object of all) {
    const p = project(s, object.z)
    if ('car' in object) {
      const c = object.car
      car(
        ctx,
        p.x + c.x * p.half,
        p.y,
        p.scale * 0.92,
        ['#d9b975', '#8fc3c4', '#d3d5c5', '#a7a2b5', '#b75e54', '#879f88'][
          c.color
        ],
        c.kind,
      )
      continue
    }
    const o = object.scenery,
      x = p.x + o.side * p.half * (o.kind === 0 ? 1.2 : 1.55)
    if (o.kind === 0) {
      rect(
        ctx,
        x - 3 * p.scale,
        p.y - 53 * p.scale,
        6 * p.scale,
        53 * p.scale,
        s.route === 3 ? '#7e8994' : '#d0cbb8',
      )
      rect(
        ctx,
        x - 4 * p.scale,
        p.y - 47 * p.scale,
        8 * p.scale,
        12 * p.scale,
        o.side === 1 ? '#e7ae7d' : '#b8d1ce',
      )
    } else if (o.kind === 1) {
      if (s.route === 2) pine(ctx, x, p.y, p.scale)
      else if (s.route === 3) {
        rect(
          ctx,
          x - 3 * p.scale,
          p.y - 180 * p.scale,
          6 * p.scale,
          180 * p.scale,
          '#4c5c69',
        )
        rect(
          ctx,
          x - 42 * p.scale,
          p.y - 180 * p.scale,
          45 * p.scale,
          5 * p.scale,
          '#75858c',
        )
        ellipse(
          ctx,
          x - 40 * p.scale,
          p.y - 176 * p.scale,
          12 * p.scale,
          4 * p.scale,
          '#ffe5ad',
        )
        polygon(
          ctx,
          [
            x - 42 * p.scale,
            p.y - 175 * p.scale,
            x - 100 * p.scale,
            p.y,
            x + 35 * p.scale,
            p.y,
          ],
          '#f3c68108',
        )
      } else palm(ctx, x, p.y, p.scale, o.side)
    } else if (o.kind === 2) {
      polygon(
        ctx,
        [
          x - 50 * p.scale,
          p.y,
          x - 30 * p.scale,
          p.y - 37 * p.scale,
          x + 12 * p.scale,
          p.y - 56 * p.scale,
          x + 45 * p.scale,
          p.y - 10 * p.scale,
        ],
        s.route === 2 ? '#7b867b' : '#a4977e',
      )
      polygon(
        ctx,
        [
          x - 30 * p.scale,
          p.y - 37 * p.scale,
          x + 12 * p.scale,
          p.y - 56 * p.scale,
          x + 2 * p.scale,
          p.y - 15 * p.scale,
        ],
        '#b3b29b',
      )
    } else {
      rect(
        ctx,
        x - 3 * p.scale,
        p.y - 80 * p.scale,
        6 * p.scale,
        80 * p.scale,
        '#52675e',
      )
      rect(
        ctx,
        x - 44 * p.scale,
        p.y - 105 * p.scale,
        88 * p.scale,
        40 * p.scale,
        '#c6d3bc',
        3 * p.scale,
      )
      text(
        ctx,
        o.side === 1 ? '» »' : '« «',
        x,
        p.y - 77 * p.scale,
        24 * p.scale,
        '#315b58',
        'center',
      )
    }
  }
  const nextGate = (s.gate + 1) * GATE,
    z = nextGate - s.distance
  if (z > 0 && z < VIEW) {
    const p = project(s, z),
      y = p.y - 160 * p.scale
    rect(ctx, p.x - p.half * 1.08, y, 12 * p.scale, p.y - y, '#d6d0b8')
    rect(
      ctx,
      p.x + p.half * 1.08 - 12 * p.scale,
      y,
      12 * p.scale,
      p.y - y,
      '#d6d0b8',
    )
    rect(ctx, p.x - p.half * 1.08, y, p.half * 2.16, 37 * p.scale, '#385d58')
    text(
      ctx,
      nextGate >= LENGTH ? 'FINISH' : 'CHECKPOINT',
      p.x,
      y + 27 * p.scale,
      22 * p.scale,
      '#eee0b6',
      'center',
    )
  }
}
function hud(
  ctx: CanvasRenderingContext2D,
  s: State,
  l: Language,
  motion: boolean,
) {
  const pl = l === 'pl'
  rect(ctx, 24, 22, 252, 77, '#152f3fe6', 9)
  text(
    ctx,
    `${pl ? 'ETAP' : 'LEG'} ${String(s.stage).padStart(2, '0')} / ∞`,
    40,
    43,
    10,
    '#a7c4bf',
  )
  text(ctx, ROUTES[s.route][l], 40, 68, 17, '#f1e3be')
  const toGate = Math.max(0, (s.gate + 1) * GATE - s.distance)
  text(
    ctx,
    `${(toGate / 1000).toFixed(1)} km  →  ${s.gate === 3 ? (pl ? 'META' : 'FINISH') : pl ? 'PUNKT KONTROLNY' : 'CHECKPOINT'}`,
    40,
    87,
    10,
    '#a7c4bf',
  )
  rect(
    ctx,
    WIDTH - 174,
    22,
    150,
    77,
    s.time < 10 ? '#7c3938ed' : '#152f3fe6',
    9,
  )
  text(
    ctx,
    pl ? 'CZAS DO PUNKTU' : 'CHECKPOINT TIME',
    WIDTH - 99,
    43,
    10,
    '#b9cec4',
    'center',
  )
  text(
    ctx,
    s.time.toFixed(1).padStart(4, '0'),
    WIDTH - 99,
    79,
    34,
    '#f6e4be',
    'center',
  )
  rect(ctx, WIDTH / 2 - 130, 23, 260, 39, '#152f3fcc', 8)
  for (let n = 0; n < 4; n++) {
    rect(
      ctx,
      WIDTH / 2 - 113 + n * 58,
      39,
      48,
      5,
      n < s.gate ? '#e7ca80' : '#728c8855',
    )
  }
  const progress = clamp(s.distance / LENGTH, 0, 1)
  circle(ctx, WIDTH / 2 - 113 + progress * 222, 41.5, 5, '#e6ae78')
  const dx = 98,
    dy = HEIGHT - 90
  ellipse(ctx, dx, dy, 77, 77, '#152f3fe6')
  for (let n = 0; n <= 12; n++) {
    const angle = Math.PI * 0.78 + (n / 12) * Math.PI * 1.44
    ctx.strokeStyle = n > 9 ? '#eaa187' : '#9cb7b4'
    ctx.lineWidth = n % 3 === 0 ? 3 : 1
    ctx.beginPath()
    ctx.moveTo(dx + Math.cos(angle) * 64, dy + Math.sin(angle) * 64)
    ctx.lineTo(
      dx + Math.cos(angle) * (n % 3 === 0 ? 55 : 59),
      dy + Math.sin(angle) * (n % 3 === 0 ? 55 : 59),
    )
    ctx.stroke()
  }
  const needle = Math.PI * 0.78 + Math.min(1, s.speed / 330) * Math.PI * 1.44
  ctx.strokeStyle = '#edac80'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(dx, dy)
  ctx.lineTo(dx + Math.cos(needle) * 49, dy + Math.sin(needle) * 49)
  ctx.stroke()
  circle(ctx, dx, dy, 5, '#e9c99b')
  text(ctx, String(Math.round(s.speed)), dx, dy + 26, 31, '#fff0cc', 'center')
  text(
    ctx,
    `km/h · ${Math.max(1, Math.min(6, Math.ceil(s.speed / 50)))}`,
    dx,
    dy + 43,
    10,
    '#a4c0bb',
    'center',
  )
  rect(ctx, WIDTH - 250, HEIGHT - 116, 226, 92, '#152f3fe6', 9)
  text(
    ctx,
    `NITRO  ${Math.floor(s.nitro)}%`,
    WIDTH - 232,
    HEIGHT - 93,
    12,
    s.boost > 0 ? '#fff0c5' : '#b9e3e2',
  )
  for (let n = 0; n < 10; n++)
    rect(
      ctx,
      WIDTH - 232 + n * 19,
      HEIGHT - 80,
      15,
      10,
      s.nitro >= n * 10 + 5
        ? s.boost > 0
          ? '#e9d09e'
          : '#94d4d3'
        : '#7faaa52c',
      2,
    )
  text(
    ctx,
    `${pl ? 'KAROSERIA' : 'BODY'} ${Math.max(0, Math.round(s.integrity))}%`,
    WIDTH - 232,
    HEIGHT - 48,
    10,
    '#c3cdb5',
  )
  for (let n = 0; n < 5; n++)
    rect(
      ctx,
      WIDTH - 114 + n * 15,
      HEIGHT - 57,
      10,
      10,
      s.integrity > n * 20 ? '#e6b88c' : '#a5756c44',
      2,
    )
  if (s.combo > 0) {
    text(ctx, `×${s.combo}`, WIDTH / 2, 126, 44, '#ffedbd', 'center')
    text(
      ctx,
      pl ? 'SERIA WYPRZEDZANIA' : 'OVERTAKE COMBO',
      WIDTH / 2,
      143,
      10,
      '#ffe3bf',
      'center',
    )
    rect(ctx, WIDTH / 2 - 58, 152, 116, 3, '#213e4e66')
    rect(ctx, WIDTH / 2 - 58, 152, (116 * s.comboTime) / 6, 3, '#f4ca84')
  }
  if (s.drifting) {
    const tier = Math.min(3, Math.floor(s.drift / 60))
    text(
      ctx,
      `${pl ? 'DRIFT' : 'DRIFT'} ${'◆'.repeat(tier)}${'◇'.repeat(3 - tier)}`,
      WIDTH / 2,
      HEIGHT - 51,
      18,
      tier > 1 ? '#f2ca8b' : '#c9e6dc',
      'center',
    )
    rect(ctx, WIDTH / 2 - 75, HEIGHT - 38, 150, 4, '#18394999')
    rect(
      ctx,
      WIDTH / 2 - 75,
      HEIGHT - 38,
      Math.min(150, (s.drift / 180) * 150),
      4,
      '#eac784',
    )
  } else if (s.drafting > 0)
    text(
      ctx,
      pl ? 'TUNEL AERODYNAMICZNY · +NITRO' : 'SLIPSTREAM · +NITRO',
      WIDTH / 2,
      HEIGHT - 50,
      14,
      '#d8ece1',
      'center',
    )
  if (s.toastTime > 0) {
    const labels: Record<string, string> = {
      start: pl ? 'SPACJA: DRIFT  ·  X: NITRO' : 'SPACE: DRIFT  ·  X: NITRO',
      near: pl ? 'BLISKO!' : 'CLOSE PASS',
      drift: pl ? 'DRIFT ZALICZONY' : 'DRIFT BANKED',
      checkpoint: pl ? 'PUNKT KONTROLNY' : 'CHECKPOINT',
      boost: 'NITRO',
      collision: pl ? 'KOLIZJA · SERIA PRZERWANA' : 'CONTACT · COMBO LOST',
    }
    const extra =
      s.toast === 'checkpoint'
        ? ` +${s.toastValue}s`
        : s.toastValue
          ? ` +${s.toastValue}`
          : ''
    ctx.globalAlpha = Math.min(1, s.toastTime * 2)
    text(
      ctx,
      (labels[s.toast] ?? '') + extra,
      WIDTH / 2,
      200,
      17,
      s.toast === 'collision' ? '#ffb8a1' : '#fff2cf',
      'center',
    )
    ctx.globalAlpha = 1
  }
  if (s.boost > 0 && motion) {
    for (let n = 0; n < 16; n++) {
      const side = n % 2 ? -1 : 1,
        phase = (s.elapsed * 1.7 + n * 0.137) % 1,
        x = WIDTH / 2 + side * (280 + phase * 320),
        y = 260 + phase * 400
      ctx.strokeStyle = `rgba(244,230,193,${phase * 0.35})`
      ctx.lineWidth = 1 + phase * 2
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + side * phase * 70, y + phase * 80)
      ctx.stroke()
    }
  }
}
export function draw(
  ctx: CanvasRenderingContext2D,
  s: State,
  l: Language,
  motion: boolean,
) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  ctx.save()
  if (motion && s.shake > 0)
    ctx.translate(
      Math.sin(s.elapsed * 70) * s.shake * 7,
      Math.cos(s.elapsed * 83) * s.shake * 4,
    )
  scenery(ctx, s)
  road(ctx, s)
  roadside(ctx, s)
  const playerX = WIDTH / 2 + s.x * 30,
    playerY =
      HEIGHT -
      54 +
      (motion
        ? Math.sin(s.elapsed * s.speed * 0.07) * Math.min(1, s.speed / 200)
        : 0)
  if (s.drifting && motion) {
    for (let n = 0; n < 7; n++) {
      const age = (s.elapsed * 2 + n * 0.13) % 1,
        x = playerX - s.steering * age * 70 + (n % 2 ? 48 : -48)
      ellipse(
        ctx,
        x,
        playerY - 5 - age * 12,
        8 + age * 17,
        5 + age * 10,
        `rgba(216,218,200,${(1 - age) * 0.2})`,
      )
    }
  }
  if (Math.abs(s.x) > 1.05 && motion)
    for (let n = 0; n < 9; n++) {
      const age = (s.elapsed * 3 + n * 0.1) % 1
      circle(
        ctx,
        playerX + (n % 2 ? 60 : -60) + s.lateral * age * 60,
        playerY + age * 30,
        4 + age * 15,
        `rgba(210,177,130,${(1 - age) * 0.35})`,
      )
    }
  car(
    ctx,
    playerX,
    playerY,
    1.15,
    '#d97157',
    0,
    s.steering * (s.drifting ? 3.5 : 1),
    s.braking,
    s.boost > 0,
    s.elapsed,
  )
  ctx.restore()
  hud(ctx, s, l, motion)
}
