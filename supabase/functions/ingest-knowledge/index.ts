import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  HttpError,
  handleError,
  json,
  parseJson,
  preflight,
  requireActiveProfile,
  requireUser,
} from '../_shared/http.ts'

interface IngestRequest {
  name?: string
  description?: string
  content?: string
  source?: string
}

const MAX_CONTENT = 120_000
const MAX_CHARS = 12_000
const OVERLAP = 400
const MAX_CHUNKS = 60
const MAX_DATASETS_PER_USER = 50

function chunkText(text: string): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\u0000/g, '').trim()
  if (!clean) return []
  const chunks: string[] = []
  let i = 0
  while (i < clean.length && chunks.length < MAX_CHUNKS) {
    let end = Math.min(i + MAX_CHARS, clean.length)
    if (end < clean.length) {
      const breakAt = clean.lastIndexOf('\n\n', end)
      const lineAt = clean.lastIndexOf('\n', end)
      const spaceAt = clean.lastIndexOf(' ', end)
      const pivot = Math.max(breakAt, lineAt, spaceAt)
      if (pivot > i + MAX_CHARS / 2) end = pivot
    }
    const chunk = clean.slice(i, end).trim()
    if (chunk) chunks.push(chunk)
    if (end >= clean.length) break
    i = Math.max(end - OVERLAP, i + 1)
  }
  return chunks
}

serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)

  try {
    const { user, admin } = await requireUser(req)
    await requireActiveProfile(admin, user.id)
    const body = await parseJson<IngestRequest>(req)

    const name = (body.name || 'AI knowledge').trim().slice(0, 120)
    const description = (body.description || body.source || 'Added by PeaceAI assistant.').trim().slice(0, 500)
    const content = (body.content || '').trim()
    if (!name) throw new HttpError(400, 'A dataset name is required.')
    if (content.length < 20) throw new HttpError(400, 'Provide at least 20 characters of content to ingest.')
    if (content.length > MAX_CONTENT) throw new HttpError(400, `Content must be ${MAX_CONTENT.toLocaleString()} characters or fewer.`)

    const { count } = await admin
      .from('knowledge_datasets')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', user.id)
    if ((count ?? 0) >= MAX_DATASETS_PER_USER) {
      throw new HttpError(429, `Knowledge limit reached (${MAX_DATASETS_PER_USER} datasets). Remove old entries first.`)
    }

    const chunks = chunkText(content)
    if (!chunks.length) throw new HttpError(400, 'No indexable content found.')

    const { data: dataset, error } = await admin
      .from('knowledge_datasets')
      .insert({
        name,
        description,
        storage_path: `self/${user.id}/${crypto.randomUUID()}.txt`,
        mime_type: 'text/plain',
        size_bytes: new TextEncoder().encode(content).length,
        status: 'processing',
        chunk_count: 0,
        uploaded_by: user.id,
      })
      .select('*')
      .single()
    if (error || !dataset) throw new HttpError(500, 'Could not create knowledge dataset.')

    const rows = chunks.map((chunk, index) => ({
      dataset_id: dataset.id,
      chunk_index: index,
      content: chunk,
      token_estimate: Math.ceil(chunk.length / 4),
    }))
    for (let i = 0; i < rows.length; i += 100) {
      const { error: insError } = await admin.from('knowledge_chunks').insert(rows.slice(i, i + 100))
      if (insError) throw insError
    }

    await admin.from('knowledge_datasets').update({
      status: 'ready',
      chunk_count: rows.length,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', dataset.id)

    return json({
      ok: true,
      datasetId: dataset.id,
      name,
      chunkCount: rows.length,
      message: 'Knowledge saved. It can be used in future AI answers (subject to retrieval configuration).',
    })
  } catch (error) {
    return handleError(error)
  }
})