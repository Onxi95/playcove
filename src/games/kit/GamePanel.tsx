import type { ReactNode } from 'react'

export function GamePanel({ locale, onOpen, children }: { locale: 'en' | 'pl'; onOpen: () => void; children: ReactNode }) {
  return (
    <details className="game-records-panel" onToggle={(event) => { if (event.currentTarget.open) onOpen() }} onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); event.currentTarget.open = false } }}>
      <summary aria-label={locale === 'pl' ? 'Wyniki i pseudonim' : 'Scores and nickname'}><span aria-hidden="true">≡</span><span>{locale === 'pl' ? 'Wyniki' : 'Scores'}</span></summary>
      <div className="game-panel-scrim" onClick={(event) => { if (event.target === event.currentTarget) { const panel = event.currentTarget.closest('details'); if (panel) panel.open = false } }}>
        <section className="game-panel-sheet" aria-label={locale === 'pl' ? 'Wyniki na tym urządzeniu' : 'Scores on this device'}>
          <button className="game-panel-close" aria-label={locale === 'pl' ? 'Zamknij wyniki' : 'Close scores'} onClick={(event) => { const panel = event.currentTarget.closest('details'); if (panel) panel.open = false }}>×</button>
          {children}
        </section>
      </div>
    </details>
  )
}
