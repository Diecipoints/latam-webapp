import { NavLink, Outlet } from 'react-router-dom'
import { Users, Target, BarChart3, Settings, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Toaster } from 'sonner'

const navItems = [
  { to: '/collaboratori', label: 'Collaboratori', icon: Users },
  { to: '/obiettivi', label: 'Obiettivi', icon: Target },
  { to: '/risultati', label: 'Risultati', icon: BarChart3 },
  { to: '/impostazioni', label: 'Impostazioni', icon: Settings },
]

export function AppLayout() {
  return (
    <div className="min-h-screen px-10 py-10">
      {/* Floating app shell — centered so the outer gradient is visible */}
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-[1440px] rounded-[28px] overflow-hidden bg-[#EAEDF5] shadow-[0_10px_50px_rgba(15,23,42,0.18)]">

        {/* Sidebar — white card, floats with margin so gray shell shows around it */}
        <aside className="m-5 flex w-72 flex-col bg-white rounded-2xl shadow-[0_6px_22px_rgba(15,23,42,0.10)] shrink-0 overflow-hidden">
          {/* Logo */}
          <div className="flex h-16 items-center gap-3 px-6 border-b border-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shrink-0">
              <Building2 className="h-4 w-4 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900 tracking-tight">LATAM Manager</p>
              <p className="text-[10px] text-gray-400 font-medium">HR & OKR Platform</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-2">
              Menu
            </p>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-gray-500 hover:bg-slate-50 hover:text-gray-800'
                  )
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Content area — inherits shell's gray, pages render their own white cards */}
        <main className="m-5 flex-1 overflow-y-auto min-w-0 rounded-2xl">
          <div className="min-h-full w-full rounded-2xl p-8">
            <Outlet />
          </div>
        </main>
      </div>

      <Toaster richColors position="top-right" />
    </div>
  )
}
