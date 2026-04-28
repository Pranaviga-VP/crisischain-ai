import type { AIClassification, IncidentType, Severity } from '../types'

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function inferSeverity(description: string, incidentType: IncidentType): Severity {
  const text = description.toLowerCase()

  if (
    incidentType === 'Medical Emergency' ||
    text.includes('unconscious') ||
    text.includes('severe bleeding') ||
    text.includes('collapsed')
  ) {
    return 'Critical'
  }

  if (
    incidentType === 'Fire' ||
    text.includes('fire') ||
    text.includes('explosion') ||
    text.includes('riot')
  ) {
    return 'High'
  }

  if (incidentType === 'Natural Disaster' || text.includes('flood') || text.includes('storm')) {
    return 'High'
  }

  if (text.includes('minor') || text.includes('small')) {
    return 'Low'
  }

  return 'Medium'
}

export function getMockClassification(
  description: string,
  incidentType: IncidentType,
): AIClassification {
  const severity = inferSeverity(description, incidentType)
  const text = description.toLowerCase()

  const fakeRisk = clampScore(
    18 +
      (text.includes('viral') ? 25 : 0) +
      (text.includes('heard') ? 20 : 0) +
      (text.includes('not sure') ? 18 : 0),
  )

  const baseConfidence =
    severity === 'Critical' ? 89 : severity === 'High' ? 82 : severity === 'Medium' ? 74 : 67

  return {
    severity,
    type: incidentType,
    isFakeRisk: fakeRisk,
    summary: `Reported ${incidentType.toLowerCase()} near ${text.includes('hospital') ? 'a medical zone' : 'a populated area'} requiring review.`,
    recommendedAction:
      severity === 'Critical'
        ? 'Dispatch nearest emergency response unit immediately and coordinate with local authorities.'
        : severity === 'High'
          ? 'Initiate rapid field verification and keep response units on standby for escalation.'
          : severity === 'Medium'
            ? 'Assign responder for on-ground verification and monitor updates from nearby reports.'
            : 'Queue for verification and notify local ward-level response team if corroborated.',
    confidenceScore: clampScore(baseConfidence - Math.floor(fakeRisk / 5)),
  }
}
