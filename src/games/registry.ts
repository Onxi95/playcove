import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { GameModule, GameProps } from './contract.ts'
import { manifest as brickBreaker, Miniature as BrickBreakerMiniature } from './brick-breaker/index.tsx'
import { manifest as neonSnake, Miniature as NeonSnakeMiniature } from './neon-snake/index.tsx'
import { manifest as paddleDuel, Miniature as PaddleDuelMiniature } from './paddle-duel/index.tsx'
import { manifest as rooftopRunner, Miniature as RooftopRunnerMiniature } from './rooftop-runner/index.tsx'
import { manifest as soccerDuel, Miniature as SoccerDuelMiniature } from './soccer-duel/index.tsx'
import { manifest as starPatrol, Miniature as StarPatrolMiniature } from './star-patrol/index.tsx'

import { manifest as AsteroidDriftManifest, Miniature as AsteroidDriftMiniature } from './asteroid-drift/index.tsx'
import { manifest as MazeChaseManifest, Miniature as MazeChaseMiniature } from './maze-chase/index.tsx'
import { manifest as BlockCascadeManifest, Miniature as BlockCascadeMiniature } from './block-cascade/index.tsx'
import { manifest as RiverCrossingManifest, Miniature as RiverCrossingMiniature } from './river-crossing/index.tsx'
import { manifest as BlastArenaManifest, Miniature as BlastArenaMiniature } from './blast-arena/index.tsx'
import { manifest as BubbleTowerManifest, Miniature as BubbleTowerMiniature } from './bubble-tower/index.tsx'
import { manifest as BarrelAscentManifest, Miniature as BarrelAscentMiniature } from './barrel-ascent/index.tsx'
import { manifest as FormationRescueManifest, Miniature as FormationRescueMiniature } from './formation-rescue/index.tsx'
import { manifest as CoastalRushManifest, Miniature as CoastalRushMiniature } from './coastal-rush/index.tsx'
import { manifest as IronFrontManifest, Miniature as IronFrontMiniature } from './iron-front/index.tsx'

import { manifest as VolleyClashManifest, Miniature as VolleyClashMiniature } from './volley-clash/index.tsx'
import { manifest as TankTacticsManifest, Miniature as TankTacticsMiniature } from './tank-tactics/index.tsx'
import { manifest as RicochetRivalsManifest, Miniature as RicochetRivalsMiniature } from './ricochet-rivals/index.tsx'
import { manifest as CircuitClashManifest, Miniature as CircuitClashMiniature } from './circuit-clash/index.tsx'
import { manifest as TwinTethersManifest, Miniature as TwinTethersMiniature } from './twin-tethers/index.tsx'

export const games: GameModule[] = [
  { manifest: VolleyClashManifest, Miniature: VolleyClashMiniature, loadGame: async () => ({ default: (await import('./volley-clash/Game.tsx')).Game }) },
  { manifest: TankTacticsManifest, Miniature: TankTacticsMiniature, loadGame: async () => ({ default: (await import('./tank-tactics/Game.tsx')).Game }) },
  { manifest: RicochetRivalsManifest, Miniature: RicochetRivalsMiniature, loadGame: async () => ({ default: (await import('./ricochet-rivals/Game.tsx')).Game }) },
  { manifest: CircuitClashManifest, Miniature: CircuitClashMiniature, loadGame: async () => ({ default: (await import('./circuit-clash/Game.tsx')).Game }) },
  { manifest: TwinTethersManifest, Miniature: TwinTethersMiniature, loadGame: async () => ({ default: (await import('./twin-tethers/Game.tsx')).Game }) },

  { manifest: AsteroidDriftManifest, Miniature: AsteroidDriftMiniature, loadGame: async () => ({ default: (await import('./asteroid-drift/Game.tsx')).Game }) },
  { manifest: MazeChaseManifest, Miniature: MazeChaseMiniature, loadGame: async () => ({ default: (await import('./maze-chase/Game.tsx')).Game }) },
  { manifest: BlockCascadeManifest, Miniature: BlockCascadeMiniature, loadGame: async () => ({ default: (await import('./block-cascade/Game.tsx')).Game }) },
  { manifest: RiverCrossingManifest, Miniature: RiverCrossingMiniature, loadGame: async () => ({ default: (await import('./river-crossing/Game.tsx')).Game }) },
  { manifest: BlastArenaManifest, Miniature: BlastArenaMiniature, loadGame: async () => ({ default: (await import('./blast-arena/Game.tsx')).Game }) },
  { manifest: BubbleTowerManifest, Miniature: BubbleTowerMiniature, loadGame: async () => ({ default: (await import('./bubble-tower/Game.tsx')).Game }) },
  { manifest: BarrelAscentManifest, Miniature: BarrelAscentMiniature, loadGame: async () => ({ default: (await import('./barrel-ascent/Game.tsx')).Game }) },
  { manifest: FormationRescueManifest, Miniature: FormationRescueMiniature, loadGame: async () => ({ default: (await import('./formation-rescue/Game.tsx')).Game }) },
  { manifest: CoastalRushManifest, Miniature: CoastalRushMiniature, loadGame: async () => ({ default: (await import('./coastal-rush/Game.tsx')).Game }) },
  { manifest: IronFrontManifest, Miniature: IronFrontMiniature, loadGame: async () => ({ default: (await import('./iron-front/Game.tsx')).Game }) },

  {
    manifest: brickBreaker,
    Miniature: BrickBreakerMiniature,
    loadGame: async () => {
      const module = await import('./brick-breaker/Game.tsx')
      return { default: module.Game }
    },
  },
  {
    manifest: neonSnake,
    Miniature: NeonSnakeMiniature,
    loadGame: async () => {
      const module = await import('./neon-snake/Game.tsx')
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
    manifest: rooftopRunner,
    Miniature: RooftopRunnerMiniature,
    loadGame: async () => {
      const module = await import('./rooftop-runner/Game.tsx')
      return { default: module.Game }
    },
  },
  {
    manifest: soccerDuel,
    Miniature: SoccerDuelMiniature,
    loadGame: async () => {
      const module = await import('./soccer-duel/Game.tsx')
      return { default: module.Game }
    },
  },
  {
    manifest: starPatrol,
    Miniature: StarPatrolMiniature,
    loadGame: async () => {
      const module = await import('./star-patrol/Game.tsx')
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
