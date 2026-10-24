import { useEffect, useRef } from 'react'

type Status = 'ready' | 'playing' | 'paused' | 'over'

export function useGameSession(status: Status, setStatus: (status: Status) => void, start: () => void) {
  const actions = useRef({ setStatus, start })
  useEffect(() => { actions.current = { setStatus, start } })

  useEffect(() => {
    function pause() {
      if (status === 'playing') actions.current.setStatus('paused')
    }
    function visibility() {
      if (document.hidden) pause()
    }
    function focus(event: FocusEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) pause()
    }
    const acceptAfter = performance.now() + (status === 'over' ? 280 : 0)
    function keyDown(event: KeyboardEvent) {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return
      if ((event.key === 'Escape' || event.key.toLowerCase() === 'p') && (status === 'playing' || status === 'paused')) {
        event.preventDefault()
        actions.current.setStatus(status === 'playing' ? 'paused' : 'playing')
      }
      if ((event.key === 'Enter' || event.code === 'Space') && performance.now() >= acceptAfter && status !== 'playing' && !(event.target instanceof HTMLElement && event.target.closest('button, a'))) {
        event.preventDefault()
        if (status === 'paused') actions.current.setStatus('playing')
        else actions.current.start()
      }
    }
    window.addEventListener('blur', pause)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('focusin', focus)
    window.addEventListener('keydown', keyDown)
    return () => {
      window.removeEventListener('blur', pause)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('focusin', focus)
      window.removeEventListener('keydown', keyDown)
    }
  }, [status])
}
