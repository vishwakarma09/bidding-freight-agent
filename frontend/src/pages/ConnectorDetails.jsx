import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { ArrowLeft, Save, Mail, MessageSquare, Phone, Info, User, Filter, AlertTriangle, ShieldCheck } from 'lucide-react'

const ConnectorDetails = () => {
  const { connectors, editingConnectorId, setEditingConnectorId, setSelectedTab, handleSaveConnector } = useApp()

  const [name, setName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactRole, setContactRole] = useState('')
  const [channel, setChannel] = useState('email')
  const [filteringKeywords, setFilteringKeywords] = useState('')
  const [status, setStatus] = useState('CONNECTED')

  useEffect(() => {
    if (editingConnectorId) {
      const conn = connectors.find(c => c.id === editingConnectorId)
      if (conn) {
        setName(conn.name || '')
        setCompanyName(conn.company_name || '')
        setContactEmail(conn.contact_email || '')
        setContactPhone(conn.contact_phone || '')
        setContactName(conn.contact_name || '')
        setContactRole(conn.contact_role || '')
        setChannel(conn.channel || 'email')
        setFilteringKeywords(conn.filtering_keywords || '')
        setStatus(conn.status || 'CONNECTED')
      }
    } else {
      // Clear fields for new
      setName('')
      setCompanyName('')
      setContactEmail('')
      setContactPhone('')
      setContactName('')
      setContactRole('')
      setChannel('email')
      setFilteringKeywords('LTL, pallets, weight, class, hazardous, expedited')
      setStatus('CONNECTED')
    }
  }, [editingConnectorId, connectors])

  const handleCancel = () => {
    setEditingConnectorId(null)
    setSelectedTab('connectors_list')
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name || !contactEmail) return
    const payload = {
      name,
      company_name: companyName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      contact_name: contactName,
      contact_role: contactRole,
      channel,
      filtering_keywords: filteringKeywords,
      status
    }
    handleSaveConnector(payload)
  }

  return (
    <div className="space-y-8 flex flex-col items-center">
      {/* Header back navigation */}
      <div className="w-full max-w-4xl flex items-center justify-between">
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 text-sm text-on-surface-variant hover:text-primary transition-colors font-medium active:scale-95 duration-150"
        >
          <ArrowLeft size={16} /> Back to Connectors Hub
        </button>
        <h2 className="text-xl font-bold text-on-surface">
          {editingConnectorId ? 'Connector Configuration' : 'New Connector Setup'}
        </h2>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="w-full max-w-4xl glass-card rounded-2xl overflow-hidden border border-white/10 bg-surface-container-low/20 backdrop-blur-md">
        {/* Header bar */}
        <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <div>
            <h3 className="font-bold text-on-surface text-base">
              {editingConnectorId ? `Universal Node ID-${editingConnectorId}` : 'Create Inbound Channel'}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1">Define metadata and rules for automated quote parsing.</p>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
            status === 'CONNECTED' 
              ? 'bg-secondary/10 text-secondary border border-secondary/20' 
              : 'bg-white/5 text-on-surface-variant border border-white/5'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${status === 'CONNECTED' ? 'bg-secondary animate-pulse' : 'bg-on-surface-variant/40'}`}></span>
            {status}
          </span>
        </div>

        <div className="p-8 space-y-8">
          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Info size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Basic Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Connector Name</label>
                <input 
                  type="text" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Apex Global Logistics"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Company Name</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Apex Global Logistics Inc."
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact Email</label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="ops@apex-logistics.io"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact Phone Number</label>
                <input 
                  type="text" 
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full"></div>

          {/* Section 2: Personal Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <User size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Personal Contact Information</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact Name</label>
                <input 
                  type="text" 
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Elena Rodriguez"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">Contact Role</label>
                <input 
                  type="text" 
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="Senior Logistics Coordinator"
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full"></div>

          {/* Section 3: Communication Channel */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Mail size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Communication Channel</h4>
            </div>
            <div className="bg-surface p-2 rounded-xl flex gap-2 border border-white/5 max-w-md">
              <button
                type="button"
                onClick={() => setChannel('email')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                  channel === 'email' 
                    ? 'bg-primary text-on-primary shadow-lg' 
                    : 'text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <Mail size={16} /> Email
              </button>
              <button
                type="button"
                onClick={() => setChannel('sms')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                  channel === 'sms' 
                    ? 'bg-primary text-on-primary shadow-lg' 
                    : 'text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <Phone size={16} /> SMS
              </button>
              <button
                type="button"
                onClick={() => setChannel('whatsapp')}
                className={`flex-1 py-3 px-4 rounded-lg font-bold text-sm transition-all duration-150 flex items-center justify-center gap-2 ${
                  channel === 'whatsapp' 
                    ? 'bg-primary text-on-primary shadow-lg' 
                    : 'text-on-surface-variant hover:bg-white/5'
                }`}
              >
                <MessageSquare size={16} /> WhatsApp
              </button>
            </div>
          </div>

          <div className="h-[1px] bg-white/5 w-full"></div>

          {/* Section 4: Email Ingestion & Filtering */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-primary">
                <Filter size={18} />
                <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Email Ingestion & Filtering</h4>
              </div>
              <div className="flex items-center gap-1.5 text-tertiary">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Case-sensitive matching enabled</span>
              </div>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <textarea 
                  value={filteringKeywords}
                  onChange={(e) => setFilteringKeywords(e.target.value)}
                  placeholder="LTL, pallets, weight, class, hazardous, expedited"
                  rows={3}
                  className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary/20 outline-none transition-all resize-none"
                />
                <div className="absolute bottom-3 right-3 text-[9px] font-bold tracking-widest text-on-surface-variant/30">
                  CSV FORMAT
                </div>
              </div>

              {filteringKeywords && (
                <div className="flex flex-wrap gap-1.5">
                  {filteringKeywords.split(',').filter(k => k.trim().length > 0).map((kw, idx) => (
                    <span 
                      key={idx} 
                      className="px-2.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[10px] text-primary font-bold flex items-center gap-1"
                    >
                      {kw.trim()}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="h-[1px] bg-white/5 w-full"></div>

          {/* Section 5: Node Status */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck size={18} />
              <h4 className="font-bold text-sm text-on-surface uppercase tracking-wider">Node Status Configuration</h4>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status"
                  value="CONNECTED"
                  checked={status === 'CONNECTED'}
                  onChange={() => setStatus('CONNECTED')}
                  className="bg-surface border-white/10 text-primary focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-sm font-semibold text-on-surface">CONNECTED / Active Ingestion</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="status"
                  value="DISCONNECTED"
                  checked={status === 'DISCONNECTED'}
                  onChange={() => setStatus('DISCONNECTED')}
                  className="bg-surface border-white/10 text-primary focus:ring-0 focus:ring-offset-0"
                />
                <span className="text-sm font-semibold text-on-surface-variant">DISCONNECTED / Deactivated</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-white/5 bg-white/2 flex justify-between items-center">
          <div className="flex items-center gap-2 text-on-surface-variant/50">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-bold uppercase tracking-wider">AES-256 Encrypted Stream</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleCancel}
              className="px-5 py-2.5 rounded-xl text-on-surface-variant font-bold text-sm border border-white/10 hover:bg-white/5 transition-all duration-150 active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center gap-2"
            >
              <Save size={16} /> Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default ConnectorDetails
