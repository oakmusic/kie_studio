import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import type { FieldSchema } from '../../lib/models/types.ts'
import { getAspectRatioInfo } from '../../lib/aspectRatioMetadata.ts'
import { Pressable } from '../motion/Pressable.tsx'

function WireframePreview({
  width,
  height,
  isAuto,
  isActive,
}: {
  width: number
  height: number
  isAuto?: boolean
  isActive?: boolean
}) {
  return (
    <div className="flex size-6 shrink-0 items-center justify-center">
      <div
        style={{ width: `${width}px`, height: `${height}px` }}
        className={`rounded-xs transition-colors ${
          isAuto
            ? 'border border-dashed border-current opacity-70'
            : isActive
              ? 'border-2 border-[var(--accent)] bg-[var(--accent)]/15'
              : 'border border-[var(--text-muted)] bg-[var(--surface-raised)]'
        }`}
      />
    </div>
  )
}

export function AspectRatioPopover({
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
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'ratios' | 'social'>('all')
  const containerRef = useRef<HTMLDivElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchId = useId()

  const currentValue = typeof value === 'string' ? value : String(field.default ?? field.enum?.[0] ?? '1:1')
  const currentInfo = useMemo(() => getAspectRatioInfo(currentValue), [currentValue])

  useEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      setAlignRight(rect.left + 300 > window.innerWidth || rect.left + rect.width / 2 > 260)
    }
  }, [open])

  const options = useMemo(() => {
    const rawOptions = field.enum && field.enum.length > 0 ? field.enum : [currentValue]
    return rawOptions.map((opt) => getAspectRatioInfo(opt))
  }, [field.enum, currentValue])

  const filteredOptions = useMemo(() => {
    return options.filter((opt) => {
      if (categoryFilter !== 'all' && opt.category !== categoryFilter) {
        return false
      }
      if (search.trim()) {
        const query = search.toLowerCase()
        return (
          opt.label.toLowerCase().includes(query) ||
          opt.subtitle.toLowerCase().includes(query) ||
          opt.value.toLowerCase().includes(query)
        )
      }
      return true
    })
  }, [options, categoryFilter, search])

  // Click outside and escape listeners
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

  // Focus search on open
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => {
        searchInputRef.current?.focus()
      })
    } else {
      setSearch('')
      setCategoryFilter('all')
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Trigger Button (Magnific Style) */}
      <Pressable
        type="button"
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Aspect ratio: ${currentInfo.label} (${currentInfo.subtitle})`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-md)] border px-2 text-xs font-medium shadow-xs transition-colors select-none ${
          open
            ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)] ring-1 ring-[var(--accent)]'
            : 'border-[var(--border)] bg-[var(--surface-raised)] text-[var(--text)] hover:border-[var(--border-strong)]'
        }`}
        scaleTo={0.96}
      >
        <WireframePreview
          width={Math.min(18, currentInfo.width)}
          height={Math.min(18, currentInfo.height)}
          isAuto={currentInfo.isAuto}
          isActive={open}
        />
        <span className="font-semibold">{currentInfo.label}</span>
        <ChevronDown
          size={13}
          strokeWidth={2}
          className={`text-[var(--text-muted)] transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </Pressable>

      {/* Floating Popover (Magnific Image 2 Style) */}
      {open && (
        <div
          role="dialog"
          aria-label="Select aspect ratio"
          className={`absolute bottom-full z-50 mb-2 flex w-72 flex-col rounded-[var(--radius-xl)] border border-[var(--border)] bg-[var(--surface-raised)] p-2.5 shadow-xl sm:w-80 ${
            alignRight ? 'right-0' : 'left-0'
          }`}
          style={{
            boxShadow: '0 12px 32px -4px oklch(0.2 0.02 250 / 0.15), 0 4px 12px -2px oklch(0.2 0.02 250 / 0.08)',
          }}
        >
          {/* Header Search */}
          <div className="relative mb-2">
            <Search
              size={14}
              strokeWidth={2}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
              aria-hidden
            />
            <input
              id={searchId}
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search size…"
              aria-label="Search aspect ratio"
              className="studio-input h-8 w-full pl-8 pr-2 text-xs"
            />
          </div>

          {/* Filter Tabs */}
          <div className="mb-2 flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--bg)] p-1 text-[11px] font-semibold">
            {(['all', 'ratios', 'social'] as const).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`flex-1 rounded-xs py-1 text-center capitalize transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[var(--surface-raised)] text-[var(--text)] shadow-xs'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="mb-1 px-1 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
            Aspect Ratios
          </div>

          {/* Aspect Ratios List */}
          <div className="max-h-56 min-h-0 space-y-0.5 overflow-y-auto pr-0.5">
            {filteredOptions.length === 0 ? (
              <p className="py-4 text-center text-xs text-[var(--text-muted)]">
                No matching aspect ratios
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === currentValue
                return (
                  <Pressable
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value)
                      setOpen(false)
                    }}
                    aria-pressed={isSelected}
                    className={`flex w-full items-center justify-between rounded-[var(--radius-md)] px-2.5 py-1.5 text-left text-xs transition-colors ${
                      isSelected
                        ? 'bg-[var(--accent-soft)] font-semibold text-[var(--accent)]'
                        : 'text-[var(--text)] hover:bg-[var(--surface)]'
                    }`}
                    scaleTo={0.98}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <WireframePreview
                        width={opt.width}
                        height={opt.height}
                        isAuto={opt.isAuto}
                        isActive={isSelected}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 leading-tight">
                          <span className="font-semibold">{opt.label}</span>
                          <span className="truncate text-[11px] font-normal text-[var(--text-muted)]">
                            {opt.subtitle}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <Check
                        size={14}
                        strokeWidth={2.5}
                        className="shrink-0 text-[var(--accent)]"
                        aria-hidden
                      />
                    )}
                  </Pressable>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

