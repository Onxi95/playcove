export function returnVelocity(offset: number, movement: number, speed: number, direction: number, curve: boolean) {
  const angle = Math.max(-1.08, Math.min(1.08, (offset * 0.85 + movement * 0.32) * (curve ? 1.25 : 1)))
  return { vx: direction * speed * Math.cos(angle), vy: speed * Math.sin(angle) }
}

export function matchWon(points: number, opponent: number) {
  return points >= 7 && points - opponent >= 2
}
