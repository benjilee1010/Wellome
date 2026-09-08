import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { c, inputStyle } from '../lib/theme'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: c.bg }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-1" style={{ color: c.text }}>Wellome</h1>
          <p className="text-sm" style={{ color: c.textMuted }}>Roommate life, organised.</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: c.text }}>
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: c.textMuted }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: c.textMuted }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} placeholder="••••••••" />
            </div>
            {error && <p className="text-sm" style={{ color: c.danger }}>{error}</p>}
            <button type="submit" disabled={loading} className="w-full font-semibold rounded-lg py-2.5 text-sm disabled:opacity-50" style={{ background: c.accent, color: '#fff', border: 'none', cursor: 'pointer' }}>
              {loading ? 'Loading…' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <button onClick={() => { setIsSignUp(!isSignUp); setError('') }} className="mt-4 w-full text-sm" style={{ color: c.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  )
}
