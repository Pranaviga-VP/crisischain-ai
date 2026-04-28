import { useEffect, useMemo, useState } from 'react'
import { formatDateTime, timeAgo } from '../lib/format'
import {
  getIncidents,
  initializeStore,
  subscribeToIncidentUpdates,
  updateIncidentStatus,
} from '../lib/store'
import { incidentTypeIcon, severityBadgeClass, statusBadgeClass } from '../lib/ui'
import TrustBar from '../components/TrustBar'
import type { IncidentRecord } from '../types'

const AUTH_KEY = 'crisischain/dashboard-auth'

interface MetricCardProps {
  label: string
  value: string
  tone?: 'teal' | 'red' | 'neutral'
}

function MetricCard({ label, value, tone = 'neutral' }: MetricCardProps) {
  const className =
    tone === 'teal'
      ? 'border-teal-400/30 bg-teal-500/10'
      : tone === 'red'
        ? 'border-red-400/30 bg-red-500/10'
        : 'border-white/15 bg-slate-900/80'

  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs uppercase tracking-widest text-slate-300">{label}</p>
      <p className="mt-2 font-display text-2xl font-bold text-white">{value}</p>
    </article>
  )
}

export function DashboardPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem(AUTH_KEY) === 'true',
  )
  const [clock, setClock] = useState(() => new Date())

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!isAuthenticated) {
      return
    }

    const load = async () => {
      await initializeStore()
      const data = await getIncidents()
      setIncidents(data)
      if (!selectedId && data.length > 0) {
        setSelectedId(data[0].id)
      }
    }

    void load()

    const unsubscribe = subscribeToIncidentUpdates(() => {
      void getIncidents().then((fresh) => setIncidents(fresh))
    })

    return unsubscribe
  }, [isAuthenticated, selectedId])

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedId) ?? incidents[0],
    [incidents, selectedId],
  )

  const stats = useMemo(() => {
    const today = new Date().toDateString()
    const reportsToday = incidents.filter(
      (incident) => new Date(incident.timestamp).toDateString() === today,
    ).length
    const criticalCount = incidents.filter(
      (incident) => incident.aiClassification.severity === 'Critical',
    ).length
    const resolvedCount = incidents.filter((incident) => incident.status === 'Resolved').length
    const avgConfidence =
      incidents.length > 0
        ? Math.round(
            incidents.reduce((sum, incident) => sum + incident.aiClassification.confidenceScore, 0) /
              incidents.length,
          )
        : 0

    return { reportsToday, criticalCount, resolvedCount, avgConfidence }
  }, [incidents])

  const activeIncidents = incidents.filter((incident) => incident.status !== 'Resolved').length

  const handleStatusChange = async (
    incidentId: string,
    status: 'Dispatched' | 'Resolved',
  ): Promise<void> => {
    await updateIncidentStatus(incidentId, status)
    const data = await getIncidents()
    setIncidents(data)
  }

  const handleLogin = () => {
    if (password === 'responder123') {
      setIsAuthenticated(true)
      setAuthError(null)
      sessionStorage.setItem(AUTH_KEY, 'true')
      return
    }

    setAuthError('Invalid responder password.')
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-xl items-center px-4 py-10">
        <section className="w-full rounded-3xl border border-white/15 bg-slate-900/80 p-8 shadow-2xl">
          <h1 className="font-display text-3xl font-bold text-white">Responder Access</h1>
          <p className="mt-2 text-slate-300">Enter dashboard password to access live operations.</p>
          <div className="mt-6 grid gap-4">
            <input
              className="rounded-xl border border-white/20 bg-slate-950 px-4 py-3 text-white outline-none ring-teal-400 focus:ring"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
            {authError && <p className="text-sm text-red-200">{authError}</p>}
            <button
              type="button"
              onClick={handleLogin}
              className="rounded-full bg-teal-500 px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-teal-400"
            >
              Unlock Dashboard
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-900/75 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔗</span>
          <h1 className="font-display text-xl font-bold text-white">CrisisChain Command Center</h1>
          <span className="rounded-full bg-teal-500/20 px-3 py-1 text-xs font-semibold text-teal-200">
            Active: {activeIncidents}
          </span>
        </div>
        <p className="font-mono text-sm text-slate-300">{clock.toLocaleString()}</p>
      </header>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Total Reports Today" value={String(stats.reportsToday)} tone="teal" />
        <MetricCard label="Critical Incidents" value={String(stats.criticalCount)} tone="red" />
        <MetricCard label="Avg AI Confidence" value={`${stats.avgConfidence}%`} tone="neutral" />
        <MetricCard label="Resolved Count" value={String(stats.resolvedCount)} tone="teal" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[420px_1fr]">
        <aside className="max-h-[72vh] overflow-auto rounded-2xl border border-white/10 bg-slate-900/75 p-3">
          <h2 className="mb-3 px-1 text-sm font-bold uppercase tracking-widest text-slate-300">
            Incident Queue
          </h2>
          <div className="grid gap-3">
            {incidents.map((incident) => {
              const selected = selectedIncident?.id === incident.id

              return (
                <article
                  key={incident.id}
                  className={`cursor-pointer rounded-2xl border p-4 transition ${
                    selected
                      ? 'border-teal-400/60 bg-teal-500/10'
                      : 'border-white/10 bg-slate-950/70 hover:border-white/30'
                  }`}
                  onClick={() => setSelectedId(incident.id)}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityBadgeClass[incident.aiClassification.severity]}`}
                    >
                      {incident.aiClassification.severity}
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass[incident.status]}`}>
                      {incident.status}
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-white">
                    {incidentTypeIcon[incident.incidentType]} {incident.incidentType}
                  </p>
                  <p className="mt-1 text-sm text-slate-300">{incident.location}</p>
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(incident.timestamp)}</p>
                  <div className="mt-2 flex items-center gap-3">
                    <TrustBar score={incident.aiClassification.confidenceScore} />
                    <p className="text-xs text-slate-200">Fake Risk: {incident.aiClassification.isFakeRisk}%</p>
                  </div>

                  {incident.aiClassification.isFakeRisk > 60 && (
                    <p className="mt-2 rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-200">
                      ⚠ High Fake Risk
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={incident.status !== 'Pending'}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleStatusChange(incident.id, 'Dispatched')
                      }}
                      className="rounded-lg bg-teal-500/10 border border-teal-400/30 px-3 py-1 text-xs font-semibold text-teal-200 transition enabled:hover:bg-teal-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Dispatch Unit
                    </button>
                    <button
                      type="button"
                      disabled={incident.status === 'Resolved'}
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleStatusChange(incident.id, 'Resolved')
                      }}
                      className="rounded-lg border border-emerald-400/50 px-3 py-1 text-xs font-semibold text-emerald-200 transition enabled:hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark Resolved
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </aside>

        <section className="min-h-[72vh] rounded-2xl border border-white/10 bg-slate-900/75 p-5">
          {!selectedIncident ? (
            <p className="text-slate-300">No incidents available.</p>
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityBadgeClass[selectedIncident.aiClassification.severity]}`}
                >
                  {selectedIncident.aiClassification.severity}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs ${statusBadgeClass[selectedIncident.status]}`}>
                  {selectedIncident.status}
                </span>
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">
                  {selectedIncident.incidentType}
                </span>
              </div>

              <h2 className="font-display text-2xl font-bold text-white">Incident Details</h2>
              <p className="mt-2 text-sm text-slate-300">{selectedIncident.description}</p>

              <dl className="mt-5 grid gap-4 rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-400">Location</dt>
                  <dd className="mt-1 text-sm text-white">{selectedIncident.location}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-widest text-slate-400">Reported At</dt>
                  <dd className="mt-1 text-sm text-white">{formatDateTime(selectedIncident.timestamp)}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-400">AI Summary</dt>
                  <dd className="mt-1 text-sm text-white">{selectedIncident.aiClassification.summary}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-400">Recommended Action</dt>
                  <dd className="mt-1 text-sm text-white">
                    {selectedIncident.aiClassification.recommendedAction}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-widest text-slate-400">Chain Hash</dt>
                  <dd className="mt-1 break-all font-mono text-xs text-teal-200">
                    {selectedIncident.chainHash}
                  </dd>
                </div>
              </dl>

              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">
                  Full Audit Timeline
                </h3>
                <ol className="mt-4 space-y-4 border-l border-teal-400/40 pl-4">
                  {selectedIncident.timeline.map((event) => (
                    <li key={event.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-400" />
                      <p className="text-sm font-semibold text-slate-100">{event.label}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(event.timestamp)}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </>
          )}
        </section>
      </section>
    </main>
  )
}
