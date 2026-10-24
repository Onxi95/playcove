export type ShotAim = 'lob' | 'drive' | 'ground'
export type BotDifficulty = 'casual' | 'club' | 'pro'

export const botSettings = {
  casual: { speed: 255, reaction: 0.28, accuracy: 54 },
  club: { speed: 340, reaction: 0.17, accuracy: 28 },
  pro: { speed: 410, reaction: 0.1, accuracy: 12 },
}

export function shotProfile(player: { aim: ShotAim; vy: number; charge?: number }) {
  const power = 0.88 + Math.min(1, Math.max(0, player.charge ?? 0)) * 0.32
  return {
    horizontal: power * ( player.aim === 'lob' ? 510 : player.aim === 'ground' ? 790 : 690),
    vertical: power * (player.aim === 'lob' ? -570 + Math.min(0, player.vy * 0.08) : player.aim === 'ground' ? -85 : -300),
  }
}

export function ballInKickRange(ball: { x: number; y: number }, player: { x: number; y: number; facing: number }) {
  return (ball.x - player.x) * player.facing >= -4 && Math.hypot(ball.x - (player.x + player.facing * 28), ball.y - (player.y + 56)) <= 70
}
