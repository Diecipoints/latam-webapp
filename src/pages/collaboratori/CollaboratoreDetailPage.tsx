import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Target } from 'lucide-react'

import { collaboratorApi, objectiveApi } from '@/lib/api'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'

type Collaborator = Database['public']['Tables']['Collaborator']['Row'] & {
  Country?: { CountryName: string; RegionId: number; Region?: { RegionName: string } | null } | null
  CollaboratorType?: { CollaboratorTypeName: string } | null
}
type Objective = Database['public']['Tables']['Objective']['Row'] & {
  Collaborator?: { CollaboratorName: string } | null
  Period?: { PeriodDescription: string; PeriodYear: number } | null
}

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
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [loading, setLoading] = useState(true)
  const [objLoading, setObjLoading] = useState(true)

  useEffect(() => {
    async function run() {
      if (!id) return
      const [{ data, error }, { data: objData, error: objErr }] = await Promise.all([
        collaboratorApi.get(Number(id)),
        objectiveApi.list({ collaboratorId: Number(id) }),
      ])
      if (error) { toast.error(error.message); navigate('/collaboratori'); return }
      setCollaborator(data as Collaborator)
      setLoading(false)
      if (objErr) toast.error(objErr.message)
      else setObjectives((objData ?? []) as Objective[])
      setObjLoading(false)
    }
    run()
  }, [id, navigate])

  const objectiveColumns: Column<Objective>[] = [
    { header: 'Periodo', cell: (r) => r.Period ? `${r.Period.PeriodDescription} (${r.Period.PeriodYear})` : '—' },
    {
      header: 'Stato',
      cell: (r) => {
        const cfg = statusConfig[r.ObjectiveStatus]
        return <Badge className={cfg.className}>{cfg.label}</Badge>
      },
    },
    {
      header: '', className: 'w-24 text-right',
      cell: (r) => (
        <Button variant="ghost" size="sm" asChild>
          <Link to={`/obiettivi/${r.ObjectiveId}`}><Target className="h-4 w-4 mr-1" /> Dettaglio</Link>
        </Button>
      ),
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
    </div>
  )
}
