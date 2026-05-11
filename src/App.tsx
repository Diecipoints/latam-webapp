import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { RequireAuth } from '@/components/auth/RequireAuth'
import { AuthProvider } from '@/lib/auth-context'
import { LoginPage } from '@/pages/auth/LoginPage'
import { RegionPage } from '@/pages/impostazioni/RegionPage'
import { PaesiPage } from '@/pages/impostazioni/PaesiPage'
import { TipiCollaboratorePage } from '@/pages/impostazioni/TipiCollaboratorePage'
import { PeriodPage } from '@/pages/impostazioni/PeriodPage'
import { TemplateObiettiviPage } from '@/pages/impostazioni/TemplateObiettiviPage'
import { CollaboratoriPage } from '@/pages/collaboratori/CollaboratoriPage'
import { CollaboratoreDetailPage } from '@/pages/collaboratori/CollaboratoreDetailPage'
import { ObiettiviPage } from '@/pages/obiettivi/ObiettiviPage'
import { ObiettivoDetailPage } from '@/pages/obiettivi/ObiettivoDetailPage'
import { RisultatiPage } from '@/pages/risultati/RisultatiPage'
import { cn } from '@/lib/utils'

const impostazioniLinks = [
  { to: '/impostazioni/regioni', label: 'Regioni' },
  { to: '/impostazioni/paesi', label: 'Paesi' },
  { to: '/impostazioni/tipi-collaboratore', label: 'Tipi Collaboratore' },
  { to: '/impostazioni/periodi', label: 'Periodi' },
  { to: '/impostazioni/template-obiettivi', label: 'Template Obiettivi' },
]

function ImpostazioniLayout() {
  return (
    <div className="flex flex-col min-h-full">
      <div className="pb-0">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Impostazioni</h1>
        <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.07)] px-4 pt-3 pb-0">
          <nav className="flex gap-0 border-b border-slate-100">
            {impostazioniLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected */}
          <Route element={<RequireAuth />}>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/collaboratori" replace />} />
              <Route path="/collaboratori" element={<CollaboratoriPage />} />
              <Route path="/collaboratori/:id" element={<CollaboratoreDetailPage />} />
              <Route path="/obiettivi" element={<ObiettiviPage />} />
              <Route path="/obiettivi/:id" element={<ObiettivoDetailPage />} />
              <Route path="/risultati" element={<RisultatiPage />} />
              <Route path="/impostazioni" element={<ImpostazioniLayout />}>
                <Route index element={<Navigate to="/impostazioni/regioni" replace />} />
                <Route path="regioni" element={<RegionPage />} />
                <Route path="paesi" element={<PaesiPage />} />
                <Route path="tipi-collaboratore" element={<TipiCollaboratorePage />} />
                <Route path="periodi" element={<PeriodPage />} />
                <Route path="template-obiettivi" element={<TemplateObiettiviPage />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
