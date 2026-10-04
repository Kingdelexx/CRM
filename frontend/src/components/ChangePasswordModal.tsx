import { useState } from 'react'
import { apiClient } from '@/api/client'
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ShieldCheck } from 'lucide-react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onSuccess: (updatedUser: any) => void
}

export default function ChangePasswordModal({ isOpen, onSuccess }: ChangePasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await apiClient.post('/accounts/change-password', {
        new_password: newPassword
      })
      onSuccess(response.data)
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to update password. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-2">
            <KeyRound className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Set Permanent Password
          </h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Your account is currently using a temporary password. For security purposes, please set your new permanent password to continue into Mintana CRM.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-semibold">
          
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              New Permanent Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 pr-10 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4" />
                  <span>Set Password & Continue</span>
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  )
}
