'use client'

import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

/**
 * Connectivity is external state that React does not own, so it is read with
 * useSyncExternalStore rather than mirrored into useState from an effect.
 * That avoids the extra render pass on mount and, more importantly, removes
 * the window where the component claims to be online because the effect that
 * checks navigator.onLine has not run yet.
 */
function subscribe(onChange: () => void): () => void {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function getSnapshot(): boolean {
  return !navigator.onLine
}

/** On the server there is no connection to report on — assume online. */
function getServerSnapshot(): boolean {
  return false
}

export function OfflineBanner() {
  const offline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  if (!offline) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-center gap-2 bg-yellow-400 text-yellow-900 py-2 px-4 text-sm font-medium shadow-lg">
      <WifiOff className="w-4 h-4" />
      You&apos;re offline — showing saved data
    </div>
  )
}
