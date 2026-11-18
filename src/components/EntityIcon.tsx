import type { LucideIcon } from 'lucide-react-native'
import { createElement } from 'react'
import { entityIcon } from '@/lib/entityIcons'

/**
 * The icon an entity wears: the one picked for it in Settings (a shared hub setting, by name), else
 * `fallback`. A name outside the curated list reads as no choice.
 */
export function EntityIcon({
  name,
  fallback,
  size,
  color,
}: {
  name: string | undefined
  fallback: LucideIcon
  size: number
  color: string
}) {
  // `createElement`, not JSX: the component is looked up, not declared here.
  return createElement(entityIcon(name) ?? fallback, { size, color })
}
