import { ShieldX } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export function UnauthorizedPage() {
  return (
    <div className="mx-auto max-w-xl py-16">
      <EmptyState
        icon={ShieldX}
        title="You do not have access to this area"
        description="Administrator access is required. If you believe this is a mistake, contact the account owner. Access changes are recorded in the audit log."
        action={
          <Link to="/app">
            <Button size="sm" variant="outline">Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  )
}
