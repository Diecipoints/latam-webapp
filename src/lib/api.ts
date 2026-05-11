import { supabase } from './supabase'
import type { ObjectiveStatus } from './database.types'

// ─── Region ───────────────────────────────────────────────────────────────────

export const regionApi = {
  list: () =>
    supabase.from('Region').select('*').order('RegionName'),

  get: (id: number) =>
    supabase.from('Region').select('*').eq('RegionId', id).single(),

  create: (data: { RegionName: string }) =>
    supabase.from('Region').insert(data).select().single(),

  update: (id: number, data: { RegionName: string }) =>
    supabase.from('Region').update(data).eq('RegionId', id).select().single(),

  delete: async (id: number) => {
    const { count } = await supabase
      .from('Country')
      .select('*', { count: 'exact', head: true })
      .eq('RegionId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: esistono paesi associati a questa regione.' } }
    return supabase.from('Region').delete().eq('RegionId', id)
  },
}

// ─── Country ──────────────────────────────────────────────────────────────────

export const countryApi = {
  list: (regionId?: number) => {
    let q = supabase.from('Country').select('*, Region(RegionName)').order('CountryName')
    if (regionId) q = q.eq('RegionId', regionId)
    return q
  },

  get: (id: number) =>
    supabase.from('Country').select('*, Region(RegionName)').eq('CountryId', id).single(),

  create: (data: { CountryName: string; RegionId: number }) =>
    supabase.from('Country').insert(data).select().single(),

  update: (id: number, data: { CountryName?: string; RegionId?: number }) =>
    supabase.from('Country').update(data).eq('CountryId', id).select().single(),

  delete: (id: number) =>
    supabase.from('Country').delete().eq('CountryId', id),
}

// ─── CollaboratorType ─────────────────────────────────────────────────────────

export const collaboratorTypeApi = {
  list: () =>
    supabase.from('CollaboratorType').select('*').order('CollaboratorTypeName'),

  get: (id: number) =>
    supabase.from('CollaboratorType').select('*').eq('CollaboratorTypeId', id).single(),

  create: (data: { CollaboratorTypeName: string }) =>
    supabase.from('CollaboratorType').insert(data).select().single(),

  update: (id: number, data: { CollaboratorTypeName: string }) =>
    supabase.from('CollaboratorType').update(data).eq('CollaboratorTypeId', id).select().single(),

  delete: async (id: number) => {
    const { count } = await supabase
      .from('Collaborator')
      .select('*', { count: 'exact', head: true })
      .eq('CollaboratorTypeId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: il tipo è assegnato a uno o più collaboratori.' } }
    return supabase.from('CollaboratorType').delete().eq('CollaboratorTypeId', id)
  },
}

// ─── Collaborator ─────────────────────────────────────────────────────────────

export const collaboratorApi = {
  list: (filters?: { active?: boolean; countryId?: number; typeId?: number }) => {
    let q = supabase
      .from('Collaborator')
      .select('*, Country(CountryName), CollaboratorType(CollaboratorTypeName)')
      .order('CollaboratorName')
    if (filters?.active !== undefined) q = q.eq('CollaboratorActive', filters.active)
    if (filters?.countryId) q = q.eq('CountryId', filters.countryId)
    if (filters?.typeId) q = q.eq('CollaboratorTypeId', filters.typeId)
    return q
  },

  get: (id: number) =>
    supabase
      .from('Collaborator')
      .select('*, Country(CountryName, RegionId, Region(RegionName)), CollaboratorType(CollaboratorTypeName)')
      .eq('CollaboratorId', id)
      .single(),

  create: (data: {
    CollaboratorName: string
    CollaboratorEmail: string
    CollaboratorTypeId: number
    CountryId: number
    CollaboratorActive?: boolean
  }) => supabase.from('Collaborator').insert({ ...data, CollaboratorActive: data.CollaboratorActive ?? true }).select().single(),

  update: (id: number, data: Partial<{
    CollaboratorName: string
    CollaboratorEmail: string
    CollaboratorTypeId: number
    CountryId: number
    CollaboratorActive: boolean
  }>) => supabase.from('Collaborator').update(data).eq('CollaboratorId', id).select().single(),

  delete: async (id: number) => {
    const { count } = await supabase
      .from('Objective')
      .select('*', { count: 'exact', head: true })
      .eq('CollaboratorId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: esistono obiettivi associati a questo collaboratore.' } }
    return supabase.from('Collaborator').delete().eq('CollaboratorId', id)
  },
}

// ─── Period ───────────────────────────────────────────────────────────────────

export const periodApi = {
  list: () =>
    supabase.from('Period').select('*').order('PeriodYear', { ascending: false }),

  get: (id: number) =>
    supabase.from('Period').select('*').eq('PeriodId', id).single(),

  create: (data: { PeriodDescription: string; PeriodYear: number }) =>
    supabase.from('Period').insert(data).select().single(),

  update: (id: number, data: { PeriodDescription?: string; PeriodYear?: number }) =>
    supabase.from('Period').update(data).eq('PeriodId', id).select().single(),

  delete: (id: number) =>
    supabase.from('Period').delete().eq('PeriodId', id),
}

// ─── ObjectiveTemplate ────────────────────────────────────────────────────────

export const objectiveTemplateApi = {
  list: () =>
    supabase.from('ObjectiveTemplate').select('*').order('ObjectiveTemplateTitle'),

  get: (id: number) =>
    supabase.from('ObjectiveTemplate').select('*').eq('ObjectiveTemplateId', id).single(),

  create: (data: { ObjectiveTemplateTitle: string; ObjectiveTemplateBody: string }) =>
    supabase.from('ObjectiveTemplate').insert(data).select().single(),

  update: (id: number, data: { ObjectiveTemplateTitle?: string; ObjectiveTemplateBody?: string }) =>
    supabase.from('ObjectiveTemplate').update(data).eq('ObjectiveTemplateId', id).select().single(),

  delete: (id: number) =>
    supabase.from('ObjectiveTemplate').delete().eq('ObjectiveTemplateId', id),
}

// ─── Objective ────────────────────────────────────────────────────────────────

export const objectiveApi = {
  list: (filters?: { collaboratorId?: number; periodId?: number; status?: ObjectiveStatus }) => {
    let q = supabase
      .from('Objective')
      .select('*, Collaborator(CollaboratorName), Period(PeriodDescription, PeriodYear)')
      .order('ObjectiveId', { ascending: false })
    if (filters?.collaboratorId) q = q.eq('CollaboratorId', filters.collaboratorId)
    if (filters?.periodId) q = q.eq('PeriodId', filters.periodId)
    if (filters?.status) q = q.eq('ObjectiveStatus', filters.status)
    return q
  },

  get: (id: number) =>
    supabase
      .from('Objective')
      .select('*, Collaborator(CollaboratorName, CollaboratorEmail), Period(PeriodDescription, PeriodYear)')
      .eq('ObjectiveId', id)
      .single(),

  create: (data: {
    CollaboratorId: number
    PeriodId: number
    ObjectiveStatus: ObjectiveStatus
    ObjectiveWordURL?: string | null
    ObjectiveSignedPdfURL?: string | null
  }) => supabase.from('Objective').insert(data).select().single(),

  update: (id: number, data: Partial<{
    ObjectiveStatus: ObjectiveStatus
    ObjectiveWordURL: string | null
    ObjectiveSignedPdfURL: string | null
    CollaboratorId: number
    PeriodId: number
  }>) => supabase.from('Objective').update(data).eq('ObjectiveId', id).select().single(),

  delete: async (id: number) => {
    const { count } = await supabase
      .from('Result')
      .select('*', { count: 'exact', head: true })
      .eq('ObjectiveId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: esistono risultati associati a questo obiettivo.' } }
    return supabase.from('Objective').delete().eq('ObjectiveId', id)
  },
}

// ─── Result ───────────────────────────────────────────────────────────────────

export const resultApi = {
  list: (objectiveId: number) =>
    supabase.from('Result').select('*').eq('ObjectiveId', objectiveId).order('ResultId'),

  get: (id: number) =>
    supabase.from('Result').select('*').eq('ResultId', id).single(),

  create: (data: {
    ObjectiveId: number
    ResultActualValue: number
    ResultDelta: number
    ResultAchievementPct: number
    ResultQlikImageUrl?: string | null
    ResultPdfUrl?: string | null
  }) => supabase.from('Result').insert(data).select().single(),

  update: (id: number, data: Partial<{
    ResultActualValue: number
    ResultDelta: number
    ResultAchievementPct: number
    ResultQlikImageUrl: string | null
    ResultPdfUrl: string | null
  }>) => supabase.from('Result').update(data).eq('ResultId', id).select().single(),

  delete: (id: number) =>
    supabase.from('Result').delete().eq('ResultId', id),
}
