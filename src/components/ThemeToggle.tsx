import { useEffect, useState } from 'react'
import type { Locale } from '../i18n'

export function ThemeToggle({ locale }: { locale: Locale }) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    function sync() {
      const choice = document.documentElement.dataset.theme
      setDark(choice === 'dark' || (choice !== 'light' && media.matches))
    }
    sync()
    media.addEventListener('change', sync)
    return () => media.removeEventListener('change', sync)
  }, [])
  const label = locale === 'pl' ? dark ? 'Włącz jasny motyw' : 'Włącz ciemny motyw' : dark ? 'Switch to light theme' : 'Switch to dark theme'
  function toggle() {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    document.documentElement.style.colorScheme = next
    setDark(!dark)
    try { localStorage.setItem('playcove.theme', next) } catch { return }
  }
  return <button className="theme-toggle" onClick={toggle} aria-label={label} title={label}><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">{dark ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5" /></> : <path d="M20 15.5A8.5 8.5 0 0 1 8.5 4a8.5 8.5 0 1 0 11.5 11.5Z" />}</svg></button>
}
