import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameModule, GameProps } from './contract.ts'
import { manifest as brickBreaker, Miniature as BrickBreakerMiniature } from './brick-breaker/index.tsx'
import { manifest as paddleDuel, Miniature as PaddleDuelMiniature } from './paddle-duel/index.tsx'
import { manifest as penaltyKick, Miniature as PenaltyKickMiniature } from './penalty-kick/index.tsx'

export const games: GameModule[] = [
  {
    manifest: brickBreaker,
    Miniature: BrickBreakerMiniature,
    loadGame: async () => {
      const module = await import('./brick-breaker/Game.tsx')
      return { default: module.Game }
    },
  },
  {
    manifest: paddleDuel,
    Miniature: PaddleDuelMiniature,
    loadGame: async () => {
      const module = await import('./paddle-duel/Game.tsx')
      return { default: module.Game }
    },
  },
  {
    manifest: penaltyKick,
    Miniature: PenaltyKickMiniature,
    loadGame: async () => {
      const module = await import('./penalty-kick/Game.tsx')
      return { default: module.Game }
    },
  },
]

const gameComponents = new Map<string, LazyExoticComponent<ComponentType<GameProps>>>()

export function getGame(slug: string) {
  return games.find((game) => game.manifest.en.slug === slug)
}

export function getGameComponent(game: GameModule) {
  const slug = game.manifest.en.slug
  let component = gameComponents.get(slug)

  if (!component) {
    component = lazy(game.loadGame)
    gameComponents.set(slug, component)
  }

  return component
}
