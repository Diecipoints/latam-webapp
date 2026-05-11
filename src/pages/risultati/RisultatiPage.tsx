import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Eye, Image, FileDown } from 'lucide-react'

import { objectiveApi, resultApi } from '@/lib/api'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { DataTable, type Column } from '@/components/ui/data-table'

type Objective = Database['public']['Tables']['Objective']['Row'] & {
  Collaborator?: { CollaboratorName: string } | null
  Period?: { PeriodDescription: string; PeriodYear: number } | null
}
type Result = Database['public']['Tables']['Result']['Row']

type ResultRow = Result & {
  objectiveName: string
  collaboratorName: string
  periodLabel: string
  status: ObjectiveStatus
  objectiveId: number
}

const STATUS_COLORS: Record<ObjectiveStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
  SIGNED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
}

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  DRAFT: 'Bozza', ASSIGNED: 'Assegnato', SIGNED: 'Firmato', CLOSED: 'Chiuso',
}

function achievementBadge(pct: number) {
  const color = pct >= 80 ? 'bg-green-100 text-green-700 border-green-200'
    : pct >= 50 ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
    : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${color}`}>
      {pct.toFixed(1)}%
    </span>
  )
}

export function RisultatiPage() {
  const [rows, setRows] = useState<ResultRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const { data: objectives, error: objErr } = await objectiveApi.list()
      if (objErr) { toast.error(objErr.message); setLoading(false); return }

      const allObjectives = (objectives ?? []) as Objective[]
      const resultPromises = allObjectives.map((obj) =>
        resultApi.list(obj.ObjectiveId).then(({ data }) =>
          (data ?? []).map((r) => ({
            ...r,
            objectiveName: `${obj.Collaborator?.CollaboratorName ?? '?'} – ${obj.Period?.PeriodDescription ?? '?'}`,
            collaboratorName: obj.Collaborator?.CollaboratorName ?? '-',
            periodLabel: obj.Period ? `${obj.Period.PeriodDescription} (${obj.Period.PeriodYear})` : '-',
            status: obj.ObjectiveStatus,
            objectiveId: obj.ObjectiveId,
          } satisfies ResultRow))
        )
      )

      const nested = await Promise.all(resultPromises)
      setRows(nested.flat())
      setLoading(false)
    }
    load()
  }, [])

  const columns: Column<ResultRow>[] = [
    { header: 'Collaboratore', accessorKey: 'collaboratorName' },
    { header: 'Periodo', accessorKey: 'periodLabel' },
    {
      header: 'Stato Obiettivo',
      cell: (r) => (
        <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[r.status]}`}>
          {STATUS_LABELS[r.status]}
        </span>
      ),
    },
    { header: 'Valore Effettivo', accessorKey: 'ResultActualValue', className: 'text-right' },
    { header: 'Delta', accessorKey: 'ResultDelta', className: 'text-right' },
    { header: '% Raggiungimento', className: 'text-center', cell: (r) => achievementBadge(r.ResultAchievementPct) },
    {
      header: 'Prove', className: 'w-20',
      cell: (r) => (
        <div className="flex gap-2">
          {r.ResultQlikImageUrl && <a href={r.ResultQlikImageUrl} target="_blank" rel="noopener noreferrer" title="Immagine Qlik"><Image className="h-4 w-4 text-slate-600 hover:text-slate-800" /></a>}
          {r.ResultPdfUrl && <a href={r.ResultPdfUrl} target="_blank" rel="noopener noreferrer" title="PDF"><FileDown className="h-4 w-4 text-red-600 hover:text-red-800" /></a>}
        </div>
      ),
    },
    {
      header: '', className: 'w-16',
      cell: (r) => (
        <Button variant="ghost" size="icon" asChild title="Vai all'obiettivo">
          <Link to={`/obiettivi/${r.objectiveId}`}><Eye className="h-4 w-4" /></Link>
        </Button>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Risultati</h1>
      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={rows as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun risultato registrato."
        />
      </div>
    </div>
  )
}
