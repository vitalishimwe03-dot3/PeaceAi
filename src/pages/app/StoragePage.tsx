import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDownToLine,
  File,
  FileArchive,
  FileCode2,
  FileImage,
  FileJson,
  FileText,
  Folder,
  FolderPlus,
  HardDrive,
  MoreHorizontal,
  Pencil,
  Search,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader, Progress } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  createFolder,
  deleteFile,
  deleteFolder,
  downloadFile,
  getFileDownloadUrl,
  getUsageSummary,
  listFileShares,
  listFiles,
  listFolders,
  renameFile,
  revokeFileShare,
  shareFile,
  uploadFile,
} from '@/lib/repository'
import { cn, formatBytes, formatDate, getErrorMessage } from '@/lib/utils'
import type { FileShare, Folder as FolderType, StoredFile, UsageSummary } from '@/types/domain'

export function StoragePage() {
  const { user, isPreview } = useAuth()
  const { toast } = useToast()
  const [files, setFiles] = useState<StoredFile[]>([])
  const [folders, setFolders] = useState<FolderType[]>([])
  const [usage, setUsage] = useState<UsageSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [creatingFolder, setCreatingFolder] = useState(false)
  const [previewFile, setPreviewFile] = useState<StoredFile | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [renameTarget, setRenameTarget] = useState<StoredFile | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<StoredFile | null>(null)
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<FolderType | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [shareTarget, setShareTarget] = useState<StoredFile | null>(null)
  const [shareEmail, setShareEmail] = useState('')
  const [shares, setShares] = useState<FileShare[]>([])
  const [sharesLoading, setSharesLoading] = useState(false)
  const [sharing, setSharing] = useState(false)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    if (!user) return
    setLoading(true)
    try {
      const [fileRows, folderRows, usageRow] = await Promise.all([
        listFiles(user.id),
        listFolders(user.id),
        getUsageSummary(user.id),
      ])
      setFiles(fileRows)
      setFolders(folderRows)
      setUsage(usageRow)
    } catch (err) {
      toast({ title: 'Could not load storage', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return files.filter((file) => {
      const folderMatch = selectedFolder === 'all' || file.folder_id === selectedFolder
      const queryMatch = !lower || file.name.toLowerCase().includes(lower)
      return folderMatch && queryMatch
    })
  }, [files, selectedFolder, query])

  if (!user) return null
  const used = usage?.storageUsed ?? files.reduce((sum, file) => sum + file.size_bytes, 0)
  const quota = usage?.storageQuota ?? user.profile.storage_quota_bytes

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList?.length) return
    setUploading(true)
    const uploaded: StoredFile[] = []
    try {
      for (const file of Array.from(fileList)) {
        const record = await uploadFile(user.id, file, selectedFolder === 'all' ? null : selectedFolder)
        uploaded.push(record)
      }
      setFiles((current) => [...uploaded, ...current])
      const nextUsage = await getUsageSummary(user.id)
      setUsage(nextUsage)
      toast({ title: `${uploaded.length} file${uploaded.length === 1 ? '' : 's'} uploaded`, tone: 'success' })
    } catch (err) {
      toast({ title: 'Upload failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const addFolder = async () => {
    if (!folderName.trim()) return
    setCreatingFolder(true)
    try {
      const folder = await createFolder(user.id, folderName.trim())
      setFolders((current) => [...current, folder])
      setNewFolderOpen(false)
      setFolderName('')
      toast({ title: 'Folder created', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not create folder', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setCreatingFolder(false)
    }
  }

  const openPreview = async (file: StoredFile) => {
    setPreviewFile(file)
    setPreviewUrl('')
    setPreviewText('')
    setPreviewError('')
    setPreviewLoading(true)
    try {
      const url = await getFileDownloadUrl(file)
      setPreviewUrl(url)
      const isText =
        file.mime_type.startsWith('text/') ||
        ['application/json', 'application/xml', 'application/javascript'].includes(file.mime_type) ||
        /\.(md|txt|json|csv|ts|tsx|js|jsx|py|html|css|sql|yaml|yml|xml|sh|java|go|rs|php|rb|toml)$/i.test(file.name)
      if (isText) {
        const response = await fetch(url)
        if (!response.ok) throw new Error('The preview could not be read.')
        const text = await response.text()
        setPreviewText(text.slice(0, 200000))
      }
    } catch (err) {
      setPreviewError(getErrorMessage(err, 'Preview is not available for this file.'))
    } finally {
      setPreviewLoading(false)
    }
  }

  const doDownload = async (file: StoredFile) => {
    try {
      await downloadFile(file)
    } catch (err) {
      toast({ title: 'Download failed', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const doRename = async () => {
    if (!renameTarget || !renameValue.trim()) return
    try {
      await renameFile(renameTarget.id, renameValue.trim())
      setFiles((current) => current.map((file) => file.id === renameTarget.id ? { ...file, name: renameValue.trim() } : file))
      setRenameTarget(null)
      toast({ title: 'File renamed', tone: 'success' })
    } catch (err) {
      toast({ title: 'Rename failed', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const doDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteFile(deleteTarget)
      setFiles((current) => current.filter((file) => file.id !== deleteTarget.id))
      setUsage(await getUsageSummary(user.id))
      setDeleteTarget(null)
      toast({ title: 'File deleted', tone: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const doDeleteFolder = async () => {
    if (!folderDeleteTarget) return
    setDeleting(true)
    try {
      await deleteFolder(folderDeleteTarget.id)
      setFolders((current) => current.filter((folder) => folder.id !== folderDeleteTarget.id))
      setFiles((current) => current.filter((file) => file.folder_id !== folderDeleteTarget.id))
      setFolderDeleteTarget(null)
      if (selectedFolder === folderDeleteTarget.id) setSelectedFolder('all')
      toast({ title: 'Folder deleted', tone: 'success' })
    } catch (err) {
      toast({ title: 'Delete failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  const openShare = async (file: StoredFile) => {
    setShareTarget(file)
    setShares([])
    setSharesLoading(true)
    try {
      setShares(await listFileShares(file.id))
    } catch (err) {
      toast({ title: 'Could not load sharing', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSharesLoading(false)
    }
  }

  const doShare = async () => {
    if (!shareTarget || !shareEmail.trim()) return
    setSharing(true)
    try {
      await shareFile(shareTarget.id, user.id, shareEmail.trim())
      setShares(await listFileShares(shareTarget.id))
      setShareEmail('')
      toast({ title: 'File shared', description: 'The recipient can access only this file.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Share failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSharing(false)
    }
  }

  const revoke = async (shareId: string) => {
    try {
      await revokeFileShare(shareId)
      if (shareTarget) setShares(await listFileShares(shareTarget.id))
      toast({ title: 'Access revoked', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not revoke access', description: getErrorMessage(err), tone: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Cloud Storage"
        description="Private file storage with folders and explicit sharing. Your quota is enforced on the server."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setNewFolderOpen(true)}>
              <FolderPlus className="h-4 w-4" /> New folder
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="sr-only"
              onChange={(event) => void handleUpload(event.target.files)}
              accept="text/*,application/json,application/pdf,application/zip,image/*,.md,.csv,.ts,.tsx,.js,.jsx,.py,.sql,.yaml,.yml,.xml,.go,.rs,.java,.php,.rb,.sh"
            />
            <Button size="sm" loading={uploading} onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" /> Upload files
            </Button>
          </>
        }
      />

      <div className="mb-5 card-surface p-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-white"><HardDrive className="h-4 w-4 text-accent" /> Storage quota</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatBytes(used)} of {formatBytes(quota)} used · {formatBytes(Math.max(0, quota - used))} remaining
            </p>
          </div>
          <Badge tone={used / quota > 0.9 ? 'rose' : 'accent'}>{Math.round((used / Math.max(quota, 1)) * 100)}% used</Badge>
        </div>
        <div className="mt-4">
          <Progress value={used} max={quota} tone={used / quota > 0.9 ? 'rose' : 'accent'} />
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          6 GiB default allocation. Uploads are validated for type and size; archives are never executed.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="card-surface h-fit p-3">
          <p className="px-2 pb-2 text-[10px] uppercase tracking-wider text-slate-600">Folders</p>
          <button
            type="button"
            onClick={() => setSelectedFolder('all')}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs',
              selectedFolder === 'all' ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-white/[0.04]',
            )}
          >
            <span className="flex items-center gap-2"><Folder className="h-4 w-4" /> All files</span>
            <span className="text-[10px]">{files.length}</span>
          </button>
          {folders.map((folder) => {
            const count = files.filter((file) => file.folder_id === folder.id).length
            return (
              <div key={folder.id} className="group flex items-center">
                <button
                  type="button"
                  onClick={() => setSelectedFolder(folder.id)}
                  className={cn(
                    'flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg px-3 py-2 text-xs',
                    selectedFolder === folder.id ? 'bg-accent/10 text-accent' : 'text-slate-400 hover:bg-white/[0.04]',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2"><Folder className="h-4 w-4 shrink-0" /> <span className="truncate">{folder.name}</span></span>
                  <span className="text-[10px]">{count}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFolderDeleteTarget(folder)}
                  className="hidden rounded p-1 text-slate-600 hover:text-rose-300 group-hover:block"
                  aria-label={`Delete ${folder.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
          {!folders.length ? <p className="px-3 py-4 text-center text-[11px] text-slate-600">No folders yet.</p> : null}
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="w-full max-w-sm">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search files"
                aria-label="Search files"
                leadingIcon={<Search className="h-4 w-4" />}
              />
            </div>
            <p className="text-[11px] text-slate-500">{filtered.length} item{filtered.length === 1 ? '' : 's'}</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-20"><Spinner label="Loading files" /></div>
          ) : filtered.length ? (
            <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
              <div className="hidden grid-cols-[1fr_100px_130px_110px] gap-3 border-b border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-[10px] uppercase tracking-wider text-slate-600 sm:grid">
                <span>Name</span><span>Size</span><span>Added</span><span className="text-right">Actions</span>
              </div>
              {filtered.map((file) => (
                <div key={file.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 hover:bg-white/[0.02] sm:grid-cols-[1fr_100px_130px_110px]">
                  <button type="button" onClick={() => void openPreview(file)} className="flex min-w-0 items-center gap-3 text-left">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] text-slate-400">
                      <FileIcon file={file} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-medium text-slate-200">{file.name}</span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[10px] text-slate-600">
                        {file.mime_type || 'File'}
                        {file.shared_with_me ? <Badge tone="blue">Shared</Badge> : null}
                      </span>
                    </span>
                  </button>
                  <span className="hidden text-[11px] text-slate-500 sm:block">{formatBytes(file.size_bytes)}</span>
                  <span className="hidden text-[11px] text-slate-500 sm:block">{formatDate(file.created_at)}</span>
                  <div className="relative flex items-center justify-end gap-0.5">
                    <button type="button" onClick={() => void doDownload(file)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Download ${file.name}`}>
                      <ArrowDownToLine className="h-4 w-4" />
                    </button>
                    {!file.shared_with_me ? (
                      <>
                        <button type="button" onClick={() => void openShare(file)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Share ${file.name}`}>
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => setMenuOpen(menuOpen === file.id ? null : file.id)} className="rounded-lg p-1.5 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`More actions for ${file.name}`} aria-expanded={menuOpen === file.id}>
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </>
                    ) : null}
                    {menuOpen === file.id ? (
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-xl border border-white/10 bg-ink-900 p-1 shadow-2xl">
                        <button
                          type="button"
                          onClick={() => {
                            setRenameTarget(file)
                            setRenameValue(file.name)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-300 hover:bg-white/5"
                        >
                          <Pencil className="h-3.5 w-3.5" /> Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteTarget(file)
                            setMenuOpen(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-rose-300 hover:bg-rose-400/10"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Upload}
              title={query ? 'No files match your search' : 'No files here yet'}
              description={query ? 'Try a different file name or clear the search.' : 'Upload source code, text, JSON, CSV, Markdown, PDFs, ZIP archives, or images.'}
              action={
                <Button size="sm" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Upload a file
                </Button>
              }
            />
          )}

          <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] leading-5 text-slate-500">
            Files are private by default. Sharing grants access to a single file, never your whole
            storage. Uploaded code is never executed automatically. {isPreview ? 'Preview uploads are stored in this browser only.' : ''}
          </div>
        </div>
      </div>

      <Modal
        open={newFolderOpen}
        onClose={() => setNewFolderOpen(false)}
        title="Create folder"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewFolderOpen(false)}>Cancel</Button>
            <Button onClick={() => void addFolder()} loading={creatingFolder} disabled={!folderName.trim()}>Create</Button>
          </>
        }
      >
        <Input label="Folder name" value={folderName} onChange={(event) => setFolderName(event.target.value)} maxLength={80} onKeyDown={(event) => { if (event.key === 'Enter') void addFolder() }} />
      </Modal>

      <Modal
        open={Boolean(renameTarget)}
        onClose={() => setRenameTarget(null)}
        title="Rename file"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRenameTarget(null)}>Cancel</Button>
            <Button onClick={() => void doRename()} disabled={!renameValue.trim()}>Save</Button>
          </>
        }
      >
        <Input label="File name" value={renameValue} onChange={(event) => setRenameValue(event.target.value)} maxLength={140} />
      </Modal>

      <Modal
        open={Boolean(previewFile)}
        onClose={() => setPreviewFile(null)}
        title={previewFile?.name ?? 'File preview'}
        description={previewFile ? `${formatBytes(previewFile.size_bytes)} · ${previewFile.mime_type || 'Unknown type'}` : undefined}
        className="max-w-3xl"
        footer={
          previewFile ? (
            <Button variant="outline" onClick={() => void doDownload(previewFile)}>
              <ArrowDownToLine className="h-4 w-4" /> Download
            </Button>
          ) : undefined
        }
      >
        {previewLoading ? (
          <div className="flex justify-center py-12"><Spinner label="Preparing preview" /></div>
        ) : previewError ? (
          <p className="rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4 text-xs text-amber-200/80">{previewError}</p>
        ) : previewFile?.mime_type.startsWith('image/') ? (
          <img src={previewUrl} alt={previewFile.name} className="max-h-[60vh] w-full rounded-xl object-contain" />
        ) : previewFile?.mime_type === 'application/pdf' ? (
          <iframe src={previewUrl} title={previewFile.name} className="h-[60vh] w-full rounded-xl border border-white/10 bg-white" />
        ) : previewText ? (
          <pre className="max-h-[60vh] overflow-auto rounded-xl border border-white/10 bg-ink-950 p-4 font-mono text-xs leading-6 text-slate-300">{previewText}</pre>
        ) : (
          <p className="rounded-xl border border-white/[0.08] p-5 text-center text-xs text-slate-400">
            This file type cannot be previewed in the browser. Use download to open it in a suitable application.
          </p>
        )}
        <p className="mt-3 text-[10px] text-slate-600">Preview access uses a short-lived signed URL in production.</p>
      </Modal>

      <Modal
        open={Boolean(shareTarget)}
        onClose={() => setShareTarget(null)}
        title="Share file"
        description="The recipient can download this file. They cannot access your other files or folders."
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void doShare()
          }}
          className="flex gap-2"
        >
          <Input
            aria-label="Recipient email"
            type="email"
            value={shareEmail}
            onChange={(event) => setShareEmail(event.target.value)}
            placeholder="teammate@example.com"
            containerClassName="flex-1"
            required
          />
          <Button type="submit" loading={sharing} className="h-[42px]">Share</Button>
        </form>
        <div className="mt-5 border-t border-white/[0.07] pt-4">
          <h3 className="text-xs font-medium text-slate-300">People with access</h3>
          {sharesLoading ? (
            <div className="flex justify-center py-5"><Spinner /></div>
          ) : shares.length ? (
            <div className="mt-3 space-y-2">
              {shares.map((share) => (
                <div key={share.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] p-3">
                  <span className="text-xs text-slate-300">{share.shared_with_profile?.full_name || share.shared_with_profile?.email || 'PeaceAI user'}</span>
                  <button type="button" onClick={() => void revoke(share.id)} className="text-[11px] text-rose-300 hover:text-rose-200">Revoke</button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-500">This file is not shared yet.</p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void doDelete()}
        title="Delete file?"
        description={`"${deleteTarget?.name ?? 'This file'}" will be permanently deleted. Existing share links will stop working.`}
        confirmLabel="Delete file"
        destructive
        loading={deleting}
      />

      <ConfirmDialog
        open={Boolean(folderDeleteTarget)}
        onClose={() => setFolderDeleteTarget(null)}
        onConfirm={() => void doDeleteFolder()}
        title="Delete folder?"
        description={`"${folderDeleteTarget?.name ?? 'This folder'}" and its file records will be removed. This cannot be undone.`}
        confirmLabel="Delete folder"
        destructive
        loading={deleting}
      />
    </div>
  )
}

function FileIcon({ file }: { file: StoredFile }) {
  const name = file.name.toLowerCase()
  if (file.mime_type.startsWith('image/')) return <FileImage className="h-4 w-4" />
  if (name.endsWith('.zip') || file.mime_type.includes('zip')) return <FileArchive className="h-4 w-4" />
  if (name.endsWith('.json')) return <FileJson className="h-4 w-4" />
  if (/\.(ts|tsx|js|jsx|py|sql|html|css|go|rs|java|php|rb|sh)$/.test(name)) return <FileCode2 className="h-4 w-4" />
  if (file.mime_type.startsWith('text/') || /\.(md|txt|csv|yaml|yml|xml)$/.test(name)) return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}
