/**
 * Canonical domain types for the Compliance module.
 * Source of truth — complianceModel.ts imports from here.
 */

// ---------------------------------------------------------------------------
// Summon / Traffic Fine
// ---------------------------------------------------------------------------
export interface SummonAgency {
   code?: null | string;
   created_at?: null | string;
   id?: number;
   name?: null | string;
   updated_at?: null | string;
}

export interface SummonType {
   created_at?: null | string;
   description?: null | string;
   id?: number;
   name?: null | string;
   updated_at?: null | string;
}

export interface SummonRecord {
   asset_id?: null | number;
   attachment_url?: null | string;
   created_at?: null | string;
   emailStat?: null | number;
   entry_code?: null | string;
   f_name?: null | string;
   id?: number;
   myeg_date?: null | string;
   notice?: null | string;
   notice_date?: null | string;
   ramco_id?: null | string;
   receipt_date?: null | string;
   reg_no?: null | string;
   running_no?: null | number;
   smn_id?: number;
   summon_agency?: null | string;
   summon_amt?: null | string;
   summon_date?: null | string;
   summon_dt?: null | string;
   summon_no?: null | string;
   summon_status?: null | string;
   summon_type?: null | string;
   updated_at?: null | string;
}

// ---------------------------------------------------------------------------
// Assessment
// ---------------------------------------------------------------------------
export interface AssessmentCriteria {
   category: null | string;
   code: null | string;
   created_at?: null | string;
   description: null | string;
   id?: number;
   max_score: null | number;
   name: string;
   updated_at?: null | string;
   weight: null | number;
}

export interface AssessmentRecord {
   assessed_by: null | string;
   asset_id: null | number;
   compliance_score: null | number;
   created_at?: null | string;
   id?: number;
   notes: null | string;
   period: null | string;
   status: null | string;
   total_score: null | number;
   updated_at?: null | string;
}

export interface AssessmentDetail {
   actual_score: null | number;
   assessment_id: number;
   created_at?: null | string;
   criteria_id: number;
   id?: number;
   max_score: null | number;
   notes: null | string;
   updated_at?: null | string;
}
