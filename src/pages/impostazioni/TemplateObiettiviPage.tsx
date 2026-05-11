import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'

import { objectiveTemplateApi } from '@/lib/api'
import { ObjectiveTemplateSchema, type ObjectiveTemplateFormValues } from '@/lib/schemas'
import type { Database } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

type ObjectiveTemplate = Database['public']['Tables']['ObjectiveTemplate']['Row']

interface TemplateDialogProps {
  open: boolean
  item: ObjectiveTemplate | null
  onClose: () => void
  onSuccess: () => void
}

function TemplateDialog({ open, item, onClose, onSuccess }: TemplateDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ObjectiveTemplateFormValues>({
    resolver: zodResolver(ObjectiveTemplateSchema),
    defaultValues: { ObjectiveTemplateTitle: '', ObjectiveTemplateBody: '' },
  })

  useEffect(() => {
    if (open) {
      reset({
        ObjectiveTemplateTitle: item?.ObjectiveTemplateTitle ?? '',
        ObjectiveTemplateBody: item?.ObjectiveTemplateBody ?? '',
      })
    }
  }, [open, item, reset])

  async function onSubmit(values: ObjectiveTemplateFormValues) {
    const { error } = item
      ? await objectiveTemplateApi.update(item.ObjectiveTemplateId, values)
      : await objectiveTemplateApi.create(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(item ? 'Template aggiornato' : 'Template creato')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item ? 'Modifica Template' : 'Nuovo Template Obiettivo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ObjectiveTemplateTitle">Titolo</Label>
            <Input
              id="ObjectiveTemplateTitle"
              {...register('ObjectiveTemplateTitle')}
              placeholder="es. Obiettivo Vendite"
            />
            {errors.ObjectiveTemplateTitle && (
              <p className="text-sm text-destructive">{errors.ObjectiveTemplateTitle.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="ObjectiveTemplateBody">Contenuto</Label>
            <Textarea
              id="ObjectiveTemplateBody"
              {...register('ObjectiveTemplateBody')}
              placeholder="Descrizione del template obiettivo..."
              className="min-h-[120px]"
            />
            {errors.ObjectiveTemplateBody && (
              <p className="text-sm text-destructive">{errors.ObjectiveTemplateBody.message}</p>
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

export function TemplateObiettiviPage() {
  const [items, setItems] = useState<ObjectiveTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<ObjectiveTemplate | null>(null)
  const [deleteItem, setDeleteItem] = useState<ObjectiveTemplate | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const { data, error } = await objectiveTemplateApi.list()
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

  function openEdit(item: ObjectiveTemplate) {
    setEditItem(item)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await objectiveTemplateApi.delete(deleteItem.ObjectiveTemplateId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Template eliminato')
      await load()
    }
    setDeleting(false)
    setDeleteItem(null)
  }

  const columns: Column<ObjectiveTemplate>[] = [
    {
      header: 'Titolo',
      accessorKey: 'ObjectiveTemplateTitle',
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
        <h2 className="text-2xl font-bold text-gray-900">Template Obiettivi</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuovo Template
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun template trovato."
        />
      </div>

      <TemplateDialog
        open={dialogOpen}
        item={editItem}
        onClose={() => setDialogOpen(false)}
        onSuccess={load}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Template</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il template{' '}
              <strong>{deleteItem?.ObjectiveTemplateTitle}</strong>? L'operazione non può essere annullata.
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
