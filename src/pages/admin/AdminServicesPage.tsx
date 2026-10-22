import { useEffect, useState } from 'react'
import { Pencil, Wrench } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/contexts/ToastContext'
import { PageHeader } from '@/components/layout/PageHeader'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select, Textarea } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/EmptyState'
import { Spinner } from '@/components/ui/Spinner'
import { listAllServices, recordAuditEvent, updateAdminService } from '@/lib/repository'
import { formatRwf, getErrorMessage } from '@/lib/utils'
import type { Service } from '@/types/domain'

const toLines = (values: string[]) => values.join('\n')
const fromLines = (value: string) => value.split('\n').map((line) => line.trim()).filter(Boolean)

export function AdminServicesPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [editService, setEditService] = useState<Service | null>(null)
  const [name, setName] = useState('')
  const [shortDescription, setShortDescription] = useState('')
  const [description, setDescription] = useState('')
  const [deliverables, setDeliverables] = useState('')
  const [technologies, setTechnologies] = useState('')
  const [timeline, setTimeline] = useState('')
  const [priceFrom, setPriceFrom] = useState('')
  const [priceTo, setPriceTo] = useState('')
  const [active, setActive] = useState(true)
  const [sortOrder, setSortOrder] = useState('0')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAllServices()
      .then(setServices)
      .catch((err) => toast({ title: 'Could not load services', description: getErrorMessage(err), tone: 'error' }))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const openEdit = (service: Service) => {
    setEditService(service)
    setName(service.name)
    setShortDescription(service.short_description)
    setDescription(service.description)
    setDeliverables(toLines(service.deliverables))
    setTechnologies(toLines(service.technologies))
    setTimeline(service.estimated_timeline)
    setPriceFrom(service.price_from_rwf?.toString() ?? '')
    setPriceTo(service.price_to_rwf?.toString() ?? '')
    setActive(service.active)
    setSortOrder(String(service.sort_order))
  }

  const save = async () => {
    if (!user || !editService) return
    setSaving(true)
    try {
      const patch: Partial<Service> = {
        name: name.trim(),
        short_description: shortDescription.trim(),
        description: description.trim(),
        deliverables: fromLines(deliverables),
        technologies: fromLines(technologies),
        estimated_timeline: timeline.trim(),
        price_from_rwf: priceFrom ? Number(priceFrom) : null,
        price_to_rwf: priceTo ? Number(priceTo) : null,
        active,
        sort_order: Number(sortOrder) || 0,
      }
      await updateAdminService(editService.id, patch)
      setServices((current) => current.map((service) => service.id === editService.id ? { ...service, ...patch } : service))
      await recordAuditEvent(user.id, 'admin.service_updated', 'info', {
        service_id: editService.id,
        active,
      })
      setEditService(null)
      toast({ title: 'Service updated', tone: 'success' })
    } catch (err) {
      toast({ title: 'Could not update service', description: getErrorMessage(err), tone: 'error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Services"
        description="Manage the services shown publicly and in project requests. Starting prices are not final quotations."
        actions={<Badge tone="neutral">{services.filter((service) => service.active).length} active</Badge>}
      />

      {loading ? (
        <div className="flex justify-center py-20"><Spinner label="Loading services" /></div>
      ) : services.length ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {services.map((service) => (
            <div key={service.id} className="card-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-xs font-medium text-slate-200">{service.name}</h3>
                    <Badge tone={service.active ? 'accent' : 'neutral'}>{service.active ? 'Active' : 'Hidden'}</Badge>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-600">{service.category?.name || 'Uncategorised'} · /{service.slug}</p>
                </div>
                <button type="button" onClick={() => openEdit(service)} className="rounded-lg p-2 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Edit ${service.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-2 text-[11px] leading-5 text-slate-500">{service.short_description}</p>
              <div className="mt-3 flex items-center justify-between text-[10px] text-slate-600">
                <span>{service.price_from_rwf != null ? `From ${formatRwf(service.price_from_rwf)}` : 'Quote only'}</span>
                <span>{service.estimated_timeline || 'Timeline on quotation'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState icon={Wrench} title="No services configured" description="Add services through a database migration or seed script." />
      )}

      <Modal
        open={Boolean(editService)}
        onClose={() => { if (!saving) setEditService(null) }}
        title="Edit service"
        description={editService?.slug}
        className="max-w-2xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditService(null)} disabled={saving}>Cancel</Button>
            <Button onClick={() => void save()} loading={saving} disabled={!name.trim()}>Save service</Button>
          </>
        }
      >
        {editService ? (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
              <Input label="Service name" value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
              <Input label="Sort order" type="number" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)} />
            </div>
            <Input label="Short description" value={shortDescription} onChange={(event) => setShortDescription(event.target.value)} maxLength={240} />
            <Textarea label="Full description" value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Starting price (RWF)" type="number" min={0} value={priceFrom} onChange={(event) => setPriceFrom(event.target.value)} />
              <Input label="Maximum guide price (RWF)" type="number" min={0} value={priceTo} onChange={(event) => setPriceTo(event.target.value)} />
            </div>
            <Input label="Estimated timeline" value={timeline} onChange={(event) => setTimeline(event.target.value)} maxLength={120} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Textarea label="Deliverables (one per line)" value={deliverables} onChange={(event) => setDeliverables(event.target.value)} rows={4} />
              <Textarea label="Technologies (one per line)" value={technologies} onChange={(event) => setTechnologies(event.target.value)} rows={4} />
            </div>
            <Select
              label="Visibility"
              value={active ? 'active' : 'hidden'}
              onChange={(event) => setActive(event.target.value === 'active')}
              options={[{ value: 'active', label: 'Active — visible publicly' }, { value: 'hidden', label: 'Hidden — not shown publicly' }]}
            />
            <p className="text-[10px] leading-4 text-slate-600">
              Detailed terms, revision policy, responsibilities, and quote factors should be edited through reviewed
              database changes. This quick editor covers the fields most often updated.
            </p>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
