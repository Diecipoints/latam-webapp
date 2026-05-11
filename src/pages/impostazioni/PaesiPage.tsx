import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus } from 'lucide-react'

import { countryApi, regionApi } from '@/lib/api'
import { CountrySchema, type CountryFormValues } from '@/lib/schemas'
import type { Database } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DataTable, type Column } from '@/components/ui/data-table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
type Country = Database['public']['Tables']['Country']['Row'] & {
  Region?: { RegionName: string } | null
}

interface CountryDialogProps {
  open: boolean
  item: Country | null
  regions: Region[]
  onClose: () => void
  onSuccess: () => void
}

function CountryDialog({ open, item, regions, onClose, onSuccess }: CountryDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CountryFormValues>({
    resolver: zodResolver(CountrySchema),
    defaultValues: { CountryName: '', RegionId: 0 },
  })

  useEffect(() => {
    if (open) {
      reset({
        CountryName: item?.CountryName ?? '',
        RegionId: item?.RegionId ?? (undefined as unknown as number),
      })
    }
  }, [open, item, reset])

  async function onSubmit(values: CountryFormValues) {
    const { error } = item
      ? await countryApi.update(item.CountryId, values)
      : await countryApi.create(values)

    if (error) {
      toast.error(error.message)
      return
    }

    toast.success(item ? 'Paese aggiornato' : 'Paese creato')
    onSuccess()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{item ? 'Modifica Paese' : 'Nuovo Paese'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="CountryName">Nome Paese</Label>
            <Input id="CountryName" {...register('CountryName')} placeholder="es. Argentina" />
            {errors.CountryName && (
              <p className="text-sm text-destructive">{errors.CountryName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Regione</Label>
            <Controller
              control={control}
              name="RegionId"
              render={({ field }) => (
                <Select
                  onValueChange={(v) => field.onChange(Number(v))}
                  value={field.value ? field.value.toString() : undefined}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleziona una regione" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.RegionId} value={r.RegionId.toString()}>
                        {r.RegionName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.RegionId && (
              <p className="text-sm text-destructive">{errors.RegionId.message}</p>
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

export function PaesiPage() {
  const [items, setItems] = useState<Country[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Country | null>(null)
  const [deleteItem, setDeleteItem] = useState<Country | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    const [countriesResult, regionsResult] = await Promise.all([
      countryApi.list(),
      regionApi.list(),
    ])
    if (countriesResult.error) {
      toast.error(countriesResult.error.message)
    } else {
      setItems((countriesResult.data ?? []) as Country[])
    }
    if (regionsResult.error) {
      toast.error(regionsResult.error.message)
    } else {
      setRegions(regionsResult.data ?? [])
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

  function openEdit(item: Country) {
    setEditItem(item)
    setDialogOpen(true)
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await countryApi.delete(deleteItem.CountryId)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Paese eliminato')
      await load()
    }
    setDeleting(false)
    setDeleteItem(null)
  }

  const columns: Column<Country>[] = [
    {
      header: 'Nome Paese',
      accessorKey: 'CountryName',
    },
    {
      header: 'Regione',
      cell: (row) => row.Region?.RegionName ?? '-',
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
        <h2 className="text-2xl font-bold text-gray-900">Paesi</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nuovo Paese
        </Button>
      </div>

      <div className="bg-white rounded-2xl shadow-md overflow-hidden">
        <DataTable
          data={items as unknown as Record<string, unknown>[]}
          columns={columns as Column<Record<string, unknown>>[]}
          isLoading={loading}
          emptyMessage="Nessun paese trovato."
        />
      </div>

      <CountryDialog
        open={dialogOpen}
        item={editItem}
        regions={regions}
        onClose={() => setDialogOpen(false)}
        onSuccess={load}
      />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Paese</AlertDialogTitle>
            <AlertDialogDescription>
              Sei sicuro di voler eliminare il paese{' '}
              <strong>{deleteItem?.CountryName}</strong>? L'operazione non può essere annullata.
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
