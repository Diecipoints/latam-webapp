import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye, FileText, FileCheck } from 'lucide-react'

import { objectiveApi, collaboratorApi, periodApi } from '@/lib/api'
import { ObjectiveSchema, type ObjectiveFormValues } from '@/lib/schemas'
import type { Database, ObjectiveStatus } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

type Collaborator = Database['public']['Tables']['Collaborator']['Row']
type Period = Database['public']['Tables']['Period']['Row']
type Objective = Database['public']['Tables']['Objective']['Row'] & {
  Collaborator?: { CollaboratorName: string } | null
  Period?: { PeriodDescription: string; PeriodYear: number } | null
}

const STATUS_LABELS: Record<ObjectiveStatus, string> = {
  DRAFT: 'Bozza', ASSIGNED: 'Assegnato', SIGNED: 'Firmato', CLOSED: 'Chiuso',
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

interface ObjectiveDialogProps {
  open: boolean; item: Objective | null; collaborators: Collaborator[]; periods: Period[]
  onClose: () => void; onSuccess: () => void
}

function ObjectiveDialog({ open, item, collaborators, periods, onClose, onSuccess }: ObjectiveDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ObjectiveFormValues>({
    resolver: zodResolver(ObjectiveSchema),
    defaultValues: { CollaboratorId: undefined as unknown as number, PeriodId: undefined as unknown as number, ObjectiveStatus: 'DRAFT', ObjectiveWordURL: null, ObjectiveSignedPdfURL: null },
  })

  useEffect(() => {
    if (open) reset({
      CollaboratorId: item?.CollaboratorId ?? (undefined as unknown as number),
      PeriodId: item?.PeriodId ?? (undefined as unknown as number),
      ObjectiveStatus: item?.ObjectiveStatus ?? 'DRAFT',
      ObjectiveWordURL: item?.ObjectiveWordURL ?? null,
      ObjectiveSignedPdfURL: item?.ObjectiveSignedPdfURL ?? null,
    })
  }, [open, item, reset])

  async function onSubmit(values: ObjectiveFormValues) {
    const payload = { ...values, ObjectiveWordURL: values.ObjectiveWordURL || null, ObjectiveSignedPdfURL: values.ObjectiveSignedPdfURL || null }
    const { error } = item ? await objectiveApi.update(item.ObjectiveId, payload) : await objectiveApi.create(payload)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Obiettivo aggiornato' : 'Obiettivo creato'); onSuccess(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Modifica Obiettivo' : 'Nuovo Obiettivo'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Collaboratore</Label>
            <Controller control={control} name="CollaboratorId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona collaboratore" /></SelectTrigger>
                <SelectContent>{collaborators.map((c) => <SelectItem key={c.CollaboratorId} value={c.CollaboratorId.toString()}>{c.CollaboratorName}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.CollaboratorId && <p className="text-sm text-destructive">{errors.CollaboratorId.message}</p>}
          </div>
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
            <Label>Stato</Label>
            <Controller control={control} name="ObjectiveStatus" render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(STATUS_LABELS) as ObjectiveStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ObjectiveWordURL">URL Documento Word (opzionale)</Label>
            <Input id="ObjectiveWordURL" {...register('ObjectiveWordURL')} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ObjectiveSignedPdfURL">URL PDF Firmato (opzionale)</Label>
            <Input id="ObjectiveSignedPdfURL" {...register('ObjectiveSignedPdfURL')} placeholder="https://..." />
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
  const [items, setItems] = useState<Objective[]>([])
  const [collaborators, setCollaborators] = useState<Collaborator[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Objective | null>(null)
  const [deleteItem, setDeleteItem] = useState<Objective | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterCollab, setFilterCollab] = useState('tutti')
  const [filterPeriod, setFilterPeriod] = useState('tutti')
  const [filterStatus, setFilterStatus] = useState('tutti')

  useEffect(() => {
    Promise.all([collaboratorApi.list(), periodApi.list()]).then(([c, p]) => {
      if (!c.error) setCollaborators((c.data ?? []) as Collaborator[])
      if (!p.error) setPeriods(p.data ?? [])
    })
  }, [])

  async function load() {
    setLoading(true)
    const filters: { collaboratorId?: number; periodId?: number; status?: ObjectiveStatus } = {}
    if (filterCollab !== 'tutti') filters.collaboratorId = Number(filterCollab)
    if (filterPeriod !== 'tutti') filters.periodId = Number(filterPeriod)
    if (filterStatus !== 'tutti') filters.status = filterStatus as ObjectiveStatus
    const { data, error } = await objectiveApi.list(filters)
    if (error) toast.error(error.message)
    else setItems((data ?? []) as Objective[])
    setLoading(false)
  }

  useEffect(() => { load() }, [filterCollab, filterPeriod, filterStatus])

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await objectiveApi.delete(deleteItem.ObjectiveId)
    if (error) toast.error(error.message)
    else { toast.success('Obiettivo eliminato'); await load() }
    setDeleting(false); setDeleteItem(null)
  }

  const columns: Column<Objective>[] = [
    { header: 'Collaboratore', cell: (r) => r.Collaborator?.CollaboratorName ?? '—' },
    { header: 'Periodo', cell: (r) => r.Period ? `${r.Period.PeriodDescription} (${r.Period.PeriodYear})` : '—' },
    { header: 'Stato', cell: (r) => <StatusPill status={r.ObjectiveStatus} /> },
    {
      header: 'Documenti', className: 'w-24',
      cell: (r) => (
        <div className="flex gap-1.5">
          {r.ObjectiveWordURL && <a href={r.ObjectiveWordURL} target="_blank" rel="noopener noreferrer" title="Word"><FileText className="h-4 w-4 text-blue-500 hover:text-blue-700" /></a>}
          {r.ObjectiveSignedPdfURL && <a href={r.ObjectiveSignedPdfURL} target="_blank" rel="noopener noreferrer" title="PDF Firmato"><FileCheck className="h-4 w-4 text-green-500 hover:text-green-700" /></a>}
        </div>
      ),
    },
    {
      header: '', className: 'w-28 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" asChild title="Dettaglio"><Link to={`/obiettivi/${r.ObjectiveId}`}><Eye className="h-4 w-4" /></Link></Button>
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
          <Select value={filterCollab} onValueChange={setFilterCollab}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Collaboratore" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i collaboratori</SelectItem>
              {collaborators.map((c) => <SelectItem key={c.CollaboratorId} value={c.CollaboratorId.toString()}>{c.CollaboratorName}</SelectItem>)}
            </SelectContent>
          </Select>
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

      <ObjectiveDialog open={dialogOpen} item={editItem} collaborators={collaborators} periods={periods} onClose={() => setDialogOpen(false)} onSuccess={load} />

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
