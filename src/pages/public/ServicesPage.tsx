import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { PageHero } from '@/components/marketing/PageHero'
import { fallbackServices, serviceCategories } from '@/lib/catalog'
import { listServices } from '@/lib/repository'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Field'
import { cn, formatRwf } from '@/lib/utils'
import type { Service } from '@/types/domain'

export function ServicesPage() {
  const [services, setServices] = useState<Service[]>(fallbackServices)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    void listServices().then(setServices).catch(() => undefined)
  }, [])

  const filtered = useMemo(() => {
    const lower = query.toLowerCase()
    return services.filter((service) => {
      const matchesCategory = category === 'all' || service.category_id === category
      const matchesQuery =
        !lower ||
        service.name.toLowerCase().includes(lower) ||
        service.short_description.toLowerCase().includes(lower) ||
        service.technologies.some((tech) => tech.toLowerCase().includes(lower))
      return matchesCategory && matchesQuery
    })
  }, [services, query, category])

  return (
    <>
      <PageHero
        eyebrow="Services marketplace"
        title={<>Expert technology work, scoped clearly.</>}
        description="Browse development, AI, security, data, and consulting services. Submit your requirements and receive a reviewed quotation — not an instant binding price."
      />

      <section className="container-page py-12">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter services by category">
            <button
              type="button"
              onClick={() => setCategory('all')}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                category === 'all'
                  ? 'border-accent/30 bg-accent/10 text-accent'
                  : 'border-white/10 text-slate-400 hover:text-white',
              )}
            >
              All services
            </button>
            {serviceCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
                  category === item.id
                    ? 'border-accent/30 bg-accent/10 text-accent'
                    : 'border-white/10 text-slate-400 hover:text-white',
                )}
              >
                {item.name}
              </button>
            ))}
          </div>
          <div className="w-full max-w-sm">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search services or technologies"
              aria-label="Search services"
              leadingIcon={<Search className="h-4 w-4" />}
            />
          </div>
        </div>

        <div className="mt-8 flex items-center justify-between border-t border-white/[0.06] pt-5 text-xs text-slate-500">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtered.length} service{filtered.length === 1 ? '' : 's'} available
          </span>
          {query || category !== 'all' ? (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="inline-flex items-center gap-1 text-accent hover:text-accent-light"
            >
              <X className="h-3.5 w-3.5" /> Clear filters
            </button>
          ) : null}
        </div>

        {filtered.length ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-white/10 py-16 text-center">
            <p className="text-sm text-slate-400">No services match those filters.</p>
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setCategory('all')
              }}
              className="mt-3 text-sm font-medium text-accent"
            >
              Show all services
            </button>
          </div>
        )}

        <div className="mt-12 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
          <p className="text-sm text-slate-400">
            Need something not listed?{' '}
            <Link to="/contact" className="font-medium text-accent hover:text-accent-light">
              Describe your project to the PeaceAI team
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  )
}

function ServiceCard({ service }: { service: Service }) {
  return (
    <Link
      to={`/services/${service.slug}`}
      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-ink-900/50 p-6 transition-all hover:-translate-y-0.5 hover:border-accent/25 hover:bg-ink-900"
    >
      <div className="flex items-start justify-between gap-3">
        <Badge tone="neutral">{service.category?.name ?? 'Service'}</Badge>
        <ArrowRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">{service.name}</h2>
      <p className="mt-2 flex-1 text-sm leading-6 text-slate-400">{service.short_description}</p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {service.technologies.slice(0, 3).map((technology) => (
          <span key={technology} className="rounded-md bg-white/[0.04] px-2 py-1 text-[10px] text-slate-500">
            {technology}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <span className="text-xs text-slate-500">{service.estimated_timeline}</span>
        <span className="text-xs font-medium text-white">
          {service.price_from_rwf ? `From ${formatRwf(service.price_from_rwf)}` : 'Request quote'}
        </span>
      </div>
    </Link>
  )
}
