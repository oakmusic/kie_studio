import { useRef, useState } from 'react'
import { FileAudio, LoaderCircle, Plus, X } from 'lucide-react'
import { uploadFileWithMetadata } from '../lib/api.ts'
import { formatMention } from '../lib/models/mentions.ts'
import type { MentionStyle } from '../lib/models/types.ts'
import { Pressable } from './motion/Pressable.tsx'

export function ReferenceUpload({
  value,
  onChange,
  maxItems = 8,
  accept = 'image/*',
  disabled,
  mentionStyle = 'at-image',
  onInsertMention,
  inputId,
  maxFileSizeMb,
  maxDurationSec,
}: {
  value: string[]
  onChange: (urls: string[]) => void
  maxItems?: number
  accept?: string
  disabled?: boolean
  mentionStyle?: MentionStyle
  onInsertMention?: (token: string) => void
  inputId?: string
  maxFileSizeMb?: number
  maxDurationSec?: number
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({})

  const [isDragging, setIsDragging] = useState(false)

  async function mediaDuration(file: File): Promise<number | undefined> {
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) return undefined
    const url = URL.createObjectURL(file)
    try {
      const element = document.createElement(file.type.startsWith('audio/') ? 'audio' : 'video')
      element.preload = 'metadata'
      return await new Promise<number | undefined>((resolve) => {
        const timeout = window.setTimeout(() => resolve(undefined), 5000)
        element.onloadedmetadata = () => {
          window.clearTimeout(timeout)
          resolve(Number.isFinite(element.duration) ? element.duration : undefined)
        }
        element.onerror = () => {
          window.clearTimeout(timeout)
          resolve(undefined)
        }
        element.src = url
      })
    } finally {
      URL.revokeObjectURL(url)
    }
  }

  async function handleFiles(files: FileList | File[] | null) {
    if (!files || files.length === 0) return
    setError(null)
    setUploading(true)
    try {
      const remaining = Math.max(0, maxItems - value.length)
      const list = [...files].slice(0, remaining)
      for (const file of list) {
        if (maxFileSizeMb && file.size > maxFileSizeMb * 1024 * 1024) {
          throw new Error(`${file.name} must be ${maxFileSizeMb}MB or less`)
        }
        if (maxDurationSec) {
          const duration = await mediaDuration(file)
          if (duration !== undefined && duration > maxDurationSec) {
            throw new Error(`${file.name} must be ${maxDurationSec}s or less`)
          }
        }
      }
      const uploaded = await Promise.all(list.map((file) => uploadFileWithMetadata(file)))
      const urls = uploaded.map((result) => result.fileUrl)
      setDisplayNames((current) => ({
        ...current,
        ...Object.fromEntries(uploaded.map((result) => [result.fileUrl, result.originalFileName])),
      }))
      onChange([...value, ...urls])
      if (/audio/i.test(accept)) {
        window.dispatchEvent(new Event('kie:audio-assets-changed'))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const canMention = mentionStyle !== 'none' && Boolean(onInsertMention)

  function onDragOver(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  function onDragLeave(e: React.DragEvent) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  function onDrop(e: React.DragEvent) {
    if (disabled || uploading) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    if (e.dataTransfer?.files?.length) {
      void handleFiles(e.dataTransfer.files)
    }
  }

  return (
    <div
      className="space-y-2.5"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {value.length === 0 ? (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={uploading ? 'Uploading…' : 'Drop reference file here or click to browse'}
          onClick={() => {
            if (!disabled && !uploading) inputRef.current?.click()
          }}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !disabled && !uploading) {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          className={`studio-dropzone flex min-h-24 w-full cursor-pointer flex-col items-center justify-center gap-1.5 p-4 text-center transition ${
            isDragging ? 'is-dragging' : 'hover:border-[var(--accent)] hover:bg-[var(--accent-soft)]'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        >
          {uploading ? (
            <div className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
              <LoaderCircle size={16} strokeWidth={2} className="studio-spinner" aria-hidden />
              <span>Uploading reference…</span>
            </div>
          ) : (
            <>
              <div className="grid size-8 place-items-center rounded-full bg-[var(--surface-raised)] text-[var(--accent)] shadow-[var(--shadow-sm)]">
                <Plus size={16} strokeWidth={2.5} aria-hidden />
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text)]">
                  Drop reference file here or <span className="text-[var(--accent)] underline underline-offset-2">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                  Up to {maxItems} {maxItems === 1 ? 'file' : 'files'}
                  {maxFileSizeMb ? ` · Max ${maxFileSizeMb}MB` : ''}
                  {maxDurationSec ? ` · Max ${maxDurationSec}s` : ''}
                </p>
              </div>
            </>
          )}
        </div>
      ) : (
        <div className={`flex flex-wrap gap-2.5 rounded-[var(--radius-md)] p-1.5 transition ${isDragging ? 'bg-[var(--accent-soft)] ring-2 ring-[var(--accent)]' : ''}`}>
          {value.map((url, i) => {
            const token = formatMention(mentionStyle, i + 1)
            return (
              <div key={url} className="studio-tile relative w-[92px] shadow-[var(--shadow-sm)]">
                <div className="relative h-20 w-full">
                  {/\.(mp4|webm|mov)(\?|$)/i.test(url) ? (
                    <video
                      src={url}
                      className="h-full w-full object-cover"
                      muted
                      preload="metadata"
                    />
                  ) : /\.(mp3|wav|m4a|aac|ogg|flac|opus)(\?|$)/i.test(url) || /audio/i.test(accept) ? (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--accent-soft)] px-2 text-center">
                      <FileAudio size={20} className="text-[var(--accent)]" />
                      <span className="line-clamp-2 text-xs font-medium">{displayNames[url] ?? `Audio ${i + 1}`}</span>
                    </div>
                  ) : (
                    <img
                      src={url}
                      alt={`Reference ${i + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    disabled={disabled}
                    aria-label={`Remove reference ${i + 1}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(value.filter((_, idx) => idx !== i))
                    }}
                    className="absolute right-1 top-1 inline-flex size-6 cursor-pointer items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] p-0.5 text-[var(--text)] hover:text-[var(--danger)] disabled:opacity-50"
                  >
                    <X size={12} strokeWidth={2.5} aria-hidden />
                  </button>
                </div>
                {canMention && token && (
                  <button
                    type="button"
                    disabled={disabled}
                    title={`Insert ${token} into prompt`}
                    onClick={(e) => {
                      e.stopPropagation()
                      onInsertMention?.(token)
                    }}
                    className="w-full cursor-pointer border-t border-[var(--border)] bg-[var(--bg-elevated)] px-1 py-1 text-center font-mono text-xs font-semibold text-[var(--accent)] transition hover:bg-[var(--accent-soft)] disabled:opacity-50"
                  >
                    {token}
                  </button>
                )}
              </div>
            )
          })}
          {value.length < maxItems && (
            <Pressable
              disabled={disabled || uploading}
              onClick={() => inputRef.current?.click()}
              scaleTo={0.96}
              aria-controls={inputId}
              aria-busy={uploading || undefined}
              aria-label={uploading ? 'Uploading…' : 'Add reference file'}
              className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] border border-dashed border-[var(--border-strong)] bg-[var(--surface-raised)] text-xs font-semibold text-[var(--text-muted)] hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              {uploading ? (
                <LoaderCircle
                  size={16}
                  strokeWidth={2}
                  className="studio-spinner text-[var(--accent)]"
                  aria-hidden
                />
              ) : (
                <>
                  <Plus size={16} strokeWidth={2.5} aria-hidden />
                  <span>Add</span>
                </>
              )}
            </Pressable>
          )}
        </div>
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        aria-label="Select reference file"
        accept={accept}
        multiple={maxItems > 1}
        className="hidden"
        tabIndex={-1}
        disabled={disabled || uploading}
        onChange={(e) => void handleFiles(e.target.files)}
      />
      {value.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          {value.length}/{maxItems} files
          {maxFileSizeMb ? ` · Up to ${maxFileSizeMb}MB` : ''}
          {maxDurationSec ? ` · Up to ${maxDurationSec}s` : ''}
          {canMention && ' · Click badge to insert mention into prompt'}
        </p>
      )}
      {error && (
        <p className="studio-field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
