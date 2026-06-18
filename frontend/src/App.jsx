import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Analytics from './pages/Analytics'
import Simulator from './pages/Simulator'
import { LayoutDashboard, Receipt, BarChart3, Mail, Bell, RefreshCw } from 'lucide-react'

const AppContent = () => {
  const { selectedTab, setSelectedTab, notifications, loading, fetchData } = useApp()

  const tabs = [
    { id: 'dashboard', name: 'Freight Pipeline', icon: LayoutDashboard },
    { id: 'billing', name: 'Billing & Reconciliation', icon: Receipt },
    { id: 'analytics', name: 'Analytics Hub', icon: BarChart3 },
    { id: 'simulator', name: 'Email Simulator', icon: Mail }
  ]

  const renderActivePage = () => {
    switch (selectedTab) {
      case 'dashboard':
        return <Dashboard />
      case 'billing':
        return <Billing />
      case 'analytics':
        return <Analytics />
      case 'simulator':
        return <Simulator />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-container">
        {notifications.map(n => (
          <div key={n.id} className={`toast-card ${n.type}`}>
            <Bell className="toast-icon" size={16} />
            <span className="toast-msg">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Sidebar Navigation */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <div className="brand-logo">AP</div>
          <div className="brand-details">
            <span className="brand-name">AMZ PREP</span>
            <span className="brand-sub">Freight Engine</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`nav-item ${selectedTab === tab.id ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={18} />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator online">
            <div className="status-dot"></div>
            <span>Dev API Online</span>
          </div>
          <button className="sync-button" onClick={() => fetchData(true)} disabled={loading}>
            <RefreshCw className={`sync-icon ${loading ? 'spinning' : ''}`} size={14} />
            <span>Force Sync</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        <header className="main-header">
          <div className="header-title-area">
            <h1 className="header-title">
              {tabs.find(t => t.id === selectedTab)?.name}
            </h1>
            <p className="header-subtitle">
              Automated competitive carrier bidding & quote pipeline
            </p>
          </div>
          <div className="header-actions">
            <div className="system-timer">
              <span className="timer-label">Simulation Speed:</span>
              <span className="timer-value badge-fast">FAST (1m = 2h)</span>
            </div>
          </div>
        </header>

        <div className="content-viewport">
          {renderActivePage()}
        </div>
      </main>
    </div>
  )
}

const App = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
