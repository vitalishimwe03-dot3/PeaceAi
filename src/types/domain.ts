export type UserRole = 'user' | 'admin'
export type UserStatus = 'active' | 'suspended' | 'pending'
export type ConversationStatus = 'active' | 'archived'
export type SharePermission = 'view' | 'download'
export type RequestStatus = 'submitted' | 'reviewing' | 'quoted' | 'approved' | 'declined' | 'completed'
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing'
export type PaymentStatus = 'pending' | 'successful' | 'failed' | 'refunded' | 'cancelled'
export type KnowledgeStatus = 'queued' | 'processing' | 'ready' | 'failed'
export type AuditSeverity = 'info' | 'warning' | 'critical'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  status: UserStatus
  storage_quota_bytes: number
  created_at: string
  updated_at: string
}

export interface Plan {
  id: string
  slug: 'free' | 'pro' | 'business' | string
  name: string
  description: string
  price_rwf: number
  annual_price_rwf: number | null
  billing_period: 'month' | 'year'
  ai_messages_per_day: number
  ai_requests_per_minute: number
  premium_models: boolean
  storage_bytes: number
  proposal_limit_per_month: number
  features: string[]
  active: boolean
  sort_order: number
}

export interface Subscription {
  id: string
  user_id: string
  plan_id: string
  plan?: Plan
  status: SubscriptionStatus
  current_period_start: string
  current_period_end: string | null
  cancel_at_period_end: boolean
  created_at: string
}

export interface Payment {
  id: string
  user_id: string
  plan_id: string | null
  amount_rwf: number
  currency: string
  provider: string
  provider_reference: string | null
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  model: string | null
  status: ConversationStatus
  created_at: string
  updated_at: string
}

export interface Attachment {
  name: string
  type: string
  size: number
  text?: string
}

export interface Message {
  id: string
  conversation_id: string
  user_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  attachments: Attachment[]
  model?: string | null
  created_at: string
}

export interface AiUsage {
  id: string
  user_id: string
  conversation_id: string | null
  model: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  created_at: string
}

export interface AiModel {
  id: string
  provider: string
  model_id: string
  display_name: string
  description: string | null
  enabled: boolean
  is_premium: boolean
  sort_order: number
}

export interface Folder {
  id: string
  owner_id: string
  name: string
  parent_id: string | null
  created_at: string
}

export interface StoredFile {
  id: string
  owner_id: string
  folder_id: string | null
  name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  created_at: string
  updated_at: string
  shared_with_me?: boolean
  owner_name?: string
}

export interface FileShare {
  id: string
  file_id: string
  shared_with: string
  permission: SharePermission
  created_at: string
  expires_at: string | null
  file?: StoredFile
  shared_with_profile?: Profile
}

export interface ProjectProposal {
  id: string
  user_id: string
  title: string
  summary: string
  status: 'draft' | 'refined' | 'shared' | 'archived'
  spec: ProjectSpec
  created_at: string
  updated_at: string
}

export interface ProjectSpec {
  overview: string
  objectives: string[]
  targetUsers: string[]
  features: string[]
  technologies: string[]
  milestones: Array<{ name: string; duration: string; deliverables: string[] }>
  estimatedTimeline: string
  budgetAssumptions: string
  risks: string[]
  openQuestions: string[]
  starterStructure?: string
}

export interface ServiceCategory {
  id: string
  slug: string
  name: string
  description: string
}

export interface Service {
  id: string
  slug: string
  name: string
  category_id: string
  category?: ServiceCategory
  short_description: string
  description: string
  requirements: string
  deliverables: string[]
  technologies: string[]
  estimated_timeline: string
  price_from_rwf: number | null
  price_to_rwf: number | null
  quote_factors: string[]
  customer_responsibilities: string[]
  terms: string
  revision_policy: string
  active: boolean
  sort_order: number
}

export interface ServiceRequest {
  id: string
  user_id: string
  service_id: string
  service?: Service
  requirements: string
  budget_rwf: number | null
  preferred_deadline: string | null
  status: RequestStatus
  admin_notes: string | null
  profile?: Pick<Profile, 'full_name' | 'email'>
  created_at: string
  updated_at: string
}

export interface Quotation {
  id: string
  service_request_id: string
  amount_rwf: number
  currency: string
  status: QuotationStatus
  terms: string
  valid_until: string | null
  created_at: string
}

export interface KnowledgeDataset {
  id: string
  name: string
  description: string | null
  storage_path: string
  mime_type: string
  size_bytes: number
  status: KnowledgeStatus
  chunk_count: number
  error_message: string | null
  uploaded_by: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_email: string | null
  event_type: string
  severity: AuditSeverity
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export interface Connection {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined' | 'blocked'
  requester?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
  addressee?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
  created_at: string
}

export interface ChatThread {
  id: string
  title: string | null
  is_group: boolean
  created_by: string
  created_at: string
  participants?: Array<Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>>
  last_message?: string
  last_message_at?: string
}

export interface DirectMessage {
  id: string
  thread_id: string
  sender_id: string
  content: string
  attachment_file_id: string | null
  created_at: string
  sender?: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>
}

export interface UsageSummary {
  messagesToday: number
  messagesLimit: number
  requestsThisMinute: number
  requestsPerMinuteLimit: number
  tokensThisMonth: number
  proposalsThisMonth: number
  proposalsLimit: number
  storageUsed: number
  storageQuota: number
  planName: string
}

export interface SystemSetting {
  key: string
  value: unknown
  updated_at: string
}

export interface AdminUserRow extends Profile {
  plan_name?: string
  subscription_status?: SubscriptionStatus
  messages_today?: number
}

export interface AiReply {
  content: string
  model: string
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  sources?: Array<{ title: string; datasetId: string }>
  limitReached?: boolean
  resetAt?: string
  upgradePlan?: string
}

export interface FeatureStatus {
  configured: boolean
  label: string
  detail: string
}
