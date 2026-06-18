import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { ArrowLeft, Save, Users, Mail, Award } from 'lucide-react'

const CarrierDetails = () => {
  const { carriers, editingCarrierId, setEditingCarrierId, setSelectedTab, handleSaveCarrier } = useApp()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [competitivenessScore, setCompetitivenessScore] = useState(5.0)

  useEffect(() => {
    if (editingCarrierId) {
      const carrier = carriers.find(c => c.id === editingCarrierId)
      if (carrier) {
        setName(carrier.name || '')
        setEmail(carrier.email || '')
        setCompetitivenessScore(carrier.competitiveness_score || 0.0)
      }
    } else {
      setName('')
      setEmail('')
      setCompetitivenessScore(5.0)
    }
  }, [editingCarrierId, carriers])

  const handleCancel = () => {
    setEditingCarrierId(null)
    setSelectedTab('connectors_list')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !email) return
    const payload = {
      name,
      email,
      competitiveness_score: parseFloat(competitivenessScore)
    }
    handleSaveCarrier(payload)
  }

  return (
    <div className="space-y-8 flex flex-col items-center animate-fade-in">
      {/* Header back navigation */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium active:scale-95 duration-150"
        >
          <ArrowLeft size={16} /> Back to Carriers Hub
        </button>
        <h2 className="text-xl font-bold text-on-surface">
          {editingCarrierId ? 'Carrier Configuration' : 'New Carrier Setup'}
        </h2>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-4xl glass-card rounded-2xl overflow-hidden border border-white/10 bg-surface-container-low/20 backdrop-blur-md">
        {/* Header bar */}
        <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-on-surface text-base">
              {editingCarrierId ? `Bidding Carrier ID-${editingCarrierId}` : 'Register Bidding Carrier'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Define metadata and competitiveness score for auto-bidding algorithm.</p>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Carrier Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Users size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Carrier Profile</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Carrier Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="UPS Freight"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Bidding Contact Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="carrier_ups@mailpit.local"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full"></div>

          {/* Section 2: Competitiveness Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Award size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Competitiveness Settings</h4>
            </div>
            <div className="space-y-4 max-w-md">
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Competitiveness Score (0.0 - 10.0)</label>
                  <span className="text-sm font-bold text-primary">{parseFloat(competitivenessScore).toFixed(1)}</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed mb-2">
                  Used by the simulation engine to generate bids. A higher score represents a carrier that bids more aggressively (lower prices) and is more likely to win quotes.
                </p>
                <input 
                  type="range" 
                  min="0.0" 
                  max="10.0" 
                  step="0.1"
                  value={competitivenessScore}
                  onChange={(e) => setCompetitivenessScore(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions bar */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-on-surface-variant/40">
            <span className="material-symbols-outlined text-sm">shield</span>
            <span className="text-[10px] font-mono uppercase tracking-wider">Database Synchronized</span>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl border border-white/10 text-on-surface-variant hover:text-on-surface font-bold text-xs hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center gap-2"
            >
              <Save size={14} /> Save Carrier
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default CarrierDetails
