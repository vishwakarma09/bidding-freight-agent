import React, { useState, useEffect, useRef } from 'react'
import { useApp } from '../context/AppContext'
import axios from 'axios'
import * as api from '../services/api'

const Simulator = () => {
  const { 
    quotes, 
    carriers, 
    customers, 
    handleSendMockEmail, 
    handleFastForwardTimers, 
    handleResetDatabase, 
    addNotification, 
    fetchData 
  } = useApp()

  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0)
  const [activeQuoteId, setActiveQuoteId] = useState('')
  const [carrierId, setCarrierId] = useState('')
  const [bidAmount, setBidAmount] = useState('1240')
  
  // State variables for Customer Reply step
  const [customerReplyQuoteId, setCustomerReplyQuoteId] = useState('')
  const [customerDecision, setCustomerDecision] = useState('APPROVED')

  const [activeTab, setActiveTab] = useState('logs') // 'logs' or 'outbox'

  const [mailpitEmails, setMailpitEmails] = useState([])
  const [mailpitLoading, setMailpitLoading] = useState(false)
  const [systemLogs, setSystemLogs] = useState([])
  const [now, setNow] = useState(Date.now())
  
  const terminalEndRef = useRef(null)

  // Pre-configured templates matching the mockup options
  const templates = [
    {
      name: "Standard LTL - LA to Chicago",
      sender: "customer_b@example.com",
      subject: "Freight Quote Request: LTL shipment to Chicago",
      body: "Hi broker,\n\nWe need a rate quote for shipping 4 pallets of consumer goods from Los Angeles, CA to Chicago, IL.\n\nWeight is 3500 lbs, Class 70. Accessorials: liftgate required at delivery. Target pickup date is June 28, 2026.\n\nThanks,\nDispatch Client B"
    },
    {
      name: "Hazmat LTL - Houston to NY",
      sender: "customer_a@example.com",
      subject: "Hazmat Class 9 rate query",
      body: "Hello,\n\nPlease provide carrier pricing for a hazmat shipment of class 9 batteries from Houston, TX to New York, NY.\nTotal weight is 4800 lbs, freight class 85. Require liftgate pickup and inside delivery. Needed pickup June 29.\n\nRegards,\nDispatch Client A"
    },
    {
      name: "Expedited LTL - Seattle to SF",
      sender: "customer_c@example.com",
      subject: "Expedited shipping request: Seattle to SF",
      body: "Greetings,\n\nI need to ship expedited freight from Seattle, WA to San Francisco, CA.\n3 pallets, 1200 lbs, class 100. Must have liftgate delivery at destination. Pickup is scheduled for July 02.\n\nBest,\nClient C"
    }
  ]

  // Fetch outgoing emails caught by Mailpit
  const fetchMailpitEmails = async () => {
    setMailpitLoading(true)
    try {
      const data = await api.getMailpitMessages()
      setMailpitEmails(data.messages || [])
    } catch (err) {
      console.warn("Mailpit API offline or unreachable from backend proxy.")
    } finally {
      setMailpitLoading(false)
    }
  }


  // Fetch real-time event logs from backend
  const fetchLogs = async () => {
    try {
      const data = await api.getSimulatorLogs()
      setSystemLogs(data)
    } catch (err) {
      console.error("Failed to fetch simulator logs:", err)
    }
  }

  // Timer Tick Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Poll logs and mailpit emails
  useEffect(() => {
    fetchMailpitEmails()
    fetchLogs()
    const interval = setInterval(() => {
      fetchMailpitEmails()
      fetchLogs()
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Auto-scroll terminal to bottom
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [systemLogs, activeTab])

  // Filter quotes currently awaiting bids
  const activeBiddingQuotes = quotes.filter(q => 
    ['OUT_TO_CARRIERS', 'RE_BID_ROUND'].includes(q.status)
  )

  // Filter quotes awaiting customer approval
  const awaitingApprovalQuotes = quotes.filter(q => 
    ['AWAITING_APPROVAL'].includes(q.status)
  )

  // Auto-trigger refetch when a timer expires
  useEffect(() => {
    const expiredQuote = activeBiddingQuotes.find(q => {
      const endsAtStr = q.status === 'OUT_TO_CARRIERS' ? q.first_round_ends_at : q.rebid_round_ends_at
      if (!endsAtStr) return false
      return new Date(endsAtStr).getTime() <= now
    })
    if (expiredQuote) {
      fetchData(false)
      fetchLogs()
    }
  }, [now, activeBiddingQuotes, fetchData])

  // Auto-select active quote ID for Carrier RFQ Reply
  useEffect(() => {
    if (activeBiddingQuotes.length > 0 && !activeQuoteId) {
      setActiveQuoteId(activeBiddingQuotes[0].id)
    } else if (activeBiddingQuotes.length === 0 && activeQuoteId) {
      setActiveQuoteId('')
    }
  }, [activeBiddingQuotes, activeQuoteId])

  // Auto-select active quote ID for Customer Reply
  useEffect(() => {
    if (awaitingApprovalQuotes.length > 0 && !customerReplyQuoteId) {
      setCustomerReplyQuoteId(awaitingApprovalQuotes[0].id)
    } else if (awaitingApprovalQuotes.length === 0 && customerReplyQuoteId) {
      setCustomerReplyQuoteId('')
    }
  }, [awaitingApprovalQuotes, customerReplyQuoteId])

  useEffect(() => {
    if (carriers.length > 0 && !carrierId) {
      setCarrierId(carriers[0].id.toString())
    }
  }, [carriers, carrierId])

  const handleTriggerInquiry = async () => {
    const t = templates[selectedTemplateIndex]
    try {
      await handleSendMockEmail(
        t.sender,
        'broker@dispatch.owera.ca',
        t.subject,
        t.body
      )
      fetchMailpitEmails()
      fetchLogs()
    } catch (err) {
      // Handled in context
    }
  }

  const handleTriggerBid = async () => {
    if (!activeQuoteId) {
      addNotification("Please select an active quote currently out for bidding.", "error")
      return
    }

    const selectedCarrier = carriers.find(c => c.id === parseInt(carrierId))
    if (!selectedCarrier) return

    const selectedQuote = quotes.find(q => q.id === activeQuoteId)
    if (!selectedQuote) return

    const bidSubject = `Re: RFQ: Freight Quote ${activeQuoteId} - ${selectedQuote.origin} to ${selectedQuote.destination}`
    const bidBody = `
      Hi Broker team,
      
      Here is our rate for quote ${activeQuoteId}:
      Bid Amount: $${bidAmount}
      Transit Days: 3
      
      Notes: We can service this lane.
      
      Best,
      ${selectedCarrier.name} pricing desk
    `

    try {
      await handleSendMockEmail(
        selectedCarrier.email,
        'broker@dispatch.owera.ca',
        bidSubject,
        bidBody
      )
      fetchMailpitEmails()
      fetchLogs()
    } catch (err) {
      // Handled in context
    }
  }

  const handleCustomerReply = async () => {
    if (!customerReplyQuoteId) {
      addNotification("Please select a quote awaiting approval.", "error")
      return
    }

    const selectedQuote = quotes.find(q => q.id === customerReplyQuoteId)
    if (!selectedQuote) return

    const customer = customers.find(c => c.id === selectedQuote.customer_id)
    const senderEmail = customer ? customer.email : 'customer@example.com'

    const subject = `Re: FREIGHT PROPOSAL: ${selectedQuote.origin} to ${selectedQuote.destination} - $${selectedQuote.sell_price} (${customerReplyQuoteId})`
    const body = customerDecision // APPROVED or REJECTED

    try {
      await handleSendMockEmail(
        senderEmail,
        'broker@dispatch.owera.ca',
        subject,
        body
      )
      fetchMailpitEmails()
      fetchLogs()
    } catch (err) {
      // Handled in context
    }
  }

  const onFastForward = async () => {
    try {
      await handleFastForwardTimers()
      fetchLogs()
    } catch (err) {
      // Handled in context
    }
  }

  const onResetDatabase = async () => {
    if (window.confirm("Are you sure you want to reset the database? This will delete all quotes, bids, and state transitions.")) {
      try {
        await handleResetDatabase()
        setActiveQuoteId('')
        setCustomerReplyQuoteId('')
        setSystemLogs([])
        fetchLogs()
      } catch (err) {
        // Handled in context
      }
    }
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* CSS Styles Embedded to Match the Mockup */}
      <style dangerouslySetInnerHTML={{ __html: `
        .glass-panel {
            background: rgba(30, 41, 59, 0.5);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
            box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.05);
        }
        .neon-glow-primary {
            box-shadow: 0 0 15px rgba(173, 198, 255, 0.3);
        }
        .cargo-progress {
            position: relative;
            height: 6px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 9999px;
            overflow: hidden;
        }
        .cargo-progress-fill {
            height: 100%;
            background: #adc6ff;
            box-shadow: 0 0 8px #adc6ff;
            transition: width 0.5s ease-in-out;
        }
        .terminal-scroll::-webkit-scrollbar {
            width: 4px;
        }
        .terminal-scroll::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.2);
        }
        .terminal-scroll::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
        }
      `}} />

      {/* Header section matching docs/simulation_running.html */}
      <header className="mb-8">
        <h1 className="font-headline-lg text-headline-lg text-on-surface">Simulation Dashboard</h1>
        <p className="text-on-surface-variant font-body-md mt-1">Real-time control over logistical pipeline automation events.</p>
      </header>

      {/* Bento Grid Layout matching docs/simulation_running.html */}
      <div className="grid grid-cols-12 gap-bento-gap auto-rows-[minmax(180px,auto)]">
        
        {/* 1. Trigger Simulation Actions Card: span 7 */}
        <section className="col-span-12 lg:col-span-7 glass-panel p-6 rounded-xl flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md text-headline-md flex items-center gap-2 text-on-surface">
              <span className="material-symbols-outlined text-primary">bolt</span>
              Trigger Simulation Actions
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={onFastForward}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container-high rounded-lg text-tertiary-fixed-dim font-bold hover:bg-surface-bright transition-colors active:scale-95 text-sm"
              >
                <span className="material-symbols-outlined text-sm">fast_forward</span>
                Fast-Forward Timer
              </button>
              <button 
                onClick={onResetDatabase}
                className="flex items-center gap-2 px-4 py-2 bg-error-container/20 border border-error/20 rounded-lg text-error font-bold hover:bg-error-container/40 transition-colors active:scale-95 text-sm"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Reset Database
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            
            {/* Step 1: Ingest Section */}
            <div className="p-4 bg-surface-container-lowest rounded-lg border border-white/5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h4 className="font-label-md text-label-md text-on-surface-variant flex items-center gap-2 uppercase">
                  <span className="material-symbols-outlined text-sm">mail</span>
                  1. Customer Request
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Simulate a client freight quote request inbound email to Dispatch.
                </p>
                <select 
                  className="w-full bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none"
                  value={selectedTemplateIndex}
                  onChange={e => setSelectedTemplateIndex(parseInt(e.target.value))}
                >
                  {templates.map((t, idx) => (
                    <option key={idx} value={idx}>{t.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={handleTriggerInquiry}
                className="w-full py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-sm mt-auto"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Ingest Email
              </button>
            </div>

            {/* Step 2: Carrier RFQ Section */}
            <div className="p-4 bg-surface-container-lowest rounded-lg border border-white/5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h4 className="font-label-md text-label-md text-on-surface-variant flex items-center gap-2 uppercase">
                  <span className="material-symbols-outlined text-sm">handshake</span>
                  2. Carrier RFQ Reply
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Simulate a carrier replying to the RFQ with rate pricing.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none w-full"
                    value={activeQuoteId}
                    onChange={e => setActiveQuoteId(e.target.value)}
                  >
                    {activeBiddingQuotes.map(q => (
                      <option key={q.id} value={q.id}>{q.id}</option>
                    ))}
                    {activeBiddingQuotes.length === 0 && (
                      <option value="">No Quotes</option>
                    )}
                  </select>
                  <select 
                    className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none w-full"
                    value={carrierId}
                    onChange={e => setCarrierId(e.target.value)}
                  >
                    {carriers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    {carriers.length === 0 && (
                      <option value="">No Registered Carriers</option>
                    )}
                  </select>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">$</span>
                  <input 
                    className="w-full bg-surface-container border border-white/10 rounded-lg py-2 pl-7 pr-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none" 
                    placeholder="Bid Price" 
                    type="number"
                    value={bidAmount}
                    onChange={e => setBidAmount(e.target.value)}
                  />
                </div>
              </div>
              <button 
                onClick={handleTriggerBid}
                disabled={activeBiddingQuotes.length === 0}
                className="w-full py-2 bg-secondary/10 border border-secondary/30 text-secondary-fixed-dim rounded-lg font-bold hover:bg-secondary/20 transition-all flex items-center justify-center gap-2 text-sm mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">send</span>
                Submit Bid
              </button>
            </div>

            {/* Step 3: Customer Proposal Reply Section */}
            <div className="p-4 bg-surface-container-lowest rounded-lg border border-white/5 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <h4 className="font-label-md text-label-md text-on-surface-variant flex items-center gap-2 uppercase">
                  <span className="material-symbols-outlined text-sm">rate_review</span>
                  3. Customer Reply
                </h4>
                <p className="text-[11px] text-on-surface-variant leading-relaxed">
                  Simulate customer response to proposal to book or reject quote.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <select 
                    className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none w-full"
                    value={customerReplyQuoteId}
                    onChange={e => setCustomerReplyQuoteId(e.target.value)}
                  >
                    {awaitingApprovalQuotes.map(q => (
                      <option key={q.id} value={q.id}>{q.id}</option>
                    ))}
                    {awaitingApprovalQuotes.length === 0 && (
                      <option value="">No Quotes</option>
                    )}
                  </select>
                  <select 
                    className="bg-surface-container border border-white/10 rounded-lg py-2 px-3 text-sm text-on-surface focus:ring-1 focus:ring-primary outline-none w-full"
                    value={customerDecision}
                    onChange={e => setCustomerDecision(e.target.value)}
                  >
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                  </select>
                </div>
                <div className="text-xs text-on-surface-variant/80 bg-surface-container p-3 rounded-md leading-relaxed space-y-1">
                  {customerReplyQuoteId ? (
                    (() => {
                      const q = quotes.find(quote => quote.id === customerReplyQuoteId);
                      const c = customers.find(cust => cust.id === q?.customer_id);
                      const carrier = q?.winning_carrier_id ? carriers.find(car => car.id === q.winning_carrier_id) : null;
                      return (
                        <>
                          <div className="flex justify-between">
                            <span className="font-semibold text-on-surface-variant">Customer:</span>
                            <span className="text-on-surface font-medium">{c ? c.name : 'Unknown Customer'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-on-surface-variant">Route:</span>
                            <span className="text-on-surface font-medium">{q?.origin.split(',')[0]} ➔ {q?.destination.split(',')[0]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-semibold text-on-surface-variant">Lowest Bid:</span>
                            <span className="text-secondary font-bold">${q?.cost_price} {carrier ? `(${carrier.name.split(' ')[0]})` : ''}</span>
                          </div>
                          <div className="flex justify-between border-t border-white/5 pt-1 mt-1">
                            <span className="font-semibold text-on-surface-variant">Proposed Price:</span>
                            <span className="text-primary font-bold">${q?.sell_price}</span>
                          </div>
                        </>
                      );
                    })()
                  ) : (
                    <div className="text-center py-4 text-on-surface-variant/60">
                      Awaiting quote proposals...
                    </div>
                  )}
                </div>
              </div>
              <button 
                onClick={handleCustomerReply}
                disabled={awaitingApprovalQuotes.length === 0}
                className="w-full py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg font-bold hover:bg-primary/20 transition-all flex items-center justify-center gap-2 text-sm mt-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-sm">reply</span>
                Submit Reply
              </button>
            </div>
            
          </div>
        </section>

        {/* 2. Active Bidding Timers & State Card: span 5 */}
        <section className="col-span-12 lg:col-span-5 glass-panel p-6 rounded-xl flex flex-col">
          <h3 className="font-headline-md text-headline-md flex items-center gap-2 mb-6 text-on-surface">
            <span className="material-symbols-outlined text-tertiary">timer</span>
            Active Bidding Timers
          </h3>
          <div className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="space-y-6 flex-1 overflow-y-auto pr-1">
              {activeBiddingQuotes.map(q => {
                const endsAtStr = q.status === 'OUT_TO_CARRIERS' ? q.first_round_ends_at : q.rebid_round_ends_at
                const endsAt = endsAtStr ? new Date(endsAtStr).getTime() : 0
                const remainingMs = endsAt - now
                const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000))
                
                const durationSec = q.status === 'OUT_TO_CARRIERS' ? 120 : 30
                const startAt = endsAt - (durationSec * 1000)
                const progressPercent = Math.max(0, Math.min(100, ((now - startAt) / (durationSec * 1000)) * 100))

                const isRound1 = q.status === 'OUT_TO_CARRIERS'

                return (
                  <div className="space-y-3" key={q.id}>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="font-body-md font-semibold text-on-surface">
                          {isRound1 ? 'Round 1: Out to Carriers' : 'Round 2: Re-Bid Round'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                          Quote {q.id} • {q.origin.split(',')[0]} to {q.destination.split(',')[0]}
                        </p>
                      </div>
                      <span className={`font-label-md px-2 py-1 rounded ${isRound1 ? 'text-primary bg-primary/10' : 'text-tertiary bg-tertiary/10'}`}>
                        {remainingSec > 0 ? `${remainingSec}s remaining` : 'Processing...'}
                      </span>
                    </div>
                    <div className="cargo-progress">
                      <div 
                        className="cargo-progress-fill" 
                        style={{ 
                          width: `${progressPercent}%`,
                          background: isRound1 ? '#adc6ff' : '#ffb95f',
                          boxShadow: isRound1 ? '0 0 8px #adc6ff' : '0 0 8px #ffb95f',
                          transition: 'width 1.1s linear'
                        }}
                      />
                    </div>
                  </div>
                )
              })}

              {activeBiddingQuotes.length === 0 && (
                <div className="text-center text-on-surface-variant py-8 flex flex-col items-center justify-center h-full">
                  <span className="material-symbols-outlined text-4xl opacity-30 mb-2">hourglass_empty</span>
                  <p className="font-semibold text-sm">No Active Bidding rounds</p>
                  <p className="text-xs opacity-70 mt-1">Ingest a customer request email to trigger bidding timers.</p>
                </div>
              )}
            </div>

            {/* State Indicator */}
            <div className="pt-6 border-t border-white/5 flex items-center justify-between mt-4">
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                </span>
                <span className="font-label-md text-on-surface-variant">System Status: Active</span>
              </div>
              <div className="text-right">
                <span className="font-label-md text-on-surface-variant block">Active RFQs</span>
                <span className="font-headline-md text-headline-md text-on-surface">
                  {activeBiddingQuotes.length}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* 3. System Logs & Intercepted Emails Card: span 12 */}
        <section className="col-span-12 glass-panel p-6 rounded-xl overflow-hidden flex flex-col max-h-[400px]">
          <div className="flex items-center justify-between mb-4">
            
            {/* Interactive Tabs instead of static title */}
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setActiveTab('logs')}
                className={`font-headline-md text-headline-md flex items-center gap-2 pb-1 border-b-2 transition-all ${
                  activeTab === 'logs' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined">terminal</span>
                System Logs &amp; Events
              </button>
              <button 
                onClick={() => setActiveTab('outbox')}
                className={`font-headline-md text-headline-md flex items-center gap-2 pb-1 border-b-2 transition-all ${
                  activeTab === 'outbox' ? 'border-primary text-primary font-bold' : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined">mail</span>
                SMTP Outbox Interceptor (Mailpit)
              </button>
            </div>

            {/* Context-aware header actions */}
            {activeTab === 'logs' ? (
              <div className="flex gap-4 text-[11px] font-mono text-on-surface-variant">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> INFO</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-secondary"></span> SUCCESS</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary"></span> WARN</span>
              </div>
            ) : (
              <button 
                onClick={fetchMailpitEmails} 
                disabled={mailpitLoading}
                className="flex items-center gap-1 px-3 py-1 bg-surface-container-high rounded text-xs text-on-surface hover:bg-surface-bright disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-xs ${mailpitLoading ? 'animate-spin' : ''}`}>refresh</span>
                Refresh
              </button>
            )}
          </div>

          {/* Tab Content 1: System Logs */}
          {activeTab === 'logs' && (
            <div className="flex-1 terminal-scroll overflow-y-auto bg-black/30 rounded-lg p-4 font-mono text-sm space-y-2 border border-white/5">
              {[...systemLogs].reverse().map((log, idx) => {
                const levelColor = log.level === 'SUCCESS' ? 'text-secondary' : log.level === 'WARN' ? 'text-tertiary' : 'text-primary'
                const timeStr = new Date(log.timestamp).toLocaleTimeString([], { hour12: false })

                return (
                  <div className="flex gap-4" key={idx}>
                    <span className="text-on-surface-variant opacity-50 shrink-0">[{timeStr}]</span>
                    <span className={`${levelColor} font-bold shrink-0 min-w-[65px]`}>{log.level}</span>
                    <span className="text-on-surface">{log.message}</span>
                  </div>
                )
              })}
              
              <div className="flex gap-4" id="dynamic-cursor">
                <span className="text-on-surface-variant opacity-50 shrink-0">[{new Date(now).toLocaleTimeString([], { hour12: false })}]</span>
                <span className="text-primary font-bold">INFO</span>
                <span className="animate-pulse w-2 h-4 bg-primary/50"></span>
              </div>
              <div ref={terminalEndRef} />
            </div>
          )}

          {/* Tab Content 2: Mailpit Emails */}
          {activeTab === 'outbox' && (
            <div className="flex-1 terminal-scroll overflow-y-auto bg-black/30 rounded-lg p-4 font-mono text-sm space-y-3 border border-white/5">
              {mailpitEmails.length > 0 ? (
                mailpitEmails.map((email, idx) => (
                  <div key={email.ID || idx} className="flex flex-col gap-2 p-3 bg-surface-container/60 rounded-lg border border-white/5">
                    <div className="flex justify-between text-xs text-on-surface-variant opacity-70">
                      <span>To: {email.To[0]?.Address}</span>
                      <span>{new Date(email.Created).toLocaleTimeString()}</span>
                    </div>
                    <div className="font-bold text-on-surface text-sm">
                      {email.Subject}
                    </div>
                    <div className="text-xs text-on-surface-variant bg-black/20 p-2 rounded whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {email.Snippet || "Rich HTML Content"}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-on-surface-variant py-12 flex flex-col items-center justify-center">
                  <span className="material-symbols-outlined text-3xl opacity-30 mb-2">mail</span>
                  <p className="font-semibold text-sm">No outgoing system emails intercepted yet.</p>
                  <p className="text-xs opacity-70 mt-1">Submit a customer request email to trigger outbound carrier RFQ emails.</p>
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          )}
        </section>

      </div>
    </div>
  )
}

export default Simulator
