import type { ModelDefinition } from './models/types.ts'

export function validateWorkflowInput(
  model: ModelDefinition,
  values: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {}
  if (
    model.provider === 'suno' &&
    (model.id === 'suno/music' || model.operation === 'upload-cover')
  ) {
    const customMode = values.customMode !== false
    const instrumental = values.instrumental === true
    const prompt = typeof values.prompt === 'string' ? values.prompt.trim() : ''
    const style = typeof values.style === 'string' ? values.style.trim() : ''
    const title = typeof values.title === 'string' ? values.title.trim() : ''
    const modelName = typeof values.model === 'string' ? values.model : 'V5'
    if (!prompt && (!customMode || !instrumental)) {
      errors.prompt = customMode
        ? 'Please enter lyrics or composition instructions for songs with vocals'
        : 'Please describe the song you want to create in up to 500 characters'
    }
    if (customMode && !style) errors.style = 'Style is required in Custom mode'
    if (customMode && !title) errors.title = 'Title is required in Custom mode'

    const promptLimit = customMode ? (modelName === 'V4' ? 3000 : 5000) : 500
    const styleLimit = modelName === 'V4' ? 200 : 1000
    if (prompt.length > promptLimit) {
      errors.prompt = `Prompt must be within ${promptLimit} characters in this mode`
    }
    if (customMode && style.length > styleLimit) {
      errors.style = `Style for ${modelName} must be within ${styleLimit} characters`
    }
  }
  if (model.provider === 'suno' && model.operation === 'replace-section') {
    const start = Number(values.infillStartS)
    const end = Number(values.infillEndS)
    const duration = Number(values._duration)
    const length = end - start
    if (!Number.isFinite(start) || !Number.isFinite(end) || length < 6 || length > 60) {
      errors.infillEndS = 'Section to replace must be between 6 and 60 seconds'
    } else if (Number.isFinite(duration) && duration > 0 && length > duration / 2) {
      errors.infillEndS = 'Section to replace must be 50% or less of the entire song'
    }
  }
  if (
    model.provider === 'runway' &&
    model.operation === 'generate' &&
    String(values.duration) === '10' &&
    values.quality === '1080p'
  ) {
    errors.quality = '1080p is not supported for 10-second Runway generations'
  }
  if (model.id === 'market/elevenlabs-tts' && typeof values.text === 'string') {
    const segments = values.text.split(/\n\s*\n/g).filter((text) => text.trim())
    if (segments.some((text) => text.length > 5000)) {
      errors.text = 'Each narration segment must be within 5,000 characters'
    }
  }
  if (model.id === 'market/volcengine-lip-sync') {
    const videos = Array.isArray(values.video_url) ? values.video_url : []
    const audio = Array.isArray(values.audio_url) ? values.audio_url : []
    if (videos.length !== 1) errors.video_url = 'Please select 1 video'
    if (audio.length !== 1) errors.audio_url = 'Please select 1 audio track'
  }
  return errors
}

export function sanitizeWorkflowInput(
  model: ModelDefinition,
  input: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = { ...input }
  if (
    model.provider === 'suno' &&
    (model.id === 'suno/music' || model.operation === 'upload-cover') &&
    sanitized.customMode === false
  ) {
    delete sanitized.style
    delete sanitized.title
    delete sanitized.negativeTags
    delete sanitized.personaId
  }
  return sanitized
}
