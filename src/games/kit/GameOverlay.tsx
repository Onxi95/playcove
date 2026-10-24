import type { ReactNode } from 'react'

type Props = {
  gameName: string
  settings?: ReactNode
  status: 'ready' | 'playing' | 'paused' | 'over'
  locale: 'en' | 'pl'
  title: string
  description: string
  actionLabel: string
  onAction: () => void
  onRestart?: () => void
  actionHint?: string
  result: {
    value: string | number
    label: string
    stats: Array<{ label: string; value: string | number }>
    score?: number
    best?: number
    saved: boolean
  }
}

export function GameOverlay({ gameName, settings, status, locale, title, description, actionLabel, onAction, onRestart, actionHint, result }: Props) {
  if (status === 'playing') return null
  const polish = locale === 'pl'
  const over = status === 'over'
  const record = result.score !== undefined && result.score > (result.best ?? 0)
  const target = Math.max(1, (result.best ?? 0) + 1)
  const remaining = Math.max(0, target - (result.score ?? 0))

  return (
    <div className={`game-overlay${over ? ' game-results' : ' game-start-screen'}${settings ? ' has-settings' : ''}`} role="region" aria-label={title}>
      {over ? (
        <div className="game-result-content">
          <span className={`game-result-badge${record ? ' is-record' : ''}`}>{record ? polish ? '✦ NOWY REKORD' : '✦ NEW BEST' : title}</span>
          <span className="game-result-value">{typeof result.value === 'number' ? result.value.toLocaleString(locale) : result.value}</span>
          <span className="game-result-label">{result.label}</span>
          <div className="game-result-stats">{result.stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}</div>
          {result.score !== undefined && (result.best ?? 0) > 0 && !record && <div className="game-result-chase"><span>{polish ? `Do rekordu brakuje ${remaining.toLocaleString(locale)} pkt` : `${remaining.toLocaleString(locale)} points to beat your best`}</span><div><i style={{ width: `${Math.min(100, (result.score / target) * 100)}%` }} /></div></div>}
          <p className="game-result-detail">{description}</p>
          <button className="game-button game-retry-button" onClick={onAction}><span aria-hidden="true">↻</span>{actionLabel}<kbd>↵</kbd></button>
          <span className="game-result-footer">{result.saved ? polish ? 'Wynik zapisany na tym urządzeniu' : 'Result saved on this device' : polish ? 'Wynik tej rundy' : 'This round’s result'}<span>{actionHint ?? (polish ? 'SPACJA / ENTER · jeszcze raz' : 'SPACE / ENTER · play again')}</span></span>
        </div>
      ) : (
        <div className="game-start-layout">
          <div className="game-start-copy">
          <span className="game-wordmark">{gameName}</span>
          <strong>{title}</strong>
          <p>{description}</p>
          <button className="game-button game-start-button" onClick={onAction}>{actionLabel}<span aria-hidden="true">→</span></button>
          {status === 'paused' && onRestart && <button className="game-restart-link" onClick={onRestart}>{polish ? 'Zacznij nową rundę' : 'Start a fresh round'}</button>}
          <small className="game-session-hint">{status === 'paused' ? polish ? 'SPACJA / ENTER / ESC · wznów' : 'SPACE / ENTER / ESC · resume' : polish ? 'SPACJA / ENTER · start    ESC / P · pauza' : 'SPACE / ENTER · start    ESC / P · pause'}</small>
          </div>
          {settings && <div className="game-start-settings">{settings}</div>}
        </div>
      )}
    </div>
  )
}
