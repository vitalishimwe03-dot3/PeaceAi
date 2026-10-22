import { useEffect, useState } from 'react'
import { Bot, KeyRound, Lock, Save, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { listAiModels, recordAuditEvent, updateAiModel } from '@/lib/repository'
import { getErrorMessage } from '@/lib/utils'
import type { AiModel } from '@/types/domain'

export function AdminAiPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    listAiModels()
      .then(setModels)
      .catch((err) => toast({ title: 'Could not load AI models', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = async (model: AiModel, patch: Partial<AiModel>) => {
    if (!user) return
    setSavingId(model.id)
    try {
      await updateAiModel(model.id, patch)
      setModels((current) => current.map((item) => item.id === model.id ? { ...item, ...patch } : item))
      await recordAuditEvent(user.id, 'admin.ai_model_updated', 'warning', {
        model_id: model.model_id,
        fields: Object.keys(patch),
      })
      toast({ title: 'Model updated', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update model', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="AI models"
        description="Control which models members can select. Provider API keys are stored only in server-side Edge Function secrets."
      />

      <div className="mb-5 rounded-xl border border-sky-400/20 bg-sky-400/[0.04] p-4">
        <p className="flex items-center gap-2 text-xs font-medium text-sky-200"><Lock className="h-4 w-4" /> Provider credentials</p>
        <p className="mt-1.5 text-[11px] leading-5 text-sky-100/70">
          Configure <code className="rounded bg-black/20 px-1">AI_API_KEY</code>, <code className="rounded bg-black/20 px-1">AI_BASE_URL</code>, and{' '}
          <code className="rounded bg-black/20 px-1">AI_DEFAULT_MODEL</code> in Supabase Edge Function secrets. Never place provider keys in
          <code className="rounded bg-black/20 px-1"> VITE_*</code> variables or this interface. The AI health indicator below reflects
          model configuration, not whether a provider key has been validated.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading models" /></div>
      ) : models.length ? (
        <div className="space-y-3">
          {models.map((model) => (
            <div key={model.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                    {model.is_premium ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{model.display_name}</h3>
                      <Badge tone={model.enabled ? 'accent' : 'neutral'}>{model.enabled ? 'Enabled' : 'Disabled'}</Badge>
                      {model.is_premium ? <Badge tone="violet">Premium</Badge> : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[10px] text-slate-500">{model.provider} / {model.model_id}</p>
                    <p className="mt-1.5 max-w-2xl text-[11px] leading-5 text-slate-500">{model.description || 'No description set.'}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={model.enabled}
                      disabled={savingId === model.id}
                      onChange={(event) => void update(model, { enabled: event.target.checked })}
                      className="accent-emerald-400"
                    />
                    Enabled
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-slate-400">
                    <input
                      type="checkbox"
                      checked={model.is_premium}
                      disabled={savingId === model.id}
                      onChange={(event) => void update(model, { is_premium: event.target.checked })}
                      className="accent-violet-400"
                    />
                    Premium
                  </label>
                  {savingId === model.id ? <Save className="h-4 w-4 animate-pulse text-accent" /> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={KeyRound}
          title="No AI models configured"
          description="Seed the ai_models table with the provider models you intend to offer. Members cannot select a model until one is enabled."
        />
      )}

      <p className="mt-4 text-[10px] leading-4 text-slate-600">
        Disabling a model prevents new requests from selecting it. Conversations that used it remain readable.
        Premium models require an eligible paid plan, and the server re-checks plan eligibility on every request.
      </p>
    </div>
  )
}
