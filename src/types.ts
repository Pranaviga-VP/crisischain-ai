export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'

export type IncidentType =
  | 'Fire'
  | 'Medical Emergency'
  | 'Civil Unrest'
  | 'Natural Disaster'
  | 'Other'

export type IncidentStatus = 'Pending' | 'Dispatched' | 'Resolved'

export interface AIClassification {
  severity: Severity
  type: string
  isFakeRisk: number
  summary: string
  recommendedAction: string
  confidenceScore: number
}

export interface IncidentTimelineEvent {
  id: string
  label: string
  timestamp: string
}

export interface IncidentRecord {
  id: string
  timestamp: string
  incidentType: IncidentType
  description: string
  location: string
  imageDataUrl?: string
  submitterName?: string
  aiClassification: AIClassification
  status: IncidentStatus
  chainHash: string
  previousLedgerHash: string
  ledgerHash: string
  timeline: IncidentTimelineEvent[]
}

export interface NewIncidentInput {
  incidentType: IncidentType
  description: string
  location: string
  imageDataUrl?: string
  submitterName?: string
  aiClassification: AIClassification
}
