import { z } from 'zod'

export const RegionSchema = z.object({
  RegionName: z.string().min(1, 'Nome obbligatorio'),
})

export const CountrySchema = z.object({
  CountryName: z.string().min(1, 'Nome obbligatorio'),
  RegionId: z.number({ message: 'Regione obbligatoria' }).int().positive(),
})

export const CollaboratorTypeSchema = z.object({
  CollaboratorTypeName: z.string().min(1, 'Nome obbligatorio'),
})

export const CollaboratorSchema = z.object({
  CollaboratorName: z.string().min(1, 'Nome obbligatorio'),
  CollaboratorEmail: z.string().email('Email non valida'),
  CollaboratorTypeId: z.number({ message: 'Tipo obbligatorio' }).int().positive(),
  CountryId: z.number({ message: 'Paese obbligatorio' }).int().positive(),
  CollaboratorActive: z.boolean().default(true),
})

export const PeriodSchema = z.object({
  PeriodDescription: z.string().min(1, 'Descrizione obbligatoria'),
  PeriodYear: z
    .number({ message: 'Anno obbligatorio' })
    .int()
    .min(2000)
    .max(2100),
})

export const ObjectiveTemplateSchema = z.object({
  ObjectiveTemplateTitle: z.string().min(1, 'Titolo obbligatorio'),
  ObjectiveTemplateBody: z.string().min(1, 'Contenuto obbligatorio'),
})

export const ObjectiveStatusEnum = z.enum(['DRAFT', 'ASSIGNED', 'SIGNED', 'CLOSED'])

export const ObjectiveSchema = z.object({
  CollaboratorId: z.number({ message: 'Collaboratore obbligatorio' }).int().positive(),
  PeriodId: z.number({ message: 'Periodo obbligatorio' }).int().positive(),
  ObjectiveStatus: ObjectiveStatusEnum,
  ObjectiveWordURL: z.string().url('URL non valido').nullable().or(z.literal('')).transform(v => v === '' ? null : v),
  ObjectiveSignedPdfURL: z.string().url('URL non valido').nullable().or(z.literal('')).transform(v => v === '' ? null : v),
})

export const ResultSchema = z.object({
  ObjectiveId: z.number({ message: 'Obiettivo obbligatorio' }).int().positive(),
  ResultActualValue: z.number({ message: 'Valore effettivo obbligatorio' }),
  ResultDelta: z.number({ message: 'Delta obbligatorio' }),
  ResultAchievementPct: z
    .number({ message: 'Percentuale obbligatoria' })
    .min(0, 'La percentuale non può essere negativa'),
  ResultQlikImageUrl: z.string().url('URL non valido').nullable().or(z.literal('')).transform(v => v === '' ? null : v),
  ResultPdfUrl: z.string().url('URL non valido').nullable().or(z.literal('')).transform(v => v === '' ? null : v),
})

export type RegionFormValues = z.infer<typeof RegionSchema>
export type CountryFormValues = z.infer<typeof CountrySchema>
export type CollaboratorTypeFormValues = z.infer<typeof CollaboratorTypeSchema>
export type CollaboratorFormValues = z.infer<typeof CollaboratorSchema>
export type PeriodFormValues = z.infer<typeof PeriodSchema>
export type ObjectiveTemplateFormValues = z.infer<typeof ObjectiveTemplateSchema>
export type ObjectiveFormValues = z.infer<typeof ObjectiveSchema>
export type ResultFormValues = z.infer<typeof ResultSchema>
