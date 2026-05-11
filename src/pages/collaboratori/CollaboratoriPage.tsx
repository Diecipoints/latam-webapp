import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Pencil, Trash2, Plus, Eye } from 'lucide-react'

import { collaboratorApi, countryApi, collaboratorTypeApi } from '@/lib/api'
import { CollaboratorSchema, type CollaboratorFormValues } from '@/lib/schemas'
import type { Database } from '@/lib/database.types'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'

type Country = Database['public']['Tables']['Country']['Row']
type CollaboratorType = Database['public']['Tables']['CollaboratorType']['Row']
type Collaborator = Database['public']['Tables']['Collaborator']['Row'] & {
  Country?: { CountryName: string } | null
  CollaboratorType?: { CollaboratorTypeName: string } | null
}

interface CollaboratorDialogProps {
  open: boolean; item: Collaborator | null; countries: Country[]; types: CollaboratorType[]
  onClose: () => void; onSuccess: () => void
}

function CollaboratorDialog({ open, item, countries, types, onClose, onSuccess }: CollaboratorDialogProps) {
  const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<CollaboratorFormValues>({
    resolver: zodResolver(CollaboratorSchema) as never,
    defaultValues: { CollaboratorName: '', CollaboratorEmail: '', CollaboratorTypeId: undefined as unknown as number, CountryId: undefined as unknown as number, CollaboratorActive: true },
  })

  useEffect(() => {
    if (open) reset({
      CollaboratorName: item?.CollaboratorName ?? '',
      CollaboratorEmail: item?.CollaboratorEmail ?? '',
      CollaboratorTypeId: item?.CollaboratorTypeId ?? (undefined as unknown as number),
      CountryId: item?.CountryId ?? (undefined as unknown as number),
      CollaboratorActive: item?.CollaboratorActive ?? true,
    })
  }, [open, item, reset])

  async function onSubmit(values: CollaboratorFormValues) {
    const { error } = item ? await collaboratorApi.update(item.CollaboratorId, values) : await collaboratorApi.create(values)
    if (error) { toast.error(error.message); return }
    toast.success(item ? 'Collaboratore aggiornato' : 'Collaboratore creato')
    onSuccess(); onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{item ? 'Modifica Collaboratore' : 'Nuovo Collaboratore'}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="CollaboratorName">Nome</Label>
            <Input id="CollaboratorName" {...register('CollaboratorName')} placeholder="Nome e cognome" />
            {errors.CollaboratorName && <p className="text-sm text-destructive">{errors.CollaboratorName.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="CollaboratorEmail">Email</Label>
            <Input id="CollaboratorEmail" type="email" {...register('CollaboratorEmail')} placeholder="email@esempio.com" />
            {errors.CollaboratorEmail && <p className="text-sm text-destructive">{errors.CollaboratorEmail.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Paese</Label>
            <Controller control={control} name="CountryId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona un paese" /></SelectTrigger>
                <SelectContent>{countries.map((c) => <SelectItem key={c.CountryId} value={c.CountryId.toString()}>{c.CountryName}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.CountryId && <p className="text-sm text-destructive">{errors.CountryId.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>Tipo Collaboratore</Label>
            <Controller control={control} name="CollaboratorTypeId" render={({ field }) => (
              <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString()}>
                <SelectTrigger><SelectValue placeholder="Seleziona un tipo" /></SelectTrigger>
                <SelectContent>{types.map((t) => <SelectItem key={t.CollaboratorTypeId} value={t.CollaboratorTypeId.toString()}>{t.CollaboratorTypeName}</SelectItem>)}</SelectContent>
              </Select>
            )} />
            {errors.CollaboratorTypeId && <p className="text-sm text-destructive">{errors.CollaboratorTypeId.message}</p>}
          </div>
          <div className="flex items-center gap-3">
            <Label htmlFor="CollaboratorActive">Attivo</Label>
            <Controller control={control} name="CollaboratorActive" render={({ field }) => (
              <Switch id="CollaboratorActive" checked={field.value} onCheckedChange={field.onChange} />
            )} />
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

export function CollaboratoriPage() {
  const [items, setItems] = useState<Collaborator[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [types, setTypes] = useState<CollaboratorType[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editItem, setEditItem] = useState<Collaborator | null>(null)
  const [deleteItem, setDeleteItem] = useState<Collaborator | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [filterActive, setFilterActive] = useState('tutti')
  const [filterCountry, setFilterCountry] = useState('tutti')
  const [filterType, setFilterType] = useState('tutti')

  async function loadRefData() {
    const [cr, tr] = await Promise.all([countryApi.list(), collaboratorTypeApi.list()])
    if (!cr.error) setCountries((cr.data ?? []) as Country[])
    if (!tr.error) setTypes(tr.data ?? [])
  }

  async function load() {
    setLoading(true)
    const filters: { active?: boolean; countryId?: number; typeId?: number } = {}
    if (filterActive === 'attivi') filters.active = true
    if (filterActive === 'inattivi') filters.active = false
    if (filterCountry !== 'tutti') filters.countryId = Number(filterCountry)
    if (filterType !== 'tutti') filters.typeId = Number(filterType)
    const { data, error } = await collaboratorApi.list(filters)
    if (error) toast.error(error.message)
    else setItems((data ?? []) as Collaborator[])
    setLoading(false)
  }

  useEffect(() => { loadRefData() }, [])
  useEffect(() => { load() }, [filterActive, filterCountry, filterType])

  async function handleToggleActive(item: Collaborator) {
    const { error } = await collaboratorApi.update(item.CollaboratorId, { CollaboratorActive: !item.CollaboratorActive })
    if (error) toast.error(error.message)
    else { toast.success(item.CollaboratorActive ? 'Disattivato' : 'Attivato'); await load() }
  }

  async function handleDelete() {
    if (!deleteItem) return
    setDeleting(true)
    const { error } = await collaboratorApi.delete(deleteItem.CollaboratorId)
    if (error) toast.error(error.message)
    else { toast.success('Collaboratore eliminato'); await load() }
    setDeleting(false); setDeleteItem(null)
  }

  const columns: Column<Collaborator>[] = [
    { header: 'Nome', accessorKey: 'CollaboratorName' },
    { header: 'Email', accessorKey: 'CollaboratorEmail' },
    { header: 'Paese', cell: (r) => r.Country?.CountryName ?? '—' },
    { header: 'Tipo', cell: (r) => r.CollaboratorType?.CollaboratorTypeName ?? '—' },
    {
      header: 'Attivo', className: 'w-20 text-center',
      cell: (r) => <div className="flex justify-center"><Switch checked={r.CollaboratorActive} onCheckedChange={() => handleToggleActive(r)} /></div>,
    },
    {
      header: '', className: 'w-28 text-right',
      cell: (r) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" asChild title="Dettaglio"><Link to={`/collaboratori/${r.CollaboratorId}`}><Eye className="h-4 w-4" /></Link></Button>
          <Button variant="ghost" size="icon" onClick={() => { setEditItem(r); setDialogOpen(true) }} title="Modifica"><Pencil className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setDeleteItem(r)} title="Elimina" className="text-red-400 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ]

  return (
    <div className="p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Collaboratori</h1>
        <Button onClick={() => { setEditItem(null); setDialogOpen(true) }}>
          <Plus className="h-4 w-4" /> Nuovo Collaboratore
        </Button>
      </div>

      {/* Filters card */}
      <div className="bg-white rounded-2xl shadow-md p-4">
        <div className="flex gap-3 flex-wrap">
          <Select value={filterActive} onValueChange={setFilterActive}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Stato" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti</SelectItem>
              <SelectItem value="attivi">Attivi</SelectItem>
              <SelectItem value="inattivi">Inattivi</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterCountry} onValueChange={setFilterCountry}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Paese" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i paesi</SelectItem>
              {countries.map((c) => <SelectItem key={c.CountryId} value={c.CountryId.toString()}>{c.CountryName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i tipi</SelectItem>
              {types.map((t) => <SelectItem key={t.CollaboratorTypeId} value={t.CollaboratorTypeId.toString()}>{t.CollaboratorTypeName}</SelectItem>)}
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
          emptyMessage="Nessun collaboratore trovato."
        />
      </div>

      <CollaboratorDialog open={dialogOpen} item={editItem} countries={countries} types={types} onClose={() => setDialogOpen(false)} onSuccess={load} />

      <AlertDialog open={!!deleteItem} onOpenChange={(v) => { if (!v) setDeleteItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Elimina Collaboratore</AlertDialogTitle>
            <AlertDialogDescription>Sei sicuro di voler eliminare <strong>{deleteItem?.CollaboratorName}</strong>? L'operazione non può essere annullata.</AlertDialogDescription>
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
