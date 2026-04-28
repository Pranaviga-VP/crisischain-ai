import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-teal-400/50 bg-teal-500/10 px-4 py-1 text-xs font-bold uppercase tracking-[0.2em] text-teal-200">
            Rapid Crisis Response
          </p>
          <h1 className="font-display text-4xl font-extrabold leading-tight text-white sm:text-5xl lg:text-6xl">
            Verify. Relay. Respond.
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
            CrisisChain routes citizen reports through AI triage and a cryptographic audit layer so responders can act fast with trustworthy incident intelligence.
          </p>
          <p className="max-w-xl text-base leading-relaxed text-slate-300">
            Built for high-pressure operations where transparency and speed are equally critical.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/report"
              className="rounded-full bg-teal-500 px-6 py-3 text-sm font-bold uppercase tracking-wide text-slate-950 transition hover:bg-teal-400"
            >
              Report an Incident
            </Link>
            <Link
              to="/dashboard"
              className="rounded-full border border-white/30 px-6 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:border-white hover:bg-white/10"
            >
              Responder Login
            </Link>
          </div>
        </div>

        <div className="relative">
          <div className="absolute inset-0 -z-10 rounded-3xl bg-gradient-to-br from-teal-400/30 via-cyan-300/10 to-red-500/20 blur-2xl" />
          <div className="grid gap-4 rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-2xl backdrop-blur">
            <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4">
              <p className="text-xs uppercase tracking-widest text-red-200">Critical Relay</p>
              <p className="mt-2 text-sm text-slate-100">AI triage marks severity in seconds and routes urgent cases to the top of the queue.</p>
            </div>
            <div className="rounded-2xl border border-teal-400/30 bg-teal-500/10 p-4">
              <p className="text-xs uppercase tracking-widest text-teal-200">Chain Replay</p>
              <p className="mt-2 text-sm text-slate-100">Every report is hash-linked to preserve verifiable incident custody across dispatch operations.</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-slate-800/70 p-4">
              <p className="text-xs uppercase tracking-widest text-slate-300">Live Mission Pulse</p>
              <p className="mt-2 text-sm text-slate-100">Responders monitor confidence, fake-risk alerts, and resolution velocity from one control center.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
