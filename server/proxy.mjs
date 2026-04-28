import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()

const app = express()
const PORT = Number(process.env.PROXY_PORT ?? 8787)

const SYSTEM_PROMPT =
  "You are an emergency incident classifier. Analyze the following emergency report and return ONLY a JSON object with these fields: { severity: 'Critical' | 'High' | 'Medium' | 'Low', type: string, isFakeRisk: number (0-100, probability this is a false alert), summary: string (1 sentence), recommendedAction: string, confidenceScore: number (0-100) }"

app.use(cors())
app.use(express.json())

function parseJsonPayload(text) {
  try {
    return JSON.parse(text)
  } catch {
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')

    if (start < 0 || end <= start) {
      return null
    }

    try {
      return JSON.parse(text.slice(start, end + 1))
    } catch {
      return null
    }
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/classify', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return res.status(503).json({ error: 'Anthropic API key is not configured on the proxy.' })
  }

  const { description, incidentType } = req.body ?? {}

  if (!description || !incidentType) {
    return res.status(400).json({ error: 'description and incidentType are required.' })
  }

  try {
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
      return res.status(response.status).json({ error: `Anthropic API failed with ${response.status}.` })
    }

    const payload = await response.json()
    const text = payload.content?.find((part) => part.type === 'text')?.text

    if (!text) {
      return res.status(502).json({ error: 'Proxy received empty classification response.' })
    }

    const parsed = parseJsonPayload(text)

    if (!parsed) {
      return res.status(502).json({ error: 'Proxy failed to parse classification JSON.' })
    }

    return res.json(parsed)
  } catch {
    return res.status(500).json({ error: 'Proxy classification request failed.' })
  }
})

app.listen(PORT, () => {
  console.log(`CrisisChain proxy listening on http://localhost:${PORT}`)
})
