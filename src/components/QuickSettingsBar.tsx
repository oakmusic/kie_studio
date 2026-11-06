import { useMemo } from 'react'
import type { FieldSchema } from '../lib/models/types.ts'
import { BatchStepper } from './BatchStepper.tsx'
import { AspectRatioPopover } from './popovers/AspectRatioPopover.tsx'
import { ResolutionQualityPopover } from './popovers/ResolutionQualityPopover.tsx'
import { BackgroundPopover } from './popovers/BackgroundPopover.tsx'
import { FormatPopover, DurationPopover } from './popovers/FormatDurationPopovers.tsx'

export const QUICK_SETTING_NAMES = new Set([
  'aspect_ratio',
  'aspectratio',
  'image_size',
  'resolution',
  'image_resolution',
  'output_resolution',
  'size',
  'quality',
  'rendering_speed',
  'background',
  'output_format',
  'duration',
  'duration_seconds',
  'num_images',
  'number_of_images',
  'image_num',
])

export function QuickSettingsBar({
  fields,
  values,
  onChange,
  batchCount,
  onBatchCountChange,
  creditEstimate,
  disabled,
}: {
  fields: FieldSchema[]
  values: Record<string, unknown>
  onChange: (name: string, value: unknown) => void
  batchCount: number
  onBatchCountChange: (count: number) => void
  creditEstimate?: number | null
  disabled?: boolean
}) {
  const aspectRatioField = useMemo(() => {
    return fields.find((f) =>
      ['aspect_ratio', 'aspectratio', 'image_size'].includes(f.name.toLowerCase()),
    )
  }, [fields])

  const resolutionField = useMemo(() => {
    return fields.find((f) =>
      ['resolution', 'image_resolution', 'output_resolution', 'size'].includes(f.name.toLowerCase()),
    )
  }, [fields])

  const qualityField = useMemo(() => {
    return fields.find((f) =>
      ['quality', 'rendering_speed'].includes(f.name.toLowerCase()),
    )
  }, [fields])

  const backgroundField = useMemo(() => {
    return fields.find((f) => f.name.toLowerCase() === 'background')
  }, [fields])

  const formatField = useMemo(() => {
    return fields.find((f) => f.name.toLowerCase() === 'output_format')
  }, [fields])

  const durationField = useMemo(() => {
    return fields.find(
      (f) =>
        ['duration', 'duration_seconds'].includes(f.name.toLowerCase()) &&
        Boolean(f.enum && f.enum.length > 0),
    )
  }, [fields])

  return (
    <div
      role="toolbar"
      aria-label="Quick generation parameters"
      className="flex flex-wrap items-center gap-1.5"
    >
      {/* Batch Stepper (Magnific Image 1 style [- 1 +]) */}
      <BatchStepper
        value={batchCount}
        onChange={onBatchCountChange}
        disabled={disabled}
      />

      {/* Aspect Ratio Selector (Magnific Image 1 & 2 style [16:9]) */}
      {aspectRatioField && (
        <AspectRatioPopover
          field={aspectRatioField}
          value={values[aspectRatioField.name]}
          onChange={(val) => onChange(aspectRatioField.name, val)}
          disabled={disabled}
        />
      )}

      {/* Resolution & Quality Combined (Magnific Image 1 & 3 style [4K · Extra high]) */}
      {(resolutionField || qualityField) && (
        <ResolutionQualityPopover
          resolutionField={resolutionField}
          qualityField={qualityField}
          resolutionValue={resolutionField ? values[resolutionField.name] : undefined}
          qualityValue={qualityField ? values[qualityField.name] : undefined}
          onResolutionChange={(val) => resolutionField && onChange(resolutionField.name, val)}
          onQualityChange={(val) => qualityField && onChange(qualityField.name, val)}
          creditEstimate={creditEstimate}
          disabled={disabled}
        />
      )}

      {/* Background (e.g. Auto / Transparent / Opaque) */}
      {backgroundField && (
        <BackgroundPopover
          field={backgroundField}
          value={values[backgroundField.name]}
          onChange={(val) => onChange(backgroundField.name, val)}
          disabled={disabled}
        />
      )}

      {/* Output Format (e.g. PNG / JPG) */}
      {formatField && (
        <FormatPopover
          field={formatField}
          value={values[formatField.name]}
          onChange={(val) => onChange(formatField.name, val)}
          disabled={disabled}
        />
      )}

      {/* Duration (for video models e.g. 5s / 10s) */}
      {durationField && (
        <DurationPopover
          field={durationField}
          value={values[durationField.name]}
          onChange={(val) => onChange(durationField.name, val)}
          disabled={disabled}
        />
      )}
    </div>
  )
}

