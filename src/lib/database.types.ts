export type ObjectiveStatus = 'DRAFT' | 'ASSIGNED' | 'SIGNED' | 'CLOSED'

export interface Database {
  public: {
    Tables: {
      Region: {
        Row: { RegionId: number; RegionName: string }
        Insert: { RegionId?: number; RegionName: string }
        Update: { RegionId?: number; RegionName?: string }
        Relationships: []
      }
      Country: {
        Row: { CountryId: number; CountryName: string; RegionId: number }
        Insert: { CountryId?: number; CountryName: string; RegionId: number }
        Update: { CountryId?: number; CountryName?: string; RegionId?: number }
        Relationships: [
          { foreignKeyName: 'Country_RegionId_fkey'; columns: ['RegionId']; referencedRelation: 'Region'; referencedColumns: ['RegionId'] }
        ]
      }
      CollaboratorType: {
        Row: { CollaboratorTypeId: number; CollaboratorTypeName: string }
        Insert: { CollaboratorTypeId?: number; CollaboratorTypeName: string }
        Update: { CollaboratorTypeId?: number; CollaboratorTypeName?: string }
        Relationships: []
      }
      Collaborator: {
        Row: {
          CollaboratorId: number
          CollaboratorTypeId: number
          CountryId: number
          CollaboratorName: string
          CollaboratorEmail: string
          CollaboratorActive: boolean
        }
        Insert: {
          CollaboratorId?: number
          CollaboratorTypeId: number
          CountryId: number
          CollaboratorName: string
          CollaboratorEmail: string
          CollaboratorActive?: boolean
        }
        Update: {
          CollaboratorId?: number
          CollaboratorTypeId?: number
          CountryId?: number
          CollaboratorName?: string
          CollaboratorEmail?: string
          CollaboratorActive?: boolean
        }
        Relationships: [
          { foreignKeyName: 'Collaborator_CountryId_fkey'; columns: ['CountryId']; referencedRelation: 'Country'; referencedColumns: ['CountryId'] },
          { foreignKeyName: 'Collaborator_CollaboratorTypeId_fkey'; columns: ['CollaboratorTypeId']; referencedRelation: 'CollaboratorType'; referencedColumns: ['CollaboratorTypeId'] }
        ]
      }
      Period: {
        Row: { PeriodId: number; PeriodDescription: string; PeriodYear: number }
        Insert: { PeriodId?: number; PeriodDescription: string; PeriodYear: number }
        Update: { PeriodId?: number; PeriodDescription?: string; PeriodYear?: number }
        Relationships: []
      }
      ObjectiveTemplate: {
        Row: { ObjectiveTemplateId: number; ObjectiveTemplateTitle: string; ObjectiveTemplateBody: string }
        Insert: { ObjectiveTemplateId?: number; ObjectiveTemplateTitle: string; ObjectiveTemplateBody: string }
        Update: { ObjectiveTemplateId?: number; ObjectiveTemplateTitle?: string; ObjectiveTemplateBody?: string }
        Relationships: []
      }
      Objective: {
        Row: {
          ObjectiveId: number
          CollaboratorId: number
          PeriodId: number
          ObjectiveStatus: ObjectiveStatus
          ObjectiveWordURL: string | null
          ObjectiveSignedPdfURL: string | null
        }
        Insert: {
          ObjectiveId?: number
          CollaboratorId: number
          PeriodId: number
          ObjectiveStatus: ObjectiveStatus
          ObjectiveWordURL?: string | null
          ObjectiveSignedPdfURL?: string | null
        }
        Update: {
          ObjectiveId?: number
          CollaboratorId?: number
          PeriodId?: number
          ObjectiveStatus?: ObjectiveStatus
          ObjectiveWordURL?: string | null
          ObjectiveSignedPdfURL?: string | null
        }
        Relationships: [
          { foreignKeyName: 'Objective_CollaboratorId_fkey'; columns: ['CollaboratorId']; referencedRelation: 'Collaborator'; referencedColumns: ['CollaboratorId'] },
          { foreignKeyName: 'Objective_PeriodId_fkey'; columns: ['PeriodId']; referencedRelation: 'Period'; referencedColumns: ['PeriodId'] }
        ]
      }
      Result: {
        Row: {
          ResultId: number
          ObjectiveId: number
          ResultActualValue: number
          ResultDelta: number
          ResultAchievementPct: number
          ResultQlikImageUrl: string | null
          ResultPdfUrl: string | null
        }
        Insert: {
          ResultId?: number
          ObjectiveId: number
          ResultActualValue: number
          ResultDelta: number
          ResultAchievementPct: number
          ResultQlikImageUrl?: string | null
          ResultPdfUrl?: string | null
        }
        Update: {
          ResultId?: number
          ObjectiveId?: number
          ResultActualValue?: number
          ResultDelta?: number
          ResultAchievementPct?: number
          ResultQlikImageUrl?: string | null
          ResultPdfUrl?: string | null
        }
        Relationships: [
          { foreignKeyName: 'Result_ObjectiveId_fkey'; columns: ['ObjectiveId']; referencedRelation: 'Objective'; referencedColumns: ['ObjectiveId'] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      objective_status: ObjectiveStatus
    }
    CompositeTypes: { [_ in never]: never }
  }
}
