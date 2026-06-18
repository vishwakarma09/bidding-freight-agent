import React from 'react'
import { useApp } from '../context/AppContext'
import { Check, ArrowRight, Zap } from 'lucide-react'

const PricingPage = () => {
  const { isAuthenticated, setSelectedTab, logout } = useApp()

  const plans = [
    {
      name: 'Starter',
      price: '$0',
      description: 'Ideal for small operations testing out automation pipelines.',
      features: [
        '50 AI-extracted quotes / month',
        'Standard 2-minute carrier bidding rounds',
        'Email channel connector',
        'Basic Pipeline dashboard access',
        'AES-256 encrypted bidding'
      ],
      cta: 'Get Started Free',
      action: () => setSelectedTab(isAuthenticated ? 'dashboard' : 'register'),
      popular: false
    },
    {
      name: 'Professional',
      price: '$499',
      description: 'Built for scaling brokerages requiring rapid turnarounds.',
      features: [
        'Unlimited quotes & bids ingestion',
        'Dynamic multi-round carrier re-bid engine',
        'Email, SMS, & WhatsApp connectors',
        'pgvector historical RAG lane benchmarking',
        'Recharts analytics hub & invoice ledger',
        'Priority email & chat support'
      ],
      cta: 'Upgrade to Pro',
      action: () => setSelectedTab(isAuthenticated ? 'dashboard' : 'register'),
      popular: true
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'Tailored for large freight forwarding and 3PL networks.',
      features: [
        'Dedicated Cerebras LLM models & custom prompts',
        'ERP & TMS system custom integrations',
        'Custom customer markup engine rules',
        'SLA-backed uptime guarantees',
        'Dedicated account engineer',
        'Custom invoice & BOL generation'
      ],
      cta: 'Contact Sales',
      action: () => setSelectedTab(isAuthenticated ? 'dashboard' : 'register'),
      popular: false
    }
  ]

  return (
    <div className="min-h-screen text-on-surface bg-background mesh-gradient relative">
      <div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none"></div>

      {/* Navigation Header */}
      <nav className="sticky top-0 w-full z-50 border-b border-white/5 bg-surface/80 backdrop-blur-xl transition-all duration-300">
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
              className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
            >
              Home
            </button>
            <button 
              onClick={() => setSelectedTab('pricing')}
              className="text-sm font-medium text-primary transition-colors"
            >
              Pricing
            </button>
            
            <div className="h-4 w-[1px] bg-white/10 mx-2"></div>
            
            {isAuthenticated ? (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTab('dashboard')}
                  className="px-5 py-2 rounded-lg bg-primary text-on-primary font-semibold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center gap-2"
                >
                  Dashboard <ArrowRight size={14} />
                </button>
                <button
                  onClick={logout}
                  className="text-sm font-medium text-on-surface-variant hover:text-error transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedTab('login')}
                  className="text-sm font-medium text-on-surface hover:text-primary transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => setSelectedTab('register')}
                  className="px-5 py-2 rounded-lg bg-primary-container/20 border border-primary/30 text-primary font-semibold text-sm hover:bg-primary-container/40 active:scale-95 transition-all"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Pricing Header */}
      <section className="pt-20 pb-16 px-8 max-w-7xl mx-auto text-center relative z-10">
        <span className="text-primary font-semibold text-xs uppercase tracking-widest block mb-4">Pricing & Plans</span>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-on-surface">
          Predictable Pricing for <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">Modern Logistics</span>
        </h1>
        <p className="mt-6 text-base text-on-surface-variant max-w-2xl mx-auto leading-relaxed">
          Scale your freight brokerage operations with transparent, value-based plans designed for precision and speed.
        </p>
      </section>

      {/* Plans Bento Grid */}
      <section className="pb-24 px-8 max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {plans.map((plan, i) => (
          <div 
            key={i} 
            className={`glass-card rounded-2xl p-8 border flex flex-col justify-between transition-all duration-300 relative ${
              plan.popular 
                ? 'border-primary bg-surface-container-high/40 neon-glow-primary scale-[1.02] z-20' 
                : 'border-white/5 bg-surface-container-low/30 hover:border-white/20'
            }`}
          >
            {plan.popular && (
              <span className="absolute top-4 right-4 bg-primary text-on-primary text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full">
                Most Popular
              </span>
            )}
            <div>
              <h3 className="text-xl font-bold text-on-surface mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-on-surface">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-xs text-on-surface-variant">/month</span>}
              </div>
              <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">{plan.description}</p>
              
              <div className="h-[1px] bg-white/5 w-full mb-6"></div>
              
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <Check className="text-secondary shrink-0 mt-0.5" size={16} />
                    <span className="text-sm text-on-surface-variant leading-tight">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <button
              onClick={plan.action}
              className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-150 ${
                plan.popular 
                  ? 'bg-primary text-on-primary hover:brightness-110' 
                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20'
              }`}
            >
              {plan.cta}
            </button>
          </div>
        ))}
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-xs text-on-surface-variant/50 border-t border-white/5 max-w-7xl mx-auto">
        &copy; {new Date().getFullYear()} Dispatch Inc. All rights reserved. AES-256 encrypted bidding channel.
      </footer>
    </div>
  )
}

export default PricingPage
