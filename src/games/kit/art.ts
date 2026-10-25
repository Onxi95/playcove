import { circle, rect } from './arcade.ts'
export function polygon(
  ctx: CanvasRenderingContext2D,
  points: number[],
  color: string | CanvasGradient,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  for (let i = 0; i < points.length; i += 2) {
    if (i === 0) ctx.moveTo(points[i], points[i + 1])
    else ctx.lineTo(points[i], points[i + 1])
  }
  ctx.closePath()
  ctx.fill()
}
export function shadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color = '#071d2a55',
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2)
  ctx.fill()
}
export function orb(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  light = '#f4f6d6',
) {
  const gradient = ctx.createRadialGradient(
    x - r * 0.35,
    y - r * 0.4,
    r * 0.05,
    x,
    y,
    r,
  )
  gradient.addColorStop(0, light)
  gradient.addColorStop(0.3, color)
  gradient.addColorStop(1, '#183746')
  circle(ctx, x, y, r, gradient)
  circle(ctx, x - r * 0.28, y - r * 0.33, r * 0.16, '#ffffff66')
}
export function bevel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
  r = 4,
) {
  rect(ctx, x, y + 3, w, h, '#081d2c77', r)
  const gradient = ctx.createLinearGradient(x, y, x, y + h)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, '#203342')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fill()
  rect(ctx, x + 4, y + 2, Math.max(1, w - 8), 2, '#ffffff55', 1)
  rect(ctx, x + 3, y + h - 4, Math.max(1, w - 6), 2, '#081d2c44', 1)
}
export function planet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
  rings = false,
) {
  ctx.save()
  ctx.globalAlpha = 0.5
  const shade = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, 1, x, y, r)
  shade.addColorStop(0, color)
  shade.addColorStop(0.7, '#26384a')
  shade.addColorStop(1, '#0d1c30')
  ctx.fillStyle = shade
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = '#a1b4c022'
  ctx.lineWidth = 1
  ctx.stroke()
  if (rings) {
    ctx.strokeStyle = '#a7b2c82c'
    ctx.lineWidth = r * 0.11
    ctx.beginPath()
    ctx.ellipse(x, y, r * 1.65, r * 0.28, -0.35, 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}
export function spacecraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  enemy = false,
  time = 0,
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(size, size)
  if (enemy) ctx.rotate(Math.PI)
  const flame = 7 + Math.sin(time * 23) * 4
  polygon(
    ctx,
    [-12, 16, -10, 25 + flame, -5, 16, 5, 16, 10, 25 + flame, 12, 16],
    '#86dfd599',
  )
  polygon(ctx, [-8, 17, -10, 25 + flame, -12, 17], '#e3f5ce')
  polygon(ctx, [8, 17, 10, 25 + flame, 12, 17], '#e3f5ce')
  polygon(
    ctx,
    [
      0, -26, 9, -8, 30, 15, 29, 22, 11, 16, 7, 24, -7, 24, -11, 16, -29, 22,
      -30, 15, -9, -8,
    ],
    color,
  )
  polygon(
    ctx,
    [0, -26, 0, 21, -7, 24, -11, 16, -29, 22, -30, 15, -9, -8],
    '#183c4d44',
  )
  polygon(ctx, [0, -15, 6, 2, 4, 10, -4, 10, -6, 2], '#213c54')
  polygon(ctx, [-2, -12, 0, -14, 3, 1, -2, 6], '#d4e5e7')
  rect(ctx, -24, 14, 5, 5, '#eac797', 1)
  rect(ctx, 19, 14, 5, 5, '#eac797', 1)
  ctx.strokeStyle = '#e3e9cf77'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(-8, -5)
  ctx.lineTo(-18, 11)
  ctx.moveTo(8, -5)
  ctx.lineTo(18, 11)
  ctx.stroke()
  ctx.restore()
}
export function worker(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  face: number,
  time: number,
  moving: boolean,
  helmet = true,
) {
  const stride = moving ? Math.sin(time * 16) * 6 : 0
  shadow(ctx, x, y + 35, 15, 4)
  ctx.strokeStyle = '#233943'
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(x - 5, y + 24)
  ctx.lineTo(x - 6 - stride, y + 34)
  ctx.moveTo(x + 5, y + 24)
  ctx.lineTo(x + 6 + stride, y + 34)
  ctx.stroke()
  rect(ctx, x - 11, y + 9, 22, 18, color, 5)
  rect(ctx, x - 7, y + 10, 3, 15, '#f4e3ba55', 1)
  ctx.strokeStyle = '#d5aa83'
  ctx.lineWidth = 5
  ctx.beginPath()
  ctx.moveTo(x - 10, y + 13)
  ctx.lineTo(x - 13 + stride * 0.5, y + 23)
  ctx.moveTo(x + 10, y + 13)
  ctx.lineTo(x + 13 - stride * 0.5, y + 23)
  ctx.stroke()
  circle(ctx, x, y + 3, 10, '#d7b58e')
  if (helmet) {
    rect(ctx, x - 12, y - 6, 24, 7, color, 3)
    rect(ctx, x - 8, y - 11, 16, 8, color, 5)
    rect(ctx, x - 2, y - 10, 3, 8, '#f4e7c755', 1)
  } else
    polygon(
      ctx,
      [
        x - 9,
        y + 1,
        x - 10,
        y - 5,
        x - 4,
        y - 10,
        x + 7,
        y - 6,
        x + 10,
        y + 1,
        x + 2,
        y - 2,
      ],
      '#344e4d',
    )
  circle(ctx, x + face * 4, y + 3, 1.6, '#243c43')
}
export function creature(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  face: number,
  time: number,
  kind = 0,
) {
  shadow(ctx, x, y + 32, 15, 4)
  const bounce = Math.sin(time * 7) * 1.4
  ctx.save()
  ctx.translate(x, y + bounce)
  polygon(ctx, [-11, 9, -16, -3, -4, 4, 4, 4, 16, -3, 11, 9], color)
  const gradient = ctx.createLinearGradient(0, 0, 0, 32)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, '#47777a')
  ctx.fillStyle = gradient
  ctx.beginPath()
  ctx.roundRect(-14, 4, 28, 28, 11)
  ctx.fill()
  shadow(ctx, 1, 22, 9, 7, '#f1e6b888')
  circle(ctx, -5, 12, 5, '#fff5d6')
  circle(ctx, 5, 12, 5, '#fff5d6')
  circle(ctx, -5 + face * 2, 12, 2, '#243d4b')
  circle(ctx, 5 + face * 2, 12, 2, '#243d4b')
  rect(ctx, -15, 28, 12, 7, '#e7c98b', 3)
  rect(ctx, 3, 28, 12, 7, '#e7c98b', 3)
  if (kind) {
    ctx.strokeStyle = '#294e56'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(face * 3, 19, 4, 0.2, Math.PI - 0.2)
    ctx.stroke()
  }
  ctx.restore()
}
