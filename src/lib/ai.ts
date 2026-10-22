import { isSupabaseConfigured } from './env'
import { invokeFunction } from './supabase'
import { saveMessage } from './repository'
import type { AiReply, Attachment, ProjectSpec } from '@/types/domain'

export class AiLimitError extends Error {
  resetAt?: string
  upgradePlan?: string

  constructor(message: string, resetAt?: string, upgradePlan?: string) {
    super(message)
    this.name = 'AiLimitError'
    this.resetAt = resetAt
    this.upgradePlan = upgradePlan
  }
}

interface SendAiOptions {
  userId: string
  conversationId: string
  message: string
  attachments?: Attachment[]
  model?: string
  mode?: 'chat' | 'proposal' | 'code-review' | 'security-review'
}

export async function sendAiMessage({
  userId,
  conversationId,
  message,
  attachments = [],
  model,
  mode = 'chat',
}: SendAiOptions): Promise<AiReply> {
  await saveMessage({
    conversation_id: conversationId,
    user_id: userId,
    role: 'user',
    content: message,
    attachments,
    model: model ?? null,
  })

  if (!isSupabaseConfigured) {
    const content = previewReply(message, mode)
    const assistant = await saveMessage({
      conversation_id: conversationId,
      user_id: userId,
      role: 'assistant',
      content,
      attachments: [],
      model: 'Preview — provider not connected',
    })
    return {
      content: assistant.content,
      model: 'Preview — provider not connected',
    }
  }

  try {
    const reply = await invokeFunction<AiReply>('ai-chat', {
      conversationId,
      message,
      attachments: attachments.map((attachment) => ({
        name: attachment.name,
        type: attachment.type,
        text: attachment.text?.slice(0, 20000),
      })),
      model,
      mode,
    })
    return reply
  } catch (error) {
    const err = error as Error & { resetAt?: string; upgradePlan?: string; status?: number }
    if (err.message.toLowerCase().includes('limit') || err.status === 429) {
      throw new AiLimitError(err.message, err.resetAt, err.upgradePlan)
    }
    throw err
  }
}

function previewReply(message: string, mode: string) {
  const modeLabel =
    mode === 'proposal'
      ? 'project proposal'
      : mode === 'code-review'
        ? 'code review'
        : mode === 'security-review'
          ? 'security review'
          : 'conversation'
  const excerpt = message.trim().slice(0, 220)
  return [
    '**AI provider not connected**',
    '',
    `PeaceAI received your ${modeLabel} request and the interface is working, but no language-model provider is configured for this local preview. A real AI response has not been generated.`,
    '',
    excerpt ? `> ${excerpt}${message.length > 220 ? '…' : ''}` : '',
    '',
    'To enable real responses:',
    '1. Create a Supabase project and apply the migrations in `supabase/migrations`.',
    '2. Deploy the `ai-chat` Edge Function.',
    '3. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` as Supabase Edge Function secrets.',
    '4. Reload the app with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` configured.',
    '',
    'Never place provider keys in a `VITE_` variable or browser code.',
  ].join('\n')
}

export async function generateProposal(input: {
  userId: string
  description: string
  objectives: string
  audience: string
  features: string
  technologies: string
  budget: string
  timeline: string
}): Promise<{ spec: ProjectSpec; title: string; summary: string; generatedByAi: boolean }> {
  const prompt = [
    'Create a structured software project proposal from the information below.',
    'Return ONLY valid JSON matching this shape:',
    '{"title":"...","summary":"...","overview":"...","objectives":["..."],"targetUsers":["..."],"features":["..."],"technologies":["..."],"milestones":[{"name":"...","duration":"...","deliverables":["..."]}],"estimatedTimeline":"...","budgetAssumptions":"...","risks":["..."],"openQuestions":["..."],"starterStructure":"..."}',
    'State assumptions explicitly. Do not claim the estimate is binding. Do not guarantee security or correctness.',
    '',
    `Project description: ${input.description}`,
    `Objectives: ${input.objectives || 'Not supplied'}`,
    `Target users: ${input.audience || 'Not supplied'}`,
    `Desired features: ${input.features || 'Not supplied'}`,
    `Preferred technologies: ${input.technologies || 'Not supplied'}`,
    `Budget: ${input.budget || 'Not supplied'}`,
    `Preferred timeline: ${input.timeline || 'Not supplied'}`,
  ].join('\n')

  if (!isSupabaseConfigured) {
    const title = titleFromDescription(input.description)
    const summary = input.description.trim().slice(0, 280)
    const spec: ProjectSpec = {
      overview: `${input.description.trim()}${input.objectives ? `\n\nPrimary objectives: ${input.objectives}` : ''}`,
      objectives: splitItems(input.objectives) || [
        'Validate the core problem with target users',
        'Deliver a focused first release',
        'Establish secure, maintainable foundations',
      ],
      targetUsers: splitItems(input.audience) || ['To be confirmed during discovery'],
      features: splitItems(input.features) || [
        'Authentication and user accounts',
        'Core workflow screens',
        'Administrator management',
        'Audit and activity history',
      ],
      technologies: splitItems(input.technologies) || ['React', 'TypeScript', 'Supabase PostgreSQL'],
      milestones: [
        {
          name: 'Discovery and requirements',
          duration: '1 week',
          deliverables: ['Confirmed scope', 'User stories', 'Data model'],
        },
        {
          name: 'Core implementation',
          duration: '3–5 weeks',
          deliverables: ['Application screens', 'Backend and access rules', 'Tests for critical flows'],
        },
        {
          name: 'Review and launch preparation',
          duration: '1 week',
          deliverables: ['Accessibility review', 'Deployment guide', 'Handover session'],
        },
      ],
      estimatedTimeline: input.timeline || 'Preliminary estimate: 5–7 weeks after scope confirmation',
      budgetAssumptions:
        input.budget ||
        'Preliminary planning assumption only. Pricing requires administrator review and an approved quotation.',
      risks: [
        'Scope can grow if requirements are not frozen for each milestone',
        'Third-party provider costs and availability are outside the initial estimate',
        'AI-assisted output requires human review and testing',
      ],
      openQuestions: [
        'This is a local preview template, not an AI-generated proposal. Configure the AI provider for a tailored plan.',
        'Who will approve requirements and acceptance criteria?',
        'Are there data-protection, localization, or integration requirements?',
      ],
      starterStructure: [
        'src/',
        '  components/',
        '  features/',
        '  lib/',
        '  pages/',
        '  types/',
        'supabase/',
        '  migrations/',
        '  functions/',
      ].join('\n'),
    }
    return { spec, title, summary, generatedByAi: false }
  }

  const reply = await invokeFunction<AiReply>('ai-chat', {
    mode: 'proposal',
    message: prompt,
    model: input.technologies ? undefined : undefined,
  })
  const parsed = parseJsonObject(reply.content)
  if (!parsed) {
    return {
      title: titleFromDescription(input.description),
      summary: input.description.trim().slice(0, 280),
      generatedByAi: true,
      spec: {
        overview: reply.content.slice(0, 1200),
        objectives: splitItems(input.objectives),
        targetUsers: splitItems(input.audience),
        features: splitItems(input.features),
        technologies: splitItems(input.technologies),
        milestones: [],
        estimatedTimeline: input.timeline || 'Requires review',
        budgetAssumptions: input.budget || 'Requires administrator review',
        risks: ['The response could not be fully structured. Review the raw proposal carefully.'],
        openQuestions: ['Confirm scope, acceptance criteria, and budget with the PeaceAI team.'],
        starterStructure: undefined,
      },
    }
  }

  return {
    title: String(parsed.title || titleFromDescription(input.description)),
    summary: String(parsed.summary || input.description.slice(0, 280)),
    generatedByAi: true,
    spec: {
      overview: String(parsed.overview || input.description),
      objectives: stringArray(parsed.objectives),
      targetUsers: stringArray(parsed.targetUsers),
      features: stringArray(parsed.features),
      technologies: stringArray(parsed.technologies),
      milestones: Array.isArray(parsed.milestones)
        ? parsed.milestones.map((milestone) => {
            const item = milestone as Record<string, unknown>
            return {
              name: String(item.name ?? 'Milestone'),
              duration: String(item.duration ?? 'To be confirmed'),
              deliverables: stringArray(item.deliverables),
            }
          })
        : [],
      estimatedTimeline: String(parsed.estimatedTimeline ?? input.timeline ?? 'Requires review'),
      budgetAssumptions: String(parsed.budgetAssumptions ?? input.budget ?? 'Requires review'),
      risks: stringArray(parsed.risks),
      openQuestions: stringArray(parsed.openQuestions),
      starterStructure: parsed.starterStructure ? String(parsed.starterStructure) : undefined,
    },
  }
}

function splitItems(value: string) {
  return value
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item)).filter(Boolean)
}

function titleFromDescription(description: string) {
  const first = description.trim().split(/[.\n]/)[0] ?? 'Software project'
  const words = first.split(/\s+/).slice(0, 8).join(' ')
  return words.length > 3 ? words : 'New software project'
}

function parseJsonObject(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced?.[1] ?? content
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}
