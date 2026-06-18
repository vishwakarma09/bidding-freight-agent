import React, { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { Mail, ArrowRight, RefreshCw, Send, CheckSquare, Sparkles, ExternalLink } from 'lucide-react'
import axios from 'axios'

const Simulator = () => {
  const { quotes, carriers, customers, handleSendMockEmail, addNotification, fetchData } = useApp()

  const [inquirySender, setInquirySender] = useState('customer_b@example.com')
  const [inquirySubject, setInquirySubject] = useState('Freight Quote Request: LTL shipment to Chicago')
  const [inquiryBody, setInquiryBody] = useState(
    "Hi broker,\n\nWe need a rate quote for shipping 4 pallets of consumer goods from Los Angeles, CA to Chicago, IL.\n\nWeight is 3500 lbs, Class 70. Accessorials: liftgate required at delivery. Target pickup date is June 28, 2026.\n\nThanks,\nAMZPrep Client B"
  )

  const [activeQuoteId, setActiveQuoteId] = useState('')
  const [carrierId, setCarrierId] = useState('')
  const [bidAmount, setBidAmount] = useState('1150')
  const [transitDays, setTransitDays] = useState('3')
  const [carrierNotes, setCarrierNotes] = useState('We can service this lane. Rate includes standard liftgate accessorial.')

  const [mailpitEmails, setMailpitEmails] = useState([])
  const [mailpitLoading, setMailpitLoading] = useState(false)

  // Pre-configured templates
  const templates = [
    {
      name: "Standard LTL (LA to Chicago)",
      sender: "customer_b@example.com",
      subject: "Freight Quote Request: LTL shipment to Chicago",
      body: "Hi broker,\n\nWe need a rate quote for shipping 4 pallets of consumer goods from Los Angeles, CA to Chicago, IL.\n\nWeight is 3500 lbs, Class 70. Accessorials: liftgate required at delivery. Target pickup date is June 28, 2026.\n\nThanks,\nAMZPrep Client B"
    },
    {
      name: "Hazmat Shipment (Dallas to Houston)",
      sender: "customer_a@example.com",
      subject: "Hazmat Class 9 rate query",
      body: "Hello,\n\nPlease provide carrier pricing for a hazmat shipment of class 9 batteries from Dallas, TX to Houston, TX.\nTotal weight is 4800 lbs, freight class 85. Require liftgate pickup and inside delivery. Needed pickup June 29.\n\nRegards,\nAMZPrep Client A"
    },
    {
      name: "Residential Delivery (NY to Seattle)",
      sender: "customer_c@example.com",
      subject: "Quote: Pallets from New York to Seattle",
      body: "Greetings,\n\nI need to ship residential freight from New York, NY to Seattle, WA.\n3 pallets, 1200 lbs, class 100. Must have liftgate delivery at destination. Pickup is scheduled for July 02.\n\nBest,\nClient C"
    }
  ]

  const applyTemplate = (t) => {
    setInquirySender(t.sender)
    setInquirySubject(t.subject)
    setInquiryBody(t.body)
  }

  // Fetch outgoing emails caught by Mailpit
  const fetchMailpitEmails = async () => {
    setMailpitLoading(true)
    try {
      // Mailpit runs on host machine port 18025 (port 8025 in container)
      const res = await axios.get('http://localhost:18025/api/v1/messages')
      setMailpitEmails(res.data.messages || [])
    } catch (err) {
      console.warn("Mailpit API offline or unreachable from client. Local mock logs will be used.")
    } finally {
      setMailpitLoading(false)
    }
  }

  useEffect(() => {
    fetchMailpitEmails()
    const interval = setInterval(fetchMailpitEmails, 8000)
    return () => clearInterval(interval)
  }, [])

  // Filter quotes currently awaiting bids
  const activeBiddingQuotes = quotes.filter(q => 
    ['OUT_TO_CARRIERS', 'RE_BID_ROUND'].includes(q.status)
  )

  useEffect(() => {
    if (activeBiddingQuotes.length > 0 && !activeQuoteId) {
      setActiveQuoteId(activeBiddingQuotes[0].id)
    }
  }, [activeBiddingQuotes, activeQuoteId])

  useEffect(() => {
    if (carriers.length > 0 && !carrierId) {
      setCarrierId(carriers[0].id)
    }
  }, [carriers, carrierId])

  const handleTriggerInquiry = async () => {
    try {
      await handleSendMockEmail(
        inquirySender,
        'broker@amzprep.com',
        inquirySubject,
        inquiryBody
      )
      fetchMailpitEmails()
    } catch (err) {
      // Notification handled in context
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
    const bidSubject = `Re: RFQ: Freight Quote ${activeQuoteId} - ${selectedQuote.origin} to ${selectedQuote.destination}`

    const bidBody = `
      Hi Broker team,
      
      Here is our rate for quote ${activeQuoteId}:
      Bid Amount: $${bidAmount}
      Transit Days: ${transitDays}
      
      Notes: ${carrierNotes}
      
      Best,
      ${selectedCarrier.name} pricing desk
    `

    try {
      await handleSendMockEmail(
        selectedCarrier.email,
        'broker@amzprep.com',
        bidSubject,
        bidBody
      )
      fetchMailpitEmails()
    } catch (err) {
      // Notification handled in context
    }
  }

  return (
    <div className="simulator-container" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
      
      {/* Left Column: Email composors */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Section 1: Customer Intake simulator */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title"><Sparkles size={16} /> 1. Simulate Customer Request Email</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Emulates a customer sending a freight request to <b>broker@amzprep.com</b>. The engine will parse this body using Cerebras (or regex fallback) and generate a pipeline quote.
          </p>

          {/* Quick template pickers */}
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
            {templates.map((t, idx) => (
              <button 
                key={idx} 
                className="sync-button" 
                style={{ fontSize: '11px', whiteSpace: 'nowrap' }}
                onClick={() => applyTemplate(t)}
              >
                Template: {t.name}
              </button>
            ))}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-lbl">Sender (Customer Email)</label>
              <select 
                className="input-field" 
                value={inquirySender}
                onChange={e => setInquirySender(e.target.value)}
              >
                {customers.map(c => (
                  <option key={c.id} value={c.email}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-lbl">Recipient Mailbox</label>
              <input className="input-field" value="broker@amzprep.com" disabled />
            </div>
            <div className="form-group full-width">
              <label className="form-lbl">Email Subject</label>
              <input 
                className="input-field" 
                value={inquirySubject}
                onChange={e => setInquirySubject(e.target.value)}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-lbl">Email Body (Logistics Specs)</label>
              <textarea 
                className="input-field text-area" 
                value={inquiryBody}
                onChange={e => setInquiryBody(e.target.value)}
              />
            </div>
          </div>

          <button className="action-btn primary" style={{ width: '100%' }} onClick={handleTriggerInquiry}>
            <Send size={16} /> Ingest Customer Request Email
          </button>
        </div>

        {/* Section 2: Carrier Bid Simulator */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title"><Send size={16} /> 2. Simulate Carrier RFQ Bid Response</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
            Emulates a carrier replying to a quote request. This will register a bid for the selected quote in the current bidding round.
          </p>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-lbl">Active Quote out for bids</label>
              <select 
                className="input-field" 
                value={activeQuoteId}
                onChange={e => setActiveQuoteId(e.target.value)}
              >
                {activeBiddingQuotes.map(q => (
                  <option key={q.id} value={q.id}>{q.id} ({q.origin.split(',')[0]} to {q.destination.split(',')[0]} - {q.status})</option>
                ))}
                {activeBiddingQuotes.length === 0 && (
                  <option value="">No active bidding quotes</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label className="form-lbl">Carrier Responder</label>
              <select 
                className="input-field" 
                value={carrierId}
                onChange={e => setCarrierId(e.target.value)}
              >
                {carriers.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-lbl">Bid Cost ($)</label>
              <input 
                className="input-field" 
                type="number"
                value={bidAmount}
                onChange={e => setBidAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-lbl">Transit Time (Days)</label>
              <input 
                className="input-field" 
                type="number"
                value={transitDays}
                onChange={e => setTransitDays(e.target.value)}
              />
            </div>
            <div className="form-group full-width">
              <label className="form-lbl">Bid Notes / Message</label>
              <input 
                className="input-field" 
                value={carrierNotes}
                onChange={e => setCarrierNotes(e.target.value)}
              />
            </div>
          </div>

          <button 
            className="action-btn success" 
            style={{ width: '100%' }} 
            onClick={handleTriggerBid}
            disabled={activeBiddingQuotes.length === 0}
          >
            <Send size={16} /> Submit Carrier Quote Reply
          </button>
        </div>

      </div>

      {/* Right Column: Outbox Interceptor Log (Mailpit) */}
      <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 className="section-title"><Mail size={16} /> SMTP Outbox Interceptor (Mailpit)</h3>
          <button className="sync-button" onClick={fetchMailpitEmails} disabled={mailpitLoading}>
            <RefreshCw size={12} className={mailpitLoading ? 'spinning' : ''} />
          </button>
        </div>
        
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
          When the orchestrator transitions states, it sends SMTP emails to carriers (RFQs) and customers (Quotes). Mailpit catches them instantly. 
          <a href="http://localhost:18025" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', marginLeft: '6px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            Open Mailpit UI <ExternalLink size={10} />
          </a>
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '560px', flexGrow: 1 }}>
          {mailpitEmails.length > 0 ? (
            mailpitEmails.map((email, idx) => (
              <div 
                key={email.ID || idx} 
                style={{ 
                  background: 'rgba(255, 255, 255, 0.02)', 
                  border: '1px solid var(--border-glass)', 
                  borderRadius: '6px', 
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)' }}>
                  <span>To: {email.To[0]?.Address}</span>
                  <span>{new Date(email.Created).toLocaleTimeString()}</span>
                </div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>
                  {email.Subject}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(0,0,0,0.2)', padding: '6px 8px', borderRadius: '4px', whiteSpace: 'pre-wrap', maxHeight: '100px', overflowY: 'auto' }}>
                  {email.Snippet || "Rich HTML Content"}
                </div>
              </div>
            ))
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
              No outgoing system emails intercepted yet.
              <div style={{ fontSize: '11px', marginTop: '4px' }}>Submit a customer request email to trigger RFQ broadcasts.</div>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default Simulator
