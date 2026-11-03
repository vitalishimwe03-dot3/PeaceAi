import { useEffect, useMemo, useState } from 'react'
import { LayoutTemplate, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useContent } from '@/contexts/ContentContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { getErrorMessage, formatDate } from '@/lib/utils'
import { listContentBlocks, recordAuditEvent, updateContentBlock } from '@/lib/repository'
import type { ContentBlock } from '@/types/domain'

export function AdminContentPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { refresh } = useContent()
  const [blocks, setBlocks] = useState<ContentBlock[]>([])
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    listContentBlocks()
      .then((rows) => {
        setBlocks(rows)
        setValues(Object.fromEntries(rows.map((row) => [row.key, row.value])))
      })
      .catch((err) =>
        toast({ title: 'Could not load content', description: getErrorMessage(err), tone: 'error' }),
      )
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sections = useMemo(() => {
    const grouped = new Map<string, ContentBlock[]>()
    for (const block of blocks) {
      const list = grouped.get(block.section) ?? []
      list.push(block)
      grouped.set(block.section, list)
    }
    return [...grouped.entries()]
  }, [blocks])

  const save = async (block: ContentBlock) => {
    if (!user) return
    setSavingKey(block.key)
    try {
      await updateContentBlock(block.key, values[block.key] ?? '', user.id)
      await recordAuditEvent(user.id, 'admin.content_updated', 'info', { key: block.key })
      setBlocks((current) =>
        current.map((item) =>
          item.key === block.key
            ? { ...item, value: values[block.key] ?? '', updated_at: new Date().toISOString() }
            : item,
        ),
      )
      await refresh()
      toast({ title: 'Content saved', description: 'The public page will use the new copy.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not save content', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="Public content"
        description="Edit the copy shown on marketing pages without a deployment. Changes are recorded in the audit log."
      />

      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner label="Loading content" />
        </div>
      ) : blocks.length ? (
        <div className="space-y-8">
          {sections.map(([section, items]) => (
            <section key={section}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold capitalize text-white">{section}</h2>
                <Badge tone="neutral">{items.length} blocks</Badge>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {items.map((block) => {
                  const value = values[block.key] ?? ''
                  const dirty = value !== block.value
                  const long = (block.value?.length ?? 0) > 90 || value.length > 90
                  return (
                    <article key={block.key} className="card-surface flex flex-col p-5">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-medium text-white">{block.label}</h3>
                          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{block.key}</p>
                        </div>
                        {dirty ? <Badge tone="accent">Unsaved</Badge> : null}
                      </div>
                      <div className="mt-3 flex-1">
                        {long ? (
                          <Textarea
                            value={value}
                            onChange={(event) =>
                              setValues((current) => ({ ...current, [block.key]: event.target.value }))
                            }
                            rows={4}
                            maxLength={1200}
                          />
                        ) : (
                          <Input
                            value={value}
                            onChange={(event) =>
                              setValues((current) => ({ ...current, [block.key]: event.target.value }))
                            }
                            maxLength={300}
                          />
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <p className="text-[10px] text-slate-600">
                          Updated {formatDate(block.updated_at, true)}
                        </p>
                        <Button
                          size="sm"
                          variant={dirty ? 'primary' : 'outline'}
                          onClick={() => void save(block)}
                          loading={savingKey === block.key}
                          disabled={!dirty}
                        >
                          <Save className="h-3.5 w-3.5" /> Save
                        </Button>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={LayoutTemplate}
          title="No content blocks yet"
          description="Apply the latest database migration to seed the editable marketing copy."
        />
      )}
    </div>
  )
}
