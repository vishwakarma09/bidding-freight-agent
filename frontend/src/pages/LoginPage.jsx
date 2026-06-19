import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Zap, ArrowRight, Mail, Lock } from 'lucide-react'

const LoginPage = () => {
  const { login, loginWithGoogle, setSelectedTab } = useApp()
  const [email, setEmail] = useState('broker@dispatch.owera.ca')
  const [password, setPassword] = useState('password123')
  const [error, setError] = useState('')

  const handleGoogleResponse = async (response) => {
    try {
      setError('')
      await loginWithGoogle(response.credential)
    } catch (err) {
      console.error("Google login failed:", err)
      setError(err.response?.data?.detail || "Google Sign-In failed")
    }
  }

  useEffect(() => {
    // Load Google Identity script
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    document.body.appendChild(script)

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || "",

          callback: handleGoogleResponse,
        })
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "100%" }
        )
      }
    }

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script)
      }
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (email && password) {
      try {
        setError('')
        await login(email, password)
      } catch (err) {
        setError(err.response?.data?.detail || "Invalid email or password")
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
              <span className="font-bold text-xl text-primary tracking-tight">CargoFlux</span>
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

      {/* Login Container */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10 my-12">
        <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden border border-white/10 bg-surface-container-low/40 backdrop-blur-xl p-8 relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-[50px] rounded-full pointer-events-none"></div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-on-surface">Welcome Back</h2>
            <p className="text-sm text-on-surface-variant mt-2">Sign in to access your freight operations control terminal.</p>
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/15 text-red-400 border border-red-500/20 text-xs text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

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
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase font-bold tracking-wider text-on-surface-variant">Password</label>
                <button type="button" className="text-xs font-semibold text-primary hover:underline">Forgot password?</button>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-4 text-on-surface-variant/40" size={18} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  className="w-full bg-surface border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center justify-center gap-2"
            >
              Access Terminal <ArrowRight size={16} />
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-surface-container-low px-2 text-on-surface-variant/60 font-bold">Or continue with</span>
            </div>
          </div>

          {/* Google Sign-In Button Container */}
          <div className="flex justify-center w-full mb-6">
            <div id="google-signin-btn" className="w-full max-w-[320px] min-h-[40px] flex justify-center"></div>
          </div>

          <div className="mt-8 text-center text-sm text-on-surface-variant">

            Don't have an account?{' '}
            <button 
              onClick={() => setSelectedTab('register')}
              className="text-primary hover:underline font-semibold"
            >
              Register now
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-on-surface-variant/50 border-t border-white/5 max-w-7xl mx-auto w-full">
        &copy; {new Date().getFullYear()} Dispatch Inc. All rights reserved. AES-256 encrypted bidding channel.
      </footer>
    </div>
  )
}

export default LoginPage
