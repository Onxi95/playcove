export type RunnerObstacle = { x: number; kind: 'crate' | 'sign'; passed: boolean }
export type RunnerCoin = { x: number; y: number; phase: number }

export function runnerSpeed(elapsed: number) {
  return 310 + Math.min(230, elapsed * 2.2)
}

export function makeSection(start: number, speed: number, section: number, variant: number) {
  const gap = speed * (section < 4 ? 1.35 : 1.05)
  const kinds: Array<'crate' | 'sign'> = section < 2 ? ['crate'] : variant % 3 === 0 ? ['crate', 'crate'] : variant % 3 === 1 ? ['sign', 'crate'] : ['crate', 'sign', 'crate']
  const obstacles: RunnerObstacle[] = kinds.map((kind, index) => ({ x: start + index * gap, kind, passed: false }))
  const coins: RunnerCoin[] = []
  for (const obstacle of obstacles) {
    for (let index = 0; index < 5; index += 1) {
      const progress = index / 4
      coins.push({ x: obstacle.x - 65 + index * 38, y: obstacle.kind === 'sign' ? 339 : 300 - Math.sin(progress * Math.PI) * 70, phase: index })
    }
  }
  return { obstacles, coins, length: (kinds.length - 1) * gap + speed * 1.7 }
}
