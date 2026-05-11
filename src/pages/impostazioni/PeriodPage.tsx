import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'

import { periodApi } from '@/lib/api'
import { PeriodSchema, type PeriodFormValues } from '@/lib/schemas'
import type { Database } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type Period = Database['public']['Tables']['Period']['Row']

interface PeriodDialogProps {
  open: boolean
  item: Period | null
  onClose: () => void
  onSuccess: () => void
}

function PeriodDialog({ open, item, onClose, onSuccess }: PeriodDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PeriodFormValues>({
    resolver: zodResolver(PeriodSchema),
    defaultValues: { PeriodDescription: '', PeriodYear: new Date().getFullYear() },
  })

  useEffect(() => {
    if (open) {
      reset({
        PeriodDescription: item?.PeriodDescription ?? '',
        PeriodYear: item?.PeriodYear ?? new Date().getFullYear(),
      })
    }
  }, [open, item, reset])

  async function onSubmit(values: PeriodFormValues) {
    const { error } = item
      ? await periodApi.update(item.PeriodId, values)
      : await periodApi.create(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(item ? 'Periodo aggiornato' : 'Periodo creato')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Modifica Periodo' : 'Nuovo Periodo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="PeriodDescription">Descrizione</Label>
            <Input
              id="PeriodDescription"
              {...register('PeriodDescription')}
              placeholder="es. Q1 2025"
            />
            {errors.PeriodDescription && (
              <p className="text-sm text-destructive">{errors.PeriodDescription.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="PeriodYear">Anno</Label>
            <Input
              id="PeriodYear"
              type="number"
              {...register('PeriodYear', { valueAsNumber: true })}
              placeholder="es. 2025"
              min={2000}
              max={2100}
            />
            {errors.PeriodYear && (
              <p className="text-sm text-destructive">{errors.PeriodYear.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annulla
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function PeriodPage() {
  const [items, setItems] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Period | null>(null)
  const [deleteItem, setDeleteItem] = useState<Period | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await periodApi.list()
    if (error) {
      toast.error(error.message)
    } else {
      setItems(data ?? [])
    }
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setEditItem(null)
    setDialogOpen(true)
  }

  function openEdit(item: Period) {
    setEditItem(item)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await periodApi.delete(deleteItem.PeriodId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Periodo eliminato')
      await load()
    }
    setDeleting(false)
    setDeleteItem(null)
  }

  const columns: Column<Period>[] = [
    {
      header: 'Descrizione',
      accessorKey: 'PeriodDescription',
    },
    {
      header: 'Anno',
      accessorKey: 'PeriodYear',
    },
    {
      header: '',
      className: 'w-24 text-right',
      cell: (row) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => openEdit(row)}
            title="Modifica"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setDeleteItem(row)}
            title="Elimina"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Periodi</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuovo Periodo
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun periodo trovato."
        />
      </div>

      <PeriodDialog
        open={dialogOpen}
        item={editItem}
        onClose={() => setDialogOpen(false)}
        onSuccess={load}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Periodo</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il periodo{' '}
              <strong>{deleteItem?.PeriodDescription}</strong>? L'operazione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Eliminazione...' : 'Elimina'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
