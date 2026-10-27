import { describe, expect, it } from 'vitest'
import type { ModelDefinition } from './models/types.ts'
import { sanitizeWorkflowInput, validateWorkflowInput } from './workflowValidation.ts'

const replaceModel: ModelDefinition = {
  id: 'suno/replace-section',
  model: 'suno/replace-section',
  title: 'replace',
  category: 'audio',
  provider: 'suno',
  operation: 'replace-section',
  fields: [],
}

describe('workflow constraints', () => {
  it('accepts a 6–60 second section within half the track', () => {
    expect(validateWorkflowInput(replaceModel, {
      infillStartS: 10,
      infillEndS: 40,
      _duration: 120,
    })).toEqual({})
  })

  it('rejects sections shorter than six seconds or over half the track', () => {
    expect(validateWorkflowInput(replaceModel, {
      infillStartS: 10,
      infillEndS: 15,
      _duration: 120,
    })).toHaveProperty('infillEndS')
    expect(validateWorkflowInput(replaceModel, {
      infillStartS: 0,
      infillEndS: 40,
      _duration: 60,
    })).toHaveProperty('infillEndS')
  })

  it('rejects Runway 10-second 1080p generation', () => {
    expect(validateWorkflowInput({
      ...replaceModel,
      id: 'runway/generate',
      model: 'runway',
      category: 'video',
      provider: 'runway',
      operation: 'generate',
    }, { duration: '10', quality: '1080p' })).toHaveProperty('quality')
  })

  it('rejects narration segments over the provider limit', () => {
    expect(validateWorkflowInput({
      ...replaceModel,
      id: 'market/elevenlabs-tts',
      model: 'elevenlabs/text-to-speech-multilingual-v2',
      provider: 'market',
      operation: 'generate',
    }, { text: `short\n\n${'x'.repeat(5001)}` })).toHaveProperty('text')
  })

  it('requires exactly one video and one audio for lip sync', () => {
    const model: ModelDefinition = {
      ...replaceModel,
      id: 'market/volcengine-lip-sync',
      model: 'volcengine/video-to-video-lip-sync',
      category: 'video',
      provider: 'market',
      operation: 'generate',
    }
    expect(validateWorkflowInput(model, { video_url: [], audio_url: [] }))
      .toEqual({ video_url: 'Please select 1 video', audio_url: 'Please select 1 audio track' })
    expect(validateWorkflowInput(model, {
      video_url: ['https://cdn.example.com/v.mp4'],
      audio_url: ['https://cdn.example.com/a.mp3'],
    })).toEqual({})
  })

  it('enforces Suno custom mode requirements and model-specific limits', () => {
    const model: ModelDefinition = {
      ...replaceModel,
      id: 'suno/music',
      model: 'suno/music',
      operation: 'generate',
    }
    expect(validateWorkflowInput(model, {
      customMode: true,
      instrumental: false,
      prompt: '',
      style: '',
      title: '',
      model: 'V5',
    })).toMatchObject({ prompt: expect.any(String), style: expect.any(String), title: expect.any(String) })
    expect(validateWorkflowInput(model, {
      customMode: true,
      instrumental: true,
      prompt: '',
      style: 'x'.repeat(201),
      title: 'Track',
      model: 'V4',
    })).toHaveProperty('style')
    expect(validateWorkflowInput(model, {
      customMode: false,
      prompt: 'x'.repeat(501),
      model: 'V5',
    })).toHaveProperty('prompt')
  })

  it('drops hidden Suno custom fields before submission', () => {
    const model: ModelDefinition = {
      ...replaceModel,
      id: 'suno/music',
      model: 'suno/music',
      operation: 'generate',
    }
    expect(sanitizeWorkflowInput(model, {
      customMode: false,
      prompt: 'lo-fi beat',
      style: 'stale',
      title: 'stale',
      negativeTags: 'stale',
      personaId: 'stale',
    })).toEqual({ customMode: false, prompt: 'lo-fi beat' })
  })

  it('strips width and height when aspect_ratio or resolution are present', () => {
    const model: ModelDefinition = {
      id: 'flux-3/klein-text-to-image',
      model: 'flux-3/klein-text-to-image',
      title: 'FLUX 3 Klein',
      category: 'image',
      provider: 'market',
      fields: [
        { name: 'prompt', type: 'textarea', label: 'Prompt' },
        { name: 'aspect_ratio', type: 'enum', label: 'Aspect Ratio', enum: ['1:1', '16:9'] },
        { name: 'resolution', type: 'enum', label: 'Resolution', enum: ['1K', '2K'] },
      ],
    }
    const input = {
      prompt: 'A sunset over the mountains',
      aspect_ratio: '16:9',
      resolution: '2K',
      width: 1920,
      height: 1080,
    }
    expect(sanitizeWorkflowInput(model, input)).toEqual({
      prompt: 'A sunset over the mountains',
      aspect_ratio: '16:9',
      resolution: '2K',
    })
  })
})
