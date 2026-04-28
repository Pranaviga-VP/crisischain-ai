import { sha256Hex } from './hash'
import { getIncidentAdapter } from './incidentAdapter'
import type {
  AIClassification,
  IncidentRecord,
  IncidentStatus,
  IncidentTimelineEvent,
  IncidentType,
  NewIncidentInput,
  Severity,
} from '../types'

const severityWeight: Record<Severity, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
}

function nowIso() {
  return new Date().toISOString()
}

async function readIncidents(): Promise<IncidentRecord[]> {
  const adapter = getIncidentAdapter()
  return adapter.loadIncidents()
}

async function writeIncidents(incidents: IncidentRecord[]): Promise<void> {
  const adapter = getIncidentAdapter()
  await adapter.saveIncidents(incidents)
}

function sortByPriority(incidents: IncidentRecord[]): IncidentRecord[] {
  return [...incidents].sort((a, b) => {
    const severityDelta =
      severityWeight[b.aiClassification.severity] - severityWeight[a.aiClassification.severity]

    if (severityDelta !== 0) {
      return severityDelta
    }

    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  })
}

function minutesAgoIso(minutes: number): string {
  return new Date(Date.now() - minutes * 60 * 1000).toISOString()
}

function buildTimeline(submitted: string, classified: string, dispatched?: string, resolved?: string) {
  const events: IncidentTimelineEvent[] = [
    { id: crypto.randomUUID(), label: 'Report submitted', timestamp: submitted },
    { id: crypto.randomUUID(), label: 'AI classified', timestamp: classified },
  ]

  if (dispatched) {
    events.push({ id: crypto.randomUUID(), label: 'Responder dispatched', timestamp: dispatched })
  }

  if (resolved) {
    events.push({ id: crypto.randomUUID(), label: 'Incident resolved', timestamp: resolved })
  }

  return events
}

function makeSampleIncident(
  id: string,
  timestamp: string,
  incidentType: IncidentType,
  description: string,
  location: string,
  aiClassification: AIClassification,
  status: IncidentStatus,
  timeline: IncidentTimelineEvent[],
): IncidentRecord {
  return {
    id,
    timestamp,
    incidentType,
    description,
    location,
    aiClassification,
    status,
    chainHash: '',
    previousLedgerHash: '',
    ledgerHash: '',
    timeline,
    submitterName: 'Anonymous',
  }
}

async function applyLedgerHashes(incidents: IncidentRecord[]): Promise<IncidentRecord[]> {
  const ordered = [...incidents].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  let previousLedgerHash = 'GENESIS'

  for (const incident of ordered) {
    const chainHash = await sha256Hex(`${incident.id}|${incident.timestamp}|${incident.description}`)
    const ledgerHash = await sha256Hex(
      `${previousLedgerHash}|${chainHash}|${incident.status}|${incident.aiClassification.severity}`,
    )

    incident.chainHash = chainHash
    incident.previousLedgerHash = previousLedgerHash
    incident.ledgerHash = ledgerHash
    previousLedgerHash = ledgerHash
  }

  return ordered
}

async function buildSeedData(): Promise<IncidentRecord[]> {
  const t1 = minutesAgoIso(118)
  const t2 = minutesAgoIso(96)
  const t3 = minutesAgoIso(68)
  const t4 = minutesAgoIso(39)
  const t5 = minutesAgoIso(12)

  const seed = [
    makeSampleIncident(
      'cc-seed-001',
      t1,
      'Medical Emergency',
      'A middle-aged man collapsed near platform 3 and is not responding. Bystanders report shallow breathing.',
      'Bengaluru City Railway Station, Karnataka',
      {
        severity: 'Critical',
        type: 'Cardiac Emergency',
        isFakeRisk: 7,
        summary: 'Possible cardiac collapse at a crowded transport hub requiring immediate medical intervention.',
        recommendedAction: 'Dispatch advanced life support ambulance and alert nearest trauma-capable hospital.',
        confidenceScore: 94,
      },
      'Dispatched',
      buildTimeline(t1, minutesAgoIso(116), minutesAgoIso(110)),
    ),
    makeSampleIncident(
      'cc-seed-002',
      t2,
      'Fire',
      'Heavy smoke and visible flames from a second-floor electrical room in an apartment block.',
      'T. Nagar, Chennai, Tamil Nadu',
      {
        severity: 'Critical',
        type: 'Structural Fire',
        isFakeRisk: 9,
        summary: 'Active structural fire reported in a residential block with immediate evacuation risk.',
        recommendedAction: 'Dispatch fire units, trigger local evacuation, and isolate electrical supply to the building.',
        confidenceScore: 92,
      },
      'Resolved',
      buildTimeline(t2, minutesAgoIso(95), minutesAgoIso(86), minutesAgoIso(51)),
    ),
    makeSampleIncident(
      'cc-seed-003',
      t3,
      'Natural Disaster',
      'Roadside flooding has trapped multiple vehicles after intense rain near the underpass.',
      'Andheri East, Mumbai, Maharashtra',
      {
        severity: 'High',
        type: 'Urban Flooding',
        isFakeRisk: 14,
        summary: 'Flash flooding reported with transport disruption and potential rescue requirement.',
        recommendedAction: 'Deploy rescue boat team and traffic diversion units; issue flood advisory immediately.',
        confidenceScore: 87,
      },
      'Pending',
      buildTimeline(t3, minutesAgoIso(66)),
    ),
    makeSampleIncident(
      'cc-seed-004',
      t4,
      'Civil Unrest',
      'A crowd is gathering and shouting near the market square, but no violence observed yet.',
      'Lucknow Chowk, Uttar Pradesh',
      {
        severity: 'Medium',
        type: 'Public Disturbance',
        isFakeRisk: 62,
        summary: 'Crowd agitation detected with uncertain escalation risk and low source reliability.',
        recommendedAction: 'Send a verification patrol and monitor nearby CCTV feeds for signs of escalation.',
        confidenceScore: 63,
      },
      'Pending',
      buildTimeline(t4, minutesAgoIso(37)),
    ),
    makeSampleIncident(
      'cc-seed-005',
      t5,
      'Other',
      'Heard there might be a gas leak in one lane; source is unconfirmed and no smell at caller location.',
      'Rajajinagar, Bengaluru, Karnataka',
      {
        severity: 'Low',
        type: 'Unverified Hazard Report',
        isFakeRisk: 78,
        summary: 'Potential gas leak claim reported with weak corroboration and high false-alarm probability.',
        recommendedAction: 'Request utility safety check while responder verifies source credibility on site.',
        confidenceScore: 54,
      },
      'Pending',
      buildTimeline(t5, minutesAgoIso(10)),
    ),
  ]

  return applyLedgerHashes(seed)
}

export async function initializeStore(): Promise<IncidentRecord[]> {
  const existing = await readIncidents()

  if (existing.length > 0) {
    return sortByPriority(existing)
  }

  const seed = await buildSeedData()
  await writeIncidents(seed)

  return sortByPriority(seed)
}

export async function getIncidents(): Promise<IncidentRecord[]> {
  const incidents = await readIncidents()

  if (incidents.length === 0) {
    return initializeStore()
  }

  return sortByPriority(incidents)
}

export async function addIncident(input: NewIncidentInput): Promise<IncidentRecord> {
  const existing = (await readIncidents()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  const timestamp = nowIso()
  const id = crypto.randomUUID()

  const timeline = buildTimeline(timestamp, timestamp)

  const chainHash = await sha256Hex(`${id}|${timestamp}|${input.description}`)
  const previousLedgerHash = existing.length > 0 ? existing[existing.length - 1].ledgerHash : 'GENESIS'
  const ledgerHash = await sha256Hex(
    `${previousLedgerHash}|${chainHash}|Pending|${input.aiClassification.severity}`,
  )

  const incident: IncidentRecord = {
    id,
    timestamp,
    incidentType: input.incidentType,
    description: input.description,
    location: input.location,
    imageDataUrl: input.imageDataUrl,
    submitterName: input.submitterName,
    aiClassification: input.aiClassification,
    status: 'Pending',
    chainHash,
    previousLedgerHash,
    ledgerHash,
    timeline,
  }

  existing.push(incident)
  await writeIncidents(existing)

  return incident
}

export async function updateIncidentStatus(
  incidentId: string,
  status: IncidentStatus,
): Promise<IncidentRecord | null> {
  const incidents = await readIncidents()
  const target = incidents.find((incident) => incident.id === incidentId)

  if (!target) {
    return null
  }

  if (target.status === status) {
    return target
  }

  if (status === 'Dispatched' && target.status === 'Pending') {
    target.timeline.push({
      id: crypto.randomUUID(),
      label: 'Responder dispatched',
      timestamp: nowIso(),
    })
  }

  if (status === 'Resolved') {
    const hasDispatch = target.timeline.some((entry) => entry.label === 'Responder dispatched')

    if (!hasDispatch) {
      target.timeline.push({
        id: crypto.randomUUID(),
        label: 'Responder dispatched',
        timestamp: nowIso(),
      })
    }

    target.timeline.push({
      id: crypto.randomUUID(),
      label: 'Incident resolved',
      timestamp: nowIso(),
    })
  }

  target.status = status

  const ordered = incidents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  await applyLedgerHashes(ordered)
  await writeIncidents(ordered)

  return target
}

export async function verifyIncidentIntegrity(
  incidentId: string,
): Promise<{ ok: boolean; message: string }> {
  const incidents = (await readIncidents()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )

  let previous = 'GENESIS'

  for (const incident of incidents) {
    const computedChainHash = await sha256Hex(
      `${incident.id}|${incident.timestamp}|${incident.description}`,
    )
    const computedLedgerHash = await sha256Hex(
      `${previous}|${computedChainHash}|${incident.status}|${incident.aiClassification.severity}`,
    )

    const thisIncident = incident.id === incidentId

    if (thisIncident && computedChainHash !== incident.chainHash) {
      return { ok: false, message: 'Integrity compromised: report payload hash mismatch.' }
    }

    if (thisIncident && computedLedgerHash !== incident.ledgerHash) {
      return { ok: false, message: 'Integrity compromised: ledger chain mismatch.' }
    }

    if (incident.ledgerHash !== computedLedgerHash) {
      previous = computedLedgerHash
    } else {
      previous = incident.ledgerHash
    }
  }

  return { ok: true, message: 'Hash verified. Data not tampered.' }
}

export function subscribeToIncidentUpdates(callback: () => void): () => void {
  const adapter = getIncidentAdapter()
  const unsubscribe = adapter.subscribe(callback)

  return () => {
    unsubscribe()
  }
}
