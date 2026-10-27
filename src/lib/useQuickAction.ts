import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { MobileStudioView } from '../components/shell/StudioShell.tsx'
import type {
  HistoryItem,
  MediaAsset,
  ModelCategory,
  QuickAction,
} from './models/types.ts'

export interface PendingRestore {
  modelId: string
  input: Record<string, unknown>
}

interface UseQuickActionOptions {
  category: ModelCategory
  setCategory: Dispatch<SetStateAction<ModelCategory>>
  setModelId: Dispatch<SetStateAction<string | null>>
  setMobileView: Dispatch<SetStateAction<MobileStudioView>>
  setViewerTaskId: Dispatch<SetStateAction<string | null>>
  setFormError: Dispatch<SetStateAction<string | null>>
  setFormNotice: Dispatch<SetStateAction<string | null>>
  pendingRestoreRef: RefObject<PendingRestore | null>
}

/**
 * 履歴メディアからの Quick Action（延長・区間置換・アップスケール等）を
 * 対応ワークフローのフォーム復元として調停する。
 */
export function useQuickAction({
  category,
  setCategory,
  setModelId,
  setMobileView,
  setViewerTaskId,
  setFormError,
  setFormNotice,
  pendingRestoreRef,
}: UseQuickActionOptions) {
  function openWorkflow(
    targetCategory: ModelCategory,
    targetModelId: string,
    input: Record<string, unknown>,
    notice: string,
  ) {
    setMobileView('create')
    setViewerTaskId(null)
    pendingRestoreRef.current = { modelId: targetModelId, input }
    setFormError(null)
    setFormNotice(notice)
    if (category !== targetCategory) setCategory(targetCategory)
    setModelId(targetModelId)
  }

  function quickAction(
    item: HistoryItem,
    media: MediaAsset,
    action: QuickAction,
    options: Record<string, unknown> = {},
  ) {
    const url = media.url ?? media.streamUrl
    const audioId = media.providerAssetId ?? media.id
    const metadata = media.metadata ?? {}
    switch (action) {
      case 'suno-extend':
        openWorkflow('audio', 'suno/extend', {
          taskId: item.taskId,
          audioId,
          continueAt: Math.max(0, (media.duration ?? 1) - 1),
          prompt: '',
          style: typeof metadata.tags === 'string' ? metadata.tags : '',
          title: media.title ?? '',
          model: typeof metadata.modelName === 'string' ? metadata.modelName : 'V5',
        }, 'Original track imported. Please review details before submitting.')
        break
      case 'suno-replace-section':
        openWorkflow('audio', 'suno/replace-section', {
          taskId: item.taskId,
          audioId,
          infillStartS: options.infillStartS ?? 0,
          infillEndS: options.infillEndS ?? Math.min(12, media.duration ?? 12),
          prompt: '',
          tags: typeof metadata.tags === 'string' ? metadata.tags : '',
          title: media.title ?? 'Edited section',
          _duration: media.duration ?? 0,
        }, 'Selected section imported. Please enter replacement prompt before submitting.')
        break
      case 'suno-upload-extend':
        openWorkflow('audio', 'suno/upload-extend', {
          uploadUrl: url,
          continueAt: Math.max(0, (media.duration ?? 1) - 1),
          prompt: '',
        }, 'Audio track imported. Please check settings before submitting.')
        break
      case 'runway-aleph':
        openWorkflow('video', 'runway/aleph', { _parentTaskId: item.taskId, videoUrl: url, prompt: '' }, 'Source video imported. Please enter changes before submitting.')
        break
      case 'runway-extend':
        openWorkflow('video', 'runway/extend', {
          taskId: item.taskId,
          videoId: media.providerAssetId ?? '',
          prompt: '',
        }, 'Source video imported. Please check extension settings before submitting.')
        break
      case 'veo-extend':
        openWorkflow('video', 'veo/extend', { taskId: item.taskId, prompt: '' }, 'Source video imported. Please check extension settings before submitting.')
        break
      case 'veo-1080p':
        openWorkflow('video', 'veo/1080p', { taskId: item.taskId, index: 0 }, 'Source task imported. Please review and submit 1080p processing.')
        break
      case 'veo-4k':
        openWorkflow('video', 'veo/4k', { taskId: item.taskId, index: 0 }, 'Source task imported. Please review and submit 4K processing.')
        break
      case 'lip-sync':
        openWorkflow('video', 'market/volcengine-lip-sync', {
          video_url: url,
          audio_url: options.audioUrl,
        }, 'Video and audio imported. Please verify duration alignment before submitting.')
        break
      case 'market-upscale':
        if (media.kind === 'video') {
          openWorkflow('video', 'topaz/video-upscale', { video_url: url }, 'Source video imported. Please select upscale scale before submitting.')
        } else {
          openWorkflow('image', 'topaz/image-upscale', { image_url: url }, 'Source image imported. Please select upscale scale before submitting.')
        }
        break
      case 'market-edit':
        if (media.kind === 'video') {
          openWorkflow('video', 'wan/2-7-videoedit', { video_url: url, prompt: '' }, 'Source video imported. Please enter edit instructions before submitting.')
        } else {
          openWorkflow('image', 'google/nano-banana-edit', { image_urls: [url], prompt: '' }, 'Source image imported. Please enter edit instructions before submitting.')
        }
        break
      default: {
        const exhaustive: never = action
        return exhaustive
      }
    }
  }

  return quickAction
}
