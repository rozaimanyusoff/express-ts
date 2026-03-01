/**
 * Canonical domain types for the User module.
 * Source of truth — userModel.ts, pendingUserModel.ts, adminModel.ts import from here.
 */

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------
export interface User {
   activated_at: Date | null;
   activation_code: null | string;
   avatar?: null | string;
   contact: string;
   created_at: Date;
   email: string;
   fname: string;
   id: number;
   last_host: null | string;
   last_ip: null | string;
   last_login: Date | null;
   last_nav: null | string;
   last_os: null | string;
   password: string;
   reset_token: null | string;
   role: number;
   status: number;
   user_type: number;
   usergroups: null | string;
   username: string;
}

export interface UserProfile {
   dob: null | string;
   job: null | string;
   location: null | string;
   profile_image_url: null | string;
   user_id: number;
}

// ---------------------------------------------------------------------------
// Pending User
// ---------------------------------------------------------------------------
export interface PendingUser {
   about?: null | string;
   activation_code: null | string;
   contact: string;
   created_at?: string;
   email: string;
   fname: string;
   id: number;
   registration_ip?: null | string;
   status: number;
   user_type: number;
   username: string;
}

// ---------------------------------------------------------------------------
// Auth: register payload
// ---------------------------------------------------------------------------
export interface RegisterPayload {
   about?: string;
   contact?: string;
   email: string;
   ip?: string;
   name: string;
   userAgent?: string;
   userType?: number;
   username: string;
}

// ---------------------------------------------------------------------------
// Auth: login payload
// ---------------------------------------------------------------------------
export interface LoginPayload {
   password: string;
   username: string;
}

// ---------------------------------------------------------------------------
// RBAC
// ---------------------------------------------------------------------------
export interface Role {
   create_at: Date;
   creates: number;
   deletes: number;
   desc?: string;
   id: number;
   name: string;
   status: number;
   update_at: Date;
   updates: number;
   views: number;
}

export interface Group {
   created_at: string;
   desc: string;
   id: number;
   name: string;
   status: number;
}

export interface UserGroup {
   group_id: number;
   id: number;
   user_id: number;
}

export interface Permission {
   id: number;
   module_id: number;
   user_group_id: number;
}

export interface Module {
   category: null | string;
   created_at: string;
   description: null | string;
   icon: null | string;
   id: number;
   name: string;
   route: null | string;
   status: number;
}
