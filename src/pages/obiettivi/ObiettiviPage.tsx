import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye, Copy } from 'lucide-react'

import { objectivePlanApi, periodApi, countryApi } from '@/lib/api'
import type { ObjectiveStatus, ObjectivePlanScope } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

import { ObjectivePlanDialog, StatusPill, STATUS_LABELS, type Period, type Country, type ObjectivePlan } from './ObjectivePlanDialog'

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

export function ObiettiviPage() {
  const [items, setItems] = useState<ObjectivePlan[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ObjectivePlan | null>(null)
  const [duplicateItem, setDuplicateItem] = useState<ObjectivePlan | null>(null)
  const [deleteItem, setDeleteItem] = useState<ObjectivePlan | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState('tutti')
  const [filterStatus, setFilterStatus] = useState('tutti')
  const [scopeFilter, setScopeFilter] = useState<ObjectivePlanScope>('individual')
  const [dialogScope, setDialogScope] = useState<ObjectivePlanScope>('individual')
  const [dialogLockedCountryId, setDialogLockedCountryId] = useState<number | undefined>(undefined)

  useEffect(() => {
    Promise.all([periodApi.list(), countryApi.list()]).then(([p, co]) => {
      if (!p.error) setPeriods(p.data ?? [])
      if (!co.error) setCountries((co.data ?? []) as Country[])
    })
  }, [])

  async function load() {
    setLoading(true)
    const filters: { periodId?: number; status?: ObjectiveStatus; scope: ObjectivePlanScope } = { scope: scopeFilter }
    if (filterPeriod !== 'tutti') filters.periodId = Number(filterPeriod)
    if (filterStatus !== 'tutti') filters.status = filterStatus as ObjectiveStatus
    const { data, error } = await objectivePlanApi.list(filters)
    if (error) toast.error(error.message)
    else setItems((data ?? []) as ObjectivePlan[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterPeriod, filterStatus, scopeFilter])

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
          <Button variant="ghost" size="icon" onClick={() => {
            setEditItem(r); setDuplicateItem(null)
            setDialogScope(r.ObjectivePlanScope)
            setDialogLockedCountryId(r.ObjectivePlanScope === 'filiale' ? r.ObjectivePlanCountry?.[0]?.CountryId : undefined)
            setDialogOpen(true)
          }} title="Modifica"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => {
            setEditItem(null); setDuplicateItem(r)
            setDialogScope(r.ObjectivePlanScope)
            setDialogLockedCountryId(r.ObjectivePlanScope === 'filiale' ? r.ObjectivePlanCountry?.[0]?.CountryId : undefined)
            setDialogOpen(true)
          }} title="Duplica"><Copy className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(r)} title="Elimina" className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Obiettivi</h1>
        {scopeFilter === 'individual' && (
          <Button onClick={() => {
            setEditItem(null); setDuplicateItem(null)
            setDialogScope('individual'); setDialogLockedCountryId(undefined)
            setDialogOpen(true)
          }}>
            <Plus className="h-4 w-4" /> Nuovo Obiettivo
          </Button>
        )}
      </div>

      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm w-fit">
        <button
          type="button"
          onClick={() => setScopeFilter('individual')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${scopeFilter === 'individual' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Individuale
        </button>
        <button
          type="button"
          onClick={() => setScopeFilter('filiale')}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${scopeFilter === 'filiale' ? 'bg-primary text-primary-foreground' : 'text-gray-600 hover:bg-gray-50'}`}
        >
          Filiale
        </button>
      </div>
      {scopeFilter === 'filiale' && (
        <p className="text-sm text-gray-500">
          I piani filiale si creano da <Link to="/country" className="underline">Country</Link>, dove il paese di destinazione è già definito.
        </p>
      )}

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

      <ObjectivePlanDialog
        open={dialogOpen}
        item={editItem}
        duplicateFrom={duplicateItem}
        periods={periods}
        countries={countries}
        scope={dialogScope}
        lockedCountryId={dialogLockedCountryId}
        onClose={() => setDialogOpen(false)}
        onSuccess={load}
      />

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
