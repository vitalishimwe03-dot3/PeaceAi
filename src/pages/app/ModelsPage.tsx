import { useEffect, useState } from 'react'
import {
  Bot,
  Brain,
  CheckCircle2,
  Cpu,
  Download,
  Plus,
  Sparkles,
  Store,
  UploadCloud,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Input, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import {
  buyModelListing,
  createModelTrainingJob,
  listAiModels,
  listKnowledgeDatasets,
  listModelListings,
  listModelTrainingJobs,
  listUserModels,
  publishModelListing,
} from '@/lib/repository'
import { formatRwf, getErrorMessage } from '@/lib/utils'
import type { AiModel, KnowledgeDataset, ModelListing, ModelTrainingJob } from '@/types/domain'

const tabs = [
  { id: 'available', label: 'Available models', icon: Bot },
  { id: 'train', label: 'Train a model', icon: Brain },
  { id: 'marketplace', label: 'Marketplace', icon: Store },
  { id: 'mine', label: 'My models', icon: Cpu },
] as const

type Tab = (typeof tabs)[number]['id']

export function ModelsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [tab, setTab] = useState<Tab>('available')
  const [models, setModels] = useState<AiModel[]>([])
  const [datasets, setDatasets] = useState<KnowledgeDataset[]>([])
  const [jobs, setJobs] = useState<ModelTrainingJob[]>([])
  const [listings, setListings] = useState<ModelListing[]>([])
  const [myModels, setMyModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [trainingOpen, setTrainingOpen] = useState(false)
  const [publishOpen, setPublishOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', baseModelId: '', datasetId: '' })
  const [publishForm, setPublishForm] = useState({ modelId: '', price: '5000' })

  const load = () => {
    if (!user) return
    setLoading(true)
    Promise.all([
      listAiModels(),
      listKnowledgeDatasets(),
      listModelTrainingJobs(user.id),
      listModelListings(),
      listUserModels(user.id),
    ])
      .then(([allModels, allDatasets, allJobs, allListings, owned]) => {
        setModels(allModels)
        setDatasets(allDatasets)
        setJobs(allJobs)
        setListings(allListings)
        setMyModels(owned)
        setForm((current) => ({
          ...current,
          baseModelId: current.baseModelId || allModels.find((model) => model.source === 'peaceai')?.id || allModels[0]?.id || '',
          datasetId: current.datasetId || allDatasets[0]?.id || '',
        }))
        setPublishForm((current) => ({
          ...current,
          modelId: current.modelId || owned[0]?.id || '',
        }))
      })
      .catch((err) => toast({ title: 'Could not load models', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const train = async () => {
    if (!user) return
    if (!form.name.trim() || !form.baseModelId) {
      toast({ title: 'Add a model name', description: 'Choose a base model to train from.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await createModelTrainingJob(user.id, {
        name: form.name.trim(),
        baseModelId: form.baseModelId,
        datasetId: form.datasetId || null,
      })
      toast({ title: 'Training started', description: 'Your custom model will appear in My models when ready.', tone: 'success' })
      setTrainingOpen(false)
      setForm({ name: '', baseModelId: form.baseModelId, datasetId: form.datasetId })
      load()
    } catch (err) {
      toast({ title: 'Could not start training', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const publish = async () => {
    if (!user) return
    if (!publishForm.modelId) {
      toast({ title: 'Choose a model', description: 'Select one of your trained models.', tone: 'error' })
      return
    }
    const price = Number(publishForm.price)
    if (!Number.isFinite(price) || price <= 0) {
      toast({ title: 'Enter a valid price', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      await publishModelListing(user.id, publishForm.modelId, price)
      toast({ title: 'Model published', description: 'It is now visible in the marketplace.', tone: 'success' })
      setPublishOpen(false)
      load()
    } catch (err) {
      toast({ title: 'Could not publish model', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const buy = async (listing: ModelListing) => {
    try {
      await buyModelListing(listing.id)
      toast({ title: 'Model unlocked', description: 'The model is now available in your workspace.', tone: 'success' })
      load()
    } catch (err) {
      toast({ title: 'Could not complete purchase', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const peaceAiModels = models.filter((model) => (model.source ?? 'peaceai') === 'peaceai')
  const externalModels = models.filter((model) => model.source === 'external')

  return (
    <div>
      <PageHeader
        title="AI models"
        description="Browse PeaceAI and external models, train custom models on your knowledge, and sell them in the marketplace."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => setPublishOpen(true)} disabled={!myModels.length}>
              <UploadCloud className="h-4 w-4" /> Publish
            </Button>
            <Button size="sm" onClick={() => setTrainingOpen(true)}>
              <Plus className="h-4 w-4" /> Train model
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((item) => {
          const Icon = item.icon
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs transition-colors ${
                tab === item.id
                  ? 'border-accent/40 bg-accent/10 text-accent'
                  : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading models" />
        </div>
      ) : null}

      {!loading && tab === 'available' ? (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">PeaceAI models</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {peaceAiModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
            {!peaceAiModels.length ? (
              <EmptyState icon={Bot} title="No PeaceAI models" description="No models are configured yet." />
            ) : null}
          </section>
          <section>
            <h2 className="mb-3 text-sm font-semibold text-white">External provider models</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {externalModels.map((model) => (
                <ModelCard key={model.id} model={model} />
              ))}
            </div>
            {!externalModels.length ? (
              <EmptyState icon={Sparkles} title="No external models" description="External providers are not configured." />
            ) : null}
          </section>
        </div>
      ) : null}

      {!loading && tab === 'train' ? (
        <div className="space-y-4">
          <div className="card-surface p-5">
            <h2 className="text-sm font-semibold text-white">Training jobs</h2>
            {jobs.length ? (
              <div className="mt-3 space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-white">{job.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Base: {models.find((model) => model.id === job.base_model_id)?.display_name ?? job.base_model_id}
                          {job.dataset_id ? ` · Dataset: ${datasets.find((dataset) => dataset.id === job.dataset_id)?.name ?? job.dataset_id}` : ''}
                        </p>
                      </div>
                      <Badge tone={job.status === 'ready' ? 'accent' : job.status === 'failed' ? 'rose' : 'amber'}>
                        {job.status} · {job.progress}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Brain} title="No training jobs" description="Start your first training run to create a custom model." />
            )}
          </div>
          <Button onClick={() => setTrainingOpen(true)}>
            <Plus className="h-4 w-4" /> Start training
          </Button>
        </div>
      ) : null}

      {!loading && tab === 'marketplace' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {listings.length ? (
            listings.map((listing) => {
              const model = models.find((item) => item.id === listing.model_id) ?? myModels.find((item) => item.id === listing.model_id)
              return (
                <article key={listing.id} className="card-surface p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-white">{model?.display_name ?? 'Custom model'}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">{model?.description || 'Trained model available for purchase.'}</p>
                    </div>
                    <Badge tone="violet">{formatRwf(listing.price_rwf)}</Badge>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-500">{listing.downloads} downloads</span>
                    <Button size="sm" onClick={() => void buy(listing)}>
                      <Download className="h-3.5 w-3.5" /> Get model
                    </Button>
                  </div>
                </article>
              )
            })
          ) : (
            <EmptyState icon={Store} title="Marketplace is empty" description="Publish a trained model to start selling it." />
          )}
        </div>
      ) : null}

      {!loading && tab === 'mine' ? (
        <div className="space-y-3">
          {myModels.length ? (
            myModels.map((model) => (
              <div key={model.id} className="card-surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-white">{model.display_name}</h3>
                    <p className="mt-0.5 text-[11px] text-slate-500">{model.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone="accent">{model.training_status ?? 'ready'}</Badge>
                    {model.price_rwf ? <Badge tone="violet">{formatRwf(model.price_rwf)}</Badge> : null}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <EmptyState icon={Cpu} title="No custom models yet" description="Train a model to create your own AI." />
          )}
        </div>
      ) : null}

      <Modal
        open={trainingOpen}
        onClose={() => setTrainingOpen(false)}
        title="Train a custom model"
        description="Choose a base model and optional knowledge dataset. Training runs on your account quota."
        footer={
          <>
            <Button variant="ghost" onClick={() => setTrainingOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void train()} loading={saving}>
              Start training
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Model name"
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
            placeholder="My coding assistant"
            maxLength={80}
          />
          <Select
            label="Base model"
            value={form.baseModelId}
            onChange={(event) => setForm((current) => ({ ...current, baseModelId: event.target.value }))}
            options={models
              .filter((model) => model.trainable || model.source === 'peaceai')
              .map((model) => ({ value: model.id, label: model.display_name }))}
          />
          <Select
            label="Training dataset (optional)"
            value={form.datasetId}
            onChange={(event) => setForm((current) => ({ ...current, datasetId: event.target.value }))}
            options={[{ value: '', label: 'None' }, ...datasets.map((dataset) => ({ value: dataset.id, label: dataset.name }))]}
          />
        </div>
      </Modal>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        title="Publish a model"
        description="List one of your trained models in the marketplace."
        footer={
          <>
            <Button variant="ghost" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void publish()} loading={saving}>
              Publish
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Model"
            value={publishForm.modelId}
            onChange={(event) => setPublishForm((current) => ({ ...current, modelId: event.target.value }))}
            options={myModels.map((model) => ({ value: model.id, label: model.display_name }))}
          />
          <Input
            label="Price (RWF)"
            type="number"
            value={publishForm.price}
            onChange={(event) => setPublishForm((current) => ({ ...current, price: event.target.value }))}
            min={1}
          />
        </div>
      </Modal>
    </div>
  )
}

function ModelCard({ model }: { model: AiModel }) {
  return (
    <article className="card-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
            {model.source === 'external' ? <Sparkles className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-medium text-white">{model.display_name}</h3>
              <Badge tone={model.enabled ? 'accent' : 'neutral'}>{model.enabled ? 'Enabled' : 'Disabled'}</Badge>
              {model.is_premium ? <Badge tone="violet">Premium</Badge> : null}
              {model.source === 'external' ? <Badge tone="blue">External</Badge> : <Badge tone="neutral">PeaceAI</Badge>}
            </div>
            <p className="mt-0.5 font-mono text-[10px] text-slate-500">{model.provider} / {model.model_id}</p>
            <p className="mt-1.5 max-w-xl text-[11px] leading-5 text-slate-500">{model.description || 'No description set.'}</p>
            {model.capabilities?.length ? (
              <div className="mt-2 flex flex-wrap gap-1">
                {model.capabilities.map((capability) => (
                  <Badge key={capability} tone="neutral">{capability}</Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>
        {model.trainable ? <Badge tone="amber">Trainable</Badge> : <CheckCircle2 className="h-4 w-4 text-slate-600" />}
      </div>
    </article>
  )
}
