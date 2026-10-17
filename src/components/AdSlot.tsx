import type { ReactNode } from 'react'

export function AdSlot({ placement, children }: { placement: string; children?: ReactNode }) {
  return <aside className="ad-slot" data-ad-slot={placement} aria-hidden={children ? undefined : true}>{children}</aside>
}
