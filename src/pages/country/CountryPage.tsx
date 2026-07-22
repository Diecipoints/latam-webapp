import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Pencil, Trash2, Target, RotateCcw } from 'lucide-react'

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
  const [expandedCountryIds, setExpandedCountryIds] = useState<Set<number>>(new Set())

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

  function toggleExpanded(countryId: number) {
    setExpandedCountryIds((prev) => {
      const next = new Set(prev)
      if (next.has(countryId)) next.delete(countryId)
      else next.add(countryId)
      return next
    })
  }

  async function handleReactivate(countryId: number, planId: number) {
    const { error } = await objectivePlanApi.reactivateFiliale(countryId, planId)
    if (error) toast.error(error.message)
    else { toast.success('Piano riattivato'); await load() }
  }

  const plansByCountry = plans.reduce((map, plan) => {
    const countryId = plan.ObjectivePlanCountry?.[0]?.CountryId
    if (countryId == null) return map
    const entry = map.get(countryId) ?? { active: null as ObjectivePlan | null, historical: [] as ObjectivePlan[] }
    if (plan.ObjectivePlanCountry?.[0]?.active) entry.active = plan
    else entry.historical.push(plan)
    map.set(countryId, entry)
    return map
  }, new Map<number, { active: ObjectivePlan | null; historical: ObjectivePlan[] }>())

  const columns: Column<CountryWithRegion>[] = [
    { header: 'Paese', cell: (r) => r.CountryName },
    { header: 'Regione', cell: (r) => r.Region?.RegionName ?? '—' },
    {
      header: 'Piani Filiale',
      cell: (r) => {
        const entry = plansByCountry.get(r.CountryId)
        const activePlan = entry?.active ?? null
        const historicalPlans = entry?.historical ?? []
        if (!activePlan && historicalPlans.length === 0) return <span className="text-gray-400">Nessun piano filiale</span>
        const isExpanded = expandedCountryIds.has(r.CountryId)
        return (
          <div className="space-y-1.5">
            {activePlan ? (
              <div className="flex items-center gap-1">
                <Badge variant="secondary">{activePlan.ObjectivePlanName}</Badge>
                <StatusPill status={activePlan.ObjectiveStatus} />
                <Button variant="ghost" size="icon" title="Modifica" onClick={() => setDialogState({ item: activePlan, countryId: r.CountryId })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" title="Elimina" onClick={() => setDeleteItem(activePlan)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <span className="text-xs text-gray-400">Nessun piano attivo</span>
            )}
            {historicalPlans.length > 0 && (
              <div>
                <button type="button" onClick={() => toggleExpanded(r.CountryId)} className="text-xs text-gray-500 underline hover:text-gray-700">
                  {isExpanded ? 'Nascondi' : 'Mostra'} storico ({historicalPlans.length})
                </button>
                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {historicalPlans.map((plan) => (
                      <div key={plan.ObjectivePlanId} className="flex items-center gap-1 opacity-70">
                        <Badge variant="outline">{plan.ObjectivePlanName}</Badge>
                        <StatusPill status={plan.ObjectiveStatus} />
                        <Button variant="ghost" size="icon" title="Riattiva" onClick={() => handleReactivate(r.CountryId, plan.ObjectivePlanId)}>
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Modifica" onClick={() => setDialogState({ item: plan, countryId: r.CountryId })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Elimina" onClick={() => setDeleteItem(plan)} className="text-red-400 hover:text-red-600 hover:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
            <AlertDialogDescription>
              Sei sicuro di voler eliminare questo piano? L'operazione non può essere annullata.
              {deleteItem?.ObjectivePlanCountry?.[0]?.active && (
                <span className="mt-2 block font-medium text-amber-600">
                  Stai eliminando il piano ATTIVO: il country resterà senza premio filiale finché non ne assegni o riattivi un altro.
                </span>
              )}
            </AlertDialogDescription>
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
