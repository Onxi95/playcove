import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { games } from './src/games/registry.ts'
import { getGenres } from './src/genres.ts'
import { locales } from './src/i18n.ts'

export default defineConfig({
  server: { port: 3000 },
  preview: { host: '127.0.0.1' },
  plugins: [
    tanstackStart({
      prerender: {
        enabled: true,
        autoStaticPathsDiscovery: true,
        crawlLinks: true,
        failOnError: true,
      },
      pages: [
        ...locales.flatMap((locale) => [
          { path: `/${locale}` },
          ...games.map(({ manifest }) => ({ path: `/${locale}/games/${manifest.en.slug}` })),
          ...getGenres(locale).map(({ slug }) => ({ path: `/${locale}/genres/${slug}` })),
        ]),
      ],
    }),
    viteReact(),
  ],
})
