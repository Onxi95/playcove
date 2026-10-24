export function SoundToggle({ locale, enabled, onToggle, onPause }: { locale: 'en' | 'pl'; enabled: boolean; onToggle: () => void; onPause?: () => void }) {
  const label = locale === 'pl' ? enabled ? 'Dźwięk wł.' : 'Dźwięk wył.' : enabled ? 'Sound on' : 'Sound off'
  return <div className="game-screen-tools">{onPause && <button aria-label={locale === 'pl' ? 'Pauza' : 'Pause'} onClick={onPause}>Ⅱ</button>}<button className="game-sound-toggle" onClick={onToggle} aria-pressed={enabled} aria-label={label}><span aria-hidden="true">{enabled ? '♫' : '♩'}</span><span>{label}</span></button><button className="game-fullscreen-toggle" aria-label={locale === 'pl' ? 'Przełącz pełny ekran' : 'Toggle fullscreen'} onClick={(event) => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    else { const game = event.currentTarget.closest<HTMLElement>('.module-game'); if (game?.requestFullscreen) void game.requestFullscreen().catch(() => {}) }
  }}>⛶</button></div>
}
