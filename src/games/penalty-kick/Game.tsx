import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../contract.ts'

type Direction = 'left' | 'center' | 'right'
type ShotResult = 'goal' | 'saved' | 'wide'
type KickRecord = { name: string; goals: number }

const directions: Direction[] = ['left', 'center', 'right']

function readNickname(fallback: string) {
  try {
    return localStorage.getItem('playcove.penalty-kick.nickname') || fallback
  } catch {
    return fallback
  }
}

function readRecords() {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem('playcove.penalty-kick.scores') ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter((record): record is KickRecord => {
      return typeof record === 'object' && record !== null && 'name' in record && typeof record.name === 'string' && 'goals' in record && typeof record.goals === 'number'
    }).slice(0, 5)
  } catch {
    return []
  }
}

function pickKeeper(except?: Direction): Direction {
  const options = directions.filter((direction) => direction !== except)
  return options[Math.floor(Math.random() * options.length)]
}

export function Game({ locale }: GameProps) {
  const copy = locale === 'pl' ? {
    subhead: 'PIĘĆ STRZAŁÓW', heading: 'Wybierz miejsce i wyczuj moment.', goals: 'GOLE', shot: 'STRZAŁ',
    readyTitle: 'Bramkarz odsłania jeden róg.', readyBody: 'Celuj tam. Strzel w zielonym polu mocy.',
    resultTitle: (score: number) => `${score} goli na 5`, resultBody: 'Zapisz wynik na tym urządzeniu.',
    aim: 'CEL', power: 'MOC STRZAŁU', shoot: 'STRZELAJ', start: 'Rozpocznij serię', again: 'Zagraj ponownie', save: 'Zapisz wynik',
    goal: 'GOL!', saved: 'OBRONIONY', wide: 'NIECELNY',
    left: 'LEWY RÓG', center: 'ŚRODEK', right: 'PRAWY RÓG',
    keeper: 'Bramkarz', highScores: 'NAJLEPSZE WYNIKI', nickname: 'PSEUDONIM', empty: 'Zagraj serię i zapisz wynik.', local: 'ZAPISANO NA TYM URZĄDZENIU',
  } : {
    subhead: 'FIVE SHOTS', heading: 'Pick a spot. Time your shot.', goals: 'GOALS', shot: 'SHOT',
    readyTitle: 'The keeper leaves one corner open.', readyBody: 'Aim there. Shoot in the green power zone.',
    resultTitle: (score: number) => `${score} goals out of 5`, resultBody: 'Save your score on this device.',
    aim: 'AIM', power: 'SHOT POWER', shoot: 'SHOOT', start: 'Start shootout', again: 'Play again', save: 'Save score',
    goal: 'GOAL!', saved: 'SAVED', wide: 'WIDE',
    left: 'LEFT', center: 'CENTER', right: 'RIGHT',
    keeper: 'Goalkeeper', highScores: 'HIGH SCORES', nickname: 'NICKNAME', empty: 'Play a shootout and save a score.', local: 'SAVED ON THIS DEVICE',
  }
  const fallbackName = locale === 'pl' ? 'Gracz' : 'Player'
  const [status, setStatus] = useState<'ready' | 'playing' | 'resolving' | 'over'>('ready')
  const [nickname, setNickname] = useState(fallbackName)
  const [records, setRecords] = useState<KickRecord[]>([])
  const [shots, setShots] = useState(0)
  const [goals, setGoals] = useState(0)
  const [results, setResults] = useState<ShotResult[]>([])
  const [keeper, setKeeper] = useState<Direction>('center')
  const [aim, setAim] = useState<Direction>('left')
  const [power, setPower] = useState(0)
  const [lastShot, setLastShot] = useState<Direction | null>(null)
  const [lastResult, setLastResult] = useState<ShotResult | null>(null)
  const [saved, setSaved] = useState(false)
  const shootRef = useRef<() => void>(() => undefined)

  useEffect(() => {
    setNickname(readNickname(fallbackName))
    setRecords(readRecords())
  }, [fallbackName])

  useEffect(() => {
    if (status !== 'playing') return
    const timer = window.setInterval(() => setPower((value) => value >= 100 ? 0 : value + 2), 25)
    return () => window.clearInterval(timer)
  }, [status, shots])

  function startGame() {
    setShots(0)
    setGoals(0)
    setResults([])
    setKeeper(pickKeeper())
    setAim('left')
    setPower(0)
    setLastShot(null)
    setLastResult(null)
    setSaved(false)
    setStatus('playing')
  }

  function takeShot(direction: Direction) {
    if (status !== 'playing') return
    const inSweetSpot = power >= 58 && power <= 82
    const result: ShotResult = !inSweetSpot ? 'wide' : direction === keeper ? 'saved' : 'goal'
    const nextShots = shots + 1
    const nextGoals = goals + (result === 'goal' ? 1 : 0)
    setLastShot(direction)
    setLastResult(result)
    setShots(nextShots)
    setGoals(nextGoals)
    setResults((current) => [...current, result])
    setStatus('resolving')
    window.setTimeout(() => {
      if (nextShots === 5) {
        setStatus('over')
        return
      }
      setKeeper(pickKeeper(keeper))
      setAim('left')
      setPower(0)
      setLastShot(null)
      setLastResult(null)
      setStatus('playing')
    }, 850)
  }

  shootRef.current = () => takeShot(aim)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select')) return
      if (status !== 'playing') return
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault()
        setAim((current) => directions[Math.max(0, directions.indexOf(current) - 1)])
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault()
        setAim((current) => directions[Math.min(directions.length - 1, directions.indexOf(current) + 1)])
      } else if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        shootRef.current()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status])

  function saveScore() {
    if (saved) return
    const next = [...records, { name: nickname.trim() || fallbackName, goals }]
      .sort((first, second) => second.goals - first.goals)
      .slice(0, 5)
    localStorage.setItem('playcove.penalty-kick.nickname', nickname.trim() || fallbackName)
    localStorage.setItem('playcove.penalty-kick.scores', JSON.stringify(next))
    setRecords(next)
    setSaved(true)
  }

  const directionLabel = (direction: Direction) => direction === 'left' ? copy.left : direction === 'right' ? copy.right : copy.center

  return (
    <div className="module-game kick-game">
      <div className="module-game-main">
        <div className="module-game-heading">
          <div><span className="game-small-label">{copy.subhead}</span><h2>{copy.heading}</h2></div>
          <div className="score-readout kick-score-readout"><span>{copy.goals}</span><strong>{goals}<i> / 5</i></strong></div>
        </div>
        <div className="kick-scene">
          <div className="kick-scoreline">
            <span>{copy.shot} {Math.min(shots + (status === 'playing' ? 1 : 0), 5)}<i> / 5</i></span>
            <div>{directions.map((direction, index) => <span className={index < shots ? `shot-pip is-done pip-${results[index]}` : 'shot-pip'} key={direction}>{index < shots ? results[index] === 'goal' ? '●' : results[index] === 'saved' ? '×' : '·' : '·'}</span>)}</div>
          </div>
          <div className="goal-area">
            <div className="goal-frame">
              <div className="goal-net">{directions.map((direction) => <div className="goal-zone" data-zone={direction} key={direction} />)}</div>
              <div className={`goalkeeper keeper-${keeper}`} aria-label={copy.keeper}><i /><b /></div>
              {lastShot && <div key={shots} className={`flying-ball ball-${lastShot} ${lastResult === 'saved' ? 'ball-saved' : lastResult === 'wide' ? 'ball-wide' : ''}`} aria-hidden="true" />}
            </div>
            <div className="goal-ground" />
            <div className="penalty-spot"><span /></div>
            {lastResult && <div className={`kick-result result-${lastResult}`}>{copy[lastResult]}</div>}
          </div>
          {status === 'ready' || status === 'over' ? (
            <div className="kick-overlay">
              <span>{status === 'over' ? '✦' : '⚽'}</span>
              <strong>{status === 'over' ? copy.resultTitle(goals) : copy.readyTitle}</strong>
              <small>{status === 'over' ? copy.resultBody : copy.readyBody}</small>
              {status === 'over' && !saved && <button className="game-button game-button-soft" onClick={saveScore}>{copy.save}</button>}
              <button className="game-button" onClick={startGame}>{status === 'over' ? copy.again : copy.start}<span>→</span></button>
            </div>
          ) : (
            <div className="shot-controls">
              <div className="aim-control">
                <span className="kick-control-label">{copy.aim}</span>
                <div className="shot-choices" aria-label={copy.aim}>
                  {directions.map((direction) => (
                    <button className={`shot-choice ${aim === direction ? 'is-selected' : ''}`} onClick={() => setAim(direction)} key={direction} disabled={status !== 'playing'}>
                      <span>{directionLabel(direction)}</span><strong>{direction === 'left' ? '↖' : direction === 'center' ? '↑' : '↗'}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div className="power-control">
                <div className="power-label-row"><span className="kick-control-label">{copy.power}</span><span>{power}%</span></div>
                <div className="power-meter" role="meter" aria-label={copy.power} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(power)}>
                  <span className="power-sweet-spot" /><i style={{ left: `${power}%` }} />
                </div>
              </div>
              <button className="game-button shoot-button" onClick={() => takeShot(aim)} disabled={status !== 'playing'}>{copy.shoot}<span>↗</span></button>
            </div>
          )}
        </div>
      </div>
      <aside className="game-scoreboard">
        <div className="scoreboard-heading"><span className="game-small-label">{copy.highScores}</span><span className="scoreboard-star">✳</span></div>
        <label className="game-field"><span>{copy.nickname}</span><input value={nickname} maxLength={14} onChange={(event) => setNickname(event.target.value)} /></label>
        <div className="scoreboard-rule" />
        <div className="scoreboard-list">
          {records.length ? records.map((record, index) => (
            <div className="scoreboard-row kick-record" key={`${record.name}-${record.goals}-${index}`}><span className="score-rank">{String(index + 1).padStart(2, '0')}</span><span className="score-name">{record.name}</span><strong>{record.goals}<small>/5</small></strong></div>
          )) : <p className="scoreboard-empty">{copy.empty}</p>}
        </div>
        <div className="scoreboard-foot">{copy.local}</div>
      </aside>
    </div>
  )
}
