import { describe, expect, it } from 'vitest'
import type { FieldSchema, ModelDefinition } from './models/types.ts'
import {
  fieldConstraintHint,
  isAdvancedField,
  isEnhancePromptField,
  isImageQualityField,
  modelInputSummary,
  presentField,
} from './studioPresentation.ts'

describe('studio presentation', () => {
  it('localizes common fields without changing Nsfw Checker', () => {
    expect(presentField({ name: 'prompt', type: 'textarea', label: 'Prompt' }).label)
      .toBe('Prompt')

    const nsfw: FieldSchema = {
      name: 'nsfw_checker',
      type: 'boolean',
      label: 'Nsfw Checker',
      description: 'Provider description stays as-is.',
    }
    expect(presentField(nsfw)).toEqual(nsfw)
  })

  it('keeps core fields visible and moves optional tuning fields to details', () => {
    expect(isAdvancedField({ name: 'prompt', type: 'textarea', label: 'Prompt' })).toBe(false)
    expect(isAdvancedField({ name: 'resolution', type: 'enum', label: 'Resolution' })).toBe(false)
    expect(isAdvancedField({ name: 'seed', type: 'number', label: 'Seed' })).toBe(true)
    expect(isAdvancedField({ name: 'steps', type: 'number', label: 'Steps', required: true })).toBe(false)
    // Enhance Prompt is kept in basic options (not advanced)
    expect(isAdvancedField({ name: 'enhance_prompt', type: 'boolean', label: 'Enhance Prompt' })).toBe(false)
    expect(isEnhancePromptField({ name: 'enhance_prompt', type: 'boolean', label: 'Enhance Prompt' })).toBe(true)
    // Background is an advanced option
    expect(isAdvancedField({ name: 'background', type: 'enum', label: 'Background', enum: ['transparent', 'opaque', 'auto'] })).toBe(true)
    // Image quality (OpenAI style) is an advanced option
    const imageQuality: FieldSchema = {
      name: 'quality',
      type: 'enum',
      label: 'Quality',
      enum: ['auto', 'low', 'medium', 'high', 'xhigh', 'max'],
    }
    expect(isImageQualityField(imageQuality)).toBe(true)
    expect(isAdvancedField(imageQuality)).toBe(true)
  })

  it('configures background and image quality with auto first and default auto', () => {
    const bg = presentField({
      name: 'background',
      type: 'enum',
      label: 'Background',
      enum: ['transparent', 'opaque', 'auto'],
    })
    expect(bg.default).toBe('auto')
    expect(bg.enum).toEqual(['auto', 'transparent', 'opaque'])

    const quality = presentField({
      name: 'quality',
      type: 'enum',
      label: 'Quality',
      enum: ['low', 'medium', 'high', 'auto'],
    })
    expect(quality.default).toBe('auto')
    expect(quality.enum).toEqual(['auto', 'low', 'medium', 'high'])
  })

  it('builds compact constraint and model input summaries', () => {
    expect(fieldConstraintHint({
      name: 'prompt',
      type: 'textarea',
      label: 'Prompt',
      maxLength: 5000,
    })).toBe('Max 5,000 characters')

    const model: ModelDefinition = {
      id: 'example',
      model: 'example',
      title: 'Example',
      category: 'video',
      provider: 'market',
      fields: [{
        name: 'input_urls',
        type: 'reference',
        label: 'Input Urls',
        accept: 'image/*,video/*',
      }],
    }
    expect(modelInputSummary(model)).toBe('Image / Video input')
  })
})
