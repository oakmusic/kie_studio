export interface AspectRatioInfo {
  value: string
  label: string
  subtitle: string
  category: 'all' | 'ratios' | 'social'
  width: number
  height: number
  isAuto?: boolean
}

/** Pre-defined aspect ratio descriptors with friendly labels and visual box dimensions (max 22x22). */
const KNOWN_RATIOS: Record<
  string,
  { label: string; subtitle: string; category: 'ratios' | 'social'; width: number; height: number; isAuto?: boolean }
> = {
  '16:9': { label: '16:9', subtitle: 'Widescreen', category: 'ratios', width: 20, height: 11 },
  'landscape_16_9': { label: '16:9', subtitle: 'Widescreen', category: 'ratios', width: 20, height: 11 },
  '9:16': { label: '9:16', subtitle: 'Social story / Reel', category: 'social', width: 11, height: 20 },
  'portrait_16_9': { label: '9:16', subtitle: 'Social story / Reel', category: 'social', width: 11, height: 20 },
  '1:1': { label: '1:1', subtitle: 'Square / Feed', category: 'social', width: 16, height: 16 },
  'square': { label: '1:1', subtitle: 'Square', category: 'social', width: 16, height: 16 },
  'square_hd': { label: '1:1', subtitle: 'Square HD', category: 'social', width: 16, height: 16 },
  '4:5': { label: '4:5', subtitle: 'Social post', category: 'social', width: 14, height: 17.5 },
  '5:4': { label: '5:4', subtitle: 'Landscape post', category: 'ratios', width: 17.5, height: 14 },
  '4:3': { label: '4:3', subtitle: 'Classic', category: 'ratios', width: 18, height: 13.5 },
  'landscape_4_3': { label: '4:3', subtitle: 'Classic', category: 'ratios', width: 18, height: 13.5 },
  '3:4': { label: '3:4', subtitle: 'Traditional', category: 'ratios', width: 13.5, height: 18 },
  'portrait_4_3': { label: '3:4', subtitle: 'Traditional', category: 'ratios', width: 13.5, height: 18 },
  '3:2': { label: '3:2', subtitle: 'Standard landscape', category: 'ratios', width: 19, height: 12.6 },
  'landscape_3_2': { label: '3:2', subtitle: 'Standard landscape', category: 'ratios', width: 19, height: 12.6 },
  '2:3': { label: '2:3', subtitle: 'Standard portrait', category: 'ratios', width: 12.6, height: 19 },
  'portrait_3_2': { label: '2:3', subtitle: 'Standard portrait', category: 'ratios', width: 12.6, height: 19 },
  '21:9': { label: '21:9', subtitle: 'Ultrawide cinema', category: 'ratios', width: 22, height: 9.4 },
  '10:16': { label: '10:16', subtitle: 'Tall portrait', category: 'social', width: 12, height: 19 },
  '1:4': { label: '1:4', subtitle: 'Vertical banner', category: 'ratios', width: 6, height: 22 },
  '4:1': { label: '4:1', subtitle: 'Horizontal banner', category: 'ratios', width: 22, height: 6 },
  '1:8': { label: '1:8', subtitle: 'Skyscraper', category: 'ratios', width: 4, height: 22 },
  'auto': { label: 'Auto', subtitle: 'Automatic adaptation', category: 'ratios', width: 16, height: 16, isAuto: true },
  'adaptive': { label: 'Adaptive', subtitle: 'Adaptive ratio', category: 'ratios', width: 16, height: 16, isAuto: true },
}

/** Parses ratio string or returns normalized info with visual box dimensions. */
export function getAspectRatioInfo(value: string): AspectRatioInfo {
  const normalized = value.trim().toLowerCase()
  const found = KNOWN_RATIOS[normalized]
  if (found) {
    return {
      value,
      label: found.label,
      subtitle: found.subtitle,
      category: found.category,
      width: found.width,
      height: found.height,
      isAuto: found.isAuto,
    }
  }

  // Parse custom W:H ratio dynamically
  const match = normalized.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
  if (match) {
    const w = parseFloat(match[1]!)
    const h = parseFloat(match[2]!)
    if (w > 0 && h > 0) {
      const maxDim = 20
      let boxW = maxDim
      let boxH = maxDim
      if (w >= h) {
        boxH = Math.max(6, Math.round((h / w) * maxDim))
      } else {
        boxW = Math.max(6, Math.round((w / h) * maxDim))
      }
      const isSocial = (w === 9 && h === 16) || (w === 1 && h === 1) || (w === 4 && h === 5)
      return {
        value,
        label: `${match[1]}:${match[2]}`,
        subtitle: w > h ? 'Landscape' : w < h ? 'Portrait' : 'Square',
        category: isSocial ? 'social' : 'ratios',
        width: boxW,
        height: boxH,
      }
    }
  }

  // Fallback for custom strings
  const pretty = value.replace(/[_-]+/g, ' ').trim()
  return {
    value,
    label: pretty,
    subtitle: 'Custom',
    category: 'ratios',
    width: 16,
    height: 16,
  }
}

