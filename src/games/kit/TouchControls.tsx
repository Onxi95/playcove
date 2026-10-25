import type { PointerEvent } from 'react'
export type TouchGroup = {
  label: string
  buttons: Array<[label: string, key: string]>
}
export function TouchControls({
  groups,
  enabled,
  onKey,
  onCancel,
  locale = 'en',
}: {
  groups: TouchGroup[]
  enabled: boolean
  onKey: (key: string, down: boolean) => void
  onCancel?: () => void
  locale?: 'en' | 'pl'
}) {
  function press(event: PointerEvent<HTMLButtonElement>, key: string) {
    event.preventDefault()
    const button = event.currentTarget,
      previous = (button.dataset.pointers ?? '')
        .split(',')
        .filter(Boolean)
        .filter((id) => button.hasPointerCapture(Number(id)))
    button.setPointerCapture(event.pointerId)
    button.dataset.pointers = [...previous, String(event.pointerId)].join(',')
    if (!previous.length) onKey(key, true)
  }
  function release(
    event: PointerEvent<HTMLButtonElement>,
    key: string,
    cancelled = false,
  ) {
    event.preventDefault()
    const button = event.currentTarget,
      previous = (button.dataset.pointers ?? '').split(',').filter(Boolean)
    if (!previous.includes(String(event.pointerId))) return
    const remaining = previous.filter((id) => id !== String(event.pointerId))
    button.dataset.pointers = remaining.join(',')
    if (!remaining.length) onKey(key, false)
    if (cancelled) onCancel?.()
  }
  return (
    <div
      className={`game-touch-controls touch-deck${groups.length > 1 ? ' touch-deck-dual' : ''}`}
      aria-label={locale === 'pl' ? 'Sterowanie dotykowe' : 'Touch controls'}
    >
      {groups
        .filter((group) => group.buttons.length)
        .map((group, index) => (
          <div className="touch-control-group" key={`${group.label}-${index}`}>
            {group.label && (
              <span className="touch-control-label">{group.label}</span>
            )}
            <div
              className={`touch-control-buttons${group.buttons.length > 6 ? ' touch-control-buttons-many' : ''}`}
            >
              {group.buttons.map(([label, key]) => (
                <button
                  key={key}
                  type="button"
                  disabled={!enabled}
                  data-touch-key={key}
                  aria-label={`${group.label} ${label}`.trim()}
                  onContextMenu={(event) => event.preventDefault()}
                  onPointerDown={(event) => press(event, key)}
                  onPointerUp={(event) => release(event, key)}
                  onPointerCancel={(event) => release(event, key, true)}
                  onLostPointerCapture={(event) => release(event, key)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

export function localTouch(
  local: boolean,
  first: TouchGroup,
  second: TouchGroup,
): TouchGroup[] {
  return local ? [first, second] : [first]
}
