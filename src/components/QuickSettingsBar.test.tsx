import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QuickSettingsBar } from './QuickSettingsBar.tsx'
import type { FieldSchema } from '../lib/models/types.ts'

describe('QuickSettingsBar', () => {
  afterEach(cleanup)

  const sampleFields: FieldSchema[] = [
    {
      name: 'aspect_ratio',
      type: 'enum',
      label: 'Aspect Ratio',
      enum: ['1:1', '16:9', '9:16'],
      default: '16:9',
    },
    {
      name: 'resolution',
      type: 'enum',
      label: 'Resolution',
      enum: ['1K', '2K', '4K'],
      default: '2K',
    },
    {
      name: 'quality',
      type: 'enum',
      label: 'Quality',
      enum: ['low', 'medium', 'high', 'xhigh'],
      default: 'high',
    },
    {
      name: 'output_format',
      type: 'enum',
      label: 'Output Format',
      enum: ['png', 'jpeg', 'webp'],
      default: 'png',
    },
  ]

  it('renders stepper and changes batch count', () => {
    const onBatchCountChange = vi.fn()
    render(
      <QuickSettingsBar
        fields={sampleFields}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', output_format: 'png' }}
        onChange={vi.fn()}
        batchCount={2}
        onBatchCountChange={onBatchCountChange}
      />,
    )

    expect(screen.getByText('2')).toBeInTheDocument()

    // Increase
    fireEvent.click(screen.getByRole('button', { name: /increase batch count/i }))
    expect(onBatchCountChange).toHaveBeenCalledWith(3)

    // Decrease
    fireEvent.click(screen.getByRole('button', { name: /decrease batch count/i }))
    expect(onBatchCountChange).toHaveBeenCalledWith(1)
  })

  it('renders aspect ratio trigger and opens popover to select ratio', () => {
    const onChange = vi.fn()
    render(
      <QuickSettingsBar
        fields={sampleFields}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', output_format: 'png' }}
        onChange={onChange}
        batchCount={1}
        onBatchCountChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: /aspect ratio: 16:9/i })
    expect(trigger).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: /select aspect ratio/i })).toBeInTheDocument()

    // Select 9:16
    const option916 = screen.getByRole('button', { name: /9:16/i })
    fireEvent.click(option916)

    expect(onChange).toHaveBeenCalledWith('aspect_ratio', '9:16')
    // Popover closed
    expect(screen.queryByRole('dialog', { name: /select aspect ratio/i })).not.toBeInTheDocument()
  })

  it('filters aspect ratios by search query', () => {
    render(
      <QuickSettingsBar
        fields={sampleFields}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', output_format: 'png' }}
        onChange={vi.fn()}
        batchCount={1}
        onBatchCountChange={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /aspect ratio: 16:9/i }))

    const searchInput = screen.getByPlaceholderText('Search size…')
    fireEvent.change(searchInput, { target: { value: 'social' } })

    const dialog = screen.getByRole('dialog', { name: /select aspect ratio/i })
    expect(within(dialog).getByRole('button', { name: /9:16/i })).toBeInTheDocument()
    // 16:9 widescreen is filtered out
    expect(within(dialog).queryByRole('button', { name: /16:9/i })).not.toBeInTheDocument()
  })

  it('renders combined resolution and quality button and updates them', () => {
    const onChange = vi.fn()
    render(
      <QuickSettingsBar
        fields={sampleFields}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', output_format: 'png' }}
        onChange={onChange}
        batchCount={1}
        onBatchCountChange={vi.fn()}
        creditEstimate={15}
      />,
    )

    const trigger = screen.getByRole('button', { name: /resolution and quality: 2k · high/i })
    expect(trigger).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: /resolution and quality/i })).toBeInTheDocument()
    expect(screen.getByText('~15 cr')).toBeInTheDocument()

    // Click 4K
    fireEvent.click(screen.getByRole('button', { name: '4K' }))
    expect(onChange).toHaveBeenCalledWith('resolution', '4K')

    // Click Extra high
    fireEvent.click(screen.getByRole('button', { name: /extra high/i }))
    expect(onChange).toHaveBeenCalledWith('quality', 'xhigh')
  })

  it('renders format popover and updates format', () => {
    const onChange = vi.fn()
    render(
      <QuickSettingsBar
        fields={sampleFields}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', output_format: 'png' }}
        onChange={onChange}
        batchCount={1}
        onBatchCountChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: /output format: png/i })
    fireEvent.click(trigger)

    const webpOption = screen.getByRole('button', { name: 'webp' })
    fireEvent.click(webpOption)

    expect(onChange).toHaveBeenCalledWith('output_format', 'webp')
  })

  it('renders background popover and updates background', () => {
    const onChange = vi.fn()
    const fieldsWithBg: FieldSchema[] = [
      ...sampleFields,
      {
        name: 'background',
        type: 'enum',
        label: 'Background',
        enum: ['auto', 'transparent', 'opaque'],
        default: 'auto',
      },
    ]

    render(
      <QuickSettingsBar
        fields={fieldsWithBg}
        values={{ aspect_ratio: '16:9', resolution: '2K', quality: 'high', background: 'auto' }}
        onChange={onChange}
        batchCount={1}
        onBatchCountChange={vi.fn()}
      />,
    )

    const trigger = screen.getByRole('button', { name: /background: auto/i })
    expect(trigger).toBeInTheDocument()

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog', { name: /select background/i })).toBeInTheDocument()

    const transparentOpt = screen.getByRole('button', { name: /transparent/i })
    fireEvent.click(transparentOpt)

    expect(onChange).toHaveBeenCalledWith('background', 'transparent')
  })
})
