import React, { createContext, useContext, useState, useEffect } from 'react'
import * as api from '../services/api'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [quotes, setQuotes] = useState([])
  const [carriers, setCarriers] = useState([])
  const [customers, setCustomers] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeQuote, setActiveQuote] = useState(null)
  const [historicalRag, setHistoricalRag] = useState([])
  const [selectedTab, setSelectedTab] = useState('dashboard')
  const [notifications, setNotifications] = useState([])

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
      const [qData, cData, custData, aData] = await Promise.all([
        api.getQuotes(),
        api.getCarriers(),
        api.getCustomers(),
        api.getAnalytics()
      ])
      setQuotes(qData)
      setCarriers(cData)
      setCustomers(custData)
      setAnalytics(aData)
    } catch (err) {
      console.error("Failed to load application data:", err)
      addNotification("Error loading data from server", "error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData(true)
    // Set up auto-refresh polling every 5 seconds to show state machine progress
    const interval = setInterval(() => {
      fetchData(false)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

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

  return (
    <AppContext.Provider value={{
      quotes,
      carriers,
      customers,
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
      handleSendMockEmail
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
