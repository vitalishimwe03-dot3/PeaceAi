import { DEFAULT_STORAGE_QUOTA_BYTES } from './env'
import { fallbackPlans, fallbackServices, serviceCategories } from './catalog'
import type {
  AuditLog,
  ChatThread,
  Conversation,
  Connection,
  DirectMessage,
  FileShare,
  Folder,
  KnowledgeDataset,
  Message,
  Payment,
  Plan,
  Profile,
  ProjectProposal,
  Service,
  ServiceRequest,
  StoredFile,
  Subscription,
} from '@/types/domain'

const KEY = 'peaceai.preview.v1'
const SESSION_KEY = 'peaceai.preview.session'
const BLOB_PREFIX = 'peaceai.preview.blob.'

interface PreviewState {
  profiles: Profile[]
  conversations: Conversation[]
  messages: Message[]
  folders: Folder[]
  files: StoredFile[]
  fileShares: FileShare[]
  proposals: ProjectProposal[]
  proposalShares: Array<{ id: string; proposal_id: string; shared_with: string; created_at: string }>
  serviceRequests: ServiceRequest[]
  plans: Plan[]
  services: Service[]
  subscriptions: Subscription[]
  payments: Payment[]
  datasets: KnowledgeDataset[]
  auditLogs: AuditLog[]
  connections: Connection[]
  threads: ChatThread[]
  directMessages: DirectMessage[]
  blockedUsers: Array<{ blocker_id: string; blocked_id: string; created_at: string }>
}

function now() {
  return new Date().toISOString()
}

export function id(prefix = 'id') {
  return `${prefix}-${crypto.randomUUID()}`
}

function userProfile(): Profile {
  return {
    id: 'preview-user',
    email: 'amina.rw@example.com',
    full_name: 'Amina Uwase',
    avatar_url: null,
    role: 'user',
    status: 'active',
    storage_quota_bytes: DEFAULT_STORAGE_QUOTA_BYTES,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 42).toISOString(),
    updated_at: now(),
  }
}

function adminProfile(): Profile {
  return {
    id: 'preview-admin',
    email: 'admin@peaceai.local',
    full_name: 'PeaceAI Administrator',
    avatar_url: null,
    role: 'admin',
    status: 'active',
    storage_quota_bytes: DEFAULT_STORAGE_QUOTA_BYTES,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(),
    updated_at: now(),
  }
}

function otherProfile(): Profile {
  return {
    id: 'preview-user-2',
    email: 'kevin.dev@example.com',
    full_name: 'Kevin Niyonsaba',
    avatar_url: null,
    role: 'user',
    status: 'active',
    storage_quota_bytes: DEFAULT_STORAGE_QUOTA_BYTES,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 20).toISOString(),
    updated_at: now(),
  }
}

function seed(): PreviewState {
  const profiles = [userProfile(), adminProfile(), otherProfile()]
  const nowIso = now()
  const conversation: Conversation = {
    id: 'preview-conversation-1',
    user_id: 'preview-user',
    title: 'Welcome to PeaceAI',
    model: 'PeaceAI Standard',
    status: 'active',
    created_at: nowIso,
    updated_at: nowIso,
  }
  const messages: Message[] = [
    {
      id: 'preview-message-1',
      conversation_id: conversation.id,
      user_id: 'preview-user',
      role: 'assistant',
      content:
        'Welcome to the PeaceAI workspace preview.\n\nI can help you plan software, explain code, review a security approach, or draft a project proposal. This local preview demonstrates the interface and data flows. **No AI provider is connected**, so requests will return a configuration notice instead of generated content.\n\nConnect Supabase and an AI provider to enable real conversations.',
      attachments: [],
      model: 'Preview',
      created_at: nowIso,
    },
  ]
  const folder: Folder = {
    id: 'preview-folder-projects',
    owner_id: 'preview-user',
    name: 'Projects',
    parent_id: null,
    created_at: nowIso,
  }
  const files: StoredFile[] = [
    {
      id: 'preview-file-1',
      owner_id: 'preview-user',
      folder_id: folder.id,
      name: 'welcome-to-peaceai.md',
      storage_path: 'preview-user/root/welcome-to-peaceai.md',
      mime_type: 'text/markdown',
      size_bytes: 612,
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]
  const thread: ChatThread = {
    id: 'preview-thread-1',
    title: null,
    is_group: false,
    created_by: 'preview-user',
    created_at: nowIso,
    participants: [profiles[0], profiles[2]],
    last_message: 'Happy to review the proposal when it is ready.',
    last_message_at: nowIso,
  }
  const directMessages: DirectMessage[] = [
    {
      id: 'preview-dm-1',
      thread_id: thread.id,
      sender_id: 'preview-user-2',
      content: 'Hi Amina — I saw your project proposal. Happy to review it when it is ready.',
      attachment_file_id: null,
      created_at: nowIso,
      sender: profiles[2],
    },
  ]
  const proposals: ProjectProposal[] = [
    {
      id: 'preview-proposal-1',
      user_id: 'preview-user',
      title: 'Community Skills Directory',
      summary:
        'A searchable directory that helps local organizations find verified trainers and volunteers.',
      status: 'draft',
      spec: {
        overview:
          'A web application for a district youth office to register trainers, maintain profiles, and search by skill, location, and availability.',
        objectives: [
          'Reduce time spent finding qualified trainers',
          'Keep verified profiles in one place',
          'Give organizations a clear way to request support',
        ],
        targetUsers: ['District program coordinators', 'Verified trainers', 'Partner organizations'],
        features: [
          'Email-based accounts',
          'Trainer profiles with approval workflow',
          'Search and filters',
          'Request and response tracking',
          'Administrator reporting',
        ],
        technologies: ['React', 'TypeScript', 'Supabase', 'PostgreSQL'],
        milestones: [
          { name: 'Discovery and data model', duration: '1 week', deliverables: ['Requirements', 'Schema'] },
          { name: 'Core application', duration: '3 weeks', deliverables: ['Profiles', 'Search', 'Admin review'] },
          { name: 'Testing and launch', duration: '1 week', deliverables: ['Tests', 'Deployment guide'] },
        ],
        estimatedTimeline: '5–6 weeks',
        budgetAssumptions: 'Assumes one web developer, existing branding, and no SMS integration.',
        risks: ['Incomplete trainer data', 'Unclear verification rules', 'Limited content-owner availability'],
        openQuestions: [
          'Who approves trainer verification?',
          'Are public profiles visible to unauthenticated visitors?',
          'Is French or Kinyarwanda localization required at launch?',
        ],
      },
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]
  const planFree = fallbackPlans[0]
  const subscription: Subscription = {
    id: 'preview-subscription-1',
    user_id: 'preview-user',
    plan_id: planFree.id,
    status: 'active',
    current_period_start: nowIso,
    current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    cancel_at_period_end: false,
    created_at: nowIso,
  }
  const auditLogs: AuditLog[] = [
    {
      id: 'preview-audit-1',
      actor_id: 'preview-admin',
      actor_email: 'admin@peaceai.local',
      event_type: 'admin.settings_updated',
      severity: 'info',
      target_type: 'system_settings',
      target_id: 'support_email',
      metadata: { note: 'Preview audit event' },
      created_at: nowIso,
    },
  ]
  const datasets: KnowledgeDataset[] = [
    {
      id: 'preview-dataset-1',
      name: 'PeaceAI Service Guide',
      description: 'Approved public service descriptions used for preview retrieval.',
      storage_path: 'knowledge/preview/service-guide.md',
      mime_type: 'text/markdown',
      size_bytes: 1840,
      status: 'ready',
      chunk_count: 4,
      error_message: null,
      uploaded_by: 'preview-admin',
      created_at: nowIso,
      updated_at: nowIso,
    },
  ]
  return {
    profiles,
    conversations: [conversation],
    messages,
    folders: [folder],
    files,
    fileShares: [],
    proposals,
    proposalShares: [],
    serviceRequests: [],
    plans: fallbackPlans,
    services: fallbackServices.map((service) => ({
      ...service,
      category: serviceCategories.find((category) => category.id === service.category_id),
    })),
    subscriptions: [subscription],
    payments: [],
    datasets,
    auditLogs,
    connections: [],
    threads: [thread],
    directMessages,
    blockedUsers: [],
  }
}

export function loadState(): PreviewState {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) {
      const state = seed()
      saveState(state)
      return state
    }
    const parsed = JSON.parse(raw) as Partial<PreviewState>
    return { ...seed(), ...parsed }
  } catch {
    return seed()
  }
}

export function saveState(state: PreviewState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // Preview storage is best-effort. The UI reports storage failures separately.
  }
}

export function mutateState<T>(mutator: (state: PreviewState) => T): T {
  const state = loadState()
  const result = mutator(state)
  saveState(state)
  return result
}

export function resetPreview() {
  localStorage.removeItem(KEY)
  localStorage.removeItem(SESSION_KEY)
  Object.keys(localStorage)
    .filter((key) => key.startsWith(BLOB_PREFIX))
    .forEach((key) => localStorage.removeItem(key))
}

export function getPreviewSession(): { userId: string; role: 'user' | 'admin' } | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setPreviewSession(role: 'user' | 'admin') {
  const userId = role === 'admin' ? 'preview-admin' : 'preview-user'
  localStorage.setItem(SESSION_KEY, JSON.stringify({ userId, role }))
  return loadState().profiles.find((profile) => profile.id === userId) ?? userProfile()
}

export function clearPreviewSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function getPreviewProfile(): Profile | null {
  const session = getPreviewSession()
  if (!session) return null
  return loadState().profiles.find((profile) => profile.id === session.userId) ?? null
}

export function storePreviewBlob(fileId: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    if (file.size > 3 * 1024 * 1024) {
      reject(new Error('Preview mode stores files up to 3 MB. Configure Supabase Storage for full uploads.'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      try {
        localStorage.setItem(`${BLOB_PREFIX}${fileId}`, String(reader.result))
        resolve()
      } catch {
        reject(new Error('This browser could not store the preview file. It may be out of local storage.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsDataURL(file)
  })
}

export function getPreviewBlob(fileId: string): string | null {
  return localStorage.getItem(`${BLOB_PREFIX}${fileId}`)
}

export function removePreviewBlob(fileId: string) {
  localStorage.removeItem(`${BLOB_PREFIX}${fileId}`)
}

export function getPreviewMessages(conversationId: string) {
  return loadState().messages.filter((message) => message.conversation_id === conversationId)
}
