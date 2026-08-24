import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiClient } from '@/api/client'
import { Building2, Mail, KeyRound, User, Phone, Loader2, ArrowRight } from 'lucide-react'

export default function SignUp() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    org_name: '',
    org_domain: '',
    email: '',
    first_name: '',
    last_name: '',
    password: '',
    phone: '',
  })
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await apiClient.post('/accounts/signup', {
        org_name: formData.org_name,
        org_domain: formData.org_domain || undefined,
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
      })

      // Redirect to login page on success with a parameter
      navigate('/login?registered=true')
    } catch (err: any) {
      console.error(err)
      setError(err?.message || 'Failed to complete registration.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-12 flex items-center justify-center bg-[#09090b] px-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-900/0 to-[#09090b] pointer-events-none" />

      <div className="w-full max-w-lg bg-zinc-950/60 backdrop-blur-xl border border-zinc-800/80 p-8 rounded-2xl shadow-2xl z-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">Create Workspace</h2>
          <p className="text-zinc-400 text-sm mt-1">Set up your organization and admin user</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/40 border border-red-500/20 text-red-400 text-xs rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Section: Organization Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
              1. Organization Details
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Company Name *
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.org_name}
                    onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                    placeholder="Mintana Inc"
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Domain (Optional)
                </label>
                <input
                  type="text"
                  value={formData.org_domain}
                  onChange={(e) => setFormData({ ...formData, org_domain: e.target.value })}
                  placeholder="mintana.com"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                />
              </div>
            </div>
          </div>

          {/* Section: Admin User Info */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest border-b border-zinc-800 pb-2">
              2. Admin User Details
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    placeholder="John"
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                  className="w-full px-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                Work Email Address *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john.doe@company.com"
                  className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Password * (Min 8 chars)
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Phone (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-zinc-500" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+1 555-0199"
                    className="w-full pl-10 pr-4 py-2 bg-zinc-900/50 border border-zinc-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg text-sm text-zinc-200 outline-none transition-all placeholder-zinc-650"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 flex items-center justify-center py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium rounded-lg text-sm transition-all focus:outline-none cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <span className="flex items-center gap-1.5">
                Generate Workspace <ArrowRight className="h-4.5 w-4.5" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-400 hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
