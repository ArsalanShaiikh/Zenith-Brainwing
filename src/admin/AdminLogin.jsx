import { useState } from 'react'
import { supabase } from '../lib/supabase'

const AdminLogin = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-[#050505] text-white flex items-center justify-center px-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.045),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent_0%,#050505_100%)]" />
      </div>

      {/* Login Card */}
      <div className="relative w-full max-w-[460px]">
        {/* Brand */}
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.45em] uppercase text-white/40 mb-5">
            Zenith
          </p>

          <h1 className="text-3xl md:text-4xl font-light tracking-[-0.03em]">
            Analytics
          </h1>

          <div className="mt-4 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b91c1c]" />

            <span className="text-[10px] uppercase tracking-[0.3em] text-white/35">
              Administrator Access
            </span>
          </div>
        </div>

        {/* Card */}
        <div className="border border-white/[0.09] bg-white/[0.025] backdrop-blur-xl p-7 md:p-9">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="admin-email"
                className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3"
              >
                Email
              </label>

              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                autoComplete="email"
                required
                className="w-full h-12 px-4 bg-white/[0.035] border border-white/[0.1] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-white/30"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="admin-password"
                className="block text-[10px] uppercase tracking-[0.25em] text-white/40 mb-3"
              >
                Password
              </label>

              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="w-full h-12 px-4 bg-white/[0.035] border border-white/[0.1] text-sm text-white placeholder:text-white/20 outline-none transition-all duration-300 focus:border-white/30"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
                <p className="text-xs text-red-300/80">
                  {error}
                </p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="group w-full h-12 bg-white text-black text-[10px] uppercase tracking-[0.28em] font-medium transition-all duration-300 hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              {loading ? (
                'Signing in...'
              ) : (
                <>
                  Sign In
                  <span className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-white/[0.07]">
            <p className="text-center text-[9px] uppercase tracking-[0.22em] text-white/20">
              Secure administrator access
            </p>
          </div>
        </div>

        {/* Bottom */}
        <p className="text-center mt-7 text-[9px] uppercase tracking-[0.25em] text-white/15">
          Runwal Zenith · Thane
        </p>
      </div>
    </main>
  )
}

export default AdminLogin