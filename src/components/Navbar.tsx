import { NavLink } from 'react-router-dom'

const linkBase =
  'rounded-full px-4 py-2 text-sm font-semibold tracking-wide transition-colors duration-200'

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/90 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <NavLink to="/" className="group inline-flex items-center gap-2">
          <span className="text-xl">🔗</span>
          <span className="font-display text-xl font-bold tracking-wide text-white">CrisisChain</span>
        </NavLink>

        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/report"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive ? 'bg-teal-500/20 text-teal-200' : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            Report Incident
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive ? 'bg-teal-500/20 text-teal-200' : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            Responder Dashboard
          </NavLink>
          <NavLink
            to="/audit"
            className={({ isActive }) =>
              `${linkBase} ${
                isActive ? 'bg-teal-500/20 text-teal-200' : 'text-slate-200 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            Audit Log
          </NavLink>
        </div>
      </nav>
    </header>
  )
}
