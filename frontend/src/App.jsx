import React from 'react'
import { AppProvider, useApp } from './context/AppContext'
import LandingPage from './pages/LandingPage'
import PricingPage from './pages/PricingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CarriersList from './pages/CarriersList'
import CarrierDetails from './pages/CarrierDetails'
import Dashboard from './pages/Dashboard'
import Billing from './pages/Billing'
import Analytics from './pages/Analytics'
import Simulator from './pages/Simulator'
import { LayoutDashboard, Receipt, BarChart3, Mail, Bell, RefreshCw, Network, LogOut, ExternalLink } from 'lucide-react'

const AppContent = () => {
  const { selectedTab, setSelectedTab, notifications, loading, fetchData, isAuthenticated, logout, addNotification } = useApp()

  const publicTabs = ['landing', 'pricing', 'login', 'register']
  const isPublicPage = publicTabs.includes(selectedTab)

  const authRef = React.useRef(isAuthenticated)
  React.useEffect(() => {
    authRef.current = isAuthenticated
  }, [isAuthenticated])

  // Handle URL email activation response parameters
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const activated = params.get('activated')
    const activationError = params.get('activation_error')

    if (activated === 'true') {
      // Clear URL query parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Notify and navigate
      addNotification("Your account has been successfully activated! Please sign in.", "success")
      setSelectedTab('login')
    } else if (activationError) {
      // Clear URL query parameters
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
      
      // Notify and navigate
      addNotification("Invalid or expired activation token. Please try again.", "error")
      setSelectedTab('register')
    }
  }, [addNotification, setSelectedTab])

  // Synchronize URL path with selectedTab
  React.useEffect(() => {
    const pathMap = {
      '/': 'landing',
      '/pricing': 'pricing',
      '/login': 'login',
      '/register': 'register',
      '/dashboard': 'dashboard',
      '/connectors': 'connectors_list',
      '/analytics': 'analytics',
      '/simulator': 'simulator',
      '/billing': 'billing'
    }

    const handlePopState = () => {
      const currentPath = window.location.pathname
      const tabFromPath = pathMap[currentPath] || 'landing'
      
      const publicTabsList = ['landing', 'pricing', 'login', 'register']
      if (!authRef.current && !publicTabsList.includes(tabFromPath)) {
        setSelectedTab('landing')
        window.history.replaceState({}, '', '/')
      } else {
        setSelectedTab(tabFromPath)
      }
    }

    // Initialize tab from direct URL entry
    handlePopState()

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    const tabToPathMap = {
      'landing': '/',
      'pricing': '/pricing',
      'login': '/login',
      'register': '/register',
      'dashboard': '/dashboard',
      'connectors_list': '/connectors',
      'connector_details': '/connectors',
      'analytics': '/analytics',
      'simulator': '/simulator',
      'billing': '/billing'
    }

    const targetPath = tabToPathMap[selectedTab] || '/'
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath)
    }
  }, [selectedTab])

  React.useEffect(() => {
    if (isPublicPage || !isAuthenticated) {
      document.body.classList.add('public-body')
    } else {
      document.body.classList.remove('public-body')
    }
    return () => document.body.classList.remove('public-body')
  }, [isPublicPage, isAuthenticated])

  const privateTabs = [
    { id: 'dashboard', name: 'Freight Pipeline', icon: LayoutDashboard },
    { id: 'connectors_list', name: 'Carriers Hub', icon: Network },
    { id: 'analytics', name: 'Analytics Center', icon: BarChart3 },
    { id: 'simulator', name: 'Email Simulator', icon: Mail },
    { id: 'billing', name: 'Billing Ledger', icon: Receipt }
  ]

  const renderActivePage = () => {
    // Auth Guard: redirect unauthenticated users to landing
    if (!isAuthenticated && !isPublicPage) {
      return <LandingPage />
    }

    switch (selectedTab) {
      case 'landing':
        return <LandingPage />
      case 'pricing':
        return <PricingPage />
      case 'login':
        return <LoginPage />
      case 'register':
        return <RegisterPage />
      case 'dashboard':
        return <Dashboard />
      case 'billing':
        return <Billing />
      case 'analytics':
        return <Analytics />
      case 'simulator':
        return <Simulator />
      case 'connectors_list':
        return <CarriersList />
      case 'connector_details':
        return <CarrierDetails />
      default:
        return <LandingPage />
    }
  }

  // Render Public Layout (No Sidebar)
  if (isPublicPage || (!isAuthenticated && !isPublicPage)) {
    return (
      <div className="public-layout">
        {/* Toast Notifications */}
        <div className="toast-container">
          {notifications.map(n => (
            <div key={n.id} className={`toast-card ${n.type}`}>
              <Bell className="toast-icon" size={16} />
              <span className="toast-msg">{n.message}</span>
            </div>
          ))}
        </div>
        {renderActivePage()}
      </div>
    )
  }

  // Render Private Dashboard Layout (With Sidebar)
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
          <div className="brand-logo">D</div>
          <div className="brand-details">
            <span className="brand-name">DISPATCH</span>
            <span className="brand-sub">Mission Control</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {privateTabs.map(tab => {
            const Icon = tab.icon
            const isActive = selectedTab === tab.id || (tab.id === 'connectors_list' && selectedTab === 'connector_details')
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="nav-icon" size={18} />
                <span>{tab.name}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer space-y-2 px-4 py-3 border-t border-white/5">
          <button 
            onClick={() => setSelectedTab('landing')}
            className="w-full flex items-center gap-2 py-2 px-3 text-xs text-on-surface-variant hover:text-primary transition-colors hover:bg-white/5 rounded-lg"
          >
            <ExternalLink size={14} />
            <span>Go to Landing</span>
          </button>
          
          <button 
            onClick={logout}
            className="w-full flex items-center gap-2 py-2 px-3 text-xs text-on-surface-variant hover:text-error transition-colors hover:bg-white/5 rounded-lg"
          >
            <LogOut size={14} />
            <span>Logout</span>
          </button>
          
          <div className="h-4"></div>
          
          <div className="status-indicator online">
            <div className="status-dot"></div>
            <span>Dev API Online</span>
          </div>
          <button className="sync-button w-full" onClick={() => fetchData(true)} disabled={loading}>
            <RefreshCw className={`sync-icon ${loading ? 'spinning' : ''}`} size={14} />
            <span>Force Sync</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="app-main">
        {selectedTab !== 'simulator' && (
          <header className="main-header">
            <div className="header-title-area">
              <h1 className="header-title">
                {selectedTab === 'connector_details' 
                  ? 'Carrier Configuration' 
                  : privateTabs.find(t => t.id === selectedTab)?.name}
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
        )}


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
