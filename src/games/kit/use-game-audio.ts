import { useEffect, useState } from 'react'

type Cue = 'hit' | 'pickup' | 'boost' | 'point' | 'start' | 'over' | 'record'
const SOUND_KEY = 'playcove.games.sound'

function createAudio() {
  let context: AudioContext | null = null
  let enabled = false
  let previousHit = -1
  return {
    setEnabled(value: boolean) { enabled = value },
    play(cue: Cue) {
      if (!enabled || typeof AudioContext === 'undefined') return
      try {
        context ??= new AudioContext()
        if (context.state === 'suspended') void context.resume().catch(() => {})
        const now = context.currentTime
        if (cue === 'hit' && now - previousHit < 0.035) return
        if (cue === 'hit') previousHit = now
        const notes = cue === 'record' ? [523, 659, 784, 1047] : cue === 'point' ? [440, 660, 880] : cue === 'pickup' ? [740, 990] : cue === 'boost' ? [180, 360, 720] : cue === 'over' ? [294, 220] : cue === 'start' ? [330, 495] : [370]
        for (const [index, frequency] of notes.entries()) {
          const start = now + index * 0.065
          const oscillator = context.createOscillator()
          const volume = context.createGain()
          oscillator.type = cue === 'hit' ? 'triangle' : 'sine'
          oscillator.frequency.setValueAtTime(frequency, start)
          oscillator.frequency.exponentialRampToValueAtTime(frequency * (cue === 'over' ? 0.8 : 1.08), start + 0.09)
          volume.gain.setValueAtTime(0, start)
          volume.gain.linearRampToValueAtTime(0.055, start + 0.006)
          volume.gain.exponentialRampToValueAtTime(0.001, start + 0.12)
          oscillator.connect(volume)
          volume.connect(context.destination)
          oscillator.start(start)
          oscillator.stop(start + 0.14)
        }
      } catch { /* Audio availability must never interrupt a round. */ }
    },
    close() { if (context) void context.close().catch(() => {}) },
  }
}

export function useGameAudio(status: 'ready' | 'playing' | 'paused' | 'over', record = false) {
  const [audio] = useState(createAudio)
  const [enabled, setEnabled] = useState(false)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(SOUND_KEY) === 'on'
      audio.setEnabled(saved)
      setEnabled(saved)
    } catch { return }
  }, [audio])
  useEffect(() => {
    if (status === 'playing') audio.play('start')
    if (status === 'over') audio.play(record ? 'record' : 'over')
  }, [audio, status])
  useEffect(() => () => audio.close(), [audio])
  function toggle() {
    const next = !enabled
    audio.setEnabled(next)
    setEnabled(next)
    try { localStorage.setItem(SOUND_KEY, next ? 'on' : 'off') } catch { /* Keep the choice for this visit. */ }
    if (next) audio.play('pickup')
  }
  return { audio, enabled, toggle }
}
