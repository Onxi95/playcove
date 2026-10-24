import type { ComponentType } from 'react'
import type { Locale } from '../i18n'

export type GameManifest = {
  slug: string
  name: string
  description: string
  genreSlug: string
  players: string
  playTime: string
  accent: 'coral' | 'blue' | 'lime'
  controls: string
  localMultiplayer?: boolean
}

export type GameProps = { locale: Locale }

export type GameModule = {
  manifest: Record<Locale, GameManifest>
  Miniature: ComponentType
  loadGame: () => Promise<{ default: ComponentType<GameProps> }>
}
