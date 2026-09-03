import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { KeyRound, Mail, Loader2, BarChart2 } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      // In django-ninja-jwt Default Controller: path is /token/pair
      const response = await apiClient.post('/token/pair', {
        username: email, // django-ninja-jwt default controller uses username field
        password: password
      })

      localStorage.setItem('access_token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)

      // Fetch user profile data
      const userResponse = await apiClient.get('/accounts/me')
      localStorage.setItem('current_user', JSON.stringify(userResponse.data))

      navigate('/dashboard')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Invalid email or password.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-900 px-4">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900/0 to-zinc-900 pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-2xl shadow-2xl relative">
        <div className="flex flex-col items-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3">
            <BarChart2 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Mintana CRM</h2>
          <p className="text-zinc-400 text-sm mt-1">Sign in to manage sales pipelines</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-600"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                Password
              </label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-3 h-4.5 w-4.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-600"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-zinc-500">
          New to Mintana?{' '}
          <Link to="/signup" className="text-indigo-400 hover:underline">
            Create an organization
          </Link>
        </div>
      </div>
    </div>
  )
}
