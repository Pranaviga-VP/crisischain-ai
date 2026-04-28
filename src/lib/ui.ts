import type { IncidentType, Severity } from '../types'

export const severityBadgeClass: Record<Severity, string> = {
  Critical: 'bg-red-500/20 text-red-300 border border-red-400/50',
  High: 'bg-orange-500/20 text-orange-300 border border-orange-400/50',
  Medium: 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
  Low: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50',
}

export const statusBadgeClass: Record<string, string> = {
  Pending: 'bg-slate-700 text-slate-100 border border-slate-500/60',
  Dispatched: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/60',
  Resolved: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/60',
}

export const incidentTypeIcon: Record<IncidentType, string> = {
  Fire: '🔥',
  'Medical Emergency': '🚑',
  'Civil Unrest': '🚨',
  'Natural Disaster': '🌊',
  Other: '📍',
}

export const severityColors: Record<Severity, string> = {
  Critical: '#FF4D4F',
  High: '#FF7A00',
  Medium: '#F59E0B',
  Low: '#10B981',
}
