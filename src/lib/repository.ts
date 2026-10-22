import { isSupabaseConfigured } from './env'
import { supabase } from './supabase'
import {
  clearPreviewSession,
  getPreviewBlob,
  getPreviewMessages,
  getPreviewProfile,
  getPreviewSession,
  id,
  loadState,
  mutateState,
  removePreviewBlob,
  setPreviewSession,
  storePreviewBlob,
} from './demo'
import { fallbackPlans, fallbackServices } from './catalog'
import { safeFileName } from './utils'
import type {
  AdminUserRow,
  AiModel,
  AuditLog,
  ChatThread,
  Connection,
  Conversation,
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
  SystemSetting,
  UsageSummary,
} from '@/types/domain'

const FILE_BUCKET = 'user-files'
const KNOWLEDGE_BUCKET = 'knowledge'
const GIB = 1024 * 1024 * 1024

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export const preview = {
  signIn(role: 'user' | 'admin') {
    return setPreviewSession(role)
  },
  signOut() {
    clearPreviewSession()
  },
  session() {
    return getPreviewSession()
  },
  profile() {
    return getPreviewProfile()
  },
}

export async function getProfile(userId: string): Promise<Profile | null> {
  if (!isSupabaseConfigured) {
    return loadState().profiles.find((profile) => profile.id === userId) ?? null
  }
  const { data, error } = await client()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data as Profile | null
}

export async function updateProfile(
  userId: string,
  patch: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>,
): Promise<Profile> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const profile = state.profiles.find((item) => item.id === userId)
      if (!profile) throw new Error('Profile not found.')
      Object.assign(profile, patch, { updated_at: new Date().toISOString() })
      return profile
    })
  }
  const { data, error } = await client()
    .from('profiles')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single()
  if (error) throw error
  return data as Profile
}

export async function listPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured) return loadState().plans.filter((plan) => plan.active)
  const { data, error } = await client()
    .from('plans')
    .select('*')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map(normalizePlan)
}

export async function listAllPlans(): Promise<Plan[]> {
  if (!isSupabaseConfigured) return loadState().plans
  const { data, error } = await client().from('plans').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []).map(normalizePlan)
}

function normalizePlan(plan: Record<string, unknown>): Plan {
  return {
    ...(plan as unknown as Plan),
    features: Array.isArray(plan.features) ? (plan.features as string[]) : [],
  }
}

export async function getSubscription(userId: string): Promise<Subscription | null> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const subscription = state.subscriptions.find(
      (item) => item.user_id === userId && item.status === 'active',
    )
    if (!subscription) return null
    return { ...subscription, plan: state.plans.find((plan) => plan.id === subscription.plan_id) }
  }
  const { data, error } = await client()
    .from('subscriptions')
    .select('*, plan:plans(*)')
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { ...(data as Subscription), plan: data.plan ? normalizePlan(data.plan) : undefined }
}

export async function getEffectivePlan(userId: string): Promise<Plan> {
  const subscription = await getSubscription(userId)
  if (subscription?.plan) return subscription.plan
  const plans = await listPlans()
  return plans.find((plan) => plan.slug === 'free') ?? fallbackPlans[0]
}

export async function listPayments(userId: string): Promise<Payment[]> {
  if (!isSupabaseConfigured) {
    return loadState().payments.filter((payment) => payment.user_id === userId)
  }
  const { data, error } = await client()
    .from('payments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Payment[]
}

export async function startCheckout(
  planId: string,
  period: 'month' | 'year',
): Promise<{ checkoutUrl: string }> {
  if (!isSupabaseConfigured) {
    throw new Error(
      'Payments are not configured in preview mode. Configure Supabase and the Flutterwave merchant account before accepting payments.',
    )
  }
  const { data, error } = await client().functions.invoke('create-payment', {
    body: { planId, period },
  })
  if (error) throw new Error(error.message || 'Could not start checkout.')
  const checkoutUrl = (data as { checkout_url?: string } | null)?.checkout_url
  if (!checkoutUrl) throw new Error('The payment provider did not return a checkout URL.')
  return { checkoutUrl }
}

export async function setSubscriptionCancellation(
  userId: string,
  cancelAtPeriodEnd: boolean,
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const subscription = state.subscriptions.find(
        (item) => item.user_id === userId && item.status === 'active',
      )
      if (subscription) subscription.cancel_at_period_end = cancelAtPeriodEnd
    })
    return
  }
  const { error } = await client()
    .from('subscriptions')
    .update({ cancel_at_period_end: cancelAtPeriodEnd })
    .eq('user_id', userId)
    .in('status', ['active', 'trialing', 'past_due'])
  if (error) throw error
}

export async function getUsageSummary(userId: string): Promise<UsageSummary> {
  const plan = await getEffectivePlan(userId)
  if (!isSupabaseConfigured) {
    const state = loadState()
    const today = startOfToday()
    const messagesToday = state.messages.filter(
      (message) => message.user_id === userId && message.role === 'user' && message.created_at >= today,
    ).length
    const proposalsThisMonth = state.proposals.filter(
      (proposal) => proposal.user_id === userId && proposal.created_at.slice(0, 7) === new Date().toISOString().slice(0, 7),
    ).length
    const quota =
      state.profiles.find((profile) => profile.id === userId)?.storage_quota_bytes ?? plan.storage_bytes
    return {
      messagesToday,
      messagesLimit: plan.ai_messages_per_day,
      requestsThisMinute: 0,
      requestsPerMinuteLimit: plan.ai_requests_per_minute,
      tokensThisMonth: state.messages
        .filter((message) => message.user_id === userId && message.role === 'assistant')
        .reduce((sum, message) => sum + Math.ceil(message.content.length / 4), 0),
      proposalsThisMonth,
      proposalsLimit: plan.proposal_limit_per_month,
      storageUsed: state.files.filter((file) => file.owner_id === userId).reduce((sum, file) => sum + file.size_bytes, 0),
      storageQuota: quota,
      planName: plan.name,
    }
  }
  const [usageResult, storageResult, proposalResult] = await Promise.all([
    client()
      .from('ai_usage')
      .select('total_tokens, created_at')
      .eq('user_id', userId)
      .gte('created_at', startOfToday()),
    client().from('files').select('size_bytes').eq('owner_id', userId),
    client()
      .from('project_proposals')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
  ])
  if (usageResult.error) throw usageResult.error
  if (storageResult.error) throw storageResult.error
  if (proposalResult.error) throw proposalResult.error
  const { count: messagesToday, error: messageCountError } = await client()
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', startOfToday())
  if (messageCountError) throw messageCountError
  const storageUsed = (storageResult.data ?? []).reduce(
    (sum, row) => sum + Number(row.size_bytes ?? 0),
    0,
  )
  return {
    messagesToday: messagesToday ?? 0,
    messagesLimit: plan.ai_messages_per_day,
    requestsThisMinute: 0,
    requestsPerMinuteLimit: plan.ai_requests_per_minute,
    tokensThisMonth: (usageResult.data ?? []).reduce(
      (sum, row) => sum + Number(row.total_tokens ?? 0),
      0,
    ),
    proposalsThisMonth: proposalResult.count ?? 0,
    proposalsLimit: plan.proposal_limit_per_month,
    storageUsed,
    storageQuota: (await getProfile(userId))?.storage_quota_bytes ?? plan.storage_bytes,
    planName: plan.name,
  }
}

export interface DailyUsage {
  date: string
  requests: number
  tokens: number
}

export async function getUsageHistory(userId: string, days = 14): Promise<DailyUsage[]> {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - (days - 1))
  const result = new Map<string, DailyUsage>()
  for (let index = 0; index < days; index += 1) {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    const key = date.toISOString().slice(0, 10)
    result.set(key, { date: key, requests: 0, tokens: 0 })
  }

  if (!isSupabaseConfigured) {
    for (const message of loadState().messages) {
      if (message.user_id !== userId || message.created_at < start.toISOString()) continue
      const key = message.created_at.slice(0, 10)
      const row = result.get(key)
      if (!row) continue
      row.requests += message.role === 'user' ? 1 : 0
      row.tokens += Math.ceil(message.content.length / 4)
    }
    return Array.from(result.values())
  }

  const { data, error } = await client()
    .from('ai_usage')
    .select('created_at, total_tokens')
    .eq('user_id', userId)
    .gte('created_at', start.toISOString())
  if (error) throw error
  for (const row of data ?? []) {
    const key = String(row.created_at).slice(0, 10)
    const entry = result.get(key)
    if (!entry) continue
    entry.requests += 1
    entry.tokens += Number(row.total_tokens ?? 0)
  }
  return Array.from(result.values())
}

export async function listConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured) {
    return loadState()
      .conversations.filter((conversation) => conversation.user_id === userId)
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  const { data, error } = await client()
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Conversation[]
}

export async function createConversation(
  userId: string,
  title = 'New conversation',
  model: string | null = null,
): Promise<Conversation> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const conversation: Conversation = {
        id: id('conversation'),
        user_id: userId,
        title,
        model,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.conversations.unshift(conversation)
      return conversation
    })
  }
  const { data, error } = await client()
    .from('conversations')
    .insert({ user_id: userId, title, model })
    .select()
    .single()
  if (error) throw error
  return data as Conversation
}

export async function updateConversation(
  conversationId: string,
  patch: Partial<Pick<Conversation, 'title' | 'status' | 'model'>>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const conversation = state.conversations.find((item) => item.id === conversationId)
      if (conversation) Object.assign(conversation, patch, { updated_at: new Date().toISOString() })
    })
    return
  }
  const { error } = await client()
    .from('conversations')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', conversationId)
  if (error) throw error
}

export async function deleteConversation(conversationId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.conversations = state.conversations.filter((item) => item.id !== conversationId)
      state.messages = state.messages.filter((item) => item.conversation_id !== conversationId)
    })
    return
  }
  const { error } = await client().from('conversations').delete().eq('id', conversationId)
  if (error) throw error
}

export async function listMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured) {
    return getPreviewMessages(conversationId).sort((a, b) => a.created_at.localeCompare(b.created_at))
  }
  const { data, error } = await client()
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at')
  if (error) throw error
  return (data ?? []).map((message) => ({
    ...(message as Message),
    attachments: Array.isArray(message.attachments) ? message.attachments : [],
  }))
}

export async function saveMessage(
  message: Omit<Message, 'id' | 'created_at'>,
): Promise<Message> {
  const row = {
    ...message,
    id: id('message'),
    created_at: new Date().toISOString(),
  }
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.messages.push(row)
      const conversation = state.conversations.find((item) => item.id === row.conversation_id)
      if (conversation) conversation.updated_at = row.created_at
    })
    return row
  }
  const { data, error } = await client()
    .from('messages')
    .insert({
      conversation_id: message.conversation_id,
      user_id: message.user_id,
      role: message.role,
      content: message.content,
      attachments: message.attachments,
      model: message.model,
    })
    .select()
    .single()
  if (error) throw error
  return data as Message
}

export async function listFolders(userId: string): Promise<Folder[]> {
  if (!isSupabaseConfigured) {
    return loadState().folders.filter((folder) => folder.owner_id === userId)
  }
  const { data, error } = await client()
    .from('folders')
    .select('*')
    .eq('owner_id', userId)
    .order('name')
  if (error) throw error
  return (data ?? []) as Folder[]
}

export async function createFolder(userId: string, name: string): Promise<Folder> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const folder: Folder = {
        id: id('folder'),
        owner_id: userId,
        name,
        parent_id: null,
        created_at: new Date().toISOString(),
      }
      state.folders.push(folder)
      return folder
    })
  }
  const { data, error } = await client()
    .from('folders')
    .insert({ owner_id: userId, name })
    .select()
    .single()
  if (error) throw error
  return data as Folder
}

export async function deleteFolder(folderId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.folders = state.folders.filter((folder) => folder.id !== folderId)
      state.files = state.files.filter((file) => file.folder_id !== folderId)
    })
    return
  }
  const { error } = await client().from('folders').delete().eq('id', folderId)
  if (error) throw error
}

export async function listFiles(userId: string): Promise<StoredFile[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const own = state.files.filter((file) => file.owner_id === userId)
    const shared = state.fileShares
      .filter((share) => share.shared_with === userId)
      .map((share) => {
        const file = state.files.find((item) => item.id === share.file_id)
        return file
          ? { ...file, shared_with_me: true, owner_name: state.profiles.find((p) => p.id === file.owner_id)?.full_name ?? undefined }
          : null
      })
      .filter(Boolean) as StoredFile[]
    return [...own, ...shared].sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const [own, shared] = await Promise.all([
    client().from('files').select('*').eq('owner_id', userId).order('created_at', { ascending: false }),
    client()
      .from('file_shares')
      .select('file:files(*, owner:profiles!files_owner_id_fkey(full_name))')
      .eq('shared_with', userId),
  ])
  if (own.error) throw own.error
  if (shared.error) throw shared.error
  const sharedFiles = (shared.data ?? [])
    .flatMap((row) => {
      const file = (row as unknown as { file?: StoredFile & { owner?: { full_name: string } } }).file
      return file
        ? [{ ...file, shared_with_me: true, owner_name: file.owner?.full_name ?? undefined }]
        : []
    })
  return [...((own.data ?? []) as StoredFile[]), ...sharedFiles]
}

const ALLOWED_FILE_TYPES = [
  'text/',
  'application/json',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'application/msword',
  'application/vnd.openxmlformats-officedocument',
]
const MAX_FILE_SIZE = 50 * 1024 * 1024

export function validateUpload(file: File) {
  if (file.size <= 0) throw new Error('The selected file is empty.')
  if (file.size > MAX_FILE_SIZE) throw new Error('Files must be 50 MB or smaller.')
  if (!ALLOWED_FILE_TYPES.some((type) => file.type.startsWith(type)) && file.type !== '') {
    throw new Error('This file type is not allowed. Upload source, text, JSON, CSV, PDF, ZIP, or images.')
  }
}

export async function uploadFile(
  userId: string,
  file: File,
  folderId: string | null,
): Promise<StoredFile> {
  validateUpload(file)
  const safeName = safeFileName(file.name) || 'upload'
  if (!isSupabaseConfigured) {
    const fileId = id('file')
    await storePreviewBlob(fileId, file)
    return mutateState((state) => {
      const profile = state.profiles.find((item) => item.id === userId)
      const used = state.files
        .filter((item) => item.owner_id === userId)
        .reduce((sum, item) => sum + item.size_bytes, 0)
      const quota = profile?.storage_quota_bytes ?? 6 * GIB
      if (used + file.size > quota) throw new Error('Storage quota exceeded. Delete files or upgrade your plan.')
      const record: StoredFile = {
        id: fileId,
        owner_id: userId,
        folder_id: folderId,
        name: file.name,
        storage_path: `${userId}/${folderId ?? 'root'}/${safeName}`,
        mime_type: file.type || 'application/octet-stream',
        size_bytes: file.size,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.files.unshift(record)
      return record
    })
  }

  const profile = await getProfile(userId)
  const { data: usageRows, error: usageError } = await client()
    .from('files')
    .select('size_bytes')
    .eq('owner_id', userId)
  if (usageError) throw usageError
  const used = (usageRows ?? []).reduce((sum, row) => sum + Number(row.size_bytes), 0)
  if (used + file.size > (profile?.storage_quota_bytes ?? 6 * GIB)) {
    throw new Error('Storage quota exceeded. Delete files or upgrade your plan.')
  }

  const path = `${userId}/${folderId ?? 'root'}/${crypto.randomUUID()}-${safeName}`
  const { error: uploadError } = await client()
    .storage.from(FILE_BUCKET)
    .upload(path, file, { cacheControl: '3600', contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { data, error } = await client()
    .from('files')
    .insert({
      owner_id: userId,
      folder_id: folderId,
      name: file.name,
      storage_path: path,
      mime_type: file.type || 'application/octet-stream',
      size_bytes: file.size,
    })
    .select()
    .single()
  if (error) {
    await client().storage.from(FILE_BUCKET).remove([path])
    throw error
  }
  return data as StoredFile
}

export async function getFileDownloadUrl(file: StoredFile): Promise<string> {
  if (!isSupabaseConfigured) {
    const blob = getPreviewBlob(file.id)
    if (!blob) throw new Error('Preview file content is not available in this browser.')
    return blob
  }
  const { data, error } = await client().storage.from(FILE_BUCKET).createSignedUrl(file.storage_path, 60)
  if (error) throw error
  return data.signedUrl
}

export async function downloadFile(file: StoredFile, content?: string) {
  if (!isSupabaseConfigured && content !== undefined) {
    const blob = new Blob([content], { type: file.mime_type || 'text/plain' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    URL.revokeObjectURL(url)
    return
  }
  const url = await getFileDownloadUrl(file)
  if (url.startsWith('data:')) {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = file.name
    anchor.click()
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}

export async function deleteFile(file: StoredFile): Promise<void> {
  if (!isSupabaseConfigured) {
    removePreviewBlob(file.id)
    mutateState((state) => {
      state.files = state.files.filter((item) => item.id !== file.id)
      state.fileShares = state.fileShares.filter((share) => share.file_id !== file.id)
    })
    return
  }
  const { error: storageError } = await client().storage.from(FILE_BUCKET).remove([file.storage_path])
  if (storageError) throw storageError
  const { error } = await client().from('files').delete().eq('id', file.id)
  if (error) throw error
}

export async function renameFile(fileId: string, name: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const file = state.files.find((item) => item.id === fileId)
      if (file) {
        file.name = name
        file.updated_at = new Date().toISOString()
      }
    })
    return
  }
  const { error } = await client()
    .from('files')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', fileId)
  if (error) throw error
}

export async function listFileShares(fileId: string): Promise<FileShare[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.fileShares
      .filter((share) => share.file_id === fileId)
      .map((share) => ({
        ...share,
        shared_with_profile: state.profiles.find((profile) => profile.id === share.shared_with),
      }))
  }
  const { data, error } = await client()
    .from('file_shares')
    .select('*, shared_with_profile:profiles!file_shares_shared_with_fkey(*)')
    .eq('file_id', fileId)
  if (error) throw error
  return (data ?? []) as FileShare[]
}

export async function shareFile(
  fileId: string,
  ownerId: string,
  email: string,
): Promise<FileShare> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const recipient = state.profiles.find(
      (profile) => profile.email.toLowerCase() === email.trim().toLowerCase(),
    )
    if (!recipient) throw new Error('No PeaceAI account was found with that email.')
    if (recipient.id === ownerId) throw new Error('You already own this file.')
    return mutateState((current) => {
      const existing = current.fileShares.find(
        (share) => share.file_id === fileId && share.shared_with === recipient.id,
      )
      if (existing) return existing
      const share: FileShare = {
        id: id('share'),
        file_id: fileId,
        shared_with: recipient.id,
        permission: 'download',
        created_at: new Date().toISOString(),
        expires_at: null,
      }
      current.fileShares.push(share)
      return share
    })
  }
  const { data: profile, error: profileError } = await client()
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('No PeaceAI account was found with that email.')
  if (profile.id === ownerId) throw new Error('You already own this file.')
  const { data, error } = await client()
    .from('file_shares')
    .upsert(
      { file_id: fileId, shared_with: profile.id, created_by: ownerId, permission: 'download' },
      { onConflict: 'file_id,shared_with' },
    )
    .select()
    .single()
  if (error) throw error
  return data as FileShare
}

export async function revokeFileShare(shareId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.fileShares = state.fileShares.filter((share) => share.id !== shareId)
    })
    return
  }
  const { error } = await client().from('file_shares').delete().eq('id', shareId)
  if (error) throw error
}

export async function listProposals(userId: string): Promise<ProjectProposal[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const sharedIds = new Set(
      state.proposalShares.filter((share) => share.shared_with === userId).map((share) => share.proposal_id),
    )
    return state.proposals
      .filter((proposal) => proposal.user_id === userId || sharedIds.has(proposal.id))
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
  }
  const [own, shares] = await Promise.all([
    client().from('project_proposals').select('*').eq('user_id', userId).order('updated_at', { ascending: false }),
    client()
      .from('project_proposal_shares')
      .select('proposal:project_proposals(*)')
      .eq('shared_with', userId),
  ])
  if (own.error) throw own.error
  if (shares.error) throw shares.error
  const shared = (shares.data ?? [])
    .map((row) => (row as unknown as { proposal: ProjectProposal | null }).proposal)
    .filter((proposal): proposal is ProjectProposal => Boolean(proposal))
  const all = [...((own.data ?? []) as ProjectProposal[]), ...shared]
  return all.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
}

export async function saveProposal(
  userId: string,
  proposal: Omit<ProjectProposal, 'id' | 'user_id' | 'created_at' | 'updated_at'> & { id?: string },
): Promise<ProjectProposal> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const existing = proposal.id ? state.proposals.find((item) => item.id === proposal.id) : null
      if (existing) {
        Object.assign(existing, proposal, { updated_at: new Date().toISOString() })
        return existing
      }
      const record: ProjectProposal = {
        ...proposal,
        id: id('proposal'),
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.proposals.unshift(record)
      return record
    })
  }
  const payload = {
    user_id: userId,
    title: proposal.title,
    summary: proposal.summary,
    status: proposal.status,
    spec: proposal.spec,
    updated_at: new Date().toISOString(),
  }
  const query = proposal.id
    ? client().from('project_proposals').update(payload).eq('id', proposal.id)
    : client().from('project_proposals').insert(payload)
  const { data, error } = await query.select().single()
  if (error) throw error
  return data as ProjectProposal
}

export async function deleteProposal(proposalId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.proposals = state.proposals.filter((proposal) => proposal.id !== proposalId)
    })
    return
  }
  const { error } = await client().from('project_proposals').delete().eq('id', proposalId)
  if (error) throw error
}

export async function listProposalShares(proposalId: string) {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.proposalShares
      .filter((share) => share.proposal_id === proposalId)
      .map((share) => ({
        ...share,
        profile: state.profiles.find((profile) => profile.id === share.shared_with),
      }))
  }
  const { data, error } = await client()
    .from('project_proposal_shares')
    .select('*, profile:profiles!project_proposal_shares_shared_with_fkey(*)')
    .eq('proposal_id', proposalId)
  if (error) throw error
  return data ?? []
}

export async function shareProposal(proposalId: string, ownerId: string, email: string) {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const recipient = state.profiles.find((profile) => profile.email.toLowerCase() === email.trim().toLowerCase())
    if (!recipient) throw new Error('No PeaceAI account was found with that email.')
    if (recipient.id === ownerId) throw new Error('You already own this proposal.')
    return mutateState((current) => {
      const existing = current.proposalShares.find(
        (share) => share.proposal_id === proposalId && share.shared_with === recipient.id,
      )
      if (existing) return existing
      const share = {
        id: id('proposal-share'),
        proposal_id: proposalId,
        shared_with: recipient.id,
        created_at: new Date().toISOString(),
      }
      current.proposalShares.push(share)
      return share
    })
  }
  const { data: profile, error: profileError } = await client()
    .from('profiles')
    .select('id')
    .ilike('email', email.trim())
    .maybeSingle()
  if (profileError) throw profileError
  if (!profile) throw new Error('No PeaceAI account was found with that email.')
  if (profile.id === ownerId) throw new Error('You already own this proposal.')
  const { data, error } = await client()
    .from('project_proposal_shares')
    .upsert(
      { proposal_id: proposalId, shared_with: profile.id, created_by: ownerId },
      { onConflict: 'proposal_id,shared_with' },
    )
    .select()
    .single()
  if (error) throw error
  return data
}

export async function revokeProposalShare(shareId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.proposalShares = state.proposalShares.filter((share) => share.id !== shareId)
    })
    return
  }
  const { error } = await client().from('project_proposal_shares').delete().eq('id', shareId)
  if (error) throw error
}

export async function listServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) {
    return loadState().services.filter((service) => service.active)
  }
  const { data, error } = await client()
    .from('services')
    .select('*, category:service_categories(*)')
    .eq('active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as Service[]
}

export async function listAllServices(): Promise<Service[]> {
  if (!isSupabaseConfigured) return loadState().services
  const { data, error } = await client()
    .from('services')
    .select('*, category:service_categories(*)')
    .order('sort_order')
  if (error) throw error
  return (data ?? []) as Service[]
}

export async function getService(slug: string): Promise<Service | null> {
  if (!isSupabaseConfigured) {
    return loadState().services.find((service) => service.slug === slug) ?? null
  }
  const { data, error } = await client()
    .from('services')
    .select('*, category:service_categories(*)')
    .eq('slug', slug)
    .eq('active', true)
    .maybeSingle()
  if (error) throw error
  return data as Service | null
}

export async function listServiceRequests(userId: string): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.serviceRequests
      .filter((request) => request.user_id === userId)
      .map((request) => ({
        ...request,
        service: state.services.find((service) => service.id === request.service_id),
      }))
  }
  const { data, error } = await client()
    .from('service_requests')
    .select('*, service:services(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ServiceRequest[]
}

export async function createServiceRequest(
  userId: string,
  request: {
    serviceId: string
    requirements: string
    budget: number | null
    deadline: string | null
  },
): Promise<ServiceRequest> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const record: ServiceRequest = {
        id: id('request'),
        user_id: userId,
        service_id: request.serviceId,
        service: state.services.find((service) => service.id === request.serviceId),
        requirements: request.requirements,
        budget_rwf: request.budget,
        preferred_deadline: request.deadline,
        status: 'submitted',
        admin_notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.serviceRequests.unshift(record)
      return record
    })
  }
  const { data, error } = await client()
    .from('service_requests')
    .insert({
      user_id: userId,
      service_id: request.serviceId,
      requirements: request.requirements,
      budget_rwf: request.budget,
      preferred_deadline: request.deadline,
    })
    .select()
    .single()
  if (error) throw error
  return data as ServiceRequest
}

export async function searchProfiles(query: string, excludeId: string): Promise<Profile[]> {
  if (!isSupabaseConfigured) {
    const lower = query.toLowerCase()
    return loadState().profiles.filter(
      (profile) =>
        profile.id !== excludeId &&
        (profile.full_name?.toLowerCase().includes(lower) ||
          profile.email.toLowerCase().includes(lower)),
    )
  }
  const { data, error } = await client()
    .from('profiles')
    .select('id, email, full_name, avatar_url, role, status, storage_quota_bytes, created_at, updated_at')
    .neq('id', excludeId)
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10)
  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function listConnections(userId: string): Promise<Connection[]> {
  if (!isSupabaseConfigured) return loadState().connections.filter(
    (connection) => connection.requester_id === userId || connection.addressee_id === userId,
  )
  const { data, error } = await client()
    .from('connections')
    .select('*, requester:profiles!connections_requester_id_fkey(id,full_name,email,avatar_url), addressee:profiles!connections_addressee_id_fkey(id,full_name,email,avatar_url)')
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as Connection[]
}

export async function sendConnectionRequest(userId: string, addresseeId: string): Promise<Connection> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const existing = state.connections.find(
        (connection) =>
          (connection.requester_id === userId && connection.addressee_id === addresseeId) ||
          (connection.requester_id === addresseeId && connection.addressee_id === userId),
      )
      if (existing) return existing
      const record: Connection = {
        id: id('connection'),
        requester_id: userId,
        addressee_id: addresseeId,
        status: 'pending',
        created_at: new Date().toISOString(),
      }
      state.connections.push(record)
      return record
    })
  }
  const { data, error } = await client()
    .from('connections')
    .insert({ requester_id: userId, addressee_id: addresseeId })
    .select()
    .single()
  if (error) throw error
  return data as Connection
}

export async function respondToConnection(
  connectionId: string,
  status: 'accepted' | 'declined',
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const connection = state.connections.find((item) => item.id === connectionId)
      if (connection) connection.status = status
    })
    return
  }
  const { error } = await client().from('connections').update({ status }).eq('id', connectionId)
  if (error) throw error
}

export async function blockUser(userId: string, blockedId: string): Promise<void> {
  if (userId === blockedId) throw new Error('You cannot block yourself.')
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      if (!state.blockedUsers.some((row) => row.blocker_id === userId && row.blocked_id === blockedId)) {
        state.blockedUsers.push({ blocker_id: userId, blocked_id: blockedId, created_at: new Date().toISOString() })
      }
    })
    return
  }
  const { error } = await client()
    .from('user_blocks')
    .upsert({ blocker_id: userId, blocked_id: blockedId }, { onConflict: 'blocker_id,blocked_id' })
  if (error) throw error
}

export async function listBlockedUsers(userId: string): Promise<string[]> {
  if (!isSupabaseConfigured) {
    return loadState().blockedUsers.filter((row) => row.blocker_id === userId).map((row) => row.blocked_id)
  }
  const { data, error } = await client().from('user_blocks').select('blocked_id').eq('blocker_id', userId)
  if (error) throw error
  return (data ?? []).map((row) => row.blocked_id)
}

export async function listBlockedProfiles(userId: string): Promise<Array<Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>>> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.blockedUsers
      .filter((row) => row.blocker_id === userId)
      .map((row) => {
        const profile = state.profiles.find((item) => item.id === row.blocked_id)
        return profile
          ? { id: profile.id, full_name: profile.full_name, email: profile.email, avatar_url: profile.avatar_url }
          : { id: row.blocked_id, full_name: null, email: 'Blocked user', avatar_url: null }
      })
  }
  const { data, error } = await client()
    .from('user_blocks')
    .select('blocked:profiles!user_blocks_blocked_id_fkey(id,full_name,email,avatar_url)')
    .eq('blocker_id', userId)
  if (error) throw error
  return (data ?? [])
    .map((row) => (row as unknown as { blocked: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> | null }).blocked)
    .filter((row): row is Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'> => Boolean(row))
}

export async function unblockUser(userId: string, blockedId: string): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.blockedUsers = state.blockedUsers.filter(
        (row) => !(row.blocker_id === userId && row.blocked_id === blockedId),
      )
    })
    return
  }
  const { error } = await client()
    .from('user_blocks')
    .delete()
    .eq('blocker_id', userId)
    .eq('blocked_id', blockedId)
  if (error) throw error
}

export async function listThreads(userId: string): Promise<ChatThread[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    const blocked = new Set(state.blockedUsers.filter((row) => row.blocker_id === userId).map((row) => row.blocked_id))
    return state.threads
      .filter(
        (thread) =>
          thread.participants?.some((participant) => participant.id === userId) &&
          !thread.participants?.some((participant) => participant.id !== userId && blocked.has(participant.id)),
      )
      .map((thread) => {
        const messages = state.directMessages.filter((message) => message.thread_id === thread.id)
        const last = messages[messages.length - 1]
        return { ...thread, last_message: last?.content, last_message_at: last?.created_at }
      })
  }
  const { data: memberships, error } = await client()
    .from('chat_participants')
    .select('thread_id, thread:chat_threads(*, participants:chat_participants(user:profiles!chat_participants_user_id_fkey(id,full_name,email,avatar_url)))')
    .eq('user_id', userId)
  if (error) throw error
  return (memberships ?? []).map((row) => {
    const record = row as unknown as {
      thread: Omit<ChatThread, 'participants'> & {
        participants?: Array<{ user: NonNullable<ChatThread['participants']>[number] }>
      }
    }
    return {
      ...record.thread,
      participants: (record.thread.participants ?? []).map((p) => p.user),
    }
  })
}

export async function getOrCreateThread(userId: string, otherUserId: string): Promise<ChatThread> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const existing = state.threads.find(
        (thread) =>
          !thread.is_group &&
          thread.participants?.some((p) => p.id === userId) &&
          thread.participants?.some((p) => p.id === otherUserId),
      )
      if (existing) return existing
      const thread: ChatThread = {
        id: id('thread'),
        title: null,
        is_group: false,
        created_by: userId,
        created_at: new Date().toISOString(),
        participants: state.profiles.filter((p) => p.id === userId || p.id === otherUserId),
      }
      state.threads.push(thread)
      return thread
    })
  }
  const { data, error } = await client().rpc('get_or_create_direct_thread', {
    p_other_user: otherUserId,
  })
  if (error) throw error
  return data as ChatThread
}

export async function listDirectMessages(threadId: string): Promise<DirectMessage[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.directMessages
      .filter((message) => message.thread_id === threadId)
      .map((message) => ({
        ...message,
        sender: state.profiles.find((profile) => profile.id === message.sender_id),
      }))
  }
  const { data, error } = await client()
    .from('direct_messages')
    .select('*, sender:profiles!direct_messages_sender_id_fkey(id,full_name,email,avatar_url)')
    .eq('thread_id', threadId)
    .order('created_at')
  if (error) throw error
  return (data ?? []) as DirectMessage[]
}

export async function sendDirectMessage(
  threadId: string,
  senderId: string,
  content: string,
): Promise<DirectMessage> {
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const record: DirectMessage = {
        id: id('dm'),
        thread_id: threadId,
        sender_id: senderId,
        content,
        attachment_file_id: null,
        created_at: new Date().toISOString(),
        sender: state.profiles.find((profile) => profile.id === senderId),
      }
      state.directMessages.push(record)
      return record
    })
  }
  const { data, error } = await client()
    .from('direct_messages')
    .insert({ thread_id: threadId, sender_id: senderId, content })
    .select()
    .single()
  if (error) throw error
  return data as DirectMessage
}

export async function listKnowledgeDatasets(): Promise<KnowledgeDataset[]> {
  if (!isSupabaseConfigured) return loadState().datasets
  const { data, error } = await client()
    .from('knowledge_datasets')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as KnowledgeDataset[]
}

export async function uploadKnowledgeDataset(
  adminId: string,
  file: File,
  name: string,
  description: string | null,
): Promise<KnowledgeDataset> {
  validateUpload(file)
  if (!isSupabaseConfigured) {
    return mutateState((state) => {
      const record: KnowledgeDataset = {
        id: id('dataset'),
        name,
        description,
        storage_path: `knowledge/${safeFileName(file.name)}`,
        mime_type: file.type || 'text/plain',
        size_bytes: file.size,
        status: 'ready',
        chunk_count: 0,
        error_message: null,
        uploaded_by: adminId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      state.datasets.unshift(record)
      return record
    })
  }
  const path = `${crypto.randomUUID()}-${safeFileName(file.name)}`
  const { error: uploadError } = await client()
    .storage.from(KNOWLEDGE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })
  if (uploadError) throw uploadError
  const { data, error } = await client()
    .from('knowledge_datasets')
    .insert({
      name,
      description,
      storage_path: path,
      mime_type: file.type || 'text/plain',
      size_bytes: file.size,
      uploaded_by: adminId,
      status: 'queued',
    })
    .select()
    .single()
  if (error) {
    await client().storage.from(KNOWLEDGE_BUCKET).remove([path])
    throw error
  }
  const dataset = data as KnowledgeDataset
  const { error: processError } = await client().functions.invoke('process-dataset', {
    body: { datasetId: dataset.id },
  })
  if (processError) {
    return { ...dataset, status: 'failed', error_message: 'Uploaded, but processing could not start.' }
  }
  return dataset
}

export async function deleteKnowledgeDataset(dataset: KnowledgeDataset): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.datasets = state.datasets.filter((item) => item.id !== dataset.id)
    })
    return
  }
  const { error: storageError } = await client()
    .storage.from(KNOWLEDGE_BUCKET)
    .remove([dataset.storage_path])
  if (storageError) throw storageError
  const { error } = await client().from('knowledge_datasets').delete().eq('id', dataset.id)
  if (error) throw error
}

export async function listAiModels(): Promise<AiModel[]> {
  if (!isSupabaseConfigured) {
    const { fallbackModels } = await import('./catalog')
    return fallbackModels
  }
  const { data, error } = await client().from('ai_models').select('*').order('sort_order')
  if (error) throw error
  return (data ?? []) as AiModel[]
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  if (!isSupabaseConfigured) {
    return loadState().profiles
  }
  const { data, error } = await client()
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as AdminUserRow[]
}

export async function adminUpdateUser(
  userId: string,
  patch: Partial<Pick<Profile, 'role' | 'status' | 'storage_quota_bytes' | 'full_name'>>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const profile = state.profiles.find((item) => item.id === userId)
      if (profile) Object.assign(profile, patch, { updated_at: new Date().toISOString() })
    })
    return
  }
  const { error } = await client().rpc('admin_update_profile', {
    p_user_id: userId,
    p_patch: patch,
  })
  if (error) throw error
}

export async function exportAccountData(userId: string): Promise<Record<string, unknown>> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return {
      exported_at: new Date().toISOString(),
      profile: state.profiles.find((profile) => profile.id === userId) ?? null,
      conversations: state.conversations.filter((conversation) => conversation.user_id === userId),
      messages: state.messages.filter((message) => message.user_id === userId),
      files: state.files.filter((file) => file.owner_id === userId),
      proposals: state.proposals.filter((proposal) => proposal.user_id === userId),
      service_requests: state.serviceRequests.filter((request) => request.user_id === userId),
      payments: state.payments.filter((payment) => payment.user_id === userId),
      threads: state.threads.filter((thread) => thread.participants?.some((participant) => participant.id === userId)),
      direct_messages: state.directMessages.filter(
        (message) => message.sender_id === userId || state.threads.some(
          (thread) => thread.id === message.thread_id && thread.participants?.some((participant) => participant.id === userId),
        ),
      ),
    }
  }

  const [
    profile,
    conversations,
    messages,
    files,
    proposals,
    requests,
    payments,
    threads,
    memberships,
  ] = await Promise.all([
    client().from('profiles').select('*').eq('id', userId).maybeSingle(),
    client().from('conversations').select('*').eq('user_id', userId),
    client().from('messages').select('*').eq('user_id', userId),
    client().from('files').select('id,name,mime_type,size_bytes,folder_id,created_at,updated_at').eq('owner_id', userId),
    client().from('project_proposals').select('*').eq('user_id', userId),
    client().from('service_requests').select('*').eq('user_id', userId),
    client().from('payments').select('*').eq('user_id', userId),
    client().from('chat_participants').select('thread_id').eq('user_id', userId),
    client().from('direct_messages').select('*').eq('sender_id', userId),
  ])
  const firstError = [profile, conversations, messages, files, proposals, requests, payments, threads, memberships]
    .map((result) => result.error)
    .find(Boolean)
  if (firstError) throw firstError
  const threadIds = (threads.data ?? []).map((row) => row.thread_id)
  const directMessages = threadIds.length
    ? await client().from('direct_messages').select('*').in('thread_id', threadIds)
    : { data: [], error: null }
  if (directMessages.error) throw directMessages.error

  return {
    exported_at: new Date().toISOString(),
    profile: profile.data,
    conversations: conversations.data ?? [],
    messages: messages.data ?? [],
    files: files.data ?? [],
    proposals: proposals.data ?? [],
    service_requests: requests.data ?? [],
    payments: payments.data ?? [],
    thread_ids: threadIds,
    direct_messages: directMessages.data ?? [],
  }
}

export async function listAuditLogs(): Promise<AuditLog[]> {
  if (!isSupabaseConfigured) {
    return loadState().auditLogs.sort((a, b) => b.created_at.localeCompare(a.created_at))
  }
  const { data, error } = await client()
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as AuditLog[]
}

export async function recordAuditEvent(
  actorId: string,
  eventType: string,
  severity: AuditLog['severity'],
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      state.auditLogs.unshift({
        id: id('audit'),
        actor_id: actorId,
        actor_email: state.profiles.find((profile) => profile.id === actorId)?.email ?? null,
        event_type: eventType,
        severity,
        target_type: null,
        target_id: null,
        metadata,
        created_at: new Date().toISOString(),
      })
    })
    return
  }
  const { error } = await client().rpc('record_audit_event', {
    p_event_type: eventType,
    p_severity: severity,
    p_target_type: null,
    p_target_id: null,
    p_metadata: metadata,
  })
  if (error) throw error
}

export async function listAdminServiceRequests(): Promise<ServiceRequest[]> {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return state.serviceRequests.map((request) => {
      const profile = state.profiles.find((item) => item.id === request.user_id)
      return {
        ...request,
        service: state.services.find((service) => service.id === request.service_id),
        profile: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
      }
    })
  }
  const { data, error } = await client()
    .from('service_requests')
    .select('*, service:services(*), profile:profiles!service_requests_user_id_fkey(full_name,email)')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as ServiceRequest[]
}

export async function updateServiceRequestStatus(
  requestId: string,
  status: ServiceRequest['status'],
  notes: string | null,
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const request = state.serviceRequests.find((item) => item.id === requestId)
      if (request) {
        request.status = status
        request.admin_notes = notes
        request.updated_at = new Date().toISOString()
      }
    })
    return
  }
  const { error } = await client()
    .from('service_requests')
    .update({ status, admin_notes: notes, updated_at: new Date().toISOString() })
    .eq('id', requestId)
  if (error) throw error
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
  if (!isSupabaseConfigured) {
    return [
      { key: 'support_email', value: 'vitalishimwe03@gmail.com', updated_at: new Date().toISOString() },
      { key: 'support_phone', value: '0792448989', updated_at: new Date().toISOString() },
      { key: 'signups_enabled', value: true, updated_at: new Date().toISOString() },
      { key: 'ai_fallback_message', value: 'AI service is temporarily unavailable. Please try again later.', updated_at: new Date().toISOString() },
    ]
  }
  const { data, error } = await client().from('system_settings').select('*').order('key')
  if (error) throw error
  return (data ?? []) as SystemSetting[]
}

export async function updateSystemSetting(
  key: string,
  value: unknown,
  adminId: string,
): Promise<void> {
  if (!isSupabaseConfigured) {
    await recordAuditEvent(adminId, 'admin.setting_updated', 'info', { key })
    return
  }
  const { error } = await client()
    .from('system_settings')
    .upsert({ key, value, updated_by: adminId, updated_at: new Date().toISOString() })
  if (error) throw error
}

export async function updateAdminService(
  serviceId: string,
  patch: Partial<Service>,
): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const service = state.services.find((item) => item.id === serviceId)
      if (service) Object.assign(service, patch)
    })
    return
  }
  const { error } = await client().from('services').update(patch).eq('id', serviceId)
  if (error) throw error
}

export async function updateAdminPlan(planId: string, patch: Partial<Plan>): Promise<void> {
  if (!isSupabaseConfigured) {
    mutateState((state) => {
      const plan = state.plans.find((item) => item.id === planId)
      if (plan) Object.assign(plan, patch)
    })
    return
  }
  const { error } = await client().from('plans').update(patch).eq('id', planId)
  if (error) throw error
}

export async function updateAiModel(modelId: string, patch: Partial<AiModel>): Promise<void> {
  if (!isSupabaseConfigured) return
  const { error } = await client().from('ai_models').update(patch).eq('id', modelId)
  if (error) throw error
}

export async function getDashboardStats() {
  if (!isSupabaseConfigured) {
    const state = loadState()
    return {
      users: state.profiles.length,
      conversations: state.conversations.length,
      messages: state.messages.length,
      files: state.files.length,
      requests: state.serviceRequests.length,
      storage: state.files.reduce((sum, file) => sum + file.size_bytes, 0),
      revenue: state.payments.filter((payment) => payment.status === 'successful').reduce((sum, payment) => sum + payment.amount_rwf, 0),
      aiMessagesToday: state.messages.filter((message) => message.role === 'user' && message.created_at >= startOfToday()).length,
    }
  }
  const [profiles, conversations, messages, files, requests, payments] = await Promise.all([
    client().from('profiles').select('id', { count: 'exact', head: true }),
    client().from('conversations').select('id', { count: 'exact', head: true }),
    client().from('messages').select('id', { count: 'exact', head: true }),
    client().from('files').select('size_bytes'),
    client().from('service_requests').select('id', { count: 'exact', head: true }),
    client().from('payments').select('amount_rwf').eq('status', 'successful'),
  ])
  const errors = [profiles.error, conversations.error, messages.error, files.error, requests.error, payments.error].filter(Boolean)
  if (errors.length) throw errors[0]
  return {
    users: profiles.count ?? 0,
    conversations: conversations.count ?? 0,
    messages: messages.count ?? 0,
    files: files.data?.length ?? 0,
    requests: requests.count ?? 0,
    storage: (files.data ?? []).reduce((sum, file) => sum + Number(file.size_bytes), 0),
    revenue: (payments.data ?? []).reduce((sum, payment) => sum + Number(payment.amount_rwf), 0),
    aiMessagesToday: messages.count ?? 0,
  }
}

export { fallbackPlans, fallbackServices }
