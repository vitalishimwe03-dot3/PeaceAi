import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  Download,
  KeyRound,
  LogOut,
  Mail,
  Shield,
  ShieldOff,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Avatar } from '@/components/ui/Avatar'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { listBlockedProfiles, unblockUser, exportAccountData } from '@/lib/repository'
import { downloadTextFile, formatDate, getErrorMessage } from '@/lib/utils'
import type { Profile } from '@/types/domain'

type BlockedProfile = Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>

export function SettingsPage() {
  const { user, isPreview, updateProfileDetails, updatePassword, updateEmail, deleteAccount, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState(user?.profile.full_name ?? '')
  const [avatarUrl, setAvatarUrl] = useState(user?.profile.avatar_url ?? '')
  const [savingProfile, setSavingProfile] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [changingPassword, setChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [changingEmail, setChangingEmail] = useState(false)
  const [blocked, setBlocked] = useState<BlockedProfile[]>([])
  const [blockedLoading, setBlockedLoading] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (!user) return
    setBlockedLoading(true)
    listBlockedProfiles(user.id)
      .then(setBlocked)
      .catch(() => undefined)
      .finally(() => setBlockedLoading(false))
  }, [user])

  if (!user) return null

  const saveProfile = async () => {
    if (!fullName.trim()) {
      toast({ title: 'Name is required', tone: 'error' })
      return
    }
    setSavingProfile(true)
    try {
      await updateProfileDetails({
        full_name: fullName.trim(),
        avatar_url: avatarUrl.trim() || null,
      })
      toast({ title: 'Profile updated', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update profile', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSavingProfile(false)
    }
  }

  const changePassword = async () => {
    if (isPreview) {
      toast({ title: 'Not available in preview', description: 'Connect Supabase to manage passwords.', tone: 'error' })
      return
    }
    const strong =
      newPassword.length >= 8 &&
      /[A-Z]/.test(newPassword) &&
      /[a-z]/.test(newPassword) &&
      /\d/.test(newPassword)
    if (!strong) {
      toast({ title: 'Password is too weak', description: 'Use at least 8 characters with upper case, lower case, and a number.', tone: 'error' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', tone: 'error' })
      return
    }
    setChangingPassword(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { error: verifyError } = await supabase!.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })
      if (verifyError) throw new Error('Your current password is incorrect.')
      await updatePassword(newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast({ title: 'Password changed', description: 'Use your new password the next time you sign in.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not change password', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setChangingPassword(false)
    }
  }

  const changeEmail = async () => {
    if (!newEmail.trim() || newEmail.trim().toLowerCase() === user.email.toLowerCase()) return
    setChangingEmail(true)
    try {
      const result = await updateEmail(newEmail.trim())
      setNewEmail('')
      toast({
        title: 'Confirm your new email',
        description: result.confirmationRequired
          ? 'Check both your current and new inbox for a confirmation link. The change is not complete until confirmed.'
          : 'Your email address has been updated.',
        tone: 'success',
      })
    } catch (err) {
      toast({ title: 'Could not change email', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setChangingEmail(false)
    }
  }

  const exportData = async () => {
    setExporting(true)
    try {
      const data = await exportAccountData(user.id)
      downloadTextFile(
        `peaceai-account-export-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(data, null, 2),
        'application/json',
      )
      toast({ title: 'Account data exported', description: 'The download contains your profile, conversations, messages, files metadata, proposals, requests, and payments.', tone: 'success' })
    } catch (err) {
      toast({ title: 'Export failed', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setExporting(false)
    }
  }

  const unblock = async (profile: BlockedProfile) => {
    try {
      await unblockUser(user.id, profile.id)
      setBlocked((current) => current.filter((item) => item.id !== profile.id))
      toast({ title: 'User unblocked', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not unblock', description: getErrorMessage(err), tone: 'error' })
    }
  }

  const removeAccount = async () => {
    if (deleteConfirm !== 'DELETE') return
    setDeleting(true)
    try {
      await deleteAccount()
      navigate('/', { replace: true })
    } catch (err) {
      toast({ title: 'Account deletion failed', description: getErrorMessage(err), tone: 'error' })
      setDeleting(false)
    }
  }

  return (
    <div>
      <PageHeader title="Settings" description="Manage your account, security, privacy, and personal data." />

      <div className="mx-auto max-w-3xl space-y-5">
        <section className="card-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <UserRound className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Profile</h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Avatar name={fullName || user.profile.full_name} email={user.email} src={avatarUrl || user.profile.avatar_url} size="lg" />
            <div className="text-[11px] text-slate-500">
              <p>Member since {formatDate(user.profile.created_at)}</p>
              <p className="mt-0.5">Account ID <span className="font-mono text-slate-600">{user.id.slice(0, 8)}…</span></p>
            </div>
            <Badge tone={user.isAdmin ? 'violet' : 'neutral'}>{user.isAdmin ? 'Administrator' : 'Member'}</Badge>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Input label="Full name" value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={80} />
            <Input
              label="Avatar image URL (optional)"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
              placeholder="https://…"
              type="url"
              hint="Use an image you have the right to display."
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button size="sm" onClick={() => void saveProfile()} loading={savingProfile} disabled={!fullName.trim()}>Save profile</Button>
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <Mail className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Email address</h2>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-600">Current email</p>
            <p className="mt-1 text-xs text-slate-300">{user.email}</p>
          </div>
          {isPreview ? (
            <p className="mt-3 text-[11px] text-slate-500">Email changes are disabled in preview mode. Connect Supabase authentication first.</p>
          ) : (
            <>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <Input
                  label="New email address"
                  type="email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                  placeholder="new@example.com"
                  containerClassName="flex-1"
                />
                <Button
                  size="md"
                  onClick={() => void changeEmail()}
                  loading={changingEmail}
                  disabled={!newEmail.trim() || newEmail.trim().toLowerCase() === user.email.toLowerCase()}
                >
                  Update email
                </Button>
              </div>
              <p className="mt-2 text-[10px] leading-4 text-slate-600">
                Supabase may require confirmation from both the current and new address. Your email is not changed until confirmation completes.
              </p>
            </>
          )}
        </section>

        <section className="card-surface p-5">
          <div className="mb-5 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Password</h2>
          </div>
          {isPreview ? (
            <p className="text-[11px] text-slate-500">Password management is disabled in preview mode because there is no authentication server.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Current password"
                type="password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete="current-password"
                containerClassName="sm:col-span-2"
              />
              <Input
                label="New password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete="new-password"
                hint="At least 8 characters with upper case, lower case, and a number."
              />
              <Input
                label="Confirm new password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                error={confirmPassword && confirmPassword !== newPassword ? 'Passwords do not match.' : undefined}
              />
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  size="sm"
                  onClick={() => void changePassword()}
                  loading={changingPassword}
                  disabled={!currentPassword || !newPassword || !confirmPassword}
                >
                  Change password
                </Button>
              </div>
            </div>
          )}
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Bell className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Notifications</h2>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-[11px] leading-5 text-slate-500">
            <p>In-app feedback is shown as toasts during your session.</p>
            <p className="mt-1.5">
              Email notifications are not active because no transactional email provider is configured. PeaceAI will not send
              marketing email or claim to have sent security alerts until the owner configures and verifies an email provider.
            </p>
          </div>
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <ShieldOff className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Blocked users</h2>
          </div>
          {blockedLoading ? (
            <p className="text-[11px] text-slate-500">Loading blocked users…</p>
          ) : blocked.length ? (
            <div className="space-y-2">
              {blocked.map((profile) => (
                <div key={profile.id} className="flex items-center gap-3 rounded-xl border border-white/[0.06] p-3">
                  <Avatar name={profile.full_name} email={profile.email} src={profile.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs text-slate-300">{profile.full_name || 'Blocked user'}</p>
                    <p className="truncate text-[10px] text-slate-600">{profile.email}</p>
                  </div>
                  <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => void unblock(profile)}>Unblock</Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-slate-500">You have not blocked anyone. Blocking is available from any conversation in Collaboration.</p>
          )}
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Download className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Your data</h2>
          </div>
          <p className="text-[11px] leading-5 text-slate-500">
            Export your profile, conversations, messages, file metadata, proposals, service requests, and
            payment records as JSON. File contents are not included in this export; download them from Storage.
          </p>
          <Button size="sm" variant="outline" className="mt-4" loading={exporting} onClick={() => void exportData()}>
            <Download className="h-4 w-4" /> Export account data
          </Button>
        </section>

        <section className="card-surface p-5">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-4 w-4 text-accent" />
            <h2 className="text-sm font-medium text-white">Session</h2>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500">Sign out of this browser. On shared devices, always sign out when finished.</p>
            <Button size="sm" variant="outline" onClick={() => void signOut().then(() => navigate('/'))}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </div>
        </section>

        <section className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.03] p-5">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-300" />
            <h2 className="text-sm font-medium text-rose-200">Danger zone</h2>
          </div>
          <p className="text-[11px] leading-5 text-slate-400">
            Permanently delete your account and associated profile data. Active sessions are revoked.
            Some records may be retained where required for legal, tax, fraud-prevention, or dispute-resolution
            purposes; the Privacy Policy explains retention.
          </p>
          <Button size="sm" variant="danger" className="mt-4" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete account
          </Button>
        </section>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => { if (!deleting) { setDeleteOpen(false); setDeleteConfirm('') } }}
        title="Permanently delete account"
        description="This action cannot be undone. Your account will be signed out and deleted on the server."
        footer={
          <>
            <Button variant="ghost" onClick={() => { setDeleteOpen(false); setDeleteConfirm('') }} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={() => void removeAccount()} loading={deleting} disabled={deleteConfirm !== 'DELETE'}>
              Delete my account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-rose-400/20 bg-rose-400/[0.04] p-3 text-[11px] leading-5 text-rose-100/70">
            {isPreview
              ? 'Preview mode: this will sign you out and clear the local preview session. No server account exists.'
              : 'This calls the secured delete-account function. You will lose access immediately. Export your data first if you need a copy.'}
          </div>
          <Input
            label='Type "DELETE" to confirm'
            value={deleteConfirm}
            onChange={(event) => setDeleteConfirm(event.target.value)}
            placeholder="DELETE"
            autoComplete="off"
          />
        </div>
      </Modal>

    </div>
  )
}
