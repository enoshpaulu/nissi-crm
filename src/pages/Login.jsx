import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, ShieldCheck } from 'lucide-react'

export default function Login() {
  const { user, signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signIn(email, password)

    if (error) {
      setError(error.message)
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-5 py-12">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-emerald-100/60 blur-3xl" />
        <div className="absolute top-24 right-8 h-80 w-80 rounded-full bg-indigo-100/60 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-72 w-72 rounded-full bg-amber-100/50 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white via-white to-gray-50" />
      </div>

      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-gray-200/70 bg-white/80 backdrop-blur shadow-xl ring-1 ring-gray-100 overflow-hidden">
          {/* Top bar */}
          <div className="px-8 sm:px-10 pt-8">
            <div className="flex items-center justify-between">
              <div className="text-xs uppercase tracking-wider text-gray-500">Nissi Office Systems</div>
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 bg-emerald-50 text-emerald-700 ring-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                Secure
              </span>
            </div>

            <h1 className="mt-3 text-3xl sm:text-4xl font-semibold tracking-tight text-gray-900">
              Nissi CRM
            </h1>
            <p className="mt-2 text-sm sm:text-base text-gray-600">
              Secure access for internal ERP operations
            </p>
          </div>

          <div className="px-8 sm:px-10 pb-8 pt-6">
            {/* Error Message */}
            {error && (
              <div className="mb-5 rounded-2xl border border-rose-200/70 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm ring-1 ring-rose-100">
                {error}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 transition focus:outline-none focus:ring-4 focus:ring-emerald-100 focus:border-emerald-400"
                  placeholder="********"
                  required
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white px-4 py-3 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-4 focus:ring-emerald-200"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white mr-2" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </span>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-7 text-center text-xs text-gray-500">
              <p>Authorized personnel only. Activity is monitored.</p>
            </div>
          </div>
        </div>

        {/* Sub footer */}
        <div className="mt-4 text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} Nissi Systems • Internal Use Only
        </div>
      </div>
    </div>
  )
}
