import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { 
  getEmailCredentials, 
  saveEmailCredentials, 
  deleteEmailCredentials, 
  testEmailCredentials, 
  testExistingEmailCredentials 
} from '../services/api'
import { 
  Plus, Edit2, Trash2, Mail, MessageSquare, Phone, Network, 
  AlertCircle, CheckCircle, Database, Shield, Activity, 
  Server, Eye, EyeOff, RefreshCw, AlertTriangle 
} from 'lucide-react'

const ConnectorsList = () => {
  const { connectors, setEditingConnectorId, setSelectedTab, handleDeleteConnector, addNotification } = useApp()

  // Email SMTP/IMAP Setup State
  const [emailCreds, setEmailCreds] = useState(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailProvider, setEmailProvider] = useState('Gmail')
  const [emailAddress, setEmailAddress] = useState('')
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com')
  const [smtpPort, setSmtpPort] = useState(587)
  const [smtpPassword, setSmtpPassword] = useState('')
  const [imapHost, setImapHost] = useState('imap.gmail.com')
  const [imapPort, setImapPort] = useState(993)
  const [imapPassword, setImapPassword] = useState('')
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [showImapPassword, setShowImapPassword] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Load email credentials from backend on mount
  useEffect(() => {
    getEmailCredentials()
      .then(data => {
        setEmailCreds(data)
      })
      .catch(err => {
        if (err.response && err.response.status === 404) {
          setEmailCreds(null)
        } else {
          console.error("Failed to load email credentials:", err)
        }
      })
  }, [])

  const handleEdit = (id) => {
    setEditingConnectorId(id)
    setSelectedTab('connector_details')
  }

  const handleAdd = () => {
    setEditingConnectorId(null)
    setSelectedTab('connector_details')
  }

  // Calculate statistics
  const totalConnectors = connectors.length
  const connectedCount = connectors.filter(c => c.status === 'CONNECTED').length
  const emailChannelCount = connectors.filter(c => c.channel.toLowerCase() === 'email').length

  const getChannelIcon = (channel) => {
    switch (channel.toLowerCase()) {
      case 'email':
        return <Mail size={16} className="text-primary" />
      case 'whatsapp':
        return <MessageSquare size={16} className="text-secondary" />
      default:
        return <Phone size={16} className="text-tertiary" />
    }
  }

  // Handle email credentials verification test
  const handleTestEmailCreds = () => {
    setTestingEmail(true)
    setTestResult(null)

    const isExisting = smtpPassword === "••••••••••••" && imapPassword === "••••••••••••"
    
    const testPromise = isExisting
      ? testExistingEmailCredentials()
      : testEmailCredentials({
          email_provider: emailProvider,
          email: emailAddress,
          smtp_host: smtpHost,
          smtp_port: parseInt(smtpPort),
          smtp_password: smtpPassword,
          imap_host: imapHost,
          imap_port: parseInt(imapPort),
          imap_password: imapPassword
        })

    testPromise
      .then(res => {
        setTestingEmail(false)
        setTestResult(res)
        if (res.success) {
          addNotification("Email connection test PASSED!", "success")
        } else {
          let errorMsg = "Email connection test FAILED. "
          if (res.smtp_error) errorMsg += `SMTP: ${res.smtp_error}. `
          if (res.imap_error) errorMsg += `IMAP: ${res.imap_error}.`
          addNotification(errorMsg, "error")
        }
      })
      .catch(err => {
        setTestingEmail(false)
        addNotification("Connection test request failed.", "error")
        console.error(err)
      })
  }

  // Handle saving credentials
  const handleSaveEmailCreds = (e) => {
    e.preventDefault()
    const payload = {
      email_provider: emailProvider,
      email: emailAddress,
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort),
      smtp_password: smtpPassword,
      imap_host: imapHost,
      imap_port: parseInt(imapPort),
      imap_password: imapPassword
    }

    saveEmailCredentials(payload)
      .then(data => {
        setEmailCreds(data)
        setShowEmailModal(false)
        addNotification("Ingestion email account configured successfully!", "success")
        setSmtpPassword('')
        setImapPassword('')
        setTestResult(null)
      })
      .catch(err => {
        console.error("Failed to save email credentials:", err)
        addNotification("Failed to save email credentials", "error")
      })
  }

  // Handle disconnecting credentials
  const handleDeleteEmailCreds = () => {
    deleteEmailCredentials()
      .then(() => {
        setEmailCreds(null)
        addNotification("Ingestion email disconnected.", "success")
      })
      .catch(err => {
        console.error("Failed to delete email credentials:", err)
        addNotification("Failed to disconnect ingestion email", "error")
      })
  }

  // Adjust prefilled values when provider changes
  useEffect(() => {
    if (emailProvider === 'Gmail') {
      setSmtpHost('smtp.gmail.com')
      setSmtpPort(587)
      setImapHost('imap.gmail.com')
      setImapPort(993)
    } else {
      setSmtpHost('')
      setSmtpPort(587)
      setImapHost('')
      setImapPort(993)
    }
  }, [emailProvider])

  return (
    <div className="space-y-8">
      {/* Page Actions Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-on-surface">Connectors Hub</h2>
          <p className="text-sm text-on-surface-variant mt-1">Configure automated communication nodes for carriers and forwarders.</p>
        </div>
        <button
          onClick={handleAdd}
          className="px-5 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-sm hover:brightness-110 active:scale-95 transition-all neon-glow-primary flex items-center gap-2"
        >
          <Plus size={16} /> Add Connector
        </button>
      </div>

      {/* KPI Stats Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-bento-gap">
        <div className="glass-card rounded-2xl p-6 bg-surface-container-low/30 border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20 text-primary">
            <Network size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Total Connectors</span>
            <span className="text-2xl font-bold text-on-surface block mt-1">{totalConnectors}</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 bg-surface-container-low/30 border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center border border-secondary/20 text-secondary">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Active / Connected</span>
            <span className="text-2xl font-bold text-on-surface block mt-1">{connectedCount}</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 bg-surface-container-low/30 border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-container/10 rounded-xl flex items-center justify-center border border-primary-container/20 text-primary-container">
            <Mail size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Email Ingestion</span>
            <span className="text-2xl font-bold text-on-surface block mt-1">{emailChannelCount} Nodes</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 bg-surface-container-low/30 border border-white/5 backdrop-blur-md flex items-center gap-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-xl flex items-center justify-center border border-tertiary/20 text-tertiary">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">Uptime Health</span>
            <span className="text-2xl font-bold text-on-surface block mt-1">99.9%</span>
          </div>
        </div>
      </div>

      {/* INGESTION EMAIL CONFIGURATION CARD (job-apply-ai style) */}
      <div className="glass-card p-8 rounded-2xl border border-white/5 bg-surface-container-low/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white shadow-md">
            <Mail size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
              Autonomous Email Ingestion Inbox
              {emailCreds && (
                <span className="text-[9px] uppercase font-bold tracking-wider text-secondary bg-secondary/10 border border-secondary/20 px-2 py-0.5 rounded-full animate-pulse">
                  Active
                </span>
              )}
            </h3>
            <p className="text-xs text-on-surface-variant mt-1 max-w-xl leading-relaxed">
              Connect your centralized company quoting mailbox. The parser scans incoming RFQ email streams via IMAP and outputs structured parameters to the quoting pipeline in real-time.
            </p>
            {emailCreds && (
              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[11px] font-mono text-primary-fixed-dim bg-black/20 p-3 rounded-lg border border-white/5">
                <span><strong>Inbox:</strong> {emailCreds.email}</span>
                <span><strong>SMTP Host:</strong> {emailCreds.smtp_host}:{emailCreds.smtp_port}</span>
                <span><strong>IMAP Host:</strong> {emailCreds.imap_host}:{emailCreds.imap_port}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {emailCreds ? (
            <>
              <button 
                onClick={() => {
                  setEmailProvider(emailCreds.email_provider)
                  setEmailAddress(emailCreds.email)
                  setSmtpHost(emailCreds.smtp_host)
                  setSmtpPort(emailCreds.smtp_port)
                  setSmtpPassword("••••••••••••")
                  setImapHost(emailCreds.imap_host)
                  setImapPort(emailCreds.imap_port)
                  setImapPassword("••••••••••••")
                  setShowEmailModal(true)
                }}
                className="text-xs font-bold px-4 py-2 bg-white/5 hover:bg-white/10 text-on-surface rounded-lg border border-white/10 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw size={14} /> Update Setup
              </button>
              <button 
                onClick={handleDeleteEmailCreds}
                className="text-xs font-bold px-4 py-2 hover:bg-error/10 text-error rounded-lg border border-error/20 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} /> Disconnect
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setEmailProvider("Gmail")
                setEmailAddress("")
                setSmtpHost("smtp.gmail.com")
                setSmtpPort(587)
                setSmtpPassword("")
                setImapHost("imap.gmail.com")
                setImapPort(993)
                setImapPassword("")
                setShowEmailModal(true)
              }}
              className="text-xs font-bold px-5 py-2.5 rounded-lg bg-primary text-on-primary hover:brightness-110 active:scale-95 transition-all shadow-md flex items-center gap-1.5"
            >
              <Plus size={14} /> Setup Ingestion Mailbox
            </button>
          )}
        </div>
      </div>

      {/* Main Connectors Table/Grid */}
      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-surface-container-low/20 backdrop-blur-md">
        <div className="p-6 border-b border-white/5 bg-white/2 flex justify-between items-center">
          <h3 className="font-bold text-on-surface text-base">Configured Connection Channels</h3>
          <span className="text-xs text-on-surface-variant/60 font-semibold uppercase tracking-wider">AES-256 ENCRYPTED INBOUNDS</span>
        </div>

        <div className="overflow-x-auto">
          {connectors.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
              <AlertCircle size={36} className="text-on-surface-variant/40" />
              <p className="text-base font-semibold">No Connectors Configured</p>
              <p className="text-sm">Click "Add Connector" to configure your first inbound automated quoting channel.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 bg-white/2 text-on-surface-variant text-[10px] uppercase font-bold tracking-wider">
                  <th className="px-6 py-4">Connector / Company</th>
                  <th className="px-6 py-4">Channel</th>
                  <th className="px-6 py-4">Contact Info</th>
                  <th className="px-6 py-4">Filtering Keywords</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {connectors.map((connector) => (
                  <tr key={connector.id} className="hover:bg-white/2 transition-colors group">
                    <td className="px-6 py-5">
                      <div className="font-semibold text-on-surface">{connector.name}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{connector.company_name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/5 text-xs text-on-surface-variant capitalize">
                        {getChannelIcon(connector.channel)}
                        {connector.channel}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="text-xs text-on-surface">{connector.contact_name || 'No contact'}</div>
                      <div className="text-[10px] text-on-surface-variant mt-0.5">{connector.contact_email}</div>
                    </td>
                    <td className="px-6 py-5 max-w-xs">
                      {connector.filtering_keywords ? (
                        <div className="flex flex-wrap gap-1">
                          {connector.filtering_keywords.split(',').map((kw, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] text-primary font-semibold">
                              {kw.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-on-surface-variant/40">No keywords (matches all)</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        connector.status === 'CONNECTED' 
                          ? 'bg-secondary/10 text-secondary border border-secondary/20' 
                          : 'bg-white/5 text-on-surface-variant border border-white/5'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${connector.status === 'CONNECTED' ? 'bg-secondary animate-pulse' : 'bg-on-surface-variant/40'}`}></span>
                        {connector.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(connector.id)}
                          className="p-1.5 rounded-lg hover:bg-white/5 text-on-surface-variant hover:text-primary transition-all duration-150"
                          title="Edit Connector"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteConnector(connector.id)}
                          className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-all duration-150"
                          title="Delete Connector"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Security Check Footer Bento Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-bento-gap">
        <div className="glass-card p-6 rounded-xl bg-surface-container-low/20 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center text-secondary">
            <Database size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Carrier Streams</span>
            <span className="text-base font-bold text-on-surface mt-0.5">14.2 GB /mo throughput</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-surface-container-low/20 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Activity size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Connection Latency</span>
            <span className="text-base font-bold text-on-surface mt-0.5">12ms average rt</span>
          </div>
        </div>

        <div className="glass-card p-6 rounded-xl bg-surface-container-low/20 border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 bg-tertiary/10 rounded-lg flex items-center justify-center text-tertiary">
            <Shield size={20} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Encryption Channel</span>
            <span className="text-base font-bold text-on-surface mt-0.5">AES-256 Verified stream</span>
          </div>
        </div>
      </div>

      {/* EMAIL SMTP/IMAP MODAL FORM (job-apply-ai style) */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg glass-panel p-8 rounded-3xl border border-white/10 flex flex-col gap-6 relative my-8 bg-surface-container">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
                <Mail size={20} className="text-primary" /> Configure Ingestion Email
              </h3>
              <button 
                onClick={() => setShowEmailModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1.5 bg-white/5 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>
            
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Authenticate your email inbox. The CargoFlux parsing pipeline relies on secure IMAP synchronization to poll incoming messages, extract freight rates, and broadcast RFQs automatically.
            </p>

            <form onSubmit={handleSaveEmailCreds} className="flex flex-col gap-5">
              {/* Provider */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Mailbox Provider</label>
                <select 
                  value={emailProvider} 
                  onChange={(e) => setEmailProvider(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-on-surface focus:outline-none focus:border-primary"
                >
                  <option value="Gmail">Gmail (Auto pre-filled hosts)</option>
                  <option value="Other">Other Custom Mail Server</option>
                </select>
              </div>

              {/* Email Address */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Ingestion Email Address</label>
                <input 
                  required
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="e.g. carrier-quotes@company.com"
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-2.5 px-4 text-xs text-on-surface focus:outline-none focus:border-primary"
                />
              </div>

              {/* SMTP configuration */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Server size={12} /> SMTP Config (Outgoing Mail)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">SMTP Host</label>
                    <input 
                      required
                      type="text"
                      disabled={emailProvider === "Gmail"}
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">SMTP Port</label>
                    <input 
                      required
                      type="number"
                      disabled={emailProvider === "Gmail"}
                      value={smtpPort}
                      onChange={(e) => setSmtpPort(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">SMTP password / App password</label>
                  <div className="relative">
                    <input 
                      required
                      type={showSmtpPassword ? "text" : "password"}
                      value={smtpPassword}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                      placeholder="Gmail App Password (16 characters)"
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 pr-10 text-xs text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      {showSmtpPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* IMAP configuration */}
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] flex flex-col gap-3">
                <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Server size={12} /> IMAP Config (Incoming Mailbox Ingestion)
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">IMAP Host</label>
                    <input 
                      required
                      type="text"
                      disabled={emailProvider === "Gmail"}
                      value={imapHost}
                      onChange={(e) => setImapHost(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface disabled:opacity-50"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">IMAP Port</label>
                    <input 
                      required
                      type="number"
                      disabled={emailProvider === "Gmail"}
                      value={imapPort}
                      onChange={(e) => setImapPort(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 text-xs text-on-surface disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">IMAP password / App password</label>
                  <div className="relative">
                    <input 
                      required
                      type={showImapPassword ? "text" : "password"}
                      value={imapPassword}
                      onChange={(e) => setImapPassword(e.target.value)}
                      placeholder="Gmail App Password (16 characters)"
                      className="w-full bg-black/40 border border-white/10 rounded-lg py-2 px-3 pr-10 text-xs text-on-surface"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImapPassword(!showImapPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                    >
                      {showImapPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Verification Feedback Block */}
              {testResult && (
                <div className={`p-4 rounded-xl border flex flex-col gap-2 ${
                  testResult.success 
                    ? "border-secondary/20 bg-secondary/5 text-secondary" 
                    : "border-error/20 bg-error/5 text-error"
                }`}>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <CheckCircle size={14} />
                    {testResult.success ? "Authentication Successful!" : "Authentication Failed!"}
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] font-mono mt-1 text-on-surface-variant">
                    <div className="flex justify-between">
                      <span>SMTP Authentication:</span>
                      <span className={testResult.smtp_connected ? "text-secondary font-bold" : "text-error font-bold"}>
                        {testResult.smtp_connected ? "OK (200)" : "FAIL"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>IMAP Mailbox Connection:</span>
                      <span className={testResult.imap_connected ? "text-secondary font-bold" : "text-error font-bold"}>
                        {testResult.imap_connected ? "OK (200)" : "FAIL"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Footer */}
              <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={handleTestEmailCreds}
                  disabled={testingEmail || !emailAddress || !smtpPassword || !imapPassword}
                  className="text-xs font-semibold text-primary hover:brightness-110 disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={14} className={testingEmail ? "animate-spin" : ""} />
                  {testingEmail ? "Verifying..." : "Verify Connection"}
                </button>

                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => {
                      setShowEmailModal(false)
                      setSmtpPassword('')
                      setImapPassword('')
                      setTestResult(null)
                    }}
                    className="text-xs font-semibold text-on-surface-variant hover:text-on-surface px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={testingEmail}
                    className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-bold text-xs hover:brightness-110 disabled:opacity-50"
                  >
                    Confirm & Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ConnectorsList
