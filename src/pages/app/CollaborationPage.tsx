import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Check,
  MessageSquare,
  Search,
  Send,
  ShieldOff,
  UserPlus,
  Users,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  blockUser,
  getOrCreateThread,
  listBlockedUsers,
  listConnections,
  listDirectMessages,
  listThreads,
  respondToConnection,
  searchProfiles,
  sendConnectionRequest,
  sendDirectMessage,
} from '@/lib/repository'
import { cn, getErrorMessage, relativeTime } from '@/lib/utils'
import type { ChatThread, Connection, DirectMessage, Profile } from '@/types/domain'

type MiniProfile = Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>

export function CollaborationPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [threads, setThreads] = useState<ChatThread[]>([])
  const [connections, setConnections] = useState<Connection[]>([])
  const [blockedIds, setBlockedIds] = useState<string[]>([])
  const [profiles, setProfiles] = useState<Record<string, MiniProfile>>({})
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null)
  const [messages, setMessages] = useState<DirectMessage[]>([])
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [searching, setSearching] = useState(false)
  const [requestingId, setRequestingId] = useState<string | null>(null)
  const [blockTarget, setBlockTarget] = useState<MiniProfile | null>(null)
  const [blocking, setBlocking] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const rememberProfiles = (rows: Array<MiniProfile | null | undefined>) => {
    setProfiles((current) => {
      const next = { ...current }
      for (const row of rows) if (row?.id) next[row.id] = row
      return next
    })
  }

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [threadRows, connectionRows, blocked] = await Promise.all([
        listThreads(user.id),
        listConnections(user.id),
        listBlockedUsers(user.id),
      ])
      setThreads(threadRows)
      setConnections(connectionRows)
      setBlockedIds(blocked)
      rememberProfiles([
        ...threadRows.flatMap((thread) => thread.participants ?? []),
        ...connectionRows.flatMap((connection) => [connection.requester, connection.addressee]),
      ])
    } catch (err) {
      toast({ title: 'Could not load collaboration data', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([])
      return
    }
    let cancelled = false
    const refresh = async () => {
      try {
        const rows = await listDirectMessages(activeThreadId)
        if (cancelled) return
        setMessages(rows)
        rememberProfiles(rows.map((message) => message.sender))
      } catch {
        /* The next poll will retry. */
      }
    }
    setThreadLoading(true)
    void refresh().finally(() => { if (!cancelled) setThreadLoading(false) })
    const timer = window.setInterval(() => void refresh(), 8000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [activeThreadId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const activeThread = threads.find((thread) => thread.id === activeThreadId) ?? null
  const otherParticipants = (thread: ChatThread) =>
    (thread.participants ?? []).filter((participant) => participant.id !== user?.id)
  const threadTitle = (thread: ChatThread) => {
    const others = otherParticipants(thread)
    const name = others.map((participant) => participant.full_name || participant.email).join(', ')
    return thread.title || name || 'Conversation'
  }
  const threadAvatar = (thread: ChatThread) => otherParticipants(thread)[0]

  const incoming = connections.filter((connection) => connection.addressee_id === user?.id && connection.status === 'pending')
  const outgoing = connections.filter((connection) => connection.requester_id === user?.id && connection.status === 'pending')
  const accepted = connections.filter((connection) => connection.status === 'accepted')
  const acceptedPeople = useMemo(() => {
    const map = new Map<string, MiniProfile>()
    for (const connection of accepted) {
      const otherId = connection.requester_id === user?.id ? connection.addressee_id : connection.requester_id
      const profile = profiles[otherId]
      if (profile) map.set(otherId, profile)
    }
    return Array.from(map.values())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections, profiles, user?.id])

  if (!user) return null

  const runSearch = async (value: string) => {
    setSearchQuery(value)
    if (value.trim().length < 2) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      const results = await searchProfiles(value.trim(), user.id)
      setSearchResults(results.filter((profile) => !blockedIds.includes(profile.id)))
      rememberProfiles(results)
    } catch (err) {
      toast({ title: 'Search failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSearching(false)
    }
  }

  const requestConnection = async (profile: Profile) => {
    setRequestingId(profile.id)
    try {
      await sendConnectionRequest(user.id, profile.id)
      setConnections(await listConnections(user.id))
      rememberProfiles([profile])
      toast({ title: 'Connection request sent', description: `${profile.full_name || profile.email} must accept before you can message.`, tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not send request', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setRequestingId(null)
    }
  }

  const respond = async (connection: Connection, status: 'accepted' | 'declined') => {
    try {
      await respondToConnection(connection.id, status)
      setConnections(await listConnections(user.id))
      toast({ title: status === 'accepted' ? 'Connection accepted' : 'Request declined', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update request', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const startThread = async (profile: MiniProfile) => {
    try {
      const thread = await getOrCreateThread(user.id, profile.id)
      setFindOpen(false)
      await load()
      setActiveThreadId(thread.id)
      rememberProfiles([profile])
    } catch (err) {
      toast({ title: 'Could not open conversation', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const send = async () => {
    const content = messageText.trim()
    if (!content || !activeThreadId || sending) return
    if (content.length > 4000) {
      toast({ title: 'Message too long', description: 'Messages are limited to 4,000 characters.', tone: 'error' })
      return
    }
    setSending(true)
    try {
      const message = await sendDirectMessage(activeThreadId, user.id, content)
      setMessages((current) => [...current, message])
      setMessageText('')
      const refreshed = await listThreads(user.id)
      setThreads(refreshed)
    } catch (err) {
      toast({ title: 'Message not sent', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSending(false)
    }
  }

  const doBlock = async () => {
    if (!blockTarget) return
    setBlocking(true)
    try {
      await blockUser(user.id, blockTarget.id)
      setBlockedIds((current) => [...current, blockTarget.id])
      setThreads((current) => current.filter((thread) => !thread.participants?.some((participant) => participant.id === blockTarget.id)))
      if (activeThread && activeThread.participants?.some((participant) => participant.id === blockTarget.id)) {
        setActiveThreadId(null)
      }
      setBlockTarget(null)
      toast({ title: 'User blocked', description: 'They can no longer message you, and their conversations are hidden.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not block user', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setBlocking(false)
    }
  }

  const reportHref = (profile: MiniProfile) => {
    const subject = encodeURIComponent('PeaceAI abuse report')
    const body = encodeURIComponent(
      `I am reporting this PeaceAI account for abusive content or behaviour.\n\nAccount: ${profile.full_name || 'Unknown'} (${profile.id})\nReported from: ${user.email}\nPlease describe what happened and include any relevant context below:\n\n`,
    )
    return `mailto:vitalishimwe03@gmail.com?subject=${subject}&body=${body}`
  }

  return (
    <div>
      <PageHeader
        title="Collaboration"
        description="Connect with other PeaceAI members and message them. Messaging is direct and private."
        actions={
          <Button size="sm" onClick={() => setFindOpen(true)}>
            <UserPlus className="h-4 w-4" /> Find people
          </Button>
        }
      />

      <div className="grid h-[calc(100vh-250px)] min-h-[540px] gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="card-surface flex min-h-0 flex-col">
          <div className="border-b border-white/[0.07] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white">Connections</h2>
              <Badge tone="neutral">{acceptedPeople.length}</Badge>
            </div>
            {acceptedPeople.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {acceptedPeople.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => void startThread(profile)}
                    className="flex items-center gap-2 rounded-full border border-white/[0.08] py-1 pl-1 pr-3 text-[11px] text-slate-300 hover:border-accent/30 hover:text-white"
                    title={profile.email}
                  >
                    <Avatar name={profile.full_name} email={profile.email} src={profile.avatar_url} size="xs" />
                    {(profile.full_name || profile.email).split(' ')[0]}
                  </button>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[11px] leading-5 text-slate-500">No accepted connections yet. Find a colleague to get started.</p>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {incoming.length ? (
              <section className="mb-3 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-2.5">
                <p className="mb-2 px-1 text-[10px] uppercase tracking-wider text-amber-200/70">Requests</p>
                {incoming.map((connection) => {
                  const profile = connection.requester ?? profiles[connection.requester_id]
                  return (
                    <div key={connection.id} className="rounded-lg p-2">
                      <div className="flex items-center gap-2">
                        <Avatar name={profile?.full_name} email={profile?.email} src={profile?.avatar_url} size="xs" />
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-200">{profile?.full_name || profile?.email || 'PeaceAI user'}</span>
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <Button size="sm" className="h-7 flex-1 px-2 text-[11px]" onClick={() => void respond(connection, 'accepted')}>
                          <Check className="h-3 w-3" /> Accept
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 flex-1 px-2 text-[11px]" onClick={() => void respond(connection, 'declined')}>
                          Decline
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </section>
            ) : null}

            {outgoing.length ? (
              <p className="mb-2 px-3 text-[10px] text-slate-600">
                {outgoing.length} sent request{outgoing.length === 1 ? '' : 's'} awaiting a response.
              </p>
            ) : null}

            <p className="px-2 pb-1 text-[10px] uppercase tracking-wider text-slate-600">Messages</p>
            {loading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : threads.length ? (
              threads.map((thread) => {
                const avatar = threadAvatar(thread)
                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => setActiveThreadId(thread.id)}
                    className={cn(
                      'flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left',
                      activeThreadId === thread.id ? 'bg-accent/10' : 'hover:bg-white/[0.04]',
                    )}
                  >
                    <Avatar name={avatar?.full_name || threadTitle(thread)} email={avatar?.email} src={avatar?.avatar_url} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-xs font-medium text-slate-200">{threadTitle(thread)}</span>
                        {thread.last_message_at ? <span className="shrink-0 text-[9px] text-slate-600">{relativeTime(thread.last_message_at)}</span> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-slate-500">{thread.last_message || 'No messages yet'}</span>
                    </span>
                  </button>
                )
              })
            ) : (
              <div className="px-3 py-8 text-center">
                <MessageSquare className="mx-auto h-6 w-6 text-slate-700" />
                <p className="mt-2 text-[11px] text-slate-500">No conversations yet.</p>
              </div>
            )}
          </div>

          {blockedIds.length ? (
            <div className="border-t border-white/[0.07] p-3">
              <p className="text-[10px] uppercase tracking-wider text-slate-600">Blocked ({blockedIds.length})</p>
              <p className="mt-1 text-[10px] leading-4 text-slate-600">Blocked users cannot message you. Manage this list from Settings.</p>
            </div>
          ) : null}
        </aside>

        <section className="card-surface flex min-h-0 flex-col">
          {activeThread ? (
            <>
              <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
                <Avatar name={threadAvatar(activeThread)?.full_name || threadTitle(activeThread)} email={threadAvatar(activeThread)?.email} src={threadAvatar(activeThread)?.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-white">{threadTitle(activeThread)}</p>
                  <p className="text-[10px] text-slate-600">Direct message · only visible to participants</p>
                </div>
                {otherParticipants(activeThread)[0] ? (
                  <div className="flex items-center gap-1">
                    <a
                      href={reportHref(otherParticipants(activeThread)[0])}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-amber-300"
                      title="Report this user"
                    >
                      <AlertTriangle className="h-4 w-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setBlockTarget(otherParticipants(activeThread)[0])}
                      className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-rose-300"
                      title="Block this user"
                    >
                      <ShieldOff className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {threadLoading && !messages.length ? (
                  <div className="flex h-full items-center justify-center"><Spinner label="Loading conversation" /></div>
                ) : messages.length ? (
                  messages.map((message, index) => {
                    const mine = message.sender_id === user.id
                    const previous = messages[index - 1]
                    const grouped = previous?.sender_id === message.sender_id &&
                      new Date(message.created_at).getTime() - new Date(previous.created_at).getTime() < 5 * 60 * 1000
                    return (
                      <div key={message.id} className={cn('flex gap-2', mine ? 'justify-end' : 'justify-start')}>
                        {!mine && !grouped ? (
                          <Avatar name={message.sender?.full_name} email={message.sender?.email} src={message.sender?.avatar_url} size="xs" />
                        ) : !mine ? <span className="w-6" /> : null}
                        <div className={cn('max-w-[78%]', mine ? 'text-right' : 'text-left')}>
                          {!grouped ? (
                            <p className="mb-1 px-1 text-[10px] text-slate-600">
                              {mine ? 'You' : message.sender?.full_name || message.sender?.email || 'Member'} · {relativeTime(message.created_at)}
                            </p>
                          ) : null}
                          <div
                            className={cn(
                              'inline-block whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-left text-xs leading-5',
                              mine ? 'rounded-br-md bg-accent text-ink-950' : 'rounded-bl-md border border-white/[0.07] bg-white/[0.04] text-slate-200',
                            )}
                          >
                            {message.content}
                          </div>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <EmptyState
                    icon={MessageSquare}
                    title={`Start a conversation with ${threadTitle(activeThread)}`}
                    description="Only the two participants can read this conversation. Do not share passwords, API keys, or other secrets."
                  />
                )}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-white/[0.07] p-3">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void send()
                  }}
                  className="flex items-end gap-2"
                >
                  <Textarea
                    value={messageText}
                    onChange={(event) => setMessageText(event.target.value)}
                    placeholder="Write a message…"
                    rows={2}
                    maxLength={4000}
                    aria-label="Message"
                    containerClassName="flex-1"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault()
                        void send()
                      }
                    }}
                  />
                  <Button type="submit" className="h-[62px] px-4" loading={sending} disabled={!messageText.trim()} aria-label="Send message">
                    {sending ? null : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <p className="mt-1.5 flex justify-between px-1 text-[9px] text-slate-600">
                  <span>Enter to send · Shift+Enter for a new line</span>
                  <span>{messageText.length}/4000</span>
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              <EmptyState
                icon={Users}
                title="Select a conversation"
                description="Choose a conversation from the left, or find a colleague and send a connection request. Messaging unlocks after they accept."
                action={<Button size="sm" onClick={() => setFindOpen(true)}><Search className="h-4 w-4" /> Find people</Button>}
              />
            </div>
          )}
        </section>
      </div>

      <Modal
        open={findOpen}
        onClose={() => setFindOpen(false)}
        title="Find people"
        description="Search by name or email. Messaging requires an accepted connection."
        className="max-w-xl"
      >
        <Input
          value={searchQuery}
          onChange={(event) => void runSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search people"
          leadingIcon={<Search className="h-4 w-4" />}
          autoFocus
        />
        <div className="mt-4 min-h-[180px]">
          {searching ? (
            <div className="flex justify-center py-10"><Spinner label="Searching" /></div>
          ) : searchQuery.trim().length < 2 ? (
            <p className="py-10 text-center text-xs text-slate-500">Enter at least two characters.</p>
          ) : searchResults.length ? (
            <div className="space-y-1.5">
              {searchResults.map((profile) => {
                const connection = connections.find(
                  (item) =>
                    (item.requester_id === profile.id && item.addressee_id === user.id) ||
                    (item.addressee_id === profile.id && item.requester_id === user.id),
                )
                return (
                  <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3">
                    <Avatar name={profile.full_name} email={profile.email} src={profile.avatar_url} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{profile.full_name || 'PeaceAI member'}</p>
                      <p className="truncate text-[10px] text-slate-500">{profile.email}</p>
                    </div>
                    {connection?.status === 'accepted' ? (
                      <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => void startThread(profile)}>
                        <MessageSquare className="h-3 w-3" /> Message
                      </Button>
                    ) : connection?.status === 'pending' ? (
                      <Badge tone="amber">Pending</Badge>
                    ) : (
                      <Button size="sm" className="h-7 px-2 text-[11px]" loading={requestingId === profile.id} onClick={() => void requestConnection(profile)}>
                        Connect
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="py-10 text-center text-xs text-slate-500">No members matched that search.</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(blockTarget)}
        onClose={() => setBlockTarget(null)}
        onConfirm={() => void doBlock()}
        title="Block this user?"
        description={`${blockTarget?.full_name || blockTarget?.email || 'This user'} will no longer be able to message you, and existing conversations will be hidden. This does not delete content already sent.`}
        confirmLabel="Block user"
        destructive
        loading={blocking}
      />
    </div>
  )
}
