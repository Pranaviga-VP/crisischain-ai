import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatDateTime } from '../lib/format'
import { getIncidents, initializeStore, verifyIncidentIntegrity } from '../lib/store'
import { incidentTypeIcon, severityBadgeClass } from '../lib/ui'
import type { IncidentRecord } from '../types'

export function AuditPage() {
  const [incidents, setIncidents] = useState<IncidentRecord[]>([])
  const [verificationResult, setVerificationResult] = useState<Record<string, { ok: boolean; message: string }>>(
    {},
  )

  useEffect(() => {
    const load = async () => {
      await initializeStore()
      const data = await getIncidents()

      const chronological = [...data].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      setIncidents(chronological)
    }

    void load()
  }, [])

  const typeData = useMemo(() => {
    const counts = incidents.reduce<Record<string, number>>((acc, incident) => {
      acc[incident.incidentType] = (acc[incident.incidentType] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [incidents])

  const severityData = useMemo(() => {
    const counts = incidents.reduce<Record<string, number>>((acc, incident) => {
      const key = incident.aiClassification.severity
      acc[key] = (acc[key] ?? 0) + 1
      return acc
    }, {})

    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [incidents])

  const runIntegrityCheck = async (incidentId: string) => {
    const result = await verifyIncidentIntegrity(incidentId)
    setVerificationResult((previous) => ({ ...previous, [incidentId]: result }))
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-[0.12em] text-teal-100">
          Every incident in this log is cryptographically hashed. Any tampering with data will invalidate the hash - providing a tamper-proof audit trail for legal and operational accountability.
        </p>
      </section>

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
          <h2 className="font-display text-xl font-bold text-white">Incident Type Breakdown</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={typeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 12 }} />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="value" fill="#1D9E75" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/75 p-4">
          <h2 className="font-display text-xl font-bold text-white">Severity Distribution</h2>
          <div className="mt-4 h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={severityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="name" stroke="#cbd5e1" tick={{ fontSize: 12 }} />
                <YAxis stroke="#cbd5e1" />
                <Tooltip />
                <Bar dataKey="value" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-4">
        {incidents.map((incident) => {
          const verify = verificationResult[incident.id]

          return (
            <article key={incident.id} className="rounded-2xl border border-white/10 bg-slate-900/75 p-5">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <h3 className="font-display text-xl font-bold text-white">
                    {incidentTypeIcon[incident.incidentType]} {incident.incidentType}
                  </h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${severityBadgeClass[incident.aiClassification.severity]}`}
                  >
                    {incident.aiClassification.severity}
                  </span>
                </div>
                <p className="text-xs text-slate-300">{incident.location}</p>
              </header>

              <ol className="space-y-4 border-l border-teal-400/40 pl-4">
                {incident.timeline.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-teal-400" />
                    <p className="text-sm font-semibold text-slate-100">{event.label}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(event.timestamp)}</p>
                  </li>
                ))}
              </ol>

              <div className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <p className="text-xs uppercase tracking-widest text-slate-400">Chain Hash</p>
                <p className="mt-1 break-all font-mono text-xs text-teal-200">{incident.chainHash}</p>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => void runIntegrityCheck(incident.id)}
                  className="rounded-full border border-teal-400/50 px-4 py-2 text-xs font-bold uppercase tracking-wide text-teal-200 transition hover:bg-teal-500/15"
                >
                  Verify Integrity
                </button>

                {verify && (
                  <p
                    className={`text-sm font-semibold ${
                      verify.ok ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {verify.ok ? '✓ Hash Verified - Data Not Tampered' : `✗ ${verify.message}`}
                  </p>
                )}
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}
