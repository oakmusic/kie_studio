import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DynamicForm } from './DynamicForm.tsx'
import type { FieldSchema } from '../lib/models/types.ts'

function renderForm(
  fields: FieldSchema[],
  values: Record<string, unknown> = {},
  overrides: Partial<Parameters<typeof DynamicForm>[0]> = {},
) {
  const onChange = vi.fn()
  render(
    <DynamicForm
      fields={fields}
      values={values}
      onChange={onChange}
      {...overrides}
    />,
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
})
