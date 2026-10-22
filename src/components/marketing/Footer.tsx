import { Link } from 'react-router-dom'
import { Mail, Phone } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { env } from '@/lib/env'

const columns = [
  {
    title: 'Platform',
    links: [
      { label: 'AI Assistant', to: '/assistant' },
      { label: 'AI Development', to: '/development' },
      { label: 'Cybersecurity', to: '/cybersecurity' },
      { label: 'Services', to: '/services' },
      { label: 'Pricing', to: '/pricing' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Contact Us', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Sign In', to: '/signin' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/legal/privacy' },
      { label: 'Terms of Service', to: '/legal/terms' },
      { label: 'Acceptable Use', to: '/legal/acceptable-use' },
      { label: 'Refund Policy', to: '/legal/refunds' },
      { label: 'Security Disclosure', to: '/legal/security' },
    ],
  },
]

export function Footer() {
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950">
      <div className="container-page grid gap-10 py-14 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Logo />
          <p className="mt-4 max-w-sm text-sm leading-6 text-slate-400">
            Secure AI conversations, software development, defensive cybersecurity, private storage,
            and collaboration in one thoughtful platform.
          </p>
          <div className="mt-5 space-y-2.5 text-sm">
            <a
              href={`mailto:${env.supportEmail}`}
              className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <Mail className="h-4 w-4 text-accent" />
              {env.supportEmail}
            </a>
            <a
              href={`tel:${env.supportPhone}`}
              className="flex items-center gap-2 text-slate-400 transition-colors hover:text-white"
            >
              <Phone className="h-4 w-4 text-accent" />
              {env.supportPhone}
            </a>
            <p className="pt-1 text-xs text-slate-600">
              Contact details are proposed and require owner confirmation before launch.
            </p>
          </div>
        </div>
        {columns.map((column) => (
          <div key={column.title}>
            <h3 className="text-sm font-semibold text-white">{column.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm text-slate-400 transition-colors hover:text-accent"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="container-page flex flex-col items-start justify-between gap-3 py-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} PeaceAI. All rights reserved.</p>
          <p>Built with secure defaults. Legal documents are drafts for review.</p>
        </div>
      </div>
    </footer>
  )
}
