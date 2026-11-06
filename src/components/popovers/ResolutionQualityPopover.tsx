import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Coins, Maximize2 } from 'lucide-react'
import type { FieldSchema } from '../../lib/models/types.ts'
import { Pressable } from '../motion/Pressable.tsx'

function formatOptionLabel(val: string): string {
  // Make labels like 'xhigh' -> 'Extra high', 'auto' -> 'Auto', etc.
  const lower = val.toLowerCase()
  if (lower === 'xhigh' || lower === 'extra_high') return 'Extra high'
  if (lower === 'high') return 'High'
  if (lower === 'medium') return 'Medium'
  if (lower === 'low') return 'Low'
  if (lower === 'max') return 'Max'
  if (lower === 'auto') return 'Auto'
  return val.replace(/[-_]+/g, ' ')
}

export function ResolutionQualityPopover({
  resolutionField,
  qualityField,
  resolutionValue,
  qualityValue,
  onResolutionChange,
  onQualityChange,
  creditEstimate,
  disabled,
}: {
  resolutionField?: FieldSchema
  qualityField?: FieldSchema
  resolutionValue?: unknown
  qualityValue?: unknown
  onResolutionChange: (val: string) => void
  onQualityChange: (val: string) => void
  creditEstimate?: number | null
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [alignRight, setAlignRight] = useState(true)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // If trigger is in the right half of the sidebar, align rightward; otherwise leftward
      setAlignRight(rect.left + rect.width / 2 > 200)
    }
  }, [open])

  const currentRes =
    typeof resolutionValue === 'string'
      ? resolutionValue
      : String(resolutionField?.default ?? resolutionField?.enum?.[0] ?? '')
  const currentQuality =
    typeof qualityValue === 'string'
      ? qualityValue
      : String(qualityField?.default ?? qualityField?.enum?.[0] ?? '')

  // Close listeners
  useEffect(() => {
    if (!open) return

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const buttonText = useMemo(() => {
    const parts: string[] = []
    if (resolutionField && currentRes) {
      parts.push(currentRes)
    }
    if (qualityField && currentQuality) {
      parts.push(formatOptionLabel(currentQuality))
    }
    return parts.join(' · ') || 'Settings'
  }, [resolutionField, qualityField, currentRes, currentQuality])

  const resOptions = resolutionField?.enum ?? (currentRes ? [currentRes] : [])
  const qualityOptions = qualityField?.enum ?? (currentQuality ? [currentQuality] : [])
  const hasBoth = Boolean(resolutionField && qualityField)

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button (Magnific Image 1 & 3 Style) */}
      <Pressable
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Resolution and Quality: ${buttonText}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-2.5 text-xs font-medium shadow-xs transition-colors select-none ${
          open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] hover:border-[var(--border-strong)]'
        }`}
        scaleTo={0.96}
      >
        <Maximize2 size={13} strokeWidth={2} className="shrink-0 text-[var(--text-muted)]" aria-hidden />
        <span className="font-semibold">{buttonText}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`text-[var(--text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </Pressable>

      {/* Floating Popover (Magnific Image 3 Style) */}
      {open && (
        <div
          role="dialog"
          aria-label="Resolution and Quality"
          className={`absolute bottom-full z-50 mb-2 flex flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-xl ${
            alignRight ? 'right-0' : 'left-0'
          } ${hasBoth ? 'w-[280px]' : 'w-48'}`}
          style={{
            boxShadow: '0 12px 32px -4px oklch(0.2 0.02 250 / 0.15), 0 4px 12px -2px oklch(0.2 0.02 250 / 0.08)',
          }}
        >
          <div className={`flex gap-2.5 ${hasBoth ? 'divide-x divide-[var(--border)]' : ''}`}>
            {/* Resolution Column - narrow compact column */}
            {resolutionField && (
              <div className={`flex flex-col ${hasBoth ? 'w-[78px] shrink-0' : 'w-full'}`}>
                <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Resolution
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto pr-0.5">
                  {resOptions.map((opt) => {
                    const isSelected = opt === currentRes
                    return (
                      <Pressable
                        key={opt}
                        type="button"
                        onClick={() => {
                          onResolutionChange(opt)
                          if (!hasBoth) setOpen(false)
                        }}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'text-[var(--text)] hover:bg-[var(--surface)]'
                        }`}
                        scaleTo={0.98}
                      >
                        <span className="truncate">{opt}</span>
                        {isSelected && (
                          <Check size={12} strokeWidth={2.5} className="shrink-0 text-[var(--accent)]" aria-hidden />
                        )}
                      </Pressable>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Quality Column - wide flex column with plenty of space */}
            {qualityField && (
              <div className={`flex flex-1 min-w-0 flex-col ${hasBoth ? 'pl-2.5' : ''}`}>
                <div className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  Quality
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto pr-1">
                  {qualityOptions.map((opt) => {
                    const isSelected = opt === currentQuality
                    return (
                      <Pressable
                        key={opt}
                        type="button"
                        onClick={() => {
                          onQualityChange(opt)
                          if (!hasBoth) setOpen(false)
                        }}
                        aria-pressed={isSelected}
                        className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2 py-1.5 text-left text-xs transition-colors ${
                          isSelected
                            ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                            : 'text-[var(--text)] hover:bg-[var(--surface)]'
                        }`}
                        scaleTo={0.98}
                      >
                        <span className="truncate capitalize">{formatOptionLabel(opt)}</span>
                        {isSelected && (
                          <Check size={12} strokeWidth={2.5} className="shrink-0 text-[var(--accent)]" aria-hidden />
                        )}
                      </Pressable>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Estimate Badge (Magnific Image 3 style bottom token indicator) */}
          {typeof creditEstimate === 'number' && (
            <div className="mt-2.5 flex items-center justify-end border-t border-[var(--border)] pt-2 text-[11px] font-medium text-[var(--text-muted)]">
              <div className="inline-flex items-center gap-1 rounded-full bg-[var(--surface)] px-2 py-0.5 font-mono text-[var(--text)]">
                <Coins size={11} className="text-[var(--accent)]" aria-hidden />
                <span>~{creditEstimate} cr</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

