import type { BotDifficulty } from './mechanics.ts'

export type Career = { wins: number; losses: number; goalsFor: number; goalsAgainst: number; points: number; streak: number; bestStreak: number }
export type CareerRecord = { name: string; score: number; wins: number; goals: number }
export type CareerCheckpoint = { career: Career; score: [number, number]; completed: boolean }
type Opponent = { names: { en: string; pl: string }; style: 'balanced' | 'chaser' | 'keeper' | 'lobber' | 'striker'; arena: 'practice' | 'coast' | 'rooftop' }

const CHECKPOINT_KEY = 'playcove.soccer-duel.arcade.progress.v1'
const RECORDS_KEY = 'playcove.soccer-duel.arcade.scores'
const opponents: Opponent[] = [
  { names: { en: 'Park Rovers', pl: 'Parkowi Wędrowcy' }, style: 'balanced', arena: 'practice' },
  { names: { en: 'Coast Runners', pl: 'Biegacze Wybrzeża' }, style: 'chaser', arena: 'coast' },
  { names: { en: 'The Wall', pl: 'Mur' }, style: 'keeper', arena: 'practice' },
  { names: { en: 'Sky United', pl: 'Podniebni' }, style: 'lobber', arena: 'rooftop' },
  { names: { en: 'Storm Strikers', pl: 'Szturmowcy' }, style: 'striker', arena: 'coast' },
]

export function createCareer(): Career {
  return { wins: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, streak: 0, bestStreak: 0 }
}

export function opponentFor(career: Career) {
  const number = career.wins + career.losses + 1
  const difficulty: BotDifficulty = career.wins < 2 ? 'casual' : career.wins < 5 ? 'club' : 'pro'
  return { ...opponents[(number - 1) % opponents.length], number, difficulty, targetGoals: career.wins >= 5 ? 7 : 5, cup: Math.floor(career.wins / 5) + 1 }
}

export function finishCareerMatch(career: Career, score: readonly [number, number]): Career {
  const won = score[0] > score[1]
  const streak = won ? career.streak + 1 : 0
  return {
    wins: career.wins + Number(won),
    losses: career.losses + Number(!won),
    goalsFor: career.goalsFor + score[0],
    goalsAgainst: career.goalsAgainst + score[1],
    points: career.points + score[0] * 25 + (won ? 250 + Math.min(5, streak) * 50 : 0) + (won && (career.wins + 1) % 5 === 0 ? 1000 : 0),
    streak,
    bestStreak: Math.max(career.bestStreak, streak),
  }
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
}

function isCareer(value: unknown): value is Career {
  return typeof value === 'object' && value !== null && 'wins' in value && nonnegative(value.wins) && 'losses' in value && nonnegative(value.losses) && value.losses <= 3 && 'goalsFor' in value && nonnegative(value.goalsFor) && 'goalsAgainst' in value && nonnegative(value.goalsAgainst) && 'points' in value && nonnegative(value.points) && 'streak' in value && nonnegative(value.streak) && 'bestStreak' in value && nonnegative(value.bestStreak) && value.streak <= value.bestStreak && value.bestStreak <= value.wins
}

export function readCareerCheckpoint(): CareerCheckpoint | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(CHECKPOINT_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null || !('career' in parsed) || !isCareer(parsed.career) || parsed.career.losses >= 3 || !('completed' in parsed) || typeof parsed.completed !== 'boolean' || !('score' in parsed) || !Array.isArray(parsed.score) || parsed.score.length !== 2) return null
    const [first, second] = parsed.score
    if (!nonnegative(first) || !nonnegative(second) || first > 7 || second > 7) return null
    if (!parsed.completed && Math.max(first, second) >= opponentFor(parsed.career).targetGoals) return null
    return { career: parsed.career, score: [first, second], completed: parsed.completed }
  } catch { return null }
}

export function writeCareerCheckpoint(checkpoint: CareerCheckpoint) {
  try { localStorage.setItem(CHECKPOINT_KEY, JSON.stringify(checkpoint)) } catch { return }
}

export function clearCareerCheckpoint() {
  try { localStorage.removeItem(CHECKPOINT_KEY) } catch { return }
}

export function readCareerRecords(): CareerRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((value): value is CareerRecord => typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string' && 'score' in value && nonnegative(value.score) && 'wins' in value && nonnegative(value.wins) && 'goals' in value && nonnegative(value.goals)).sort((first, second) => second.score - first.score).slice(0, 5)
  } catch { return [] }
}

export function writeCareerRecords(records: CareerRecord[]) {
  try { localStorage.setItem(RECORDS_KEY, JSON.stringify(records)); return true } catch { return false }
}
