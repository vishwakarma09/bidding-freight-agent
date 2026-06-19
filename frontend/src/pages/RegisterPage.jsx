import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { Zap, ArrowRight, User, Mail, Lock } from 'lucide-react'

const RegisterPage = () => {
  const { register, setSelectedTab } = useApp()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (name && email && password) {
      setLoading(true)
      setError('')
      try {
        await register(name, email, password)
        setIsSubmitted(true)
      } catch (err) {
        setError(err.response?.data?.detail || "Registration failed. Please try again.")
      } finally {
        setLoading(false)
      }
    }
  }

  return (
    <div className="min-h-screen text-on-surface bg-background mesh-gradient relative flex flex-col justify-between">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      {/* Navigation Header */}
      <nav className="w-full border-b border-white/5 bg-surface/80 backdrop-blur-xl relative z-50">
        <div className="flex justify-between items-center h-20 px-8 max-w-7xl mx-auto">
          <div 
            onClick={() => setSelectedTab('landing')}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
              <Zap className="text-primary" size={20} />
            </div>
            <div>
              <span className="font-bold text-xl text-primary tracking-tight">Dispatch</span>
              <p className="text-[9px] uppercase tracking-widest text-secondary font-bold -mt-0.5">Enterprise Logistics</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button 
              onClick={() => setSelectedTab('landing')}
              className="text-sm font-medium text-on-surface-variant hover:text-primary transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </nav>

      {/* Register Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10 my-12">
        <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden border border-white/10 bg-surface-container-low/40 backdrop-blur-xl p-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none"></div>

          {isSubmitted ? (
            <div className="text-center py-4 relative z-10">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center border border-primary/20 mx-auto mb-6">
                <Mail className="text-primary" size={28} />
              </div>
              <h3 className="text-xl font-bold text-on-surface mb-3">Check your email</h3>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
                We've sent an activation link to <strong className="text-on-surface">{email}</strong>. 
                Please click the link in the email to activate your account.
              </p>
              
              <div className="bg-white/5 p-4 rounded-xl mb-8 border border-white/5 text-left">
                <p className="text-xs font-semibold text-primary mb-1">Local Development Tip:</p>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Open <strong>Mailpit</strong> at <a href="http://localhost:18025" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-bold">localhost:18025</a> to view the simulated activation email and click the activation button.
                </p>
              </div>

              <button
                onClick={() => setSelectedTab('login')}
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-on-surface">Create Account</h2>
                <p className="text-sm text-on-surface-variant mt-2">Deploy your autonomous freight quote & bidding engine.</p>
              </div>

              {error && (
                <div className="mb-6 p-3 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 text-xs text-center">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">Full Name</label>
                  <div className="relative flex items-center">
                    <User className="absolute left-4 text-on-surface-variant/40" size={18} />
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe" 
                      className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">Email Address</label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-4 text-on-surface-variant/40" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com" 
                      className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">Password</label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-4 text-on-surface-variant/40" size={18} />
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••" 
                      className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? "Registering..." : "Access Terminal"} <ArrowRight size={16} />
                </button>
              </form>

              <div className="mt-8 text-center text-sm text-on-surface-variant">
                Already have an account?{' '}
                <button 
                  onClick={() => setSelectedTab('login')}
                  className="text-primary hover:underline font-semibold"
                >
                  Sign in
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-on-surface-variant/50 border-t border-white/5 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Dispatch Inc. All rights reserved. AES-256 encrypted bidding channel.
      </footer>
    </div>
  )
}

export default RegisterPage
