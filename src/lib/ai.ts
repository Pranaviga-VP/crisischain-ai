import { getMockClassification } from './mockClassifier'
import type { AIClassification, IncidentType, Severity } from '../types'

const SYSTEM_PROMPT =
  "You are an emergency incident classifier. Analyze the following emergency report and return ONLY a JSON object with these fields: { severity: 'Critical' | 'High' | 'Medium' | 'Low', type: string, isFakeRisk: number (0-100, probability this is a false alert), summary: string (1 sentence), recommendedAction: string, confidenceScore: number (0-100) }"

function normalizeSeverity(value: string): Severity {
  if (value === 'Critical' || value === 'High' || value === 'Medium' || value === 'Low') {
    return value
  }

  return 'Medium'
}

function extractJson(text: string): Record<string, unknown> | null {
  const cleaned = text.trim()

  try {
    return JSON.parse(cleaned) as Record<string, unknown>
  } catch {
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')

    if (start < 0 || end <= start) {
      return null
    }

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>
    } catch {
      return null
    }
  }
}

function validateClassification(payload: Record<string, unknown>, incidentType: IncidentType): AIClassification {
  const severity = normalizeSeverity(String(payload.severity ?? 'Medium'))
  const isFakeRisk = Number(payload.isFakeRisk ?? 35)
  const confidenceScore = Number(payload.confidenceScore ?? 70)

  return {
    severity,
    type: String(payload.type ?? incidentType),
    isFakeRisk: Number.isFinite(isFakeRisk) ? Math.max(0, Math.min(100, Math.round(isFakeRisk))) : 35,
    summary: String(payload.summary ?? 'Incident submitted and queued for responder verification.'),
    recommendedAction: String(
      payload.recommendedAction ?? 'Assign nearest responder for on-ground verification and action.',
    ),
    confidenceScore: Number.isFinite(confidenceScore)
      ? Math.max(0, Math.min(100, Math.round(confidenceScore)))
      : 70,
  }
}

async function classifyViaDirectAnthropic(
  apiKey: string,
  description: string,
  incidentType: IncidentType,
): Promise<AIClassification> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 280,
      temperature: 0.2,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Incident type: ${incidentType}\nDescription: ${description}`,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`)
  }

  const data = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>
  }

  const text = data.content?.find((part) => part.type === 'text')?.text

  if (!text) {
    throw new Error('Anthropic API returned empty content')
  }

  const parsed = extractJson(text)

  if (!parsed) {
    throw new Error('Unable to parse JSON output from Anthropic')
  }

  return validateClassification(parsed, incidentType)
}

async function classifyViaProxy(
  description: string,
  incidentType: IncidentType,
): Promise<AIClassification> {
  const proxyUrl = import.meta.env.VITE_CLASSIFIER_PROXY_URL ?? '/api/classify'
  const response = await fetch(proxyUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({ description, incidentType }),
  })

  if (!response.ok) {
    throw new Error(`Proxy classification failed: ${response.status}`)
  }

  const payload = (await response.json()) as Record<string, unknown>
  return validateClassification(payload, incidentType)
}

export async function classifyIncident(
  description: string,
  incidentType: IncidentType,
): Promise<AIClassification> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  try {
    return await classifyViaProxy(description, incidentType)
  } catch {
    if (apiKey) {
      try {
        return await classifyViaDirectAnthropic(apiKey, description, incidentType)
      } catch {
        return getMockClassification(description, incidentType)
      }
    }

    return getMockClassification(description, incidentType)
  }
}
