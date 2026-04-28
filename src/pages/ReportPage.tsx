import { useMemo, useState } from 'react'
import type { ChangeEvent, FormEvent } from 'react'
import { classifyIncident } from '../lib/ai'
import { addIncident } from '../lib/store'
import { severityBadgeClass } from '../lib/ui'
import type { IncidentRecord, IncidentType } from '../types'

const incidentTypes: IncidentType[] = [
  'Fire',
  'Medical Emergency',
  'Civil Unrest',
  'Natural Disaster',
  'Other',
]

export function ReportPage() {
  const [incidentType, setIncidentType] = useState<IncidentType>('Fire')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [submitterName, setSubmitterName] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFetchingLocation, setIsFetchingLocation] = useState(false)
  const [locationMode, setLocationMode] = useState<'manual' | 'geo'>('manual')
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<IncidentRecord | null>(null)

  const canSubmit = useMemo(
    () => description.trim().length >= 10 && location.trim().length > 0 && !isSubmitting,
    [description, location, isSubmitting],
  )

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      setImageDataUrl(undefined)
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setImageDataUrl(String(reader.result ?? ''))
    }
    reader.readAsDataURL(file)
  }

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationMode('manual')
      setError('Geolocation is not supported in this browser. Please enter your city or area manually.')
      return
    }

    setIsFetchingLocation(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setIsFetchingLocation(false)
        setLocationMode('geo')
        setLocation(`${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`)
      },
      (geolocationError) => {
        setIsFetchingLocation(false)
        setLocationMode('manual')

        if (geolocationError.code === geolocationError.PERMISSION_DENIED) {
          setError('Location permission was denied. Please enter your city or area manually.')
          return
        }

        if (geolocationError.code === geolocationError.POSITION_UNAVAILABLE) {
          setError('Your location could not be determined. Please enter your city or area manually.')
          return
        }

        if (geolocationError.code === geolocationError.TIMEOUT) {
          setError('Location request timed out. Please enter your city or area manually.')
          return
        }

        setError('Unable to fetch your location. Please enter your city or area manually.')
      },
      { enableHighAccuracy: false, timeout: 20000, maximumAge: 0 },
    )
  }

  const submitReport = async (event: FormEvent) => {
    event.preventDefault()

    if (!canSubmit) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const aiClassification = await classifyIncident(description.trim(), incidentType)
      const incident = await addIncident({
        incidentType,
        description: description.trim(),
        location: location.trim(),
        submitterName: submitterName.trim() || undefined,
        imageDataUrl,
        aiClassification,
      })

      setSubmitted(incident)
      setDescription('')
      setLocation('')
      setSubmitterName('')
      setImageDataUrl(undefined)
    } catch {
      setError('Unable to submit report right now. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="animate-fade-in rounded-3xl border border-white/10 bg-slate-900/80 p-8 text-center shadow-2xl">
          <h1 className="font-display text-3xl font-bold text-white">Report Confirmed</h1>
          <p className="mt-3 text-slate-200">Your report has been submitted and verified.</p>
          <div className="mt-6 space-y-3 text-left">
            <p className="rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-slate-100">
              Report ID: <span className="font-mono text-teal-200">{submitted.id}</span>
            </p>
            <p className="rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-slate-100">
              Severity:{' '}
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityBadgeClass[submitted.aiClassification.severity]}`}
              >
                {submitted.aiClassification.severity}
              </span>
            </p>
          </div>
          <button
            type="button"
            className="mt-8 rounded-full bg-teal-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-teal-400"
            onClick={() => setSubmitted(null)}
          >
            Submit Another Report
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-slate-900/75 p-6 shadow-2xl sm:p-8">
        <h1 className="font-display text-3xl font-bold text-white">Citizen Incident Report</h1>
        <p className="mt-2 text-sm text-slate-300">
          Share emergency details so responders can triage and act quickly.
        </p>

        <form className="mt-6 grid gap-5" onSubmit={submitReport}>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-100">Incident Type</span>
            <select
              className="rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-teal-400 focus:ring"
              value={incidentType}
              onChange={(event) => setIncidentType(event.target.value as IncidentType)}
            >
              {incidentTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-100">Description</span>
            <textarea
              className="min-h-32 rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-teal-400 focus:ring"
              placeholder="Describe what happened, how many people are affected, and immediate hazards."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <label className="grid gap-2">
              <span className="text-sm font-semibold text-slate-100">Location</span>
              <input
                className="rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-teal-400 focus:ring"
                placeholder="City / area / landmark"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                required
              />
              <p className="text-xs text-slate-400">
                {locationMode === 'geo'
                  ? 'Using browser location coordinates.'
                  : 'You can enter the city or area manually.'}
              </p>
            </label>
            <button
              type="button"
              disabled={isFetchingLocation}
              className="inline-flex items-center justify-center rounded-xl border border-teal-400/60 px-4 py-3 text-sm font-semibold text-teal-200 transition hover:bg-teal-500/15 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={detectLocation}
            >
              {isFetchingLocation ? 'Fetching location...' : 'Use Current Location'}
            </button>
          </div>

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-100">Upload Image (optional)</span>
            <input
              className="rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-slate-200"
              type="file"
              accept="image/*"
              onChange={onFileChange}
            />
          </label>

          {imageDataUrl && (
            <img
              src={imageDataUrl}
              alt="Incident preview"
              className="max-h-52 w-full rounded-2xl border border-white/10 object-cover"
            />
          )}

          <label className="grid gap-2">
            <span className="text-sm font-semibold text-slate-100">Submitter Name (optional)</span>
            <input
              className="rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-teal-400 focus:ring"
              placeholder="Leave blank for anonymous"
              value={submitterName}
              onChange={(event) => setSubmitterName(event.target.value)}
            />
          </label>

          {error && <p className="rounded-xl bg-red-500/20 px-3 py-2 text-sm text-red-200">{error}</p>}

          <button
            type="submit"
            disabled={!canSubmit}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition enabled:hover:bg-teal-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />}
            {isSubmitting ? 'Processing with AI...' : 'Submit Report'}
          </button>
        </form>
      </section>
    </main>
  )
}
