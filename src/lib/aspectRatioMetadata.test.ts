import { describe, expect, it } from 'vitest'
import { getAspectRatioInfo } from './aspectRatioMetadata.ts'

describe('aspectRatioMetadata', () => {
  it('recognizes standard 16:9 widescreen', () => {
    const info = getAspectRatioInfo('16:9')
    expect(info.label).toBe('16:9')
    expect(info.subtitle).toBe('Widescreen')
    expect(info.category).toBe('ratios')
    expect(info.width).toBeGreaterThan(info.height)
  })

  it('recognizes 9:16 social reel / story', () => {
    const info = getAspectRatioInfo('9:16')
    expect(info.label).toBe('9:16')
    expect(info.subtitle).toBe('Social story / Reel')
    expect(info.category).toBe('social')
    expect(info.height).toBeGreaterThan(info.width)
  })

  it('recognizes 1:1 square as social', () => {
    const info = getAspectRatioInfo('1:1')
    expect(info.label).toBe('1:1')
    expect(info.category).toBe('social')
    expect(info.width).toBe(info.height)
  })

  it('maps landscape_16_9 to 16:9', () => {
    const info = getAspectRatioInfo('landscape_16_9')
    expect(info.label).toBe('16:9')
    expect(info.subtitle).toBe('Widescreen')
  })

  it('parses custom ratio like 2:1 dynamically', () => {
    const info = getAspectRatioInfo('2:1')
    expect(info.label).toBe('2:1')
    expect(info.subtitle).toBe('Landscape')
    expect(info.width).toBeGreaterThan(info.height)
  })

  it('handles auto gracefully', () => {
    const info = getAspectRatioInfo('auto')
    expect(info.label).toBe('Auto')
    expect(info.isAuto).toBe(true)
  })
})

