export const PIPELINE_STATUSES = [
  { value: 'pipeline',    label: 'In pipeline',   headerClass: 'bg-slate-100 border-slate-200 text-slate-700' },
  { value: 'submitted',   label: 'Submitted',     headerClass: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'shortlisted', label: 'Shortlisted',   headerClass: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'interview',   label: 'Interview',     headerClass: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'rejected',    label: 'Rejected',      headerClass: 'bg-red-50 border-red-200 text-red-600' },
  { value: 'offer',       label: 'Offer',         headerClass: 'bg-green-50 border-green-200 text-green-700' },
] as const

export type PipelineStatus = typeof PIPELINE_STATUSES[number]['value']

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STATUSES.map(s => [s.value, s.label])
)

export const CANDIDATE_STATUSES = [
  { value: 'activ',     label: 'Active',     cls: 'bg-green-100 text-green-700 border border-green-200' },
  { value: 'pasiv',     label: 'Passive',    cls: 'bg-gray-100 text-gray-600 border border-gray-200' },
  { value: 'angajat',   label: 'Employed',   cls: 'bg-blue-100 text-blue-700 border border-blue-200' },
  { value: 'blacklist', label: 'Black List', cls: 'bg-red-100 text-red-600 border border-red-200' },
] as const

export const CANDIDATE_STATUS_LABELS = Object.fromEntries(
  CANDIDATE_STATUSES.map(s => [s.value, s.label])
)

export const ROLE_STATUSES = [
  { value: 'draft',    label: 'Draft',        cls: 'bg-gray-50 text-gray-500 border border-gray-200' },
  { value: 'active',   label: 'Active role',  cls: 'bg-green-50 text-green-700 border border-green-200' },
  { value: 'on_hold',  label: 'On Hold',      cls: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  { value: 'closed',   label: 'Role closed',  cls: 'bg-red-50 text-red-600 border border-red-200' },
  { value: 'filled',   label: 'Role filled',  cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
] as const

export const CONTRACT_STATUSES = [
  { value: 'activ',    label: 'Active',     cls: 'bg-green-100 text-green-700' },
  { value: 'terminat', label: 'Terminated', cls: 'bg-gray-100 text-gray-500' },
] as const
