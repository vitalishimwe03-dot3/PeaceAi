import { useEffect, useState } from 'react'
import { AlertTriangle, Save, Settings, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Textarea } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { getSystemSettings, recordAuditEvent, updateSystemSetting } from '@/lib/repository'
import { formatDate, getErrorMessage } from '@/lib/utils'
import type { SystemSetting } from '@/types/domain'

export function AdminSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<SystemSetting[]>([])
  const [values, setValues] = useState<Record<string, string | boolean>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getSystemSettings()
      .then((rows) => {
        setSettings(rows)
        const next: Record<string, string | boolean> = {}
        for (const row of rows) {
          next[row.key] = typeof row.value === 'boolean'
            ? row.value
            : typeof row.value === 'string'
              ? row.value
              : JSON.stringify(row.value)
        }
        setValues(next)
      })
      .catch((err) => toast({ title: 'Could not load settings', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    if (!user) return
    setSaving(true)
    try {
      for (const setting of settings) {
        const next = values[setting.key]
        if (next === undefined) continue
        await updateSystemSetting(setting.key, next, user.id)
      }
      await recordAuditEvent(user.id, 'admin.settings_updated', 'warning', {
        keys: settings.map((setting) => setting.key),
      })
      toast({ title: 'Settings saved', description: 'Configuration changes are recorded in the audit log.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not save settings', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const setValue = (key: string, value: string | boolean) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  return (
    <div>
      <PageHeader
        title="Platform settings"
        description="Public contact details, signup availability, and AI fallback copy. Provider secrets belong in server-side environment variables."
        actions={<Button size="sm" onClick={() => void save()} loading={saving}><Save className="h-4 w-4" /> Save settings</Button>}
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-20"><Spinner label="Loading settings" /></div>
          ) : settings.length ? (
            settings.map((setting) => {
              const value = values[setting.key]
              const isBoolean = typeof value === 'boolean' || typeof setting.value === 'boolean'
              return (
                <section key={setting.key} className="card-surface p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-mono text-xs font-medium text-slate-200">{setting.key}</h2>
                      <p className="mt-0.5 text-[10px] text-slate-600">Last updated {formatDate(setting.updated_at, true)}</p>
                    </div>
                    {isBoolean ? (
                      <Badge tone={value === true ? 'accent' : 'neutral'}>{value === true ? 'Enabled' : 'Disabled'}</Badge>
                    ) : null}
                  </div>
                  <div className="mt-3">
                    {isBoolean ? (
                      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={value === true}
                          onChange={(event) => setValue(setting.key, event.target.checked)}
                          className="accent-emerald-400"
                        />
                        {setting.key === 'signups_enabled'
                          ? 'Allow new account signups'
                          : 'Setting enabled'}
                      </label>
                    ) : setting.key === 'ai_fallback_message' ? (
                      <Textarea
                        value={String(value ?? '')}
                        onChange={(event) => setValue(setting.key, event.target.value)}
                        rows={3}
                        maxLength={500}
                        hint="Shown when the AI provider is unavailable. Do not promise recovery times you cannot meet."
                      />
                    ) : (
                      <Input
                        value={String(value ?? '')}
                        onChange={(event) => setValue(setting.key, event.target.value)}
                        type={setting.key.includes('email') ? 'email' : setting.key.includes('phone') ? 'tel' : 'text'}
                        maxLength={200}
                        hint={
                          setting.key === 'support_phone'
                            ? 'Confirm the owner has authorised this phone number for public and payment-related contact before publishing it.'
                            : setting.key === 'support_email'
                              ? 'Use a monitored mailbox. Do not list an address the owner has not approved.'
                              : undefined
                        }
                      />
                    )}
                  </div>
                </section>
              )
            })
          ) : (
            <div className="card-surface p-8 text-center">
              <Settings className="mx-auto h-6 w-6 text-slate-700" />
              <p className="mt-2 text-xs text-slate-500">No configurable settings found. Seed the system_settings table.</p>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.04] p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-amber-200"><AlertTriangle className="h-4 w-4" /> Owner confirmation required</p>
            <p className="mt-2 text-[11px] leading-5 text-amber-100/70">
              The proposed support email and phone number are placeholders from the project brief. Confirm ownership,
              monitoring, and consent before publishing them as official contact channels. Do not use an unauthorised
              phone number as a mobile-money recipient.
            </p>
          </div>
          <div className="card-surface p-4">
            <p className="flex items-center gap-2 text-xs font-medium text-white"><ShieldCheck className="h-4 w-4 text-accent" /> Server-only secrets</p>
            <ul className="mt-2 space-y-2 text-[10px] leading-4 text-slate-500">
              <li><code>SUPABASE_SERVICE_ROLE_KEY</code> — Edge Functions only</li>
              <li><code>AI_API_KEY</code> / <code>AI_BASE_URL</code> — AI calls only</li>
              <li><code>FLUTTERWAVE_SECRET_KEY</code> / <code>FLUTTERWAVE_WEBHOOK_SECRET</code> — payments</li>
              <li><code>RESEND_API_KEY</code> or approved email provider — transactional email</li>
            </ul>
            <p className="mt-3 text-[10px] leading-4 text-slate-600">
              Never enter these values into system_settings or any client-visible field.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}
