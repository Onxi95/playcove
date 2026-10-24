export type Cell = { x: number; y: number }

export function queueTurn(queue: Cell[], current: Cell, next: Cell) {
  const previous = queue.at(-1) ?? current
  if (queue.length >= 2 || next.x * previous.x + next.y * previous.y !== 0) return
  queue.push(next)
}

export function snakeStep(snake: Cell[], direction: Cell, growing: boolean, cells: number) {
  const head = { x: snake[0].x + direction.x, y: snake[0].y + direction.y }
  const body = growing ? snake : snake.slice(0, -1)
  const crashed = head.x < 0 || head.y < 0 || head.x >= cells || head.y >= cells || body.some((cell) => cell.x === head.x && cell.y === head.y)
  return { head, crashed }
}

export function fruitScore(combo: number, golden: boolean, boosting: boolean) {
  return (golden ? 50 : 10) * Math.max(1, combo) * (boosting ? 2 : 1)
}
