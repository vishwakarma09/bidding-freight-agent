import React from 'react'
import { useApp } from '../context/AppContext'
import { Plus, Edit2, Trash2, Mail, MessageSquare, Phone, Network, AlertCircle, CheckCircle, Database, Shield, Activity } from 'lucide-react'

const ConnectorsList = () => {
  const { connectors, setEditingConnectorId, setSelectedTab, handleDeleteConnector } = useApp()

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
  const otherChannelCount = totalConnectors - emailChannelCount

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
    </div>
  )
}

export default ConnectorsList
