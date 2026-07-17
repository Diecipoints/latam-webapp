import { supabase } from './supabase'
import type { ObjectiveStatus, ObjectivePlanScope, CurrencyCode, ThresholdType } from './database.types'

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
    CuatrimestreIngresso: string | null
    OnboardingDone: boolean
  }>) => supabase.from('Collaborator').update(data).eq('CollaboratorId', id).select().single(),

  delete: async (id: number) => {
    const { count } = await supabase
      .from('CollaboratorObjectivePlan')
      .select('*', { count: 'exact', head: true })
      .eq('CollaboratorId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: il collaboratore è assegnato a uno o più piani obiettivo.' } }
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

// ─── ObjectivePlan ────────────────────────────────────────────────────────────

interface ObjectiveThresholdInput {
  ObjectiveThresholdRevenueValue: number
  ObjectiveThresholdRevenueCurrency: CurrencyCode
  ObjectiveThresholdBonusValue: number
  ObjectiveThresholdBonusCurrency: CurrencyCode
  ObjectiveThresholdType: ThresholdType
}

export const objectivePlanApi = {
  list: async (filters?: { collaboratorId?: number; periodId?: number; status?: ObjectiveStatus }) => {
    let q = supabase
      .from('ObjectivePlan')
      .select('*, Period(PeriodDescription, PeriodYear), ObjectivePlanCountry(CountryId, Country(CountryName)), CollaboratorObjectivePlan(CollaboratorId)')
      .order('ObjectivePlanId', { ascending: false })
    if (filters?.collaboratorId) {
      const { data: assigned } = await supabase
        .from('CollaboratorObjectivePlan')
        .select('ObjectivePlanId')
        .eq('CollaboratorId', filters.collaboratorId)
      q = q.in('ObjectivePlanId', (assigned ?? []).map((a) => a.ObjectivePlanId))
    }
    if (filters?.periodId) q = q.eq('PeriodId', filters.periodId)
    if (filters?.status) q = q.eq('ObjectiveStatus', filters.status)
    return q
  },

  get: (id: number) =>
    supabase
      .from('ObjectivePlan')
      .select('*, Period(PeriodDescription, PeriodYear), ObjectivePlanCountry(CountryId, Country(CountryName)), ObjectiveThreshold(*), CollaboratorObjectivePlan(CollaboratorId)')
      .eq('ObjectivePlanId', id)
      .single(),

  create: async (data: {
    PeriodId: number
    ObjectivePlanName: string
    ObjectiveStatus: ObjectiveStatus
    ObjectivePlanScope?: ObjectivePlanScope
    CountryIds: number[]
    Thresholds: ObjectiveThresholdInput[]
  }) => {
    const { CountryIds, Thresholds, ...planData } = data
    const { data: plan, error: planError } = await supabase.from('ObjectivePlan').insert(planData).select().single()
    if (planError || !plan) return { data: null, error: planError }

    const [{ error: countryError }, { error: thresholdError }] = await Promise.all([
      supabase.from('ObjectivePlanCountry').insert(CountryIds.map((CountryId) => ({ ObjectivePlanId: plan.ObjectivePlanId, CountryId }))),
      supabase.from('ObjectiveThreshold').insert(Thresholds.map((t) => ({ ObjectivePlanId: plan.ObjectivePlanId, ...t }))),
    ])
    if (countryError || thresholdError) return { data: null, error: countryError ?? thresholdError }
    return { data: plan, error: null }
  },

  update: async (id: number, data: Partial<{
    PeriodId: number
    ObjectivePlanName: string
    ObjectiveStatus: ObjectiveStatus
    ObjectivePlanScope?: ObjectivePlanScope
    CountryIds: number[]
    Thresholds: ObjectiveThresholdInput[]
  }>) => {
    const { CountryIds, Thresholds, ...planData } = data
    const { data: plan, error: planError } = await supabase.from('ObjectivePlan').update(planData).eq('ObjectivePlanId', id).select().single()
    if (planError) return { data: null, error: planError }

    if (CountryIds) {
      await supabase.from('ObjectivePlanCountry').delete().eq('ObjectivePlanId', id)
      if (CountryIds.length) {
        const { error } = await supabase.from('ObjectivePlanCountry').insert(CountryIds.map((CountryId) => ({ ObjectivePlanId: id, CountryId })))
        if (error) return { data: null, error }
      }
    }
    if (Thresholds) {
      await supabase.from('ObjectiveThreshold').delete().eq('ObjectivePlanId', id)
      if (Thresholds.length) {
        const { error } = await supabase.from('ObjectiveThreshold').insert(Thresholds.map((t) => ({ ObjectivePlanId: id, ...t })))
        if (error) return { data: null, error }
      }
    }
    return { data: plan, error: null }
  },

  delete: async (id: number) => {
    const { count } = await supabase
      .from('Result')
      .select('*', { count: 'exact', head: true })
      .eq('ObjectivePlanId', id)
    if (count && count > 0)
      return { data: null, error: { message: 'Impossibile eliminare: esistono risultati associati a questo piano obiettivo.' } }
    return supabase.from('ObjectivePlan').delete().eq('ObjectivePlanId', id)
  },
}

// ─── CollaboratorObjectivePlan ─────────────────────────────────────────────────

export const collaboratorObjectivePlanApi = {
  listByCollaborator: (collaboratorId: number) =>
    supabase
      .from('CollaboratorObjectivePlan')
      .select('*, ObjectivePlan(ObjectivePlanId, ObjectivePlanName, ObjectivePlanCountry(CountryId, Country(CountryName)), ObjectiveThreshold(*))')
      .eq('CollaboratorId', collaboratorId),

  assign: (collaboratorId: number, objectivePlanId: number) =>
    supabase.from('CollaboratorObjectivePlan').insert({ CollaboratorId: collaboratorId, ObjectivePlanId: objectivePlanId }).select().single(),
}

// ─── Result ───────────────────────────────────────────────────────────────────

export const resultApi = {
  list: (objectivePlanId: number) =>
    supabase.from('Result').select('*').eq('ObjectivePlanId', objectivePlanId).order('ResultId'),

  get: (id: number) =>
    supabase.from('Result').select('*').eq('ResultId', id).single(),

  create: (data: {
    ObjectivePlanId: number
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
