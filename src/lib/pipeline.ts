export const PIPELINE_STATUSES = [
  { value: 'pipeline',    label: 'Pipeline',    headerClass: 'bg-slate-100 border-slate-200 text-slate-700' },
  { value: 'submitted',   label: 'Submitted',   headerClass: 'bg-blue-50 border-blue-200 text-blue-700' },
  { value: 'shortlisted', label: 'Shortlisted', headerClass: 'bg-purple-50 border-purple-200 text-purple-700' },
  { value: 'interview',   label: 'Interview',   headerClass: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'rejected',    label: 'Rejected',    headerClass: 'bg-red-50 border-red-200 text-red-600' },
  { value: 'offer',       label: 'Offer',       headerClass: 'bg-green-50 border-green-200 text-green-700' },
] as const

export type PipelineStatus = typeof PIPELINE_STATUSES[number]['value']

export const STATUS_LABELS: Record<string, string> = Object.fromEntries(
  PIPELINE_STATUSES.map(s => [s.value, s.label])
)
