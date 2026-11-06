import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Clock, FileType } from 'lucide-react'
import type { FieldSchema } from '../../lib/models/types.ts'
import { Pressable } from '../motion/Pressable.tsx'

export function FormatPopover({
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

  const current = typeof value === 'string' ? value : String(field.default ?? field.enum?.[0] ?? 'png')
  const options = field.enum && field.enum.length > 0 ? field.enum : [current]

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setAlignRight(rect.left + rect.width / 2 > 240)
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
        aria-label={`Output format: ${current.toUpperCase()}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-2 text-xs font-semibold uppercase shadow-xs transition-colors select-none ${
          open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] hover:border-[var(--border-strong)]'
        }`}
        scaleTo={0.96}
      >
        <FileType size={13} strokeWidth={2} className="text-[var(--text-muted)]" aria-hidden />
        <span>{current}</span>
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
          aria-label="Select format"
          className={`absolute bottom-full z-50 mb-2 w-36 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          }`}
          style={{
            boxShadow: '0 12px 32px -4px oklch(0.2 0.02 250 / 0.15), 0 4px 12px -2px oklch(0.2 0.02 250 / 0.08)',
          }}
        >
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Format
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
                  className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-xs font-medium uppercase transition-colors ${
                    isSelected
                      ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                      : 'text-[var(--text)] hover:bg-[var(--surface)]'
                  }`}
                  scaleTo={0.98}
                >
                  <span>{opt}</span>
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

export function DurationPopover({
  field,
  value,
  onChange,
  disabled,
}: {
  field: FieldSchema
  value: unknown
  onChange: (val: unknown) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const current = value !== undefined && value !== null ? String(value) : String(field.default ?? field.enum?.[0] ?? '5')
  const options = field.enum && field.enum.length > 0 ? field.enum : [current]

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setAlignRight(rect.left + rect.width / 2 > 240)
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
        aria-label={`Duration: ${current}s`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 text-xs font-semibold shadow-xs transition-colors select-none ${
          open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] hover:border-[var(--border-strong)]'
        }`}
        scaleTo={0.96}
      >
        <Clock size={13} strokeWidth={2} className="text-[var(--text-muted)]" aria-hidden />
        <span>{current.endsWith('s') ? current : `${current}s`}</span>
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
          aria-label="Select duration"
          className={`absolute bottom-full z-50 mb-2 w-36 rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-2 shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          }`}
          style={{
            boxShadow: '0 12px 32px -4px oklch(0.2 0.02 250 / 0.15), 0 4px 12px -2px oklch(0.2 0.02 250 / 0.08)',
          }}
        >
          <div className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Duration
          </div>
          <div className="space-y-0.5">
            {options.map((opt) => {
              const isSelected = String(opt) === current
              const label = String(opt).endsWith('s') ? String(opt) : `${opt}s`
              return (
                <Pressable
                  key={String(opt)}
                  type="button"
                  onClick={() => {
                    onChange(field.type === 'number' ? Number(opt) : opt)
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
                  <span>{label}</span>
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

