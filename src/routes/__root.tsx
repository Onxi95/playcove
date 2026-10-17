import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
  useRouterState,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { SiteFooter } from '../components/SiteFooter'
import { SiteHeader } from '../components/SiteHeader'
import { normalizeLocale } from '../i18n'
import '../styles.css'
import '../game-styles.css'
import '../design-system.css'

export const Route = createRootRoute({
  head: () => ({
    links: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Playcove — Browser games' },
      {
        name: 'description',
        content: 'Free arcade and sports games. Play solo or with a friend on one keyboard.',
      },
      { name: 'theme-color', content: '#f4f6f8' },
    ],
  }),
  component: RootComponent,
})

function RootComponent() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = normalizeLocale(pathname.split('/')[1] ?? 'en')

  return (
    <RootDocument>
      <div className="site-frame">
        <SiteHeader />
        <Outlet />
        <SiteFooter locale={locale} />
      </div>
    </RootDocument>
  )
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const locale = normalizeLocale(pathname.split('/')[1] ?? 'en')

  return (
    <html lang={locale}>
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
