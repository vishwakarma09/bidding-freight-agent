import React, { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../services/api'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [quotes, setQuotes] = useState([])
  const [carriers, setCarriers] = useState([])
  const [customers, setCustomers] = useState([])
  const [connectors, setConnectors] = useState([])
  const [editingConnectorId, setEditingConnectorId] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeQuote, setActiveQuote] = useState(null)
  const [historicalRag, setHistoricalRag] = useState([])
  const [selectedTab, setSelectedTab] = useState('landing')
  const [notifications, setNotifications] = useState([])
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    const savedEmail = localStorage.getItem('userEmail')
    if (savedEmail) {
      if (api.default && api.default.defaults) {
        api.default.defaults.headers.common['X-User-Email'] = savedEmail
      }
      return true
    }
    return false
  })
  const [user, setUser] = useState(() => {
    const savedEmail = localStorage.getItem('userEmail')
    return savedEmail ? { email: savedEmail, name: savedEmail.split('@')[0] } : null
  })

  const addNotification = (message, type = 'success') => {
    const id = Date.now()
    setNotifications(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }, 4000)
  }

  const fetchData = async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const [qData, cData, custData, aData, connData] = await Promise.all([
        api.getQuotes(),
        api.getCarriers(),
        api.getCustomers(),
        api.getAnalytics(),
        api.getConnectors()
      ])
      setQuotes(qData)
      setCarriers(cData)
      setCustomers(custData)
      setAnalytics(aData)
      setConnectors(connData)
    } catch (err) {
      console.error("Failed to load application data:", err)
      addNotification("Error loading data from server", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const publicTabs = ['landing', 'pricing', 'login', 'register']
    const isPublicPage = publicTabs.includes(selectedTab)

    if (!isAuthenticated || isPublicPage) {
      return
    }

    fetchData(true)
    // Set up auto-refresh polling every 5 seconds to show state machine progress
    const interval = setInterval(() => {
      fetchData(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [isAuthenticated, selectedTab])

  const selectQuote = async (id) => {
    if (!id) {
      setActiveQuote(null)
      setHistoricalRag([])
      return
    }
    try {
      const [detailedQuote, ragData] = await Promise.all([
        api.getQuote(id),
        api.getHistoricalRag(id)
      ])
      setActiveQuote(detailedQuote)
      setHistoricalRag(ragData)
    } catch (err) {
      console.error("Failed to fetch detailed quote info:", err)
      addNotification("Failed to load quote details", "error")
    }
  }

  const handleManualOverride = async (quoteId, toStatus, notes) => {
    try {
      await api.manualOverride(quoteId, toStatus, notes)
      addNotification(`Quote ${quoteId} overridden to stage: ${toStatus}`)
      fetchData()
      if (activeQuote && activeQuote.id === quoteId) {
        selectQuote(quoteId)
      }
    } catch (err) {
      console.error("Manual override failed:", err)
      addNotification("Failed to apply manual override", "error")
    }
  }

  const handleApproval = async (quoteId, approved, lostReason = "", competitorInfo = "") => {
    try {
      await api.approveQuote(quoteId, { approved, lost_reason: lostReason, competitor_info: competitorInfo })
      addNotification(approved ? `Quote ${quoteId} APPROVED & booked!` : `Quote ${quoteId} marked as LOST`)
      fetchData()
      if (activeQuote && activeQuote.id === quoteId) {
        selectQuote(quoteId)
      }
    } catch (err) {
      console.error("Quote resolution action failed:", err)
      addNotification("Resolution action failed", "error")
    }
  }

  const handleSendMockEmail = async (sender, recipient, subject, body) => {
    try {
      const response = await api.sendMockEmail({ sender, recipient, subject, body })
      if (response.type === "CUSTOMER_INQUIRY") {
        addNotification(`Mock inquiry ingested! Quote ${response.quote_id} created.`)
      } else if (response.type === "CARRIER_BID") {
        addNotification(`Mock bid received! Carrier ${response.carrier} bid $${response.bid_amount}.`)
      }
      fetchData()
      return response
    } catch (err) {
      console.error("Mock email ingestion failed:", err)
      addNotification("Email simulator error: check email fields", "error")
      throw err
    }
  }

  const handleFastForwardTimers = async () => {
    try {
      const response = await api.fastForwardTimers()
      addNotification(response.message || "Timers fast-forwarded successfully!")
      fetchData()
      return response
    } catch (err) {
      console.error("Fast-forward timers failed:", err)
      addNotification("Failed to fast-forward timers", "error")
      throw err
    }
  }

  const handleResetDatabase = async () => {
    try {
      const response = await api.resetSimulatorDatabase()
      addNotification(response.message || "Database reset successfully!")
      fetchData()
      return response
    } catch (err) {
      console.error("Database reset failed:", err)
      addNotification("Failed to reset database", "error")
      throw err
    }
  }


  const login = (email, password) => {
    localStorage.setItem('userEmail', email)
    setIsAuthenticated(true)
    setUser({ email, name: email.split('@')[0] })
    if (api.default && api.default.defaults) {
      api.default.defaults.headers.common['X-User-Email'] = email
    }
    addNotification("Logged in successfully! Welcome back.", "success")
    setSelectedTab('dashboard')
  }

  const logout = () => {
    localStorage.removeItem('userEmail')
    setIsAuthenticated(false)
    setUser(null)
    if (api.default && api.default.defaults && api.default.defaults.headers.common['X-User-Email']) {
      delete api.default.defaults.headers.common['X-User-Email']
    }
    addNotification("Logged out successfully.", "success")
    setSelectedTab('landing')
  }

  const handleSaveConnector = async (payload) => {
    try {
      if (editingConnectorId) {
        await api.updateConnector(editingConnectorId, payload)
        addNotification("Connector updated successfully!", "success")
      } else {
        await api.createConnector(payload)
        addNotification("New connector added successfully!", "success")
      }
      setEditingConnectorId(null)
      fetchData()
      setSelectedTab('connectors_list')
    } catch (err) {
      console.error("Failed to save connector:", err)
      addNotification("Failed to save connector", "error")
    }
  }

  const handleDeleteConnector = async (id) => {
    try {
      await api.deleteConnector(id)
      addNotification("Connector deleted successfully!", "success")
      fetchData()
    } catch (err) {
      console.error("Failed to delete connector:", err)
      addNotification("Failed to delete connector", "error")
    }
  }

  return (
    <AppContext.Provider value={{
      quotes,
      carriers,
      customers,
      connectors,
      editingConnectorId,
      setEditingConnectorId,
      analytics,
      loading,
      activeQuote,
      historicalRag,
      selectedTab,
      setSelectedTab,
      notifications,
      addNotification,
      fetchData,
      selectQuote,
      handleManualOverride,
      handleApproval,
      handleSendMockEmail,
      handleFastForwardTimers,
      handleResetDatabase,
      isAuthenticated,

      user,
      login,
      logout,
      handleSaveConnector,
      handleDeleteConnector
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
