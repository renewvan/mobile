import { createContext, useContext } from 'react'
import type { Position, PositionPermission, PositionSource } from './position'

export interface PositionState {
  position: Position | null
  source: PositionSource
  status: PositionPermission | null
  /** The only action that can show the system permission prompt. */
  requestPermission: () => Promise<void>
}

export const PositionContext = createContext<PositionState | null>(null)

/** The van/phone position, shared app-wide by `PositionProvider`. */
export function usePosition(): PositionState {
  const value = useContext(PositionContext)
  if (!value) throw new Error('usePosition must be used inside PositionProvider')
  return value
}
