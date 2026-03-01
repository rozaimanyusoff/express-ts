/**
 * Canonical domain types for the Telco module.
 * Source of truth — telcoModel.ts, telcoController.ts import from here.
 */

// ---------------------------------------------------------------------------
// SIM Card
// ---------------------------------------------------------------------------
export interface TelcoSimCard {
   activated_at?: null | string;
   created_at?: string;
   id?: number;
   reason?: null | string;
   register_date?: null | string;
   replacement_sim_id?: null | number;
   sim_sn: string;
   status: string;
   sub_no_id?: null | number;
}

// ---------------------------------------------------------------------------
// Subscriber (telephone line / mobile number)
// ---------------------------------------------------------------------------
export interface TelcoSubscriber {
   account_sub?: null | string;
   created_at?: string;
   id?: number;
   register_date?: null | string;
   status: string;
   sub_no: string;
}

// ---------------------------------------------------------------------------
// Account (billing account holding multiple subscribers)
// ---------------------------------------------------------------------------
export interface TelcoAccount {
   account_master: string;
   created_at?: string;
   id?: number;
   status?: string;
}

// ---------------------------------------------------------------------------
// Account → Subscriber mapping
// ---------------------------------------------------------------------------
export interface TelcoAccountSub {
   account_id: number;
   account_sub: string;
   effective_date?: string;
   id?: number;
   sub_no_id: number;
}

// ---------------------------------------------------------------------------
// Contract
// ---------------------------------------------------------------------------
export interface TelcoContract {
   account_id: null | number;
   contract_end?: null | string;
   contract_start?: null | string;
   created_at?: string;
   id?: number;
   notes?: null | string;
   status?: string;
   vendor?: null | string;
}

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------
export interface TelcoBilling {
   account_id: null | number;
   billing_date: string;
   billing_month?: null | string;
   billing_year?: null | number;
   created_at?: string;
   id?: number;
   invoice_no?: null | string;
   status?: string;
   total_amount: null | string;
}

export interface TelcoBillingDetail {
   billing_id: number;
   created_at?: string;
   id?: number;
   line_amount: null | string;
   sub_no: null | string;
   sub_no_id?: null | number;
}
