export type ObjectiveStatus = 'DRAFT' | 'ASSIGNED' | 'SIGNED' | 'CLOSED'
export type CurrencyCode = 'EUR' | 'COP' | 'MXN' | 'ARS' | 'CLP' | 'DOP'
export type ThresholdType = 'si_alcanza' | 'adicionalmente' | 'adicionalmente_mayor'
export type ObjectivePlanScope = 'individual' | 'filiale'

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
          CuatrimestreIngresso: string | null
          OnboardingDone: boolean
        }
        Insert: {
          CollaboratorId?: number
          CollaboratorTypeId: number
          CountryId: number
          CollaboratorName: string
          CollaboratorEmail: string
          CollaboratorActive?: boolean
          CuatrimestreIngresso?: string | null
          OnboardingDone?: boolean
        }
        Update: {
          CollaboratorId?: number
          CollaboratorTypeId?: number
          CountryId?: number
          CollaboratorName?: string
          CollaboratorEmail?: string
          CollaboratorActive?: boolean
          CuatrimestreIngresso?: string | null
          OnboardingDone?: boolean
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
      ObjectivePlan: {
        Row: {
          ObjectivePlanId: number
          PeriodId: number
          ObjectivePlanName: string
          ObjectiveStatus: ObjectiveStatus
          ObjectivePlanScope: ObjectivePlanScope
        }
        Insert: {
          ObjectivePlanId?: number
          PeriodId: number
          ObjectivePlanName: string
          ObjectiveStatus: ObjectiveStatus
          ObjectivePlanScope?: ObjectivePlanScope
        }
        Update: {
          ObjectivePlanId?: number
          PeriodId?: number
          ObjectivePlanName?: string
          ObjectiveStatus?: ObjectiveStatus
          ObjectivePlanScope?: ObjectivePlanScope
        }
        Relationships: [
          { foreignKeyName: 'Objective_PeriodId_fkey'; columns: ['PeriodId']; referencedRelation: 'Period'; referencedColumns: ['PeriodId'] }
        ]
      }
      ObjectivePlanCountry: {
        Row: { ObjectivePlanCountryId: number; ObjectivePlanId: number; CountryId: number }
        Insert: { ObjectivePlanCountryId?: number; ObjectivePlanId: number; CountryId: number }
        Update: { ObjectivePlanCountryId?: number; ObjectivePlanId?: number; CountryId?: number }
        Relationships: [
          { foreignKeyName: 'ObjectivePlanCountry_ObjectivePlanId_fkey'; columns: ['ObjectivePlanId']; referencedRelation: 'ObjectivePlan'; referencedColumns: ['ObjectivePlanId'] },
          { foreignKeyName: 'ObjectivePlanCountry_CountryId_fkey'; columns: ['CountryId']; referencedRelation: 'Country'; referencedColumns: ['CountryId'] }
        ]
      }
      CollaboratorObjectivePlan: {
        Row: { CollaboratorObjectivePlanId: number; CollaboratorId: number; ObjectivePlanId: number }
        Insert: { CollaboratorObjectivePlanId?: number; CollaboratorId: number; ObjectivePlanId: number }
        Update: { CollaboratorObjectivePlanId?: number; CollaboratorId?: number; ObjectivePlanId?: number }
        Relationships: [
          { foreignKeyName: 'CollaboratorObjectivePlan_CollaboratorId_fkey'; columns: ['CollaboratorId']; referencedRelation: 'Collaborator'; referencedColumns: ['CollaboratorId'] },
          { foreignKeyName: 'CollaboratorObjectivePlan_ObjectivePlanId_fkey'; columns: ['ObjectivePlanId']; referencedRelation: 'ObjectivePlan'; referencedColumns: ['ObjectivePlanId'] }
        ]
      }
      ObjectiveThreshold: {
        Row: {
          ObjectiveThresholdId: number
          ObjectivePlanId: number
          ObjectiveThresholdRevenueValue: number
          ObjectiveThresholdRevenueCurrency: CurrencyCode
          ObjectiveThresholdBonusValue: number
          ObjectiveThresholdBonusCurrency: CurrencyCode
          ObjectiveThresholdType: ThresholdType
        }
        Insert: {
          ObjectiveThresholdId?: number
          ObjectivePlanId: number
          ObjectiveThresholdRevenueValue: number
          ObjectiveThresholdRevenueCurrency: CurrencyCode
          ObjectiveThresholdBonusValue: number
          ObjectiveThresholdBonusCurrency: CurrencyCode
          ObjectiveThresholdType: ThresholdType
        }
        Update: {
          ObjectiveThresholdId?: number
          ObjectivePlanId?: number
          ObjectiveThresholdRevenueValue?: number
          ObjectiveThresholdRevenueCurrency?: CurrencyCode
          ObjectiveThresholdBonusValue?: number
          ObjectiveThresholdBonusCurrency?: CurrencyCode
          ObjectiveThresholdType?: ThresholdType
        }
        Relationships: [
          { foreignKeyName: 'ObjectiveThreshold_ObjectivePlanId_fkey'; columns: ['ObjectivePlanId']; referencedRelation: 'ObjectivePlan'; referencedColumns: ['ObjectivePlanId'] }
        ]
      }
      Result: {
        Row: {
          ResultId: number
          ObjectivePlanId: number
          ResultActualValue: number
          ResultDelta: number
          ResultAchievementPct: number
          ResultQlikImageUrl: string | null
          ResultPdfUrl: string | null
        }
        Insert: {
          ResultId?: number
          ObjectivePlanId: number
          ResultActualValue: number
          ResultDelta: number
          ResultAchievementPct: number
          ResultQlikImageUrl?: string | null
          ResultPdfUrl?: string | null
        }
        Update: {
          ResultId?: number
          ObjectivePlanId?: number
          ResultActualValue?: number
          ResultDelta?: number
          ResultAchievementPct?: number
          ResultQlikImageUrl?: string | null
          ResultPdfUrl?: string | null
        }
        Relationships: [
          { foreignKeyName: 'Result_ObjectiveId_fkey'; columns: ['ObjectivePlanId']; referencedRelation: 'ObjectivePlan'; referencedColumns: ['ObjectivePlanId'] }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      objective_status: ObjectiveStatus
      currency_code: CurrencyCode
      threshold_type: ThresholdType
      objective_plan_scope: ObjectivePlanScope
    }
    CompositeTypes: { [_ in never]: never }
  }
}
