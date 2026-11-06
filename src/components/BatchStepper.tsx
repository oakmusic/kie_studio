import { Minus, Plus } from 'lucide-react'
import { Pressable } from './motion/Pressable.tsx'

export function BatchStepper({
  value,
  onChange,
  disabled,
  min = 1,
  max = 4,
}: {
  value: number
  onChange: (val: number) => void
  disabled?: boolean
  min?: number
  max?: number
}) {
  const canDec = !disabled && value > min
  const canInc = !disabled && value < max

  return (
    <div
      role="group"
      aria-label="Batch generation count"
      className="inline-flex h-9 shrink-0 items-center gap-0.5 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] px-1 shadow-xs"
    >
      <Pressable
        disabled={!canDec}
        onClick={() => onChange(Math.max(min, value - 1))}
        aria-label="Decrease batch count"
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-30"
        scaleTo={0.94}
      >
        <Minus size={13} strokeWidth={2.5} aria-hidden />
      </Pressable>

      <span
        className="min-w-5 px-1 text-center font-mono text-xs font-bold tabular-nums text-[var(--text)] select-none"
        aria-live="polite"
        title={`Batch ×${value}`}
      >
        {value}
      </span>

      <Pressable
        disabled={!canInc}
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Increase batch count"
        className="flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--text-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--text)] disabled:pointer-events-none disabled:opacity-30"
        scaleTo={0.94}
      >
        <Plus size={13} strokeWidth={2.5} aria-hidden />
      </Pressable>
    </div>
  )
}

