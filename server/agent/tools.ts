import { tool } from 'ai'
import { z } from 'zod'
import type { MediaTaskData } from './mediaTask.ts'
import { errorMessage, StudioAgentError } from './errors.ts'
import * as actions from './actions.ts'

export interface StudioToolHooks {
  onMediaTask?: (data: MediaTaskData) => void
}

export function createStudioTools(hooks: StudioToolHooks = {}) {
  return {
    'list-workflows': tool({
      description:
        'Get a list of available image/video/audio workflows (models). Filter by category (image/video/audio) or capability (e.g., lip-sync, upscale, tts). Always inspect candidate workflows before generating.',
      inputSchema: z.object({
        category: z.enum(['image', 'video', 'audio']).optional(),
        capability: z.string().optional(),
        q: z.string().optional(),
      }),
      execute: async (data) => {
        return actions.listWorkflows(data)
      },
    }),
    'get-workflow-schema': tool({
      description:
        'Get the input schema (required/optional parameters, types, enum options, defaults) for a workflow. Always call this before generate-media to avoid guessing parameter names.',
      inputSchema: z.object({ id: z.string() }),
      execute: async ({ id }) => {
        try {
          const schema = await actions.getWorkflowSchema(id)
          return {
            id: schema.id,
            model: schema.model,
            title: schema.title,
            category: schema.category,
            provider: schema.provider,
            operation: schema.operation ?? 'generate',
            useCase: schema.useCase ?? null,
            docsUrl: schema.docsUrl ?? null,
            fields: schema.fields.map((f) => ({
              name: f.name,
              type: f.type,
              label: f.label,
              required: f.required === true,
              ...(f.default !== undefined ? { default: f.default } : {}),
              ...(f.enum ? { enum: f.enum } : {}),
              ...(f.description ? { description: f.description } : {}),
              ...(f.accept ? { accept: f.accept } : {}),
              ...(f.maxLength ? { maxLength: f.maxLength } : {}),
              ...(f.min !== undefined ? { min: f.min } : {}),
              ...(f.max !== undefined ? { max: f.max } : {}),
            })),
          }
        } catch (error) {
          return `Workflow not found: ${errorMessage(error)}`
        }
      },
    }),
    'generate-media': tool({
      description:
        'Create an image/video/audio generation task. Requires workflowId and input. Before running, present the model name, key parameters, and estimated credit cost to the user to confirm. Pass the returned taskId / provider / operation to get-task-status (generation is asynchronous).',
      inputSchema: z.object({
        workflowId: z.string(),
        input: z.record(z.string(), z.unknown()),
        title: z.string().optional(),
      }),
      execute: async (data) => {
        try {
          const created = await actions.generateMedia({
            workflowId: data.workflowId,
            params: data.input,
            title: data.title,
          })
          hooks.onMediaTask?.({
            taskId: created.taskId,
            title: data.title ?? created.schema.title,
            workflowId: created.schema.id,
            status: 'submitted',
          })
          return {
            taskId: created.taskId,
            workflow: created.workflow,
            provider: created.schema.provider,
            operation: created.schema.operation ?? 'generate',
            note: created.note,
          }
        } catch (error) {
          return `Failed to start generation: ${errorMessage(error)}`
        }
      },
    }),
    'get-task-status': tool({
      description:
        'Check the status of a generation task. Returns result media URLs on success. Use provider/operation from the generate-media return value (filled from history if omitted).',
      inputSchema: z.object({
        taskId: z.string(),
        provider: z.string().optional(),
        operation: z.string().optional(),
      }),
      execute: async (data) => {
        try {
          const task = await actions.getTaskStatus(data)
          if (task.state === 'success' || task.state === 'partial') {
            hooks.onMediaTask?.({
              taskId: task.taskId,
              status: 'succeeded',
              resultUrls: task.resultUrls,
              media: task.media.map((m) => ({
                kind: m.kind,
                ...(m.url ? { url: m.url } : {}),
                ...(m.localPath ? { localPath: m.localPath } : {}),
              })),
            })
          } else if (task.state === 'fail') {
            hooks.onMediaTask?.({
              taskId: task.taskId,
              status: 'failed',
              error: task.failMsg ?? 'Unknown error',
            })
          }
          return {
            taskId: task.taskId,
            state: task.state,
            provider: task.provider,
            operation: task.operation,
            resultUrls: task.resultUrls,
            ...(task.failMsg ? { failMsg: task.failMsg } : {}),
            ...(task.creditsConsumed !== undefined
              ? { creditsConsumed: task.creditsConsumed }
              : {}),
          }
        } catch (error) {
          return `Failed to check task status: ${errorMessage(error)}`
        }
      },
    }),
    'search-history': tool({
      description: 'Search past generation history by task ID, model name, or prompt content.',
      inputSchema: z.object({
        q: z.string().optional(),
        category: z.enum(['image', 'video', 'audio']).optional(),
        limit: z.number().optional(),
      }),
      execute: async (data) => actions.searchHistory(data),
    }),
    'get-task-input': tool({
      description:
        'Retrieve input parameters of a past task. Used as a base for extension, regeneration, or parameter adjustment.',
      inputSchema: z.object({ taskId: z.string() }),
      execute: async ({ taskId }) => {
        try {
          return actions.getTaskInput(taskId)
        } catch (error) {
          return `Task not found: ${errorMessage(error)}`
        }
      },
    }),
    'get-credit-balance': tool({
      description: 'Check kie.ai credit balance. Useful before running high-cost generation tasks.',
      inputSchema: z.object({}),
      execute: async () => {
        try {
          return await actions.readCreditBalance()
        } catch (error) {
          return `Failed to check balance: ${errorMessage(error)}`
        }
      },
    }),
    'optimize-prompt': tool({
      description:
        'Optimize a prompt for a target model using Grok CLI. Suggest as a refinement step before generation.',
      inputSchema: z.object({
        prompt: z.string(),
        modelId: z.string().optional(),
      }),
      execute: async (data) => {
        try {
          return await actions.optimizePrompt(data)
        } catch (error) {
          if (error instanceof StudioAgentError && error.status === 503) {
            return error.message
          }
          return `Prompt optimization failed: ${errorMessage(error)}`
        }
      },
    }),
  }
}
