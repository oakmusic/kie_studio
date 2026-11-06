import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { DynamicForm } from './DynamicForm.tsx'
import type { FieldSchema } from '../lib/models/types.ts'

function renderForm(
  fields: FieldSchema[],
  values: Record<string, unknown> = {},
  overrides: Partial<Parameters<typeof DynamicForm>[0]> = {},
) {
  const onChange = vi.fn()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  render(
    <QueryClientProvider client={queryClient}>
      <DynamicForm
        fields={fields}
        values={values}
        onChange={onChange}
        {...overrides}
      />
    </QueryClientProvider>,
  )
  return { onChange }
}

describe('DynamicForm', () => {
  afterEach(cleanup)

  it('renders a text input and emits its value on change', () => {
    const { onChange } = renderForm(
      [{ name: 'title', type: 'string', label: 'Title', required: true }],
      { title: '' },
    )
    const input = screen.getByRole('textbox', { name: 'Title' })
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('title', 'hello')
  })

  it('coerces number fields to numeric values', () => {
    const { onChange } = renderForm(
      [{ name: 'seed', type: 'number', label: 'Seed', required: true, min: 0, max: 10 }],
      { seed: 3 },
    )
    const [range] = screen.getAllByLabelText('Seed')
    fireEvent.change(range, { target: { value: '7' } })
    expect(onChange).toHaveBeenCalledWith('seed', 7)
  })

  it('toggles a boolean field between true and false', () => {
    const { onChange } = renderForm(
      [{ name: 'hd', type: 'boolean', label: 'HD', required: true }],
      { hd: false },
    )
    fireEvent.click(screen.getByRole('button', { name: 'true' }))
    expect(onChange).toHaveBeenCalledWith('hd', true)
  })

  it('emits the selected enum option', () => {
    const { onChange } = renderForm(
      [
        {
          name: 'ratio',
          type: 'enum',
          label: 'Ratio',
          required: true,
          enum: ['1:1', '16:9'],
        },
      ],
      { ratio: '1:1' },
    )
    fireEvent.change(screen.getByRole('combobox', { name: 'Ratio' }), {
      target: { value: '16:9' },
    })
    expect(onChange).toHaveBeenCalledWith('ratio', '16:9')
  })

  it('shows a field error with an alert role', () => {
    renderForm(
      [{ name: 'title', type: 'string', label: 'Title', required: true }],
      { title: '' },
      { fieldErrors: { title: 'This field is required' } },
    )
    expect(screen.getByRole('alert')).toHaveTextContent('This field is required')
  })

  it('hides non-required advanced fields until the section is expanded', () => {
    renderForm(
      [{ name: 'guidance', type: 'number', label: 'Guidance' }],
      { guidance: 5 },
    )
    expect(screen.queryByLabelText('Guidance')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }))
    expect(screen.getAllByLabelText('Guidance').length).toBeGreaterThan(0)
  })

  it('does not render width and height sliders', () => {
    renderForm(
      [
        { name: 'title', type: 'string', label: 'Title' },
        { name: 'width', type: 'number', label: 'Width', min: 256, max: 4096 },
        { name: 'height', type: 'number', label: 'Height', min: 256, max: 4096 },
        { name: 'aspect_ratio', type: 'enum', label: 'Aspect Ratio', enum: ['1:1', '16:9'] },
        { name: 'resolution', type: 'enum', label: 'Resolution', enum: ['1K', '2K'] },
      ],
      { title: 'test', width: 256, height: 256, aspect_ratio: '1:1', resolution: '1K' },
    )
    expect(screen.queryByLabelText('Width')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Height')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Aspect Ratio' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Resolution' })).toBeInTheDocument()
  })

  it('renders Enhance Prompt outside advanced settings right after prompt', () => {
    const { onChange } = renderForm(
      [
        { name: 'prompt', type: 'textarea', label: 'Prompt' },
        { name: 'enhance_prompt', type: 'boolean', label: 'Enhance Prompt', default: true },
        { name: 'aspect_ratio', type: 'enum', label: 'Aspect Ratio', enum: ['1:1', '16:9'] },
      ],
      { prompt: 'a cat', enhance_prompt: true, aspect_ratio: '1:1' },
    )
    expect(screen.getByText('Enhance Prompt')).toBeInTheDocument()
    // It should not require opening Advanced Settings
    expect(screen.queryByRole('button', { name: /Advanced Settings/i })).not.toBeInTheDocument()

    // Clicking Off toggles the enhance_prompt value
    fireEvent.click(screen.getByRole('button', { name: 'Enhance Prompt Off' }))
    expect(onChange).toHaveBeenCalledWith('enhance_prompt', false)
  })

  it('renders Background and Quality in Advanced Settings with auto first and default', () => {
    renderForm(
      [
        { name: 'prompt', type: 'textarea', label: 'Prompt' },
        {
          name: 'background',
          type: 'enum',
          label: 'Background',
          enum: ['transparent', 'opaque', 'auto'],
        },
        {
          name: 'quality',
          type: 'enum',
          label: 'Quality',
          enum: ['low', 'medium', 'high', 'xhigh', 'max', 'auto'],
        },
      ],
      { prompt: 'a portrait' },
    )
    // Both are advanced fields
    expect(screen.queryByLabelText('Background')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Quality')).not.toBeInTheDocument()

    // Open Advanced Settings
    fireEvent.click(screen.getByRole('button', { name: /Advanced Settings/i }))

    const bgSelect = screen.getByRole('combobox', { name: 'Background' }) as HTMLSelectElement
    expect(bgSelect).toBeInTheDocument()
    expect(bgSelect.value).toBe('auto')
    expect(bgSelect.options[0]?.value).toBe('auto')

    const qualitySelect = screen.getByRole('combobox', { name: 'Quality' }) as HTMLSelectElement
    expect(qualitySelect).toBeInTheDocument()
    expect(qualitySelect.value).toBe('auto')
    expect(qualitySelect.options[0]?.value).toBe('auto')
  })
})
