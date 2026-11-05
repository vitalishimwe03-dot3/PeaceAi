import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import {
  HttpError,
  handleError,
  json,
  parseJson,
  preflight,
  requireActiveProfile,
  requireAdmin,
  requireUser,
  serviceClient,
} from '../_shared/http.ts'

const MAX_CHARS = 12_000
const OVERLAP = 400
const MAX_CHUNKS = 400

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

async function extractText(blob: Blob, mime: string, name: string): Promise<string> {
  const lower = (name || '').toLower()
  const type = (mime || '').toLowerCase()
  if (type.includes('json') || lower.endsWith('.json')) {
    const raw = await blob.text()
    try {
      return JSON.stringify(JSON.parse(raw), null, 2)
    } catch {
      return raw
    }
  }
  if (
    type.startsWith('text/') ||
    type.includes('csv') ||
    type.includes('markdown') ||
    type.includes('xml') ||
    /\.(txt|md|csv|ts|tsx|js|jsx|py|html|css|sql|ya?ml|xml|sh|java|go|rs|php|rb|toml)$/i.test(lower)
  ) {
    return await blob.text()
  }
  // PDF/DOCX extraction requires additional parsers not bundled here.
  // Upload text/markdown/csv/json for reliable indexing, or extend this function.
  return await blob.text()
}

serve(async (req) => {
  const options = preflight(req)
  if (options) return options
  if (req.method !== 'POST') return json({ error: 'Only POST is supported.' }, 405)

  const admin = serviceClient()
  let datasetId = ''
  try {
    // Allow admin users or internal service-triggered calls via service key context.
    const auth = req.headers.get('Authorization') ?? ''
    if (auth.toLowerCase().startsWith('bearer ')) {
      const token = auth.slice(7).trim()
      const { data } = await admin.auth.getUser(token)
      if (data.user) {
        await requireActiveProfile(admin, data.user.id)
        await requireAdmin(admin, data.user.id)
      }
    }

    const body = await parseJson<{ datasetId?: string }>(req)
    datasetId = (body.datasetId || '').trim()
    if (!datasetId) throw new HttpError(400, 'datasetId is required.')

    const { data: dataset, error } = await admin
      .from('knowledge_datasets')
      .select('*')
      .eq('id', datasetId)
      .maybeSingle()
    if (error) throw new HttpError(500, 'Could not load dataset.')
    if (!dataset) throw new HttpError(404, 'Dataset not found.')

    await admin
      .from('knowledge_datasets')
      .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', datasetId)

    const { data: file, error: dlError } = await admin.storage.from('knowledge').download(dataset.storage_path)
    if (dlError || !file) throw new HttpError(400, 'Could not read the uploaded file from storage.')

    const text = await extractText(file, dataset.mime_type || '', dataset.name || dataset.storage_path)
    const chunks = chunkText(text)
    if (!chunks.length) {
      await admin.from('knowledge_datasets').update({
        status: 'failed',
        chunk_count: 0,
        error_message: 'No extractable text found. Upload text, Markdown, CSV, or JSON for reliable indexing.',
        updated_at: new Date().toISOString(),
      }).eq('id', datasetId)
      return json({ ok: false, error: 'No extractable text found.' }, 422)
    }

    await admin.from('knowledge_chunks').delete().eq('dataset_id', datasetId)
    const rows = chunks.map((content, index) => ({
      dataset_id: datasetId,
      chunk_index: index,
      content,
      token_estimate: Math.ceil(content.length / 4),
    }))
    // Insert in batches
    for (let i = 0; i < rows.length; i += 100) {
      const { error: insError } = await admin.from('knowledge_chunks').insert(rows.slice(i, i + 100))
      if (insError) throw insError
    }

    await admin.from('knowledge_datasets').update({
      status: 'ready',
      chunk_count: rows.length,
      error_message: null,
      updated_at: new Date().toISOString(),
    }).eq('id', datasetId)

    return json({ ok: true, datasetId, chunkCount: rows.length })
  } catch (error) {
    if (datasetId) {
      try {
        await admin.from('knowledge_datasets').update({
          status: 'failed',
          error_message: error instanceof Error ? error.message.slice(0, 500) : 'Processing failed.',
          updated_at: new Date().toISOString(),
        }).eq('id', datasetId)
      } catch { /* best effort */ }
    }
    return handleError(error)
  }
})