export type Currency = 'EUR' | 'USD' | 'GBP' | 'RON'
export type SourceType = 'own' | 'external_recruiter' | 'partner'
export type Seniority = 'junior' | 'mid' | 'senior' | 'lead' | 'principal'
export type CollaborationType = 'full_time' | 'part_time' | 'contract' | 'freelance'
export type JobStatus = 'draft' | 'active' | 'on_hold' | 'closed' | 'filled'

export type SubmissionStatus =
  | 'new'
  | 'cv_received'
  | 'in_analysis'
  | 'match_identified'
  | 'to_contact'
  | 'contacted'
  | 'screening_scheduled'
  | 'screening_done'
  | 'proposed_to_client'
  | 'not_suitable'
  | 'waiting_for_job'
  | 'closed'

export interface Profile {
  id: string
  name: string
  created_at: string
}

export interface Skill {
  id: string
  name: string
  category: string
  created_at: string
}

export interface Partner {
  id: string
  name: string
  contact_name: string | null
  contact_email: string | null
  commission_terms: string | null
  created_at: string
}

export interface Client {
  id: string
  name: string
  fieldglass_enabled: boolean
  created_at: string
}

export interface Candidate {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  linkedin_url: string | null
  location: string | null
  years_experience: number | null
  seniority: Seniority | null
  profile_id: string | null
  rate: number | null
  currency: Currency
  source_type: SourceType
  partner_id: string | null
  successful: boolean
  successful_client: string | null
  cv_file_path: string | null
  notes: string | null
  cv_upload_token: string | null
  gdpr_consent: boolean
  deleted_at: string | null
  created_at: string
  updated_at: string
  profile?: Profile
  partner?: Partner
  skills?: Skill[]
}

export interface Role {
  id: string
  title: string
  client_id: string
  description: string | null
  required_skills: string | null
  preferred_skills: string | null
  location: string | null
  seniority: Seniority | null
  collaboration_type: CollaborationType | null
  status: JobStatus
  fieldglass_id: string | null
  deadline: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  client?: Client
  stages?: RoleStage[]
}

export interface RoleStage {
  id: string
  role_id: string
  name: string
  order_index: number
  created_at: string
}

export interface Submission {
  id: string
  candidate_id: string
  role_id: string
  current_stage_id: string | null
  status: SubmissionStatus
  ai_score: number | null
  ai_summary: string | null
  deleted_at: string | null
  created_at: string
  updated_at: string
  candidate?: Candidate
  role?: Role
  current_stage?: RoleStage
  stage_history?: StageHistory[]
}

export interface StageHistory {
  id: string
  submission_id: string
  stage_id: string | null
  stage_name: string
  result: string | null
  feedback: string | null
  created_by: string | null
  created_at: string
  stage?: RoleStage
}

export interface Contract {
  id: string
  submission_id: string
  start_date: string
  end_date: string | null
  pay_rate: number
  bill_rate: number
  currency: Currency
  partner_commission: number | null
  notes: string | null
  created_at: string
  updated_at: string
  submission?: Submission
}
