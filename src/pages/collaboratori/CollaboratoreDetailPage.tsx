import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Target, Trash2 } from 'lucide-react'

import { collaboratorApi, collaboratorObjectivePlanApi } from '@/lib/api'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

type Collaborator = Database['public']['Tables']['Collaborator']['Row'] & {
  Country?: { CountryName: string; RegionId: number; Region?: { RegionName: string } | null } | null
  CollaboratorType?: { CollaboratorTypeName: string } | null
}
type AssignedObjectivePlan = {
  CollaboratorObjectivePlanId: number
  ObjectivePlan: (Database['public']['Tables']['ObjectivePlan']['Row'] & {
    Period?: { PeriodDescription: string; PeriodYear: number } | null
  }) | null
}

const LOCKED_STATUSES: ObjectiveStatus[] = ['CLOSED']

const statusConfig: Record<ObjectiveStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Bozza', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  ASSIGNED: { label: 'Assegnato', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  SIGNED: { label: 'Firmato', className: 'bg-green-100 text-green-700 border-green-200' },
  CLOSED: { label: 'Chiuso', className: 'bg-slate-100 text-slate-700 border-slate-200' },
}

export function CollaboratoreDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [collaborator, setCollaborator] = useState<Collaborator | null>(null)
  const [objectives, setObjectives] = useState<AssignedObjectivePlan[]>([])
  const [loading, setLoading] = useState(true)
  const [objLoading, setObjLoading] = useState(true)
  const [removeTarget, setRemoveTarget] = useState<AssignedObjectivePlan | null>(null)
  const [removing, setRemoving] = useState(false)

  async function loadObjectives(collaboratorId: number) {
    setObjLoading(true)
    const { data, error } = await collaboratorObjectivePlanApi.listByCollaborator(collaboratorId)
    if (error) toast.error(error.message)
    else setObjectives((data ?? []) as unknown as AssignedObjectivePlan[])
    setObjLoading(false)
  }

  useEffect(() => {
    async function run() {
      if (!id) return
      const { data, error } = await collaboratorApi.get(Number(id))
      if (error) { toast.error(error.message); navigate('/collaboratori'); return }
      setCollaborator(data as Collaborator)
      setLoading(false)
      await loadObjectives(Number(id))
    }
    run()
  }, [id, navigate])

  async function handleRemove() {
    if (!removeTarget) return
    setRemoving(true)
    const { error } = await collaboratorObjectivePlanApi.remove(removeTarget.CollaboratorObjectivePlanId)
    setRemoving(false)
    if (error) { toast.error(error.message); setRemoveTarget(null); return }
    toast.success('Piano rimosso dal collaboratore')
    setRemoveTarget(null)
    if (id) await loadObjectives(Number(id))
  }

  const objectiveColumns: Column<AssignedObjectivePlan>[] = [
    { header: 'Nome piano', cell: (r) => r.ObjectivePlan?.ObjectivePlanName ?? '—' },
    { header: 'Periodo', cell: (r) => r.ObjectivePlan?.Period ? `${r.ObjectivePlan.Period.PeriodDescription} (${r.ObjectivePlan.Period.PeriodYear})` : '—' },
    {
      header: 'Stato',
      cell: (r) => {
        if (!r.ObjectivePlan) return '—'
        const cfg = statusConfig[r.ObjectivePlan.ObjectiveStatus]
        return <Badge className={cfg.className}>{cfg.label}</Badge>
      },
    },
    {
      header: '', className: 'w-56 text-right',
      cell: (r) => {
        const locked = !r.ObjectivePlan || LOCKED_STATUSES.includes(r.ObjectivePlan.ObjectiveStatus)
        return (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" asChild>
              <Link to={`/obiettivi/${r.ObjectivePlan?.ObjectivePlanId}`}><Target className="h-4 w-4 mr-1" /> Dettaglio</Link>
            </Button>
            <Button
              variant="ghost" size="sm"
              onClick={() => setRemoveTarget(r)}
              disabled={locked}
              title={locked ? 'Un piano chiuso non può essere rimosso: fa parte dello storico dei premi pagati.' : undefined}
              className="text-red-400 hover:text-red-600 hover:bg-red-50 disabled:text-gray-300 disabled:hover:bg-transparent"
            >
              <Trash2 className="h-4 w-4 mr-1" /> Rimuovi
            </Button>
          </div>
        )
      },
    },
  ]

  if (loading) return <div className="p-5 text-gray-400">Caricamento...</div>
  if (!collaborator) return null

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate('/collaboratori')}>
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">{collaborator.CollaboratorName}</h1>
        {collaborator.CollaboratorActive
          ? <Badge className="bg-green-100 text-green-700 border-green-200">Attivo</Badge>
          : <Badge className="bg-gray-100 text-gray-500 border-gray-200">Inattivo</Badge>
        }
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl shadow-md p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-4">Informazioni</p>
        <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div>
            <dt className="text-gray-500">Email</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{collaborator.CollaboratorEmail}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Tipo</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{collaborator.CollaboratorType?.CollaboratorTypeName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Paese</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{collaborator.Country?.CountryName ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Regione</dt>
            <dd className="font-medium text-gray-900 mt-0.5">{collaborator.Country?.Region?.RegionName ?? '—'}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-gray-500">Onboarding Drive</dt>
            <dd className="flex items-center gap-3 mt-0.5">
              {collaborator.OnboardingDone
                ? <span className="font-medium text-green-600">Completato</span>
                : <span className="font-medium text-gray-400">Non avviato</span>
              }
              {collaborator.OnboardingDone && (
                <Button variant="outline" size="sm" onClick={async () => {
                  const { error } = await collaboratorApi.update(collaborator.CollaboratorId, { OnboardingDone: false })
                  if (error) { toast.error(error.message); return }
                  setCollaborator({ ...collaborator, OnboardingDone: false })
                  toast.success('Onboarding riabilitato')
                }}>
                  Riabilita
                </Button>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Objectives */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Obiettivi</h2>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/obiettivi?collaboratorId=${collaborator.CollaboratorId}`}>Vedi tutti</Link>
          </Button>
        </div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <DataTable
            data={objectives as unknown as Record<string, unknown>[]}
            columns={objectiveColumns as Column<Record<string, unknown>>[]}
            isLoading={objLoading}
            emptyMessage="Nessun obiettivo trovato."
            pageSize={10}
          />
        </div>
      </div>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rimuovi piano</AlertDialogTitle>
            <AlertDialogDescription>
              Rimuovere il piano <strong>{removeTarget?.ObjectivePlan?.ObjectivePlanName}</strong> da <strong>{collaborator.CollaboratorName}</strong>?
              Il piano non verrà eliminato, resta disponibile per essere assegnato ad altri collaboratori.
              {removeTarget?.ObjectivePlan?.ObjectiveStatus === 'SIGNED' && (
                <span className="block mt-2 font-medium text-amber-700">Attenzione: questo piano risulta già firmato dal collaboratore.</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} disabled={removing} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{removing ? 'Rimozione...' : 'Rimuovi'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
