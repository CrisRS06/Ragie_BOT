import { cn } from '@/lib/utils/cn'

/** Placeholder de carga con animación de pulso. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className)}
      aria-hidden="true"
    />
  )
}
