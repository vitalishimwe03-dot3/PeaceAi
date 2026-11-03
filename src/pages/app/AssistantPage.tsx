import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import {
  Archive,
  ArchiveRestore,
  ArrowUp,
  Bot,
  Check,
  Copy,
  Download,
  FileCode2,
  FileText,
  GitBranch,
  MoreHorizontal,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  X,
  Zap,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { Button, buttonStyles } from '@/components/ui/Button'
import { Modal, ConfirmDialog } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { AiLimitError, sendAiMessage } from '@/lib/ai'
import {
  createConversation,
  deleteConversation,
  getUsageSummary,
  listAiModels,
  listConversations,
  listMessages,
  updateConversation,
} from '@/lib/repository'
import { cn, formatBytes, getErrorMessage, relativeTime, truncate } from '@/lib/utils'
import type {
  AiModel,
  Attachment,
  Conversation,
  Message,
  UsageSummary,
} from '@/types/domain'

const TEXT_EXTENSIONS = [
  '.txt', '.md', '.json', '.csv', '.ts', '.tsx', '.js', '.jsx', '.py', '.html', '.css',
  '.sql', '.yaml', '.yml', '.xml', '.sh', '.java', '.go', '.rs', '.php', '.rb', '.toml',
  '.env.example',
]

const suggestions = [
  'Plan a secure full-stack application with modern architecture',
  'Debug and fix complex code issues with step by step explanation',
  'Conduct a comprehensive security audit on my codebase',
  'Build a scalable API with authentication, rate limiting & documentation',
  'Optimize performance and improve code quality',
  'Create production-ready React components with best practices',
]

export function AssistantPage() {
  const { user, isPreview } = useAuth()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [models, setModels] = useState<AiModel[]>([])
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [limit, setLimit] = useState<{ message: string; resetAt?: string } | null>(null)
  const [view, setView] = useState<'active' | 'archived'>('active')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [conversationMenu, setConversationMenu] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const initialLoaded = useRef(false)

  const selectedConversation = conversations.find((item) => item.id === selectedId) ?? null

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([listConversations(user.id), listAiModels(), getUsageSummary(user.id)])
      .then(([conversationRows, modelRows, usageRow]) => {
        if (!active) return
        setConversations(conversationRows)
        const enabled = modelRows.filter((model) => model.enabled)
        setModels(enabled)
        setSelectedModel(enabled[0]?.model_id ?? '')
        setUsage(usageRow)
        const requested = params.get('conversation')
        const initialPrompt = sessionStorage.getItem('peaceai.initialPrompt')
        if (requested && conversationRows.some((row) => row.id === requested)) {
          setSelectedId(requested)
        } else if (!params.get('new') && conversationRows.find((row) => row.status === 'active')) {
          setSelectedId(conversationRows.find((row) => row.status === 'active')!.id)
        }
        if (initialPrompt) {
          setPrompt(initialPrompt)
          sessionStorage.removeItem('peaceai.initialPrompt')
          window.setTimeout(() => textareaRef.current?.focus(), 100)
        }
        initialLoaded.current = true
      })
      .catch((err) => toast({ title: 'Could not load assistant', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => {
        if (active) setLoadingList(false)
      })
    return () => {
      active = false
    }
    // params intentionally read on first load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, toast])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      return
    }
    let active = true
    setLoadingMessages(true)
    listMessages(selectedId)
      .then((rows) => {
        if (active) setMessages(rows)
      })
      .catch((err) => {
        if (active) setError(getErrorMessage(err))
      })
      .finally(() => {
        if (active) setLoadingMessages(false)
      })
    return () => {
      active = false
    }
  }, [selectedId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: messages.length > 1 ? 'smooth' : 'instant', block: 'end' })
  }, [messages, sending])

  if (!user) return null

  const startNew = () => {
    setSelectedId(null)
    setMessages([])
    setError('')
    setLimit(null)
    setSidebarOpen(false)
    setParams({ new: '1' })
    setPrompt('')
    setAttachments([])
    window.setTimeout(() => textareaRef.current?.focus(), 80)
  }

  const refreshUsage = async () => {
    try {
      setUsage(await getUsageSummary(user.id))
    } catch {
      // Usage refresh is best-effort.
    }
  }

  const selectConversation = (conversation: Conversation) => {
    setSelectedId(conversation.id)
    setParams({ conversation: conversation.id })
    setSidebarOpen(false)
    setError('')
    setLimit(null)
  }

  const addAttachment = async (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files).slice(0, 3 - attachments.length)
    const next: Attachment[] = []
    for (const file of selected) {
      const lower = file.name.toLowerCase()
      const isText = file.type.startsWith('text/') || file.type === 'application/json' || TEXT_EXTENSIONS.some((ext) => lower.endsWith(ext))
      if (!isText) {
        toast({ title: 'Unsupported attachment', description: `${file.name} is not a supported text or code file for AI context.`, tone: 'error' })
        continue
      }
      if (file.size > 512 * 1024) {
        toast({ title: 'Attachment too large', description: `${file.name} exceeds the 512 KB AI attachment limit.`, tone: 'error' })
        continue
      }
      next.push({ name: file.name, type: file.type || 'text/plain', size: file.size, text: await file.text() })
    }
    if (next.length) setAttachments((current) => [...current, ...next])
    if (fileRef.current) fileRef.current.value = ''
  }

  const send = async (event?: FormEvent, override?: string) => {
    event?.preventDefault()
    const content = (override ?? prompt).trim()
    if (!content || sending) return
    setSending(true)
    setError('')
    setLimit(null)
    let conversationId = selectedId
    try {
      let conversation = selectedConversation
      if (!conversationId) {
        conversation = await createConversation(user.id, truncate(content.replace(/\s+/g, ' '), 70), selectedModel || null)
        conversationId = conversation.id
        setConversations((current) => [conversation!, ...current])
        setSelectedId(conversation.id)
        setParams({ conversation: conversation.id })
      } else if (conversation && !conversation.model) {
        await updateConversation(conversation.id, { model: selectedModel || null })
      }

      const optimistic: Message = {
        id: `local-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        user_id: user.id,
        role: 'user',
        content,
        attachments,
        model: selectedModel || null,
        created_at: new Date().toISOString(),
      }
      setMessages((current) => [...current, optimistic])
      setPrompt('')
      const files = attachments
      setAttachments([])

      const reply = await sendAiMessage({
        userId: user.id,
        conversationId,
        message: content,
        attachments: files,
        model: selectedModel || undefined,
      })

      const assistant: Message = {
        id: `local-assistant-${crypto.randomUUID()}`,
        conversation_id: conversationId,
        user_id: user.id,
        role: 'assistant',
        content: reply.content,
        attachments: [],
        model: reply.model,
        created_at: new Date().toISOString(),
      }
      setMessages((current) => [...current, assistant])
      setConversations((current) =>
        current.map((row) =>
          row.id === conversationId
            ? { ...row, title: row.title === 'New conversation' ? truncate(content.replace(/\s+/g, ' '), 70) : row.title, updated_at: new Date().toISOString() }
            : row,
        ),
      )
      void refreshUsage()
    } catch (err) {
      if (err instanceof AiLimitError) {
        setLimit({ message: err.message, resetAt: err.resetAt })
        setError('')
      } else {
        setError(getErrorMessage(err, 'The assistant could not respond. Please try again.'))
      }
    } finally {
      setSending(false)
    }
  }

  const handleRename = async () => {
    if (!selectedConversation || !renameValue.trim()) return
    try {
      await updateConversation(selectedConversation.id, { title: renameValue.trim() })
      setConversations((current) =>
        current.map((row) => row.id === selectedConversation.id ? { ...row, title: renameValue.trim() } : row),
      )
      setRenameOpen(false)
      toast({ title: 'Conversation renamed', tone: 'success' })
    } catch (err) {
      toast({ title: 'Rename failed', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const toggleArchive = async () => {
    if (!selectedConversation) return
    const archived = selectedConversation.status === 'archived'
    try {
      await updateConversation(selectedConversation.id, { status: archived ? 'active' : 'archived' })
      setConversations((current) =>
        current.map((row) =>
          row.id === selectedConversation.id
            ? { ...row, status: archived ? 'active' : 'archived', updated_at: new Date().toISOString() }
            : row,
        ),
      )
      toast({ title: archived ? 'Conversation restored' : 'Conversation archived', tone: 'success' })
      if (!archived) setSelectedId(null)
    } catch (err) {
      toast({ title: 'Could not update conversation', description: getErrorMessage(err), tone: 'error' })
    }
    setConversationMenu(false)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteConversation(deleteTarget.id)
      setConversations((current) => current.filter((row) => row.id !== deleteTarget.id))
      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
        setMessages([])
        setParams({})
      }
      setDeleteTarget(null)
      toast({ title: 'Conversation deleted', tone: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const copyText = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(messageId)
      window.setTimeout(() => setCopiedId(null), 1600)
    } catch {
      toast({ title: 'Copy failed', description: 'Clipboard access is not available in this browser.', tone: 'error' })
    }
  }

  const visibleConversations = conversations.filter((conversation) => conversation.status === view)

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-70px)] overflow-hidden sm:-mx-6 lg:-mx-8 lg:-my-8">
      <aside
        className={cn(
          'fixed inset-y-[70px] left-0 z-30 flex w-72 shrink-0 flex-col border-r border-white/[0.06] bg-ink-900/95 backdrop-blur-xl transition-transform lg:static lg:inset-auto lg:z-auto lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-label="Conversation history"
      >
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] p-3">
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-white/10 bg-ink-950/60 p-0.5">
              <button
                type="button"
                onClick={() => setView('active')}
                className={cn('rounded-md px-2.5 py-1.5 text-[11px]', view === 'active' ? 'bg-white/10 text-white' : 'text-slate-500')}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => setView('archived')}
                className={cn('rounded-md px-2.5 py-1.5 text-[11px]', view === 'archived' ? 'bg-white/10 text-white' : 'text-slate-500')}
              >
                Archived
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
              aria-label="Search conversations"
              title="Search"
            >
              <Search className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={startNew}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-accent"
              aria-label="New conversation"
              title="New chat"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto p-2">
          {loadingList ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : visibleConversations.length ? (
            visibleConversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => selectConversation(conversation)}
                className={cn(
                  'mb-1 w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                  conversation.id === selectedId ? 'bg-accent/10' : 'hover:bg-white/[0.04]',
                )}
              >
                <p className={cn('truncate text-xs font-medium', conversation.id === selectedId ? 'text-accent' : 'text-slate-300')}>
                  {conversation.title}
                </p>
                <p className="mt-1 truncate text-[10px] text-slate-600">
                  {relativeTime(conversation.updated_at)} · {conversation.model || 'Standard'}
                </p>
              </button>
            ))
          ) : (
            <p className="px-3 py-8 text-center text-xs text-slate-600">
              {view === 'archived' ? 'No archived conversations.' : 'No conversations yet.'}
            </p>
          )}
        </div>
        {usage ? (
          <div className="border-t border-white/[0.06] p-3">
            <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3">
              <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span>Daily AI usage</span>
                <span>{usage.messagesToday}/{usage.messagesLimit}</span>
              </div>
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, (usage.messagesToday / Math.max(usage.messagesLimit, 1)) * 100)}%` }}
                />
              </div>
              <p className="mt-2 text-[10px] text-slate-600">{usage.planName} plan · resets at midnight</p>
            </div>
          </div>
        ) : null}
      </aside>

      {sidebarOpen ? (
        <button type="button" className="fixed inset-0 z-20 bg-ink-950/70 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close conversation history" />
      ) : null}

      <section className="flex min-w-0 flex-1 flex-col bg-ink-950/40">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 lg:hidden"
              aria-label="Open conversation history"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Bot className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{selectedConversation?.title || 'New conversation'}</p>
                <p className="text-[10px] text-slate-500">
                  {isPreview ? 'AI provider not connected' : 'PeaceAI • Secure & Fast'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {models.length > 1 ? (
              <select
                value={selectedModel}
                onChange={(event) => setSelectedModel(event.target.value)}
                className="max-w-[180px] rounded-lg border border-white/10 bg-ink-900 px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:ring-1 focus:ring-accent"
                aria-label="Select AI model"
              >
                {models.map((model) => (
                  <option key={model.id} value={model.model_id}>
                    {model.display_name}{model.is_premium ? ' ✦' : ''}
                  </option>
                ))}
              </select>
            ) : null}
            {selectedConversation ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setConversationMenu((open) => !open)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
                  aria-label="Conversation actions"
                  aria-expanded={conversationMenu}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {conversationMenu ? (
                  <div className="absolute right-0 top-full z-20 mt-1 w-44 rounded-xl border border-white/10 bg-ink-900 p-1 shadow-2xl">
                    <button
                      type="button"
                      onClick={() => {
                        setRenameValue(selectedConversation.title)
                        setRenameOpen(true)
                        setConversationMenu(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleArchive()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                    >
                      {selectedConversation.status === 'archived' ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                      {selectedConversation.status === 'archived' ? 'Restore' : 'Archive'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteTarget(selectedConversation)
                        setConversationMenu(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <Link to="/app/usage" className="hidden text-[11px] text-slate-500 hover:text-slate-300 sm:block">
              {usage ? `${usage.messagesToday}/${usage.messagesLimit} today` : ''}
            </Link>
          </div>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
            {loadingMessages ? (
              <div className="flex justify-center py-16"><Spinner label="Loading messages" /></div>
            ) : messages.length ? (
              <div className="space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={cn('flex gap-3', message.role === 'user' && 'justify-end')}>
                    {message.role !== 'user' ? (
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                        <Bot className="h-4 w-4" />
                      </span>
                    ) : null}
                    <div className={cn('min-w-0 max-w-[90%] sm:max-w-[85%]', message.role === 'user' && 'flex flex-col items-end')}>
                      <div
                        className={cn(
                          'rounded-2xl px-4 py-3',
                          message.role === 'user'
                            ? 'rounded-br-md bg-accent/10 text-slate-100'
                            : 'rounded-bl-md border border-white/[0.07] bg-white/[0.025]',
                        )}
                      >
                        {message.attachments?.length ? (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {message.attachments.map((attachment) => (
                              <span key={attachment.name} className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] text-slate-300">
                                <Paperclip className="h-3 w-3" /> {attachment.name}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {message.role === 'assistant' ? (
                          <MarkdownContent content={message.content} />
                        ) : (
                          <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                        )}
                      </div>
                      <div className={cn('mt-1.5 flex items-center gap-2 px-1 text-[10px] text-slate-600', message.role === 'user' && 'flex-row-reverse')}>
                        <span>{relativeTime(message.created_at)}</span>
                        {message.model ? <span>· {message.model}</span> : null}
                        {message.role === 'assistant' ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => void copyText(message.content, message.id)}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300"
                              aria-label="Copy response"
                              title="Copy"
                            >
                              {copiedId === message.id ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-emerald-400"
                              aria-label="Good response"
                              title="Good response"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-rose-400"
                              aria-label="Bad response"
                              title="Bad response"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center rounded px-1.5 py-0.5 hover:bg-white/5 hover:text-slate-300"
                              aria-label="Regenerate"
                              title="Regenerate"
                            >
                              <RotateCcw className="h-3 w-3" />
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
                {sending ? (
                  <div className="flex gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 text-accent">
                      <Bot className="h-4 w-4" />
                    </span>
                    <div className="rounded-2xl rounded-bl-md border border-white/[0.07] bg-white/[0.025] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.3s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent" />
                        </div>
                        <span className="text-xs text-slate-400">PeaceAI is thinking...</span>
                      </div>
                    </div>
                  </div>
                ) : null}
                <div ref={bottomRef} />
              </div>
            ) : (
              <EmptyAssistant onSuggestion={(text) => void send(undefined, text)} />
            )}

            {limit ? (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] p-5">
                <div className="flex gap-3">
                  <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
                  <div>
                    <h2 className="text-sm font-semibold text-amber-100">Usage limit reached</h2>
                    <p className="mt-1 text-xs leading-5 text-amber-100/70">{limit.message}</p>
                    {limit.resetAt ? (
                      <p className="mt-1 text-xs text-amber-100/60">Your limit resets {new Date(limit.resetAt).toLocaleString()}.</p>
                    ) : (
                      <p className="mt-1 text-xs text-amber-100/60">Your allowance normally resets at midnight in your local time.</p>
                    )}
                    <Link to="/pricing" className={buttonStyles({ variant: 'outline', size: 'sm', className: 'mt-3' })}>
                      Compare plans
                    </Link>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mt-6 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-xs text-rose-300" role="alert">
                {error}
                <button type="button" onClick={() => void send()} className="ml-2 inline-flex items-center gap-1 underline">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="border-t border-white/[0.06] bg-ink-950/80 p-3 sm:p-4">
          <form onSubmit={send} className="mx-auto max-w-3xl">
            {attachments.length ? (
              <div className="mb-2 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <span key={attachment.name} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] text-slate-300">
                    <FileCode2 className="h-3.5 w-3.5 text-accent" />
                    {attachment.name}
                    <span className="text-slate-600">{formatBytes(attachment.size)}</span>
                    <button
                      type="button"
                      onClick={() => setAttachments((current) => current.filter((item) => item.name !== attachment.name))}
                      className="text-slate-500 hover:text-white"
                      aria-label={`Remove ${attachment.name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <div className="rounded-2xl border border-white/10 bg-ink-900/80 p-2 shadow-[0_0_80px_-40px_rgba(52,227,176,0.3)] transition-all focus-within:border-accent/40 focus-within:shadow-[0_0_80px_-30px_rgba(52,227,176,0.4)]">
              <label htmlFor="assistant-prompt" className="sr-only">Message PeaceAI</label>
              <textarea
                ref={textareaRef}
                id="assistant-prompt"
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void send()
                  }
                }}
                rows={2}
                placeholder="Message PeaceAI... (Shift+Enter for new line)"
                className="max-h-40 min-h-[3rem] w-full resize-none bg-transparent px-2.5 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none"
              />
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-1">
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => void addAttachment(event.target.files)}
                    accept={TEXT_EXTENSIONS.join(',')}
                  />
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                    aria-label="Attach text or code file"
                    title="Attach files (max 512 KB)"
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white"
                    aria-label="Add context"
                    title="More options"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <span className="hidden text-[10px] text-slate-600 sm:block">
                    ⏎ Send · ⇧⏎ New line
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={sending || !prompt.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent/80 text-ink-950 transition-all hover:scale-105 hover:shadow-[0_0_20px_-5px_rgba(52,227,176,0.6)] disabled:opacity-40 disabled:hover:scale-100"
                  aria-label="Send message"
                >
                  {sending ? <Spinner className="h-4 w-4 text-ink-950" /> : <ArrowUp className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">
              AI can be wrong. Verify code, plans, and security advice before relying on them.
            </p>
          </form>
        </div>
      </section>

      <Modal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        title="Rename conversation"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleRename()} disabled={!renameValue.trim()}>Save name</Button>
          </>
        }
      >
        <Input
          label="Conversation title"
          value={renameValue}
          onChange={(event) => setRenameValue(event.target.value)}
          maxLength={100}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleRename()
          }}
        />
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        title="Delete conversation?"
        description="This permanently deletes the conversation and its messages. This action cannot be undone."
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />
    </div>
  )
}

function EmptyAssistant({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const quickActions = [
    { icon: FileCode2, label: 'Code Review', prompt: 'Review this code for bugs, security issues, performance, and best practices. Provide detailed feedback with suggestions.' },
    { icon: ShieldAlert, label: 'Security Audit', prompt: 'Perform a comprehensive security audit. Check for OWASP Top 10 vulnerabilities, authentication issues, and recommend fixes.' },
    { icon: FileText, label: 'Write Docs', prompt: 'Generate comprehensive documentation including README, API docs, and usage examples.' },
    { icon: GitBranch, label: 'Architecture', prompt: 'Design a scalable system architecture. Include diagrams description, tech stack, and implementation plan.' },
  ]

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="relative">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/20 to-accent/5 text-accent shadow-[0_0_60px_-20px_rgba(52,227,176,0.8)]">
          <Sparkles className="h-7 w-7" />
        </span>
        <div className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-accent animate-pulse" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold gradient-text">PeaceAI Assistant</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-400">
        Your intelligent coding companion. Build, debug, secure, and optimize with advanced AI assistance.
      </p>
      
      <div className="mt-8 grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={() => onSuggestion(action.prompt)}
            className="group flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-4 transition-all hover:border-accent/40 hover:bg-accent/5 hover:shadow-[0_0_40px_-20px_rgba(52,227,176,0.6)]"
          >
            <action.icon className="h-5 w-5 text-slate-400 transition-colors group-hover:text-accent" />
            <span className="text-xs text-slate-400 transition-colors group-hover:text-slate-200">{action.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 w-full max-w-2xl">
        <p className="mb-3 text-xs text-slate-500">Popular prompts</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => onSuggestion(suggestion)}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left text-xs leading-5 text-slate-400 transition-all hover:border-accent/25 hover:bg-white/[0.04] hover:text-slate-200"
            >
              <Zap className="h-3.5 w-3.5 shrink-0 text-accent/60" />
              <span className="line-clamp-1">{suggestion}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="mt-8 max-w-md text-[10px] leading-5 text-slate-600">
        AI responses are generated and should be reviewed before use. In preview mode, a configuration notice may appear.
      </p>
    </div>
  )
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="prose-peace max-w-none text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre({ children }) {
            return <CodeBlock>{children}</CodeBlock>
          },
          a({ children, ...props }) {
            return <a {...props} target="_blank" rel="noopener noreferrer">{children}</a>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLPreElement>(null)
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    const text = ref.current?.textContent ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard permission is browser-controlled.
    }
  }
  const download = () => {
    const text = ref.current?.textContent ?? ''
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'code.txt'
    a.click()
    URL.revokeObjectURL(url)
  }
  return (
    <div className="group relative my-4">
      <div className="flex items-center justify-between rounded-t-xl border border-white/10 border-b-0 bg-ink-950/80 px-3 py-1.5">
        <span className="text-[10px] text-slate-500">Code</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            title="Copy code"
          >
            {copied ? <Check className="h-3 w-3 text-accent" /> : <Copy className="h-3 w-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            type="button"
            onClick={download}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
            title="Download"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
      </div>
      <pre ref={ref} className="!mt-0 !rounded-t-none">{children}</pre>
    </div>
  )
}
