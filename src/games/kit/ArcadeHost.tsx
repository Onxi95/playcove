import { TouchControls } from './TouchControls.tsx'
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { GameProps } from '../contract.ts'
import { GameOverlay } from './GameOverlay.tsx'
import { GamePanel } from './GamePanel.tsx'
import { SoundToggle } from './SoundToggle.tsx'
import { useCanvasResolution } from './use-canvas-resolution.ts'
import { useGameSession } from './use-game-session.ts'
import { useGameAudio } from './use-game-audio.ts'
import { checkpoint } from './arcade.ts'
import type {
  ArcadeDefinition,
  ArcadeInput,
  ArcadeState,
  Progress,
} from './arcade.ts'

type Entry = { name: string; score: number; stage: number }
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
function validProgress(value: unknown): value is Progress {
  return (
    object(value) &&
    typeof value.stage === 'number' &&
    Number.isSafeInteger(value.stage) &&
    value.stage > 0 &&
    value.stage <= 100000 &&
    typeof value.score === 'number' &&
    Number.isSafeInteger(value.score) &&
    value.score >= 0 &&
    typeof value.lives === 'number' &&
    Number.isInteger(value.lives) &&
    value.lives > 0 &&
    value.lives <= 10 &&
    typeof value.elapsed === 'number' &&
    Number.isFinite(value.elapsed) &&
    value.elapsed >= 0 &&
    value.elapsed < 1e8 &&
    object(value.carry) &&
    Object.keys(value.carry).length < 50 &&
    Object.values(value.carry).every(
      (item) =>
        typeof item === 'boolean' ||
        (typeof item === 'string' && item.length < 50000) ||
        (typeof item === 'number' && Number.isFinite(item)),
    )
  )
}
function readEntries(key: string): Entry[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
    return Array.isArray(value)
      ? value
          .filter(
            (entry): entry is Entry =>
              object(entry) &&
              typeof entry.name === 'string' &&
              typeof entry.score === 'number' &&
              Number.isSafeInteger(entry.score) &&
              entry.score >= 0 &&
              typeof entry.stage === 'number' &&
              Number.isInteger(entry.stage),
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
      : []
  } catch {
    return []
  }
}
function emptyInput(mode: string): ArcadeInput {
  return {
    held: new Set(),
    pressed: new Set(),
    pointer: { x: 0, y: 0, active: false, down: false },
    mode,
  }
}

export function createArcadeGame<S extends ArcadeState>(
  definition: ArcadeDefinition<S>,
) {
  return function Game({ locale }: GameProps) {
    const pl = locale === 'pl',
      prefix = `playcove.${definition.id}`,
      defaultName = pl ? 'Gracz' : 'Player'
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const canvasRevision = useCanvasResolution(
      canvasRef,
      definition.width,
      definition.height,
    )
    const [initial] = useState(() => definition.create())
    const sceneRef = useRef(initial)
    const [mode, setMode] = useState(definition.modes?.[0]?.id ?? 'normal')
    const inputRef = useRef(emptyInput(mode))
    const [status, setStatus] = useState<
      'ready' | 'playing' | 'paused' | 'over'
    >('ready')
    const [, setView] = useState(0)
    const [records, setRecords] = useState<Entry[]>([])
    const [nickname, setNickname] = useState(defaultName)
    const [saved, setSaved] = useState(false)
    const [resume, setResume] = useState(false)
    const [runBest, setRunBest] = useState(0)
    const [motion, setMotion] = useState(true)
    const { audio, enabled, toggle } = useGameAudio(
      status,
      sceneRef.current.score > runBest,
    )
    function persist() {
      const scene = sceneRef.current
      if (scene.phase === 'over') return
      const progress = (definition.checkpoint ?? checkpoint)(scene)
      progress.carry.__phase = scene.phase
      try {
        localStorage.setItem(
          `${prefix}.checkpoint.v1`,
          JSON.stringify({ progress, mode }),
        )
      } catch {
        return
      }
    }
    function fresh() {
      sceneRef.current = definition.create()
      definition.configure?.(sceneRef.current, mode)
      inputRef.current = emptyInput(mode)
      persist()
      setSaved(false)
      setResume(false)
      setRunBest(records[0]?.score ?? 0)
      setStatus('playing')
      setView((v) => v + 1)
    }
    function start() {
      if (resume && status === 'ready') {
        inputRef.current = emptyInput(mode)
        setResume(false)
        setSaved(false)
        setRunBest(records[0]?.score ?? 0)
        setStatus('playing')
      } else fresh()
    }
    function choose(id: string) {
      definition.choose(sceneRef.current, id)
      inputRef.current = emptyInput(mode)
      persist()
      audio.play('point')
      setView((v) => v + 1)
    }
    useEffect(() => {
      const saveOnLeave = () => {
        if (status === 'playing' || status === 'paused') persist()
      }
      window.addEventListener('pagehide', saveOnLeave)
      return () => window.removeEventListener('pagehide', saveOnLeave)
    }, [status, mode])
    useEffect(() => {
      definition.configure?.(sceneRef.current, mode)
      setView((v) => v + 1)
    }, [mode])
    useGameSession(status, setStatus, start, canvasRef)
    useEffect(() => {
      setRecords(readEntries(`${prefix}.scores`))
      try {
        setNickname(localStorage.getItem(`${prefix}.nickname`) || defaultName)
        const value: unknown = JSON.parse(
          localStorage.getItem(`${prefix}.checkpoint.v1`) ?? 'null',
        )
        if (
          object(value) &&
          validProgress(value.progress) &&
          typeof value.mode === 'string' &&
          (!definition.modes ||
            definition.modes.some((item) => item.id === value.mode))
        ) {
          const scene = definition.create(value.progress)
          if (value.progress.carry.__phase === 'choice') scene.phase = 'choice'
          if (scene.phase !== 'over') {
            sceneRef.current = scene
            setMode(value.mode)
            setResume(true)
            setView((v) => v + 1)
          }
        }
      } catch {
        return
      }
    }, [])
    useEffect(() => {
      if (typeof window.matchMedia !== 'function') return
      const query = window.matchMedia('(prefers-reduced-motion: reduce)'),
        update = () => setMotion(!query.matches)
      update()
      query.addEventListener('change', update)
      return () => query.removeEventListener('change', update)
    }, [])
    useEffect(() => {
      if (status === 'paused') persist()
      if (status === 'over') {
        const scene = sceneRef.current
        try {
          localStorage.removeItem(`${prefix}.checkpoint.v1`)
          if (scene.score <= 0) return
          const name = nickname.trim() || defaultName
          const next = [
            ...records,
            { name, score: scene.score, stage: scene.stage },
          ]
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
          localStorage.setItem(`${prefix}.nickname`, name)
          localStorage.setItem(`${prefix}.scores`, JSON.stringify(next))
          setRecords(next)
          setSaved(true)
        } catch {
          return
        }
      }
    }, [status])
    useEffect(() => {
      const context = canvasRef.current?.getContext('2d')
      if (!context) return
      const ctx = context
      const scene = sceneRef.current
      definition.draw(ctx, scene, locale, motion)
      if (status !== 'playing') return
      let frameId = 0,
        previous = 0,
        hud = 0,
        saving = 0
      function keyDown(event: KeyboardEvent) {
        if (event.ctrlKey || event.metaKey || event.altKey) return
        if (
          event.target instanceof HTMLElement &&
          event.target.closest('input,textarea,select,summary')
        )
          return
        const key = event.key.toLowerCase()
        if (scene.phase === 'choice' && !event.repeat) {
          const choices = definition.choices(scene, locale),
            index = key === 'enter' || key === ' ' ? 0 : Number(key) - 1
          if (Number.isInteger(index) && choices[index]) {
            event.preventDefault()
            choose(choices[index].id)
            return
          }
        }
        if (
          [
            'arrowleft',
            'arrowright',
            'arrowup',
            'arrowdown',
            ' ',
            'shift',
            'enter',
            'w',
            'a',
            's',
            'd',
            'q',
            'e',
            'z',
            'x',
            'c',
            'v',
            'j',
            'k',
            'l',
            'f',
            'g',
          ].includes(key)
        )
          event.preventDefault()
        inputRef.current.held.add(key)
        if (!event.repeat) inputRef.current.pressed.add(key)
      }
      function keyUp(event: KeyboardEvent) {
        inputRef.current.held.delete(event.key.toLowerCase())
      }
      function frame(time: number) {
        const delta = Math.min(0.05, (time - (previous || time)) / 1000)
        previous = time
        if (scene.phase === 'play')
          definition.update(scene, inputRef.current, delta)
        inputRef.current.pressed.clear()
        for (const event of scene.events) audio.play(event)
        scene.events = []
        definition.draw(ctx, scene, locale, motion)
        hud += delta
        saving += delta
        if (hud >= 0.1) {
          hud = 0
          setView((v) => v + 1)
        }
        if (saving >= 3) {
          saving = 0
          persist()
        }
        if (scene.phase === 'over') {
          setStatus('over')
          return
        }
        if (scene.phase === 'choice') {
          persist()
          setView((v) => v + 1)
          return
        }
        frameId = requestAnimationFrame(frame)
      }
      window.addEventListener('keydown', keyDown)
      window.addEventListener('keyup', keyUp)
      if (scene.phase === 'play') frameId = requestAnimationFrame(frame)
      return () => {
        window.cancelAnimationFrame(frameId)
        window.removeEventListener('keydown', keyDown)
        window.removeEventListener('keyup', keyUp)
        inputRef.current = emptyInput(mode)
      }
    }, [
      status,
      canvasRevision,
      locale,
      mode,
      motion,
      sceneRef.current,
      sceneRef.current.phase,
    ])
    const scene = sceneRef.current,
      choice = status === 'playing' && scene.phase === 'choice'
    function pointer(event: PointerEvent<HTMLCanvasElement>) {
      const box = event.currentTarget.getBoundingClientRect()
      inputRef.current.pointer.x =
        ((event.clientX - box.left) * definition.width) / box.width
      inputRef.current.pointer.y =
        ((event.clientY - box.top) * definition.height) / box.height
      inputRef.current.pointer.active = event.pointerType !== 'touch'
    }
    function touch(key: string, on: boolean) {
      if (on) {
        inputRef.current.held.add(key)
        inputRef.current.pressed.add(key)
      } else inputRef.current.held.delete(key)
    }
    return (
      <div
        className={`module-game arcade-host ${definition.id}-game${status === 'playing' ? ' is-playing' : ''}`}
      >
        <div className="module-game-main">
          <div className="canvas-wrap">
            <div className="module-game-heading game-frame-bar">
              <div>
                <span className="game-small-label">
                  {pl ? 'ETAP' : 'STAGE'} {scene.stage}
                </span>
                <h2>{definition.name}</h2>
              </div>
              <div className="arcade-game-stats">
                <div className="score-readout">
                  <span>{pl ? 'WYNIK' : 'SCORE'}</span>
                  <strong>{scene.score.toLocaleString(locale)}</strong>
                </div>
                <div className="score-readout">
                  <span>
                    {definition.meter?.(scene, locale).label ??
                      (pl ? 'ŻYCIA' : 'LIVES')}
                  </span>
                  <strong>
                    {definition.meter?.(scene, locale).value ??
                      '♥'.repeat(Math.max(0, scene.lives))}
                  </strong>
                </div>
              </div>
            </div>
            <canvas
              tabIndex={0}
              ref={canvasRef}
              width={definition.width}
              height={definition.height}
              aria-label={definition.name}
              onPointerMove={pointer}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId)
                pointer(event)
                inputRef.current.pointer.down = true
                inputRef.current.pressed.add('pointer')
              }}
              onPointerUp={() => {
                inputRef.current.pointer.down = false
              }}
              onPointerCancel={() => {
                inputRef.current.pointer.down = false
              }}
              onPointerLeave={() => {
                inputRef.current.pointer.active = false
              }}
            />
            <div className="arcade-livebar">
              <span>
                {definition.status?.(scene, locale) ??
                  definition.tagline[locale]}
              </span>
              <span>
                {pl ? 'REKORD' : 'BEST'} {records[0]?.score ?? 0}
              </span>
            </div>
            <SoundToggle
              locale={locale}
              enabled={enabled}
              onToggle={toggle}
              onPause={
                status === 'playing' ? () => setStatus('paused') : undefined
              }
            />
            <GamePanel
              locale={locale}
              onOpen={() => {
                if (status === 'playing') setStatus('paused')
              }}
            >
              <aside className="game-scoreboard">
                <div className="scoreboard-heading">
                  <span className="game-small-label">
                    {pl ? 'NAJLEPSZE WYNIKI' : 'HIGH SCORES'}
                  </span>
                </div>
                <label className="game-field">
                  <span>{pl ? 'PSEUDONIM' : 'NICKNAME'}</span>
                  <input
                    maxLength={14}
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>
                <div className="scoreboard-list">
                  {records.length ? (
                    records.map((entry, index) => (
                      <div
                        className="scoreboard-row"
                        key={`${entry.name}-${entry.score}-${index}`}
                      >
                        <span className="score-rank">{index + 1}</span>
                        <span className="score-name">
                          {entry.name}
                          <small>
                            {pl ? 'Etap' : 'Stage'} {entry.stage}
                          </small>
                        </span>
                        <strong>{entry.score}</strong>
                      </div>
                    ))
                  ) : (
                    <p className="scoreboard-empty">
                      {pl
                        ? 'Zagraj, by zapisać pierwszy wynik.'
                        : 'Play to set the first record.'}
                    </p>
                  )}
                </div>
                <p className="scoreboard-foot">
                  {pl
                    ? 'WYNIKI I PUNKTY KONTROLNE NA TYM URZĄDZENIU'
                    : 'SCORES AND CHECKPOINTS ON THIS DEVICE'}
                </p>
              </aside>
            </GamePanel>
            {choice && (
              <div className="game-overlay arcade-choice-screen">
                <span className="game-choice-eyebrow">
                  {pl ? 'ETAP UKOŃCZONY' : 'STAGE CLEAR'} · {scene.stage}
                </span>
                <h2>{pl ? 'Co dalej?' : 'What’s next?'}</h2>
                <div className="arcade-choice-grid">
                  {definition.choices(scene, locale).map((item, index) => (
                    <button key={item.id} onClick={() => choose(item.id)}>
                      <kbd>{index + 1}</kbd>
                      <strong>{item.title}</strong>
                      <span>{item.detail}</span>
                      <b>→</b>
                    </button>
                  ))}
                </div>
                <small>
                  {pl
                    ? '1 / 2 / 3 · wybór · postęp zapisany'
                    : '1 / 2 / 3 · choose · checkpoint saved'}
                </small>
              </div>
            )}
            <GameOverlay
              gameName={definition.name}
              status={status}
              locale={locale}
              title={
                status === 'over'
                  ? pl
                    ? 'Koniec biegu'
                    : 'Run complete'
                  : status === 'paused'
                    ? pl
                      ? 'Pauza'
                      : 'Paused'
                    : resume
                      ? pl
                        ? 'Kontynuować zapisany bieg?'
                        : 'Continue your saved run?'
                      : definition.tagline[locale]
              }
              description={
                status === 'over'
                  ? (definition.endMessage?.(scene, locale) ??
                    definition.help[locale])
                  : definition.help[locale]
              }
              actionLabel={
                status === 'paused'
                  ? pl
                    ? 'Wznów'
                    : 'Resume'
                  : status === 'over'
                    ? pl
                      ? 'Jeszcze raz'
                      : 'Play again'
                    : resume
                      ? pl
                        ? 'Kontynuuj'
                        : 'Continue'
                      : pl
                        ? 'Zagraj'
                        : 'Play'
              }
              onAction={
                status === 'paused' ? () => setStatus('playing') : start
              }
              onRestart={fresh}
              showRestart={resume}
              restartLabel={
                resume
                  ? pl
                    ? 'Zacznij nowy bieg'
                    : 'Start a new run'
                  : undefined
              }
              result={{
                value: scene.score,
                label: pl ? 'PUNKTY' : 'POINTS',
                score: scene.score,
                best: runBest,
                saved,
                stats: definition.stats?.(scene, locale) ?? [
                  { label: pl ? 'ETAP' : 'STAGE', value: scene.stage },
                  {
                    label: pl ? 'CZAS' : 'TIME',
                    value: `${Math.floor(scene.elapsed)}s`,
                  },
                ],
              }}
              settings={
                status === 'ready' && definition.modes ? (
                  <div className="arcade-menu-settings">
                    {definition.modes?.map((item) => (
                      <button
                        key={item.id}
                        disabled={resume}
                        aria-pressed={mode === item.id}
                        onClick={() => {
                          setMode(item.id)
                          inputRef.current.mode = item.id
                        }}
                      >
                        <strong>{item.title[locale]}</strong>
                        <span>{item.detail[locale]}</span>
                      </button>
                    ))}
                    <p>
                      {pl
                        ? 'Postęp zapisuje się lokalnie.'
                        : 'Progress saves locally.'}
                    </p>
                  </div>
                ) : undefined
              }
            />
          </div>
          <TouchControls
            locale={locale}
            enabled={status === 'playing' && scene.phase === 'play'}
            onKey={touch}
            onCancel={() => {
              if (status === 'playing') setStatus('paused')
            }}
            groups={
              definition.touchGroups?.(scene, locale) ?? [
                {
                  label: '',
                  buttons: definition.touch ?? [
                    ['←', 'arrowleft'],
                    ['↑', 'arrowup'],
                    ['↓', 'arrowdown'],
                    ['→', 'arrowright'],
                    [pl ? 'Akcja' : 'Action', ' '],
                    ['✦', 'x'],
                  ],
                },
              ]
            }
          />
          <p className="arcade-controls-note">{definition.help[locale]}</p>
        </div>
      </div>
    )
  }
}
