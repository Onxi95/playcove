export type PhysicsBall = { x: number; y: number; vx: number; vy: number }
type Body = { x: number; y: number; vx: number; vy: number }
export const BALL_RADIUS = 12
export const BALL_GRAVITY = 900
export const GROUND = 426
export const GOAL_TOP = 226
export const LEFT_GOAL_LINE = 132
export const RIGHT_GOAL_LINE = 768

function contact(ball: PhysicsBall, left: number, top: number, right: number, bottom: number) {
  const nearestX = Math.max(left, Math.min(right, ball.x))
  const nearestY = Math.max(top, Math.min(bottom, ball.y))
  const dx = ball.x - nearestX
  const dy = ball.y - nearestY
  const distance = Math.hypot(dx, dy)
  if (distance >= BALL_RADIUS) return null
  if (distance > 0.001) return { nx: dx / distance, ny: dy / distance, depth: BALL_RADIUS - distance }
  const faces = [
    { nx: -1, ny: 0, depth: ball.x - left + BALL_RADIUS },
    { nx: 1, ny: 0, depth: right - ball.x + BALL_RADIUS },
    { nx: 0, ny: -1, depth: ball.y - top + BALL_RADIUS },
    { nx: 0, ny: 1, depth: bottom - ball.y + BALL_RADIUS },
  ]
  return faces.reduce((nearest, face) => face.depth < nearest.depth ? face : nearest)
}

export function integrateBall(ball: PhysicsBall, delta: number, wind: number) {
  const previous = { x: ball.x, y: ball.y }
  const rolling = ball.y >= GROUND - BALL_RADIUS - 1 && Math.abs(ball.vy) < 80
  ball.vx = (ball.vx + wind * (rolling ? 0.08 : 1) * delta) * Math.exp(-(rolling ? 1.1 : 0.1) * delta)
  ball.vy += BALL_GRAVITY * delta
  ball.x += ball.vx * delta
  ball.y += ball.vy * delta
  if (ball.y < 36) { ball.y = 36; ball.vy = Math.abs(ball.vy) * 0.55 }
  if (ball.y > GROUND - BALL_RADIUS) {
    ball.y = GROUND - BALL_RADIUS
    ball.vy = ball.vy > 110 ? -ball.vy * 0.46 : 0
  }
  return previous
}

export function collideGoalFrames(ball: PhysicsBall) {
  let hit = false
  for (const [left, right] of [[20, LEFT_GOAL_LINE], [RIGHT_GOAL_LINE, 880]]) {
    const overlap = contact(ball, left, GOAL_TOP - 3.5, right, GOAL_TOP + 3.5)
    if (!overlap) continue
    ball.x += overlap.nx * (overlap.depth + 0.01)
    ball.y += overlap.ny * (overlap.depth + 0.01)
    const speed = ball.vx * overlap.nx + ball.vy * overlap.ny
    if (speed < 0) { ball.vx -= 1.55 * speed * overlap.nx; ball.vy -= 1.55 * speed * overlap.ny }
    if (overlap.ny < -0.8 && Math.abs(ball.vx) < 75) ball.vx = left < 450 ? 95 : -95
    hit = true
  }
  return hit
}

export function goalScorer(previous: { x: number; y: number }, ball: PhysicsBall): 0 | 1 | null {
  const leftCrossing = previous.x + BALL_RADIUS >= LEFT_GOAL_LINE && ball.x + BALL_RADIUS < LEFT_GOAL_LINE && ball.vx < 0
  const rightCrossing = previous.x - BALL_RADIUS <= RIGHT_GOAL_LINE && ball.x - BALL_RADIUS > RIGHT_GOAL_LINE && ball.vx > 0
  if (!leftCrossing && !rightCrossing) return null
  const line = leftCrossing ? LEFT_GOAL_LINE - BALL_RADIUS : RIGHT_GOAL_LINE + BALL_RADIUS
  const fraction = (line - previous.x) / (ball.x - previous.x)
  const crossingY = previous.y + (ball.y - previous.y) * fraction
  if (crossingY - BALL_RADIUS <= GOAL_TOP + 3.5 || crossingY + BALL_RADIUS > GROUND + 0.1) return null
  return leftCrossing ? 1 : 0
}

export function collidePlayer(ball: PhysicsBall, player: Body) {
  const overlap = contact(ball, player.x - 16, player.y + 4, player.x + 16, player.y + 69)
  if (!overlap) return
  const { nx, ny, depth } = overlap
  ball.x += nx * (depth + 0.1)
  ball.y += ny * (depth + 0.1)
  const dribbling = ball.y > GROUND - BALL_RADIUS - 7 && Math.abs(nx) > 0.8 && player.vx * nx > 25 && Math.abs(ball.vx) < Math.abs(player.vx) + 160
  if (dribbling) {
    ball.vx = player.vx * 0.92 + nx * 35
    ball.vy = Math.min(0, ball.vy)
    return
  }
  const approach = (ball.vx - player.vx) * nx + (ball.vy - player.vy) * ny
  if (approach >= 0) return
  const restitution = ny < -0.5 ? 0.75 : 0.32
  ball.vx -= (1 + restitution) * approach * nx
  ball.vy -= (1 + restitution) * approach * ny
  const speed = Math.hypot(ball.vx, ball.vy)
  if (speed > 900) { ball.vx *= 900 / speed; ball.vy *= 900 / speed }
}
