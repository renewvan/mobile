import { useEffect, useState } from 'react'

/** The current time, refreshed every `intervalMs`: for readings that age without a new message. */
export function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const handle = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(handle)
  }, [intervalMs])
  return now
}
