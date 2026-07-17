import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye } from 'lucide-react'

import { objectivePlanApi, periodApi, countryApi } from '@/lib/api'
import { ObjectivePlanSchema, type ObjectivePlanFormValues } from '@/lib/schemas'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

type Period = Database['public']['Tables']['Period']['Row']
type Country = Database['public']['Tables']['Country']['Row']
type ObjectivePlan = Database['public']['Tables']['ObjectivePlan']['Row'] & {
  Period?: { PeriodDescription: string; PeriodYear: number } | null
  ObjectivePlanCountry?: { CountryId: number; Country?: { CountryName: string } | null }[]
  CollaboratorObjectivePlan?: { CollaboratorId: number }[]
  ObjectiveThreshold?: Database['public']['Tables']['ObjectiveThreshold']['Row'][]
}

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  DRAFT: 'Bozza', ASSIGNED: 'Assegnato', SIGNED: 'Firmato', CLOSED: 'Chiuso',
}

const CURRENCIES = ['EUR', 'COP', 'MXN', 'ARS', 'CLP', 'DOP'] as const

const THRESHOLD_TYPE_LABELS = {
  si_alcanza: 'Si alcanza',
  adicionalmente: 'Adicionalmente',
  adicionalmente_mayor: 'Adicionalmente (>)',
}

function StatusPill({ status }: { status: ObjectiveStatus }) {
  const cls: Record<ObjectiveStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-600',
    ASSIGNED: 'bg-blue-100 text-blue-700',
    SIGNED: 'bg-green-100 text-green-700',
    CLOSED: 'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}

function CountryBadges({ countries }: { countries: { CountryId: number; Country?: { CountryName: string } | null }[] }) {
  if (!countries || countries.length === 0) return <span className="text-gray-400">—</span>
  const names = countries.map((c) => c.Country?.CountryName).filter(Boolean) as string[]
  const shown = names.slice(0, 2)
  const rest = names.length - shown.length
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((n) => <Badge key={n} variant="secondary">{n}</Badge>)}
      {rest > 0 && <Badge variant="outline">+{rest}</Badge>}
    </div>
  )
}

const emptyThreshold = {
  ObjectiveThresholdRevenueValue: 0,
  ObjectiveThresholdRevenueCurrency: 'EUR' as const,
  ObjectiveThresholdBonusValue: 0,
  ObjectiveThresholdBonusCurrency: 'EUR' as const,
  ObjectiveThresholdType: 'si_alcanza' as const,
}

const DEFAULT_THRESHOLD_ROWS = 4

interface ObjectivePlanDialogProps {
  open: boolean; item: ObjectivePlan | null; periods: Period[]; countries: Country[]
  onClose: () => void; onSuccess: () => void
}

function ObjectivePlanDialog({ open, item, periods, countries, onClose, onSuccess }: ObjectivePlanDialogProps) {
  const manuallyEditedRef = useRef(false)
  const { register, handleSubmit, reset, control, setValue, formState: { errors, isSubmitting } } = useForm<ObjectivePlanFormValues>({
    resolver: zodResolver(ObjectivePlanSchema),
    defaultValues: {
      PeriodId: undefined as unknown as number,
      CountryIds: [],
      ObjectivePlanName: '',
      ObjectiveStatus: 'DRAFT',
      Thresholds: [],
    },
  })

  const { fields, append, remove, replace } = useFieldArray({ control, name: 'Thresholds' })
  const watchedCountryIds = useWatch({ control, name: 'CountryIds' })

  useEffect(() => {
    if (!open) return
    manuallyEditedRef.current = !!item
    reset({
      PeriodId: item?.PeriodId ?? (undefined as unknown as number),
      CountryIds: item?.ObjectivePlanCountry?.map((c) => c.CountryId) ?? [],
      ObjectivePlanName: item?.ObjectivePlanName ?? '',
      ObjectiveStatus: item?.ObjectiveStatus ?? 'DRAFT',
      Thresholds: Array.from({ length: DEFAULT_THRESHOLD_ROWS }, () => ({ ...emptyThreshold })),
    })

    if (!item) return
    objectivePlanApi.get(item.ObjectivePlanId).then(({ data, error }) => {
      if (error) { toast.error(error.message); return }
      const loaded = ((data as ObjectivePlan | null)?.ObjectiveThreshold ?? []).map((t) => ({
        ObjectiveThresholdRevenueValue: t.ObjectiveThresholdRevenueValue,
        ObjectiveThresholdRevenueCurrency: t.ObjectiveThresholdRevenueCurrency,
        ObjectiveThresholdBonusValue: t.ObjectiveThresholdBonusValue,
        ObjectiveThresholdBonusCurrency: t.ObjectiveThresholdBonusCurrency,
        ObjectiveThresholdType: t.ObjectiveThresholdType,
      }))
      replace(loaded.length ? loaded : Array.from({ length: DEFAULT_THRESHOLD_ROWS }, () => ({ ...emptyThreshold })))
    })
  }, [open, item, reset, replace])

  useEffect(() => {
    if (!open || manuallyEditedRef.current) return
    const generated = countries
      .filter((c) => watchedCountryIds?.includes(c.CountryId))
      .map((c) => c.CountryName)
      .join(' + ')
    setValue('ObjectivePlanName', generated)
  }, [watchedCountryIds, countries, open, setValue])

  async function onSubmit(values: ObjectivePlanFormValues) {
    const { error } = item ? await objectivePlanApi.update(item.ObjectivePlanId, values) : await objectivePlanApi.create(values)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Obiettivo aggiornato' : 'Obiettivo creato'); onSuccess(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Periodo</Label>
            <Controller control={control} name="PeriodId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona periodo" /></SelectTrigger>
                <SelectContent>{periods.map((p) => <SelectItem key={p.PeriodId} value={p.PeriodId.toString()}>{p.PeriodDescription}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.PeriodId && <p className="text-sm text-destructive">{errors.PeriodId.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Paesi coperti</Label>
            <Controller control={control} name="CountryIds" render={({ field }) => (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 p-2 space-y-1">
                {countries.map((c) => {
                  const checked = field.value?.includes(c.CountryId) ?? false
                  return (
                    <label key={c.CountryId} className="flex items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...(field.value ?? []), c.CountryId]
                            : (field.value ?? []).filter((id) => id !== c.CountryId)
                          field.onChange(next)
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      {c.CountryName}
                    </label>
                  )
                })}
              </div>
            )} />
            {errors.CountryIds && <p className="text-sm text-destructive">{errors.CountryIds.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ObjectivePlanName">Nome piano</Label>
            <Input id="ObjectivePlanName" {...register('ObjectivePlanName', { onChange: () => { manuallyEditedRef.current = true } })} />
            {errors.ObjectivePlanName && <p className="text-sm text-destructive">{errors.ObjectivePlanName.message}</p>}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Soglie</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ ...emptyThreshold })}>
                <Plus className="h-4 w-4" /> Aggiungi soglia
              </Button>
            </div>
            {errors.Thresholds?.message && <p className="text-sm text-destructive">{errors.Thresholds.message}</p>}
            <div className="space-y-3">
              {fields.map((field, i) => (
                <div key={field.id} className="rounded-lg border border-gray-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Fatturato soglia</Label>
                      <div className="flex gap-1.5">
                        <Input type="number" step="any" {...register(`Thresholds.${i}.ObjectiveThresholdRevenueValue`, { valueAsNumber: true })} />
                        <Controller control={control} name={`Thresholds.${i}.ObjectiveThresholdRevenueCurrency`} render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Premio</Label>
                      <div className="flex gap-1.5">
                        <Input type="number" step="any" {...register(`Thresholds.${i}.ObjectiveThresholdBonusValue`, { valueAsNumber: true })} />
                        <Controller control={control} name={`Thresholds.${i}.ObjectiveThresholdBonusCurrency`} render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value}>
                            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
                            <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                          </Select>
                        )} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Tipo</Label>
                      <Controller control={control} name={`Thresholds.${i}.ObjectiveThresholdType`} render={({ field: f }) => (
                        <Select onValueChange={f.onChange} value={f.value}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="si_alcanza">{THRESHOLD_TYPE_LABELS.si_alcanza}</SelectItem>
                            <SelectItem value="adicionalmente">{THRESHOLD_TYPE_LABELS.adicionalmente}</SelectItem>
                            <SelectItem value="adicionalmente_mayor">{THRESHOLD_TYPE_LABELS.adicionalmente_mayor}</SelectItem>
                          </SelectContent>
                        </Select>
                      )} />
                    </div>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(i)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Stato</Label>
            <Controller control={control} name="ObjectiveStatus" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS_LABELS) as ObjectiveStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
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

export function ObiettiviPage() {
  const [items, setItems] = useState<ObjectivePlan[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ObjectivePlan | null>(null)
  const [deleteItem, setDeleteItem] = useState<ObjectivePlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState('tutti')
  const [filterStatus, setFilterStatus] = useState('tutti')

  useEffect(() => {
    Promise.all([periodApi.list(), countryApi.list()]).then(([p, co]) => {
      if (!p.error) setPeriods(p.data ?? [])
      if (!co.error) setCountries((co.data ?? []) as Country[])
    })
  }, [])

  async function load() {
    setLoading(true)
    const filters: { periodId?: number; status?: ObjectiveStatus; scope: 'individual' } = { scope: 'individual' }
    if (filterPeriod !== 'tutti') filters.periodId = Number(filterPeriod)
    if (filterStatus !== 'tutti') filters.status = filterStatus as ObjectiveStatus
    const { data, error } = await objectivePlanApi.list(filters)
    if (error) toast.error(error.message)
    else setItems((data ?? []) as ObjectivePlan[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterPeriod, filterStatus])

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await objectivePlanApi.delete(deleteItem.ObjectivePlanId)
    if (error) toast.error(error.message)
    else { toast.success('Obiettivo eliminato'); await load() }
    setDeleting(false); setDeleteItem(null)
  }

  const columns: Column<ObjectivePlan>[] = [
    { header: 'Nome piano', cell: (r) => r.ObjectivePlanName },
    { header: 'Periodo', cell: (r) => r.Period ? `${r.Period.PeriodDescription} (${r.Period.PeriodYear})` : '—' },
    { header: 'Assegnati', className: 'text-center', cell: (r) => r.CollaboratorObjectivePlan?.length ?? 0 },
    { header: 'Paesi', cell: (r) => <CountryBadges countries={r.ObjectivePlanCountry ?? []} /> },
    { header: 'Stato', cell: (r) => <StatusPill status={r.ObjectiveStatus} /> },
    {
      header: '', className: 'w-28 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" asChild title="Dettaglio"><Link to={`/obiettivi/${r.ObjectivePlanId}`}><Eye className="h-4 w-4" /></Link></Button>
          <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setDialogOpen(true) }} title="Modifica"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(r)} title="Elimina" className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Obiettivi</h1>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> Nuovo Obiettivo
        </Button>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={filterPeriod} onValueChange={setFilterPeriod}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Periodo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i periodi</SelectItem>
              {periods.map((p) => <SelectItem key={p.PeriodId} value={p.PeriodId.toString()}>{p.PeriodDescription}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti gli stati</SelectItem>
              {(Object.keys(STATUS_LABELS) as ObjectiveStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
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
          emptyMessage="Nessun obiettivo trovato."
        />
      </div>

      <ObjectivePlanDialog open={dialogOpen} item={editItem} periods={periods} countries={countries} onClose={() => setDialogOpen(false)} onSuccess={load} />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Obiettivo</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler eliminare questo obiettivo? L'operazione non può essere annullata.</AlertDialogDescription>
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
