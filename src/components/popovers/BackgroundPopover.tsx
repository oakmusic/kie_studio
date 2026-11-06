import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Paintbrush } from 'lucide-react'
import type { FieldSchema } from '../../lib/models/types.ts'
import { Pressable } from '../motion/Pressable.tsx'

function formatBackgroundLabel(val: string): string {
  const lower = val.toLowerCase()
  if (lower === 'auto') return 'Auto'
  if (lower === 'transparent') return 'Transparent'
  if (lower === 'opaque') return 'Opaque'
  return val.replace(/[-_]+/g, ' ')
}

export function BackgroundPopover({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldSchema
  value: unknown
  onChange: (val: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const current = typeof value === 'string' ? value : String(field.default ?? field.enum?.[0] ?? 'auto')
  const options = field.enum && field.enum.length > 0 ? field.enum : ['auto', 'transparent', 'opaque']

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // If button is in the right half of the sidebar, align popover to right; otherwise align to left
      setAlignRight(rect.left + rect.width / 2 > 220)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <Pressable
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Background: ${formatBackgroundLabel(current)}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-2 text-xs font-semibold shadow-xs transition-colors select-none ${
          open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] hover:border-[var(--border-strong)]'
        }`}
        scaleTo={0.96}
      >
        <Paintbrush size={13} strokeWidth={2} className="text-[var(--text-muted)]" aria-hidden />
        <span>Bg: {formatBackgroundLabel(current)}</span>
        <ChevronDown
          size={12}
          strokeWidth={2}
          className={`text-[var(--text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </Pressable>

      {open && (
        <div
          role="dialog"
          aria-label="Select background"
          className={`absolute bottom-full z-50 mb-2 w-44 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          }`}
          style={{
            boxShadow: '0 12px 32px -4px oklch(0.2 0.02 250 / 0.15), 0 4px 12px -2px oklch(0.2 0.02 250 / 0.08)',
          }}
        >
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Background
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = opt.toLowerCase() === current.toLowerCase()
              return (
                <Pressable
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt)
                    setOpen(false)
                  }}
                  aria-pressed={isSelected}
                  className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-xs font-medium transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                  scaleTo={0.98}
                >
                  <span className="capitalize">{formatBackgroundLabel(opt)}</span>
                  {isSelected && (
                    <Check size={12} strokeWidth={2.5} className="text-[var(--accent)]" aria-hidden />
                  )}
                </Pressable>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

