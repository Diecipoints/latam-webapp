import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'

import { regionApi } from '@/lib/api'
import { RegionSchema, type RegionFormValues } from '@/lib/schemas'
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

type Region = Database['public']['Tables']['Region']['Row']

interface RegionDialogProps {
  open: boolean
  item: Region | null
  onClose: () => void
  onSuccess: () => void
}

function RegionDialog({ open, item, onClose, onSuccess }: RegionDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RegionFormValues>({
    resolver: zodResolver(RegionSchema),
    defaultValues: { RegionName: '' },
  })

  useEffect(() => {
    if (open) {
      reset({ RegionName: item?.RegionName ?? '' })
    }
  }, [open, item, reset])

  async function onSubmit(values: RegionFormValues) {
    const { error } = item
      ? await regionApi.update(item.RegionId, values)
      : await regionApi.create(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(item ? 'Regione aggiornata' : 'Regione creata')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Modifica Regione' : 'Nuova Regione'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="RegionName">Nome Regione</Label>
            <Input id="RegionName" {...register('RegionName')} placeholder="es. Sud America" />
            {errors.RegionName && (
              <p className="text-sm text-destructive">{errors.RegionName.message}</p>
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

export function RegionPage() {
  const [items, setItems] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Region | null>(null)
  const [deleteItem, setDeleteItem] = useState<Region | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await regionApi.list()
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

  function openEdit(item: Region) {
    setEditItem(item)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await regionApi.delete(deleteItem.RegionId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Regione eliminata')
      await load()
    }
    setDeleting(false)
    setDeleteItem(null)
  }

  const columns: Column<Region>[] = [
    {
      header: 'Nome Regione',
      accessorKey: 'RegionName',
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
            className="text-destructive hover:text-destructive hover:bg-red-50"
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
        <h2 className="text-2xl font-bold text-gray-900">Regioni</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuova Regione
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessuna regione trovata."
        />
      </div>

      <RegionDialog
        open={dialogOpen}
        item={editItem}
        onClose={() => setDialogOpen(false)}
        onSuccess={load}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Regione</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare la regione{' '}
              <strong>{deleteItem?.RegionName}</strong>? L'operazione non può essere annullata.
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
