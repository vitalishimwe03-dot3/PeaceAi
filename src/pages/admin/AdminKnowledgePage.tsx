import { useEffect, useRef, useState } from 'react'
import { Database, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Input, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  deleteKnowledgeDataset,
  listKnowledgeDatasets,
  recordAuditEvent,
  uploadKnowledgeDataset,
} from '@/lib/repository'
import { formatBytes, formatDate, getErrorMessage, relativeTime } from '@/lib/utils'
import type { KnowledgeDataset } from '@/types/domain'

export function AdminKnowledgePage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [datasets, setDatasets] = useState<KnowledgeDataset[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [uploading, setUploading] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeDataset | null>(null)
  const [deleting, setDeleting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
    try {
      setDatasets(await listKnowledgeDatasets())
    } catch (err) {
      toast({ title: 'Could not load knowledge datasets', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openUpload = () => {
    setFile(null)
    setName('')
    setDescription('')
    setUploadOpen(true)
  }

  const upload = async () => {
    if (!user || !file || !name.trim()) return
    setUploading(true)
    try {
      const dataset = await uploadKnowledgeDataset(user.id, file, name.trim(), description.trim() || null)
      setDatasets((current) => [dataset, ...current])
      await recordAuditEvent(user.id, 'admin.knowledge_uploaded', 'info', {
        dataset_id: dataset.id,
        name: dataset.name,
        size_bytes: dataset.size_bytes,
      })
      setUploadOpen(false)
      toast({
        title: 'Dataset uploaded',
        description: dataset.status === 'failed' ? dataset.error_message ?? 'Uploaded, but processing failed.' : 'Text is queued for extraction and indexing. Refresh to check status.',
        tone: dataset.status === 'failed' ? 'error' : 'success',
      })
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setUploading(false)
    }
  }

  const remove = async () => {
    if (!user || !deleteTarget) return
    setDeleting(true)
    try {
      await deleteKnowledgeDataset(deleteTarget)
      setDatasets((current) => current.filter((item) => item.id !== deleteTarget.id))
      await recordAuditEvent(user.id, 'admin.knowledge_deleted', 'warning', {
        dataset_id: deleteTarget.id,
        name: deleteTarget.name,
      })
      setDeleteTarget(null)
      toast({ title: 'Dataset deleted', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not delete dataset', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Knowledge bases"
        description="Upload approved documents for retrieval-augmented answers. Only administrators can add or remove sources."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void load(true)} loading={refreshing}>
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button size="sm" onClick={openUpload}><Upload className="h-4 w-4" /> Upload dataset</Button>
          </>
        }
      />

      <div className="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4 text-[11px] leading-5 text-amber-100/70">
        Upload only content you have the right to use. Datasets may contain confidential material, so retrieval is
        restricted to authenticated members and answers should cite their approved sources. Malicious instructions
        embedded in documents must not be treated as system instructions.
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading datasets" /></div>
      ) : datasets.length ? (
        <div className="space-y-2.5">
          {datasets.map((dataset) => (
            <div key={dataset.id} className="card-surface flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="truncate text-xs font-medium text-slate-200">{dataset.name}</h3>
                  <Badge tone={statusTone(dataset.status)}>{dataset.status}</Badge>
                  {dataset.chunk_count ? <Badge tone="neutral">{dataset.chunk_count} chunks</Badge> : null}
                </div>
                <p className="mt-0.5 truncate text-[10px] text-slate-600">
                  {dataset.mime_type} · {formatBytes(dataset.size_bytes)} · uploaded {relativeTime(dataset.created_at)} · {formatDate(dataset.created_at)}
                </p>
                {dataset.description ? <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-slate-500">{dataset.description}</p> : null}
                {dataset.error_message ? <p className="mt-1 text-[10px] text-rose-300">{dataset.error_message}</p> : null}
              </div>
              <button type="button" onClick={() => setDeleteTarget(dataset)} className="rounded-lg p-2 text-slate-500 hover:bg-rose-400/10 hover:text-rose-300" aria-label={`Delete ${dataset.name}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Database}
          title="No knowledge datasets"
          description="Upload approved text, Markdown, CSV, JSON, PDF, or Word documents to ground assistant answers in your content."
          action={<Button size="sm" onClick={openUpload}><Upload className="h-4 w-4" /> Upload dataset</Button>}
        />
      )}

      <p className="mt-4 text-[10px] leading-4 text-slate-600">
        Processing extracts text, chunks it, and stores embeddings when the AI provider is configured. Without an
        embeddings provider, the dataset remains queued and retrieval is unavailable. The interface never claims a
        dataset is ready unless the server marks it ready.
      </p>

      <Modal
        open={uploadOpen}
        onClose={() => { if (!uploading) setUploadOpen(false) }}
        title="Upload knowledge dataset"
        description="Accepted: text, Markdown, CSV, JSON, PDF, and Word documents up to 50 MB."
        footer={
          <>
            <Button variant="ghost" onClick={() => setUploadOpen(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={() => void upload()} loading={uploading} disabled={!file || !name.trim()}>Upload and process</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="knowledge-file" className="mb-1.5 block text-sm font-medium text-slate-200">Source file</label>
            <input
              ref={fileRef}
              id="knowledge-file"
              type="file"
              accept=".txt,.md,.csv,.json,.pdf,.doc,.docx,text/*,application/json,application/pdf"
              onChange={(event) => {
                const selected = event.target.files?.[0] ?? null
                setFile(selected)
                if (selected && !name) setName(selected.name.replace(/\.[^.]+$/, ''))
              }}
              className="block w-full cursor-pointer rounded-xl border border-white/10 bg-ink-950/70 px-3.5 py-2.5 text-xs text-slate-400 file:mr-3 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
            />
            {file ? <p className="mt-1.5 text-[10px] text-slate-500">{file.name} · {formatBytes(file.size)}</p> : null}
          </div>
          <Input label="Dataset name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          <Textarea
            label="Description (optional)"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            maxLength={500}
            placeholder="What this source contains and how it should be used."
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void remove()}
        title="Delete dataset?"
        description={`"${deleteTarget?.name ?? 'This dataset'}" and its extracted chunks will be removed. Answers will no longer cite it. This cannot be undone.`}
        confirmLabel="Delete dataset"
        destructive
        loading={deleting}
      />
    </div>
  )
}
