export type Enemy = { x: number; y: number; phase: number; hits: number; maxHits: number; dive: number; homeX: number; homeY: number }

export function makeFormation(wave: number): Enemy[] {
  if (wave % 4 === 0) return [{ x: 400, y: 90, phase: 2, hits: 22 + wave * 2, maxHits: 22 + wave * 2, dive: 0, homeX: 400, homeY: 90 }]
  const rows = Math.min(4, 2 + Math.floor(wave / 3))
  const columns = Math.min(8, 5 + Math.floor(wave / 2))
  return Array.from({ length: rows * columns }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const x = (800 - (columns - 1) * 72) / 2 + column * 72
    const y = 76 + row * 48 + (wave % 3 === 2 ? Math.abs(column - (columns - 1) / 2) * 9 : 0)
    const hits = wave >= 3 && row === 0 ? 2 : 1
    return { x, y, phase: (row + column) % 2, hits, maxHits: hits, dive: 0, homeX: x, homeY: y }
  })
}

export function aimedShot(fromX: number, fromY: number, targetX: number, speed: number) {
  const angle = Math.max(-0.6, Math.min(0.6, Math.atan2(targetX - fromX, 438 - fromY)))
  return { vx: Math.sin(angle) * speed, vy: Math.cos(angle) * speed }
}
