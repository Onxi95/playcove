export type RunnerObstacle = { x: number; kind: 'crate' | 'stack' | 'sign' | 'gap'; width: number; passed: boolean }
export type RunnerCoin = { x: number; y: number; phase: number }

export function runnerSpeed(elapsed: number) {
  return 310 + Math.min(310, elapsed * 3.2)
}

export function makeSection(start: number, speed: number, section: number, variant: number) {
  const opening: Array<Array<[RunnerObstacle['kind'], number]>> = [
    [['crate', 0]],
    [['crate', 0], ['sign', 1.15]],
    [['sign', 0], ['crate', 1.1]],
    [['crate', 0], ['crate', 1.1]],
  ]
  const middle: Array<Array<[RunnerObstacle['kind'], number]>> = [
    [['crate', 0], ['sign', 0.85], ['crate', 1.65]],
    [['sign', 0], ['stack', 0.95], ['sign', 1.9]],
    [['gap', 0], ['crate', 1.2], ['sign', 2.05]],
    [['crate', 0], ['crate', 0.33], ['sign', 1.1]],
  ]
  const late: Array<Array<[RunnerObstacle['kind'], number]>> = [
    [['crate', 0], ['sign', 0.58], ['crate', 1.21], ['stack', 2.08]],
    [['stack', 0], ['sign', 0.88], ['gap', 1.7]],
    [['gap', 0], ['sign', 0.74], ['crate', 1.44]],
    [['crate', 0], ['crate', 0.28], ['sign', 0.95], ['stack', 1.68]],
  ]
  const patterns = section < 4 ? opening : section < 12 ? middle : late
  const pattern = section === 0 ? opening[0] : patterns[((variant % patterns.length) + patterns.length) % patterns.length]
  const obstacles: RunnerObstacle[] = pattern.map(([kind, offset]) => ({ x: start + offset * speed, kind, width: kind === 'gap' ? Math.max(120, speed * (section < 12 ? 0.38 : 0.44)) : kind === 'stack' ? 46 : kind === 'crate' ? 34 : 58, passed: false }))
  const coins: RunnerCoin[] = []
  for (const obstacle of obstacles) {
    for (let index = 0; index < 5; index += 1) {
      const progress = index / 4
      coins.push({ x: obstacle.x - 65 + index * (obstacle.kind === 'gap' ? (obstacle.width + 130) / 4 : 38), y: obstacle.kind === 'sign' ? 339 : (obstacle.kind === 'stack' ? 270 : 300) - Math.sin(progress * Math.PI) * 70, phase: index })
    }
  }
  return { obstacles, coins, length: (pattern.at(-1)?.[1] ?? 0) * speed + speed * (section < 4 ? 1.6 : section < 12 ? 1.2 : 0.95) }
}
