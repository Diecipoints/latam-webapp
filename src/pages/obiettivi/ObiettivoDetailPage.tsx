import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Pencil, Trash2, FileText, FileCheck, Image, FileDown } from 'lucide-react'

import { objectiveApi, resultApi } from '@/lib/api'
import { ResultSchema, type ResultFormValues } from '@/lib/schemas'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

type Objective = Database['public']['Tables']['Objective']['Row'] & {
  Collaborator?: { CollaboratorName: string; CollaboratorEmail: string } | null
  Period?: { PeriodDescription: string; PeriodYear: number } | null
}
type Result = Database['public']['Tables']['Result']['Row']

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  DRAFT: 'Bozza', ASSIGNED: 'Assegnato', SIGNED: 'Firmato', CLOSED: 'Chiuso',
}

const STATUS_COLORS: Record<ObjectiveStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  ASSIGNED: 'bg-blue-100 text-blue-700 border-blue-200',
  SIGNED: 'bg-green-100 text-green-700 border-green-200',
  CLOSED: 'bg-slate-100 text-slate-600 border-slate-200',
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

interface ResultDialogProps {
  open: boolean
  item: Result | null
  objectiveId: number
  onClose: () => void
  onSuccess: () => void
}

function ResultDialog({ open, item, objectiveId, onClose, onSuccess }: ResultDialogProps) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ResultFormValues>({
    resolver: zodResolver(ResultSchema),
    defaultValues: { ObjectiveId: objectiveId, ResultActualValue: 0, ResultDelta: 0, ResultAchievementPct: 0, ResultQlikImageUrl: null, ResultPdfUrl: null },
  })

  useEffect(() => {
    if (open) {
      reset({
        ObjectiveId: objectiveId,
        ResultActualValue: item?.ResultActualValue ?? 0,
        ResultDelta: item?.ResultDelta ?? 0,
        ResultAchievementPct: item?.ResultAchievementPct ?? 0,
        ResultQlikImageUrl: item?.ResultQlikImageUrl ?? null,
        ResultPdfUrl: item?.ResultPdfUrl ?? null,
      })
    }
  }, [open, item, objectiveId, reset])

  async function onSubmit(values: ResultFormValues) {
    const payload = { ...values, ResultQlikImageUrl: values.ResultQlikImageUrl || null, ResultPdfUrl: values.ResultPdfUrl || null }
    const { error } = item ? await resultApi.update(item.ResultId, payload) : await resultApi.create(payload)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Risultato aggiornato' : 'Risultato aggiunto')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{item ? 'Modifica Risultato' : 'Aggiungi Risultato'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="ResultActualValue">Valore Effettivo</Label>
              <Input id="ResultActualValue" type="number" step="any" {...register('ResultActualValue', { valueAsNumber: true })} />
              {errors.ResultActualValue && <p className="text-xs text-destructive">{errors.ResultActualValue.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ResultDelta">Delta</Label>
              <Input id="ResultDelta" type="number" step="any" {...register('ResultDelta', { valueAsNumber: true })} />
              {errors.ResultDelta && <p className="text-xs text-destructive">{errors.ResultDelta.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="ResultAchievementPct">% Raggiungimento</Label>
              <Input id="ResultAchievementPct" type="number" step="0.1" min="0" {...register('ResultAchievementPct', { valueAsNumber: true })} />
              {errors.ResultAchievementPct && <p className="text-xs text-destructive">{errors.ResultAchievementPct.message}</p>}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ResultQlikImageUrl">URL Immagine Qlik (opzionale)</Label>
            <Input id="ResultQlikImageUrl" {...register('ResultQlikImageUrl')} placeholder="https://..." />
            {errors.ResultQlikImageUrl && <p className="text-sm text-destructive">{errors.ResultQlikImageUrl.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="ResultPdfUrl">URL PDF (opzionale)</Label>
            <Input id="ResultPdfUrl" {...register('ResultPdfUrl')} placeholder="https://..." />
            {errors.ResultPdfUrl && <p className="text-sm text-destructive">{errors.ResultPdfUrl.message}</p>}
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

export function ObiettivoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const objectiveId = Number(id)
  const [objective, setObjective] = useState<Objective | null>(null)
  const [results, setResults] = useState<Result[]>([])
  const [loadingObj, setLoadingObj] = useState(true)
  const [loadingRes, setLoadingRes] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editResult, setEditResult] = useState<Result | null>(null)
  const [deleteResult, setDeleteResult] = useState<Result | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    objectiveApi.get(objectiveId).then(({ data, error }) => {
      if (error) toast.error(error.message)
      else setObjective(data as Objective)
      setLoadingObj(false)
    })
  }, [objectiveId])

  async function loadResults() {
    setLoadingRes(true)
    const { data, error } = await resultApi.list(objectiveId)
    if (error) toast.error(error.message)
    else setResults(data ?? [])
    setLoadingRes(false)
  }

  useEffect(() => { loadResults() }, [objectiveId])

  async function handleDeleteResult() {
    if (!deleteResult) return
    setDeleting(true)
    const { error } = await resultApi.delete(deleteResult.ResultId)
    if (error) toast.error(error.message)
    else { toast.success('Risultato eliminato'); await loadResults() }
    setDeleting(false)
    setDeleteResult(null)
  }

  const resultColumns: Column<Result>[] = [
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
      header: '', className: 'w-24 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => { setEditResult(r); setDialogOpen(true) }} title="Modifica"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteResult(r)} title="Elimina" className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  if (loadingObj) return <div className="p-5 text-gray-400">Caricamento...</div>
  if (!objective) return <div className="p-5 text-gray-400">Obiettivo non trovato.</div>

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4" /> Indietro
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">Dettaglio Obiettivo</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-md p-5">
        <div className="grid grid-cols-2 gap-5 text-sm">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Collaboratore</p>
            <p className="font-medium text-gray-900">{objective.Collaborator?.CollaboratorName ?? '-'}</p>
            <p className="text-gray-500">{objective.Collaborator?.CollaboratorEmail}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Periodo</p>
            <p className="font-medium text-gray-900">{objective.Period?.PeriodDescription} ({objective.Period?.PeriodYear})</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Stato</p>
            <span className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[objective.ObjectiveStatus]}`}>
              {STATUS_LABELS[objective.ObjectiveStatus]}
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Documenti</p>
            <div className="flex gap-3">
              {objective.ObjectiveWordURL
                ? <a href={objective.ObjectiveWordURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"><FileText className="h-3.5 w-3.5" /> Word</a>
                : <span className="text-xs text-gray-400">Nessun Word</span>}
              {objective.ObjectiveSignedPdfURL
                ? <a href={objective.ObjectiveSignedPdfURL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-600 hover:underline font-medium"><FileCheck className="h-3.5 w-3.5" /> PDF Firmato</a>
                : <span className="text-xs text-gray-400">Nessun PDF</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Risultati</h2>
          <Button onClick={() => { setEditResult(null); setDialogOpen(true) }}>
            <Plus className="h-4 w-4" /> Aggiungi Risultato
          </Button>
        </div>
        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          <DataTable
            data={results as unknown as Record<string, unknown>[]}
            columns={resultColumns as Column<Record<string, unknown>>[]}
            isLoading={loadingRes}
            emptyMessage="Nessun risultato registrato per questo obiettivo."
          />
        </div>
      </div>

      <ResultDialog open={dialogOpen} item={editResult} objectiveId={objectiveId} onClose={() => setDialogOpen(false)} onSuccess={loadResults} />

      <AlertDialog open={!!deleteResult} onOpenChange={(v) => { if (!v) setDeleteResult(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Risultato</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler eliminare questo risultato? L'operazione non può essere annullata.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteResult} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
