import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ParticleCanvas } from '@/components/auth/ParticleCanvas'

const LoginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria'),
})

type LoginValues = z.infer<typeof LoginSchema>

export function LoginPage() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
  })

  if (loading) return null
  if (user) return <Navigate to="/collaboratori" replace />

  async function onSubmit(values: LoginValues) {
    setAuthError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })
    if (error) {
      setAuthError('Credenziali non valide. Riprova.')
    } else {
      navigate('/collaboratori', { replace: true })
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — particle portrait */}
      <div className="hidden lg:block flex-1 relative" style={{ background: '#060610' }}>
        <ParticleCanvas />
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 lg:w-[480px] lg:flex-none flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-[0_8px_40px_rgba(15,23,42,0.14)] p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold text-gray-900 tracking-tight">LATAM Manager</p>
              <p className="text-[10px] text-gray-400 font-medium">HR & OKR Platform</p>
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-1">Accedi</h1>
          <p className="text-sm text-gray-500 mb-6">Inserisci le tue credenziali per continuare.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="nome@azienda.com" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" {...register('password')} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {authError && (
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {authError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Accesso in corso…' : 'Accedi'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
