import { Compass } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Compass className="h-10 w-10 text-accent" />
      <p className="mt-5 font-mono text-xs text-slate-500">404</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-white">Page not found</h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        The page you requested does not exist, has moved, or you may not have permission to view it.
      </p>
      <div className="mt-6 flex gap-2">
        <Link to="/"><Button size="sm">Back to home</Button></Link>
        <Link to="/app"><Button size="sm" variant="outline">Open workspace</Button></Link>
      </div>
    </div>
  )
}
