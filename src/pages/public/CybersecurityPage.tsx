import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileSearch,
  Fingerprint,
  Lock,
  Radar,
  ShieldAlert,
  ShieldCheck,
  TerminalSquare,
} from 'lucide-react'
import { PageHero, SectionHeading } from '@/components/marketing/PageHero'
import { buttonStyles } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { listServices } from '@/lib/repository'
import { fallbackServices } from '@/lib/catalog'
import type { Service } from '@/types/domain'
import { formatRwf } from '@/lib/utils'

export function CybersecurityPage() {
  const [services, setServices] = useState<Service[]>(
    fallbackServices.filter((service) => service.category_id === 'cat-security'),
  )

  useEffect(() => {
    void listServices()
      .then((items) => setServices(items.filter((service) => service.category_id === 'cat-security')))
      .catch(() => undefined)
  }, [])

  return (
    <>
      <PageHero
        eyebrow="Defensive cybersecurity"
        title={<>Build with security in the room from the start.</>}
        description="Lawful, scoped security services for systems you own or are explicitly authorized to assess. Clear scope, evidence-backed findings, and practical remediation."
        actions={
          <>
            <Link to="/services/website-security-assessment" className={buttonStyles({ size: 'lg' })}>
              Request an assessment <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/contact" className={buttonStyles({ size: 'lg', variant: 'outline' })}>
              Discuss scope
            </Link>
          </>
        }
      />

      <section className="container-page py-20">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileSearch, title: 'Website security assessments', text: 'Scoped review of an authorized site or web application.' },
            { icon: Lock, title: 'Secure architecture', text: 'Design review for authentication, data flow, storage, and boundaries.' },
            { icon: ClipboardCheck, title: 'Configuration reviews', text: 'Check cloud, database, headers, CORS, and deployment settings.' },
            { icon: Fingerprint, title: 'Access-control implementation', text: 'Role models, server-side authorization, and database policies.' },
            { icon: TerminalSquare, title: 'Secure coding assistance', text: 'Input validation, output encoding, secret handling, and safe file uploads.' },
            { icon: Radar, title: 'Monitoring and logging', text: 'Structured audit trails, security alerts, and retention guidance.' },
            { icon: ShieldCheck, title: 'Vulnerability assessment', text: 'Authorized, bounded testing with human verification of findings.' },
            { icon: ShieldAlert, title: 'Remediation guidance', text: 'Prioritized fixes with trade-offs and verification steps.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
              <item.icon className="h-5 w-5 text-accent" />
              <h2 className="mt-4 text-sm font-semibold">{item.title}</h2>
              <p className="mt-2 text-xs leading-5 text-slate-400">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/[0.06] bg-ink-900/40 py-20">
        <div className="container-page grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="left"
              eyebrow="Rules of engagement"
              title="Authorization comes before any test."
              description="PeaceAI performs defensive security work only within a written, agreed scope. We do not test systems without permission."
            />
            <div className="mt-7 space-y-3">
              {[
                'Written authorization for exact domains, applications, and accounts',
                'Named technical contact and agreed testing window',
                'Clear boundaries for production safety and data handling',
                'No denial-of-service, credential theft, or social engineering',
                'Automated checks are always distinguished from verified manual review',
                'Findings describe what was tested, not a guarantee that no vulnerabilities exist',
              ].map((item) => (
                <p key={item} className="flex gap-2.5 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" /> {item}
                </p>
              ))}
            </div>
          </div>
          <div className="card-surface p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold">What a scoped review includes</h3>
              <Badge tone="neutral">Authorized systems only</Badge>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Scope', 'Domains, environments, accounts, dates, exclusions'],
                ['Method', 'Configuration review, manual checks, limited automated scanning'],
                ['Evidence', 'Reproducible steps without exposing unnecessary sensitive data'],
                ['Severity', 'Context-aware rating and business impact'],
                ['Remediation', 'Prioritized, practical recommendations'],
                ['Report', 'Executive summary and technical detail'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                  <p className="mt-1 text-sm text-slate-200">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="container-page py-20">
        <SectionHeading
          eyebrow="Security services"
          title="Choose a scoped engagement."
          description="Each service has defined requirements, deliverables, limitations, timeline, and pricing factors. Final quotations are reviewed by a person."
        />
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {services.map((service) => (
            <Link
              key={service.id}
              to={`/services/${service.slug}`}
              className="group rounded-2xl border border-white/[0.08] bg-ink-900/60 p-6 transition-colors hover:border-accent/30"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <ArrowRight className="mt-1 h-4 w-4 text-slate-600 group-hover:text-accent" />
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-400">{service.short_description}</p>
              <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-white/[0.06] pt-4 text-xs">
                <span className="text-slate-500">{service.estimated_timeline}</span>
                <span className="font-medium text-white">
                  {service.price_from_rwf ? `From ${formatRwf(service.price_from_rwf)}` : 'Request a quote'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-20">
        <div className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.04] p-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
            <div>
              <h2 className="text-base font-semibold text-white">Responsible disclosure</h2>
              <p className="mt-1.5 text-sm leading-6 text-slate-400">
                If you believe you have found a vulnerability in PeaceAI, report it privately to{' '}
                <a href="mailto:vitalishimwe03@gmail.com" className="text-accent hover:underline">
                  vitalishimwe03@gmail.com
                </a>
                . Do not access other users’ data, disrupt the service, or test without written permission.
                Read our{' '}
                <Link to="/legal/security" className="text-accent hover:underline">
                  Security Disclosure Policy
                </Link>
                .
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
