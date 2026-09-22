import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye, Rocket, Target, Play, FileSearch, ExternalLink } from 'lucide-react'

import { collaboratorApi, countryApi, collaboratorTypeApi, objectivePlanApi, periodApi, collaboratorObjectivePlanApi } from '@/lib/api'
import { CollaboratorSchema, type CollaboratorFormValues } from '@/lib/schemas'
import type { Database } from '@/lib/database.types'
import { formatThresholdValue } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

const N8N_WEBHOOK = 'https://n8n.diecipoints.info/webhook/fafdd9af-c7ad-40e7-8e4f-8c36869e1d4b'
const N8N_CALCOLO_WEBHOOK = 'https://n8n.diecipoints.info/webhook/b7190b76-ae97-4573-bbd5-e8701165a700'
const CUATRIMESTRI = (year: number) => [
  `1er Cuatrimestre ${year}`,
  `2do Cuatrimestre ${year}`,
  `3er Cuatrimestre ${year}`,
]

const THRESHOLD_TYPE_LABELS = {
  si_alcanza: 'Si alcanza',
  adicionalmente: 'Adicionalmente',
  adicionalmente_mayor: 'Adicionalmente (>)',
}

type Country = Database['public']['Tables']['Country']['Row']
type CollaboratorType = Database['public']['Tables']['CollaboratorType']['Row']
type Period = Database['public']['Tables']['Period']['Row']
type Collaborator = Database['public']['Tables']['Collaborator']['Row'] & {
  Country?: { CountryName: string } | null
  CollaboratorType?: { CollaboratorTypeName: string } | null
}
type ObjectivePlan = Database['public']['Tables']['ObjectivePlan']['Row']
type AssignedObjectivePlan = {
  CollaboratorObjectivePlanId: number
  ObjectivePlan: (Database['public']['Tables']['ObjectivePlan']['Row'] & {
    ObjectivePlanCountry?: { CountryId: number; Country?: { CountryName: string } | null }[]
    ObjectiveThreshold?: Database['public']['Tables']['ObjectiveThreshold']['Row'][]
  }) | null
}

interface AssignObjectiveDialogProps {
  open: boolean; collaborator: Collaborator | null; plans: ObjectivePlan[]
  onClose: () => void; onSuccess: () => void
}

function AssignObjectiveDialog({ open, collaborator, plans, onClose, onSuccess }: AssignObjectiveDialogProps) {
  const [planId, setPlanId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { if (open) setPlanId('') }, [open])

  async function handleAssign() {
    if (!collaborator || !planId) return
    setSubmitting(true)
    const { error } = await collaboratorObjectivePlanApi.assign(collaborator.CollaboratorId, Number(planId))
    setSubmitting(false)
    if (error) {
      toast.error(error.message.includes('duplicate') || error.message.includes('unique')
        ? 'Questo obiettivo è già assegnato a questo collaboratore.'
        : error.message)
      return
    }
    toast.success('Obiettivo assegnato')
    onSuccess(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Assegna Obiettivo</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">Assegna un piano obiettivo a <strong>{collaborator?.CollaboratorName}</strong>.</p>
          <div className="space-y-1.5">
            <Label>Piano obiettivo</Label>
            <Select value={planId} onValueChange={setPlanId}>
              <SelectTrigger><SelectValue placeholder="Seleziona un piano" /></SelectTrigger>
              <SelectContent>
                {plans.map((p) => <SelectItem key={p.ObjectivePlanId} value={p.ObjectivePlanId.toString()}>{p.ObjectivePlanName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
          <Button type="button" onClick={handleAssign} disabled={!planId || submitting}>{submitting ? 'Assegnazione...' : 'Assegna'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PreviewObjectiveDialogProps {
  open: boolean; collaborator: Collaborator | null; onClose: () => void
}

function PreviewObjectiveDialog({ open, collaborator, onClose }: PreviewObjectiveDialogProps) {
  const [assigned, setAssigned] = useState<AssignedObjectivePlan[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !collaborator) return
    setLoading(true)
    collaboratorObjectivePlanApi.listByCollaborator(collaborator.CollaboratorId).then(({ data, error }) => {
      if (error) toast.error(error.message)
      else setAssigned((data ?? []) as unknown as AssignedObjectivePlan[])
      setLoading(false)
    })
  }, [open, collaborator])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Anteprima Obiettivo — {collaborator?.CollaboratorName}</DialogTitle></DialogHeader>
        {loading ? (
          <p className="text-sm text-gray-400">Caricamento...</p>
        ) : assigned.length === 0 ? (
          <p className="text-sm text-gray-400">Nessun obiettivo assegnato a questo collaboratore.</p>
        ) : (
          <div className="space-y-5">
            {assigned.map((a) => (
              <div key={a.CollaboratorObjectivePlanId} className="space-y-3">
                <h3 className="font-semibold text-gray-900">{a.ObjectivePlan?.ObjectivePlanName ?? '—'}</h3>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Paesi coperti</p>
                  <div className="flex flex-wrap gap-1.5">
                    {a.ObjectivePlan?.ObjectivePlanCountry?.length
                      ? a.ObjectivePlan.ObjectivePlanCountry.map((c) => <Badge key={c.CountryId} variant="secondary">{c.Country?.CountryName}</Badge>)
                      : <span className="text-xs text-gray-400">Nessun paese</span>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Soglie</p>
                  {a.ObjectivePlan?.ObjectiveThreshold?.length ? (
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        <tr>
                          <th className="text-left px-3 py-2">Tipo</th>
                          <th className="text-right px-3 py-2">Fatturato soglia</th>
                          <th className="text-right px-3 py-2">Premio</th>
                        </tr>
                      </thead>
                      <tbody>
                        {a.ObjectivePlan.ObjectiveThreshold.map((t) => (
                          <tr key={t.ObjectiveThresholdId} className="border-t border-gray-100">
                            <td className="px-3 py-2">{THRESHOLD_TYPE_LABELS[t.ObjectiveThresholdType]}</td>
                            <td className="px-3 py-2 text-right">{formatThresholdValue(t.ObjectiveThresholdRevenueValue, t.ObjectiveThresholdRevenueCurrency)}</td>
                            <td className="px-3 py-2 text-right">{formatThresholdValue(t.ObjectiveThresholdBonusValue, t.ObjectiveThresholdBonusCurrency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="text-sm text-gray-400">Nessuna soglia definita.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Chiudi</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface StartCalculationDialogProps {
  open: boolean; collaborator: Collaborator | null; periods: Period[]; onClose: () => void
}

type CalcResult =
  | { status: 'success'; pdfUrl: string | null }
  | { status: 'not-found'; message: string }

function StartCalculationDialog({ open, collaborator, periods, onClose }: StartCalculationDialogProps) {
  const [selectedKey, setSelectedKey] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<CalcResult | null>(null)

  useEffect(() => {
    if (open) { setSelectedKey(''); setResult(null); setSubmitting(false) }
  }, [open])

  const cuatrimestreOptions = periods
    .slice()
    .sort((a, b) => b.PeriodYear - a.PeriodYear)
    .flatMap((p) => CUATRIMESTRI(p.PeriodYear).map((c) => ({ key: `${p.PeriodId}__${c}`, label: c, period: p })))

  const selected = cuatrimestreOptions.find((o) => o.key === selectedKey)

  const canSubmit = !!collaborator && !!selected

  async function handleAvvia() {
    if (!collaborator || !selected) {
      toast.error('Parametri mancanti: seleziona un cuatrimestre.')
      return
    }
    setSubmitting(true)
    setResult(null)
    try {
      const payload = {
        collaboratorId: collaborator.CollaboratorId.toString(),
        periodo: selected.period.PeriodDescription,
        anno: selected.period.PeriodYear,
        cuatrimestre: selected.label,
        collaboratoreName: collaborator.CollaboratorName,
      }
      const res = await fetch(N8N_CALCOLO_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)

      if (res.status === 404) {
        const message = (data && typeof data.error === 'string' && data.error) || 'Dati Qlik non trovati per questo collaboratore e periodo'
        setResult({ status: 'not-found', message })
        return
      }
      if (!res.ok || !data?.success) {
        toast.error((data && typeof data.error === 'string' && data.error) || 'Errore durante il calcolo del premio.')
        return
      }
      setResult({ status: 'success', pdfUrl: typeof data.pdfUrl === 'string' ? data.pdfUrl : null })
      toast.success('Premio calcolato correttamente')
    } catch {
      toast.error('Errore di connessione al servizio di calcolo.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Avvia Calcolo</DialogTitle></DialogHeader>

        {result?.status === 'success' ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-700">
              Premio calcolato correttamente per <strong>{collaborator?.CollaboratorName}</strong>.
            </p>
            {result.pdfUrl && (
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" /> Apri PDF risultato
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Cuatrimestre</Label>
              <Select value={selectedKey} onValueChange={setSelectedKey} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Seleziona cuatrimestre" /></SelectTrigger>
                <SelectContent>
                  {cuatrimestreOptions.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-gray-600">
              Avvia calcolo per <strong>{collaborator?.CollaboratorName}</strong> - {selected ? selected.label : 'seleziona un cuatrimestre'}
            </p>
            {result?.status === 'not-found' && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {result.message}. Carica prima lo screenshot Qlik del collaboratore per questo periodo (Inbox Processor).
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>{result?.status === 'success' ? 'Chiudi' : 'Annulla'}</Button>
          {result?.status !== 'success' && (
            <Button type="button" disabled={!canSubmit || submitting} onClick={handleAvvia}>
              {submitting ? 'Calcolo in corso...' : 'Avvia'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface CollaboratorDialogProps {
  open: boolean; item: Collaborator | null; countries: Country[]; types: CollaboratorType[]
  onClose: () => void; onSuccess: () => void
}

function CollaboratorDialog({ open, item, countries, types, onClose, onSuccess }: CollaboratorDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CollaboratorFormValues>({
    resolver: zodResolver(CollaboratorSchema) as never,
    defaultValues: { CollaboratorName: '', CollaboratorEmail: '', CollaboratorTypeId: undefined as unknown as number, CountryId: undefined as unknown as number, CollaboratorActive: true },
  })

  useEffect(() => {
    if (open) reset({
      CollaboratorName: item?.CollaboratorName ?? '',
      CollaboratorEmail: item?.CollaboratorEmail ?? '',
      CollaboratorTypeId: item?.CollaboratorTypeId ?? (undefined as unknown as number),
      CountryId: item?.CountryId ?? (undefined as unknown as number),
      CollaboratorActive: item?.CollaboratorActive ?? true,
      CuatrimestreIngresso: item?.CuatrimestreIngresso ?? undefined,
    })
  }, [open, item, reset])

  async function onSubmit(values: CollaboratorFormValues) {
    const { error } = item ? await collaboratorApi.update(item.CollaboratorId, values) : await collaboratorApi.create(values)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Collaboratore aggiornato' : 'Collaboratore creato')
    onSuccess(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Modifica Collaboratore' : 'Nuovo Collaboratore'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="CollaboratorName">Nome</Label>
            <Input id="CollaboratorName" {...register('CollaboratorName')} placeholder="Nome e cognome" />
            {errors.CollaboratorName && <p className="text-sm text-destructive">{errors.CollaboratorName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="CollaboratorEmail">Email</Label>
            <Input id="CollaboratorEmail" type="email" {...register('CollaboratorEmail')} placeholder="email@esempio.com" />
            {errors.CollaboratorEmail && <p className="text-sm text-destructive">{errors.CollaboratorEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Paese</Label>
            <Controller control={control} name="CountryId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona un paese" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.CountryId} value={c.CountryId.toString()}>{c.CountryName}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.CountryId && <p className="text-sm text-destructive">{errors.CountryId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo Collaboratore</Label>
            <Controller control={control} name="CollaboratorTypeId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona un tipo" /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.CollaboratorTypeId} value={t.CollaboratorTypeId.toString()}>{t.CollaboratorTypeName}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.CollaboratorTypeId && <p className="text-sm text-destructive">{errors.CollaboratorTypeId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Cuatrimestre Ingresso</Label>
            <Controller control={control} name="CuatrimestreIngresso" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value ?? ''}>
                <SelectTrigger><SelectValue placeholder="Seleziona cuatrimestre" /></SelectTrigger>
                <SelectContent>
                  {CUATRIMESTRI(new Date().getFullYear()).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )} />
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="CollaboratorActive">Attivo</Label>
            <Controller control={control} name="CollaboratorActive" render={({ field }) => (
              <Switch id="CollaboratorActive" checked={field.value} onCheckedChange={field.onChange} />
            )} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annulla</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Salvataggio...' : 'Salva'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function CollaboratoriPage() {
  const [items, setItems] = useState<Collaborator[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [types, setTypes] = useState<CollaboratorType[]>([])
  const [plans, setPlans] = useState<ObjectivePlan[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Collaborator | null>(null)
  const [deleteItem, setDeleteItem] = useState<Collaborator | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [assignItem, setAssignItem] = useState<Collaborator | null>(null)
  const [previewItem, setPreviewItem] = useState<Collaborator | null>(null)
  const [calcItem, setCalcItem] = useState<Collaborator | null>(null)
  const [filterActive, setFilterActive] = useState('tutti')
  const [filterCountry, setFilterCountry] = useState('tutti')
  const [filterType, setFilterType] = useState('tutti')
  const [onboardingLoading, setOnboardingLoading] = useState<number | null>(null)

  async function loadRefData() {
    const [cr, tr, pr, per] = await Promise.all([countryApi.list(), collaboratorTypeApi.list(), objectivePlanApi.list(), periodApi.list()])
    if (!cr.error) setCountries((cr.data ?? []) as Country[])
    if (!tr.error) setTypes(tr.data ?? [])
    if (!pr.error) setPlans((pr.data ?? []) as ObjectivePlan[])
    if (!per.error) setPeriods(per.data ?? [])
  }

  async function load() {
    setLoading(true)
    const filters: { active?: boolean; countryId?: number; typeId?: number } = {}
    if (filterActive === 'attivi') filters.active = true
    if (filterActive === 'inattivi') filters.active = false
    if (filterCountry !== 'tutti') filters.countryId = Number(filterCountry)
    if (filterType !== 'tutti') filters.typeId = Number(filterType)
    const { data, error } = await collaboratorApi.list(filters)
    if (error) toast.error(error.message)
    else setItems((data ?? []) as Collaborator[])
    setLoading(false)
  }

  useEffect(() => { loadRefData() }, [])
  useEffect(() => { load() }, [filterActive, filterCountry, filterType])

  async function handleToggleActive(item: Collaborator) {
    const { error } = await collaboratorApi.update(item.CollaboratorId, { CollaboratorActive: !item.CollaboratorActive })
    if (error) toast.error(error.message)
    else { toast.success(item.CollaboratorActive ? 'Disattivato' : 'Attivato'); await load() }
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await collaboratorApi.delete(deleteItem.CollaboratorId)
    if (error) toast.error(error.message)
    else { toast.success('Collaboratore eliminato'); await load() }
    setDeleting(false); setDeleteItem(null)
  }

  async function handleOnboarding(item: Collaborator) {
    if (item.OnboardingDone) return
    setOnboardingLoading(item.CollaboratorId)
    try {
      const payload = {
        collaboratorId: item.CollaboratorId.toString(),
        collaboratorName: item.CollaboratorName,
        country: item.Country?.CountryName ?? '',
        collaboratorType: item.CollaboratorType?.CollaboratorTypeName ?? '',
        cuatrimestre: item.CuatrimestreIngresso ?? '',
      }
      const res = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`n8n error: ${res.status}`)
      await collaboratorApi.update(item.CollaboratorId, { OnboardingDone: true })
      toast.success('Onboarding avviato!')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore onboarding')
    } finally {
      setOnboardingLoading(null)
    }
  }

  const columns: Column<Collaborator>[] = [
    { header: 'Nome', accessorKey: 'CollaboratorName' },
    { header: 'Email', accessorKey: 'CollaboratorEmail' },
    { header: 'Paese', cell: (r) => r.Country?.CountryName ?? '—' },
    { header: 'Tipo', cell: (r) => r.CollaboratorType?.CollaboratorTypeName ?? '—' },
    {
      header: 'Attivo', className: 'w-20 text-center',
      cell: (r) => <div className="flex justify-center"><Switch checked={r.CollaboratorActive} onCheckedChange={() => handleToggleActive(r)} /></div>,
    },
    {
      header: '', className: 'w-64 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" asChild title="Dettaglio"><Link to={`/collaboratori/${r.CollaboratorId}`}><Eye className="h-4 w-4" /></Link></Button>
          <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setDialogOpen(true) }} title="Modifica"><Pencil className="h-4 w-4" /></Button>
          <Button
            variant="ghost" size="icon" title="Assegna Obiettivo"
            onClick={() => setAssignItem(r)}
            className="text-purple-400 hover:text-purple-600 hover:bg-purple-50"
          >
            <Target className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" title="Anteprima Obiettivo"
            onClick={() => setPreviewItem(r)}
          >
            <FileSearch className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" title="Avvia Calcolo"
            onClick={() => setCalcItem(r)}
            className="text-teal-500 hover:text-teal-700 hover:bg-teal-50"
          >
            <Play className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost" size="icon" title={r.OnboardingDone ? 'Onboarding completato' : 'Avvia onboarding'}
            disabled={!!r.OnboardingDone || onboardingLoading === r.CollaboratorId}
            onClick={() => handleOnboarding(r)}
            className={r.OnboardingDone ? 'text-green-500' : 'text-blue-400 hover:text-blue-600 hover:bg-blue-50'}
          >
            <Rocket className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(r)} title="Elimina" className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Collaboratori</h1>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> Nuovo Collaboratore
        </Button>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="attivi">Attivi</SelectItem>
              <SelectItem value="inattivi">Inattivi</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Paese" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i paesi</SelectItem>
              {countries.map((c) => <SelectItem key={c.CountryId} value={c.CountryId.toString()}>{c.CountryName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i tipi</SelectItem>
              {types.map((t) => <SelectItem key={t.CollaboratorTypeId} value={t.CollaboratorTypeId.toString()}>{t.CollaboratorTypeName}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun collaboratore trovato."
        />
      </div>

      <CollaboratorDialog open={dialogOpen} item={editItem} countries={countries} types={types} onClose={() => setDialogOpen(false)} onSuccess={load} />

      <AssignObjectiveDialog open={!!assignItem} collaborator={assignItem} plans={plans} onClose={() => setAssignItem(null)} onSuccess={load} />

      <PreviewObjectiveDialog open={!!previewItem} collaborator={previewItem} onClose={() => setPreviewItem(null)} />

      <StartCalculationDialog open={!!calcItem} collaborator={calcItem} periods={periods} onClose={() => setCalcItem(null)} />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Collaboratore</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler eliminare <strong>{deleteItem?.CollaboratorName}</strong>? L'operazione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{deleting ? 'Eliminazione...' : 'Elimina'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
