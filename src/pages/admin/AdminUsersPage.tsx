import { useEffect, useMemo, useState } from 'react'
import { Pencil, Search, ShieldAlert, Users } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge, statusTone } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import {
  adminUpdateUser,
  listAdminUsers,
  recordAuditEvent,
} from '@/lib/repository'
import { formatBytes, formatDate, getErrorMessage } from '@/lib/utils'
import type { AdminUserRow, UserRole, UserStatus } from '@/types/domain'

const GIB = 1024 * 1024 * 1024

export function AdminUsersPage() {
  const { user: currentUser } = useAuth()
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all')
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [status, setStatus] = useState<UserStatus>('active')
  const [quotaGib, setQuotaGib] = useState('6')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAdminUsers()
      .then(setUsers)
      .catch((err) => toast({ title: 'Could not load users', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return users.filter((profile) => {
      const matchesQuery = !lower || profile.full_name?.toLowerCase().includes(lower) || profile.email.toLowerCase().includes(lower)
      const matchesRole = roleFilter === 'all' || profile.role === roleFilter
      const matchesStatus = statusFilter === 'all' || profile.status === statusFilter
      return matchesQuery && matchesRole && matchesStatus
    })
  }, [users, query, roleFilter, statusFilter])

  const openEdit = (profile: AdminUserRow) => {
    setEditUser(profile)
    setFullName(profile.full_name ?? '')
    setRole(profile.role)
    setStatus(profile.status)
    setQuotaGib((profile.storage_quota_bytes / GIB).toFixed(2).replace(/\.?0+$/, ''))
  }

  const save = async () => {
    if (!editUser || !currentUser) return
    const quota = Number(quotaGib)
    if (!Number.isFinite(quota) || quota < 0.1 || quota > 100) {
      toast({ title: 'Invalid storage quota', description: 'Set a quota between 0.1 and 100 GiB.', tone: 'error' })
      return
    }
    const isSelf = editUser.id === currentUser.id
    if (isSelf && (role !== editUser.role || status !== 'active')) {
      toast({ title: 'Cannot change your own access', description: 'Ask another administrator to change your role or suspend your own account.', tone: 'error' })
      return
    }
    setSaving(true)
    try {
      const patch = {
        full_name: fullName.trim() || null,
        role,
        status,
        storage_quota_bytes: Math.round(quota * GIB),
      }
      await adminUpdateUser(editUser.id, patch)
      setUsers((current) => current.map((profile) => profile.id === editUser.id ? { ...profile, ...patch, updated_at: new Date().toISOString() } : profile))
      await recordAuditEvent(currentUser.id, 'admin.user_updated', 'warning', {
        target_user_id: editUser.id,
        role,
        status,
        storage_quota_bytes: patch.storage_quota_bytes,
      })
      setEditUser(null)
      toast({ title: 'User updated', description: 'The change is recorded in the audit log.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update user', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage roles, account status, names, and storage quotas. Role changes take effect through the server and are audited."
        actions={<Badge tone="neutral">{users.length} members</Badge>}
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          leadingIcon={<Search className="h-4 w-4" />}
          containerClassName="w-full max-w-xs"
        />
        <Select
          aria-label="Filter role"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as 'all' | UserRole)}
          options={[{ value: 'all', label: 'All roles' }, { value: 'user', label: 'Members' }, { value: 'admin', label: 'Administrators' }]}
          containerClassName="w-36"
        />
        <Select
          aria-label="Filter status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | UserStatus)}
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'active', label: 'Active' },
            { value: 'suspended', label: 'Suspended' },
            { value: 'pending', label: 'Pending' },
          ]}
          containerClassName="w-36"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading users" /></div>
      ) : filtered.length ? (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-b border-white/[0.06] bg-white/[0.03] text-[10px] uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium">Storage quota</th>
                <th className="px-4 py-2.5 font-medium">Joined</th>
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {filtered.map((profile) => (
                <tr key={profile.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={profile.full_name} email={profile.email} src={profile.avatar_url} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-xs font-medium text-slate-200">
                          {profile.full_name || 'Unnamed member'}
                          {profile.id === currentUser?.id ? <span className="ml-1.5 text-[9px] text-accent">(you)</span> : null}
                        </p>
                        <p className="truncate text-[10px] text-slate-600">{profile.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge tone={profile.role === 'admin' ? 'violet' : 'neutral'}>{profile.role}</Badge></td>
                  <td className="px-4 py-3"><Badge tone={statusTone(profile.status)}>{profile.status}</Badge></td>
                  <td className="px-4 py-3 text-[11px] text-slate-400">{formatBytes(profile.storage_quota_bytes)}</td>
                  <td className="px-4 py-3 text-[11px] text-slate-500">{formatDate(profile.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(profile)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Edit ${profile.email}`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState icon={Users} title="No members match" description="Try a different search or filter." />
      )}

      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.03] p-3 text-[10px] leading-4 text-amber-100/60">
        <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Suspension is not deletion. Suspended members retain data according to the retention policy. Never grant administrator access without a clear operational need.</p>
      </div>

      <Modal
        open={Boolean(editUser)}
        onClose={() => { if (!saving) setEditUser(null) }}
        title="Edit member"
        description={editUser?.email}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditUser(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} loading={saving}>Save changes</Button>
          </>
        }
      >
        {editUser ? (
          <div className="space-y-4">
            <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Select
                label="Role"
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
                options={[{ value: 'user', label: 'Member' }, { value: 'admin', label: 'Administrator' }]}
                disabled={editUser.id === currentUser?.id}
                hint={editUser.id === currentUser?.id ? 'You cannot change your own role.' : undefined}
              />
              <Select
                label="Account status"
                value={status}
                onChange={(event) => setStatus(event.target.value as UserStatus)}
                options={[
                  { value: 'active', label: 'Active' },
                  { value: 'suspended', label: 'Suspended' },
                  { value: 'pending', label: 'Pending' },
                ]}
                disabled={editUser.id === currentUser?.id}
                hint={editUser.id === currentUser?.id ? 'You cannot suspend your own account.' : undefined}
              />
            </div>
            <Input
              label="Storage quota (GiB)"
              type="number"
              min={0.1}
              max={100}
              step={0.1}
              value={quotaGib}
              onChange={(event) => setQuotaGib(event.target.value)}
              hint={`Currently ${formatBytes(editUser.storage_quota_bytes)}. Changes affect future uploads.`}
            />
            {role === 'admin' && editUser.role !== 'admin' ? (
              <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3 text-[11px] leading-5 text-rose-100/70">
                Administrator access exposes user records, settings, and audit data. Confirm this person requires full platform access.
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
