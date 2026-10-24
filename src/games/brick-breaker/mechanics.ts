const COLORS = ['#f0785d', '#f3a34a', '#c8d867', '#75b8ad', '#718be5']

export function createBricks(wave: number) {
  const rows = Math.min(7, 4 + Math.floor(wave / 3))
  const pattern = (wave - 1) % 4
  return Array.from({ length: rows * 10 }, (_, index) => {
    const row = Math.floor(index / 10)
    const column = index % 10
    const alive = pattern === 0 || (pattern === 1 ? (row + column) % 3 !== 0 : pattern === 2 ? Math.abs(column - 4.5) <= row + 1 : column % 3 !== 1 || row % 2 === 0)
    return {
      x: 54 + column * 70,
      y: 46 + row * 28,
      color: COLORS[(row + wave - 1) % COLORS.length],
      hits: wave >= 3 && (row + column + wave) % 4 === 0 ? 2 : 1,
      alive,
    }
  })
}

export function paddleReturn(offset: number, speed: number, movement: number) {
  const angle = Math.max(-1.05, Math.min(1.05, offset * 1.02 + movement * 0.14))
  return { vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed }
}
