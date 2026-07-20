import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Target } from 'lucide-react'

import { countryApi, periodApi, objectivePlanApi } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

import { ObjectivePlanDialog, StatusPill, type Period, type Country, type ObjectivePlan } from '../obiettivi/ObjectivePlanDialog'

type CountryWithRegion = Country & { Region?: { RegionName: string } | null }

export function CountryPage() {
  const [countries, setCountries] = useState<CountryWithRegion[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [plans, setPlans] = useState<ObjectivePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogState, setDialogState] = useState<{ item: ObjectivePlan | null; countryId: number } | null>(null)
  const [deleteItem, setDeleteItem] = useState<ObjectivePlan | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    Promise.all([countryApi.list(), periodApi.list()]).then(([c, p]) => {
      if (!c.error) setCountries((c.data ?? []) as CountryWithRegion[])
      if (!p.error) setPeriods(p.data ?? [])
    })
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await objectivePlanApi.list({ scope: 'filiale' })
    if (error) toast.error(error.message)
    else setPlans((data ?? []) as ObjectivePlan[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await objectivePlanApi.delete(deleteItem.ObjectivePlanId)
    if (error) toast.error(error.message)
    else { toast.success('Piano filiale eliminato'); await load() }
    setDeleting(false); setDeleteItem(null)
  }

  const plansByCountry = plans.reduce((map, plan) => {
    const countryId = plan.ObjectivePlanCountry?.[0]?.CountryId
    if (countryId == null) return map
    const list = map.get(countryId) ?? []
    list.push(plan)
    map.set(countryId, list)
    return map
  }, new Map<number, ObjectivePlan[]>())

  const columns: Column<CountryWithRegion>[] = [
    { header: 'Paese', cell: (r) => r.CountryName },
    { header: 'Regione', cell: (r) => r.Region?.RegionName ?? '—' },
    {
      header: 'Piani Filiale',
      cell: (r) => {
        const rowPlans = plansByCountry.get(r.CountryId) ?? []
        if (rowPlans.length === 0) return <span className="text-gray-400">Nessun piano filiale</span>
        return (
          <div className="flex flex-wrap gap-2">
            {rowPlans.map((plan) => (
              <div key={plan.ObjectivePlanId} className="flex items-center gap-1">
                <Badge variant="secondary">{plan.ObjectivePlanName}</Badge>
                <StatusPill status={plan.ObjectiveStatus} />
                <Button
                  variant="ghost" size="icon" title="Modifica"
                  onClick={() => setDialogState({ item: plan, countryId: plan.ObjectivePlanCountry?.[0]?.CountryId ?? r.CountryId })}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost" size="icon" title="Elimina"
                  onClick={() => setDeleteItem(plan)}
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )
      },
    },
    {
      header: 'Azioni', className: 'w-24 text-right',
      cell: (r) => (
        <div className="flex justify-end">
          <Button
            variant="ghost" size="icon" title="Assegna Obiettivo"
            onClick={() => setDialogState({ item: null, countryId: r.CountryId })}
            className="text-purple-400 hover:text-purple-600 hover:bg-purple-50"
          >
            <Target className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Country</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={countries as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun paese trovato."
        />
      </div>

      <ObjectivePlanDialog
        open={!!dialogState}
        item={dialogState?.item ?? null}
        periods={periods}
        countries={countries}
        scope="filiale"
        lockedCountryId={dialogState?.countryId}
        onClose={() => setDialogState(null)}
        onSuccess={load}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Piano Filiale</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler eliminare questo piano? L'operazione non può essere annullata.</AlertDialogDescription>
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
