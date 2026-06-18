import React, { useState } from 'react'
import { useApp } from '../context/AppContext'
import { 
  DollarSign, Percent, Timer, UserCheck, MapPin, 
  ChevronRight, Calendar, AlertTriangle, ShieldCheck, 
  History, Settings, Eye, Info, CheckCircle2, XCircle
} from 'lucide-react'

const Dashboard = () => {
  const { 
    quotes, analytics, loading, activeQuote, 
    historicalRag, selectQuote, handleManualOverride, handleApproval 
  } = useApp()

  const [overrideStatus, setOverrideStatus] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [competitorInfo, setCompetitorInfo] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)

  // Stage definition array
  const STAGES = [
    { id: 'INTAKE', name: 'Intake' },
    { id: 'OUT_TO_CARRIERS', name: 'Out to Carriers' },
    { id: 'FIRST_ROUND_RECEIVED', name: 'First Round Recv' },
    { id: 'RE_BID_ROUND', name: 'Re-Bid Round' },
    { id: 'QUOTE_SENT', name: 'Quote Sent' },
    { id: 'AWAITING_APPROVAL', name: 'Awaiting Approval' },
    { id: 'APPROVED', name: 'Approved' },
    { id: 'IN_TRANSIT', name: 'In Transit' },
    { id: 'COMPLETED', name: 'Completed' },
    { id: 'LOST', name: 'Lost' }
  ]

  // Helper to categorize quotes into columns
  const getQuotesByStage = (stageId) => {
    return quotes.filter(q => q.status === stageId)
  }

  // Timer helper
  const getTimerRemaining = (quote) => {
    let targetTime = null
    if (quote.status === 'OUT_TO_CARRIERS') targetTime = quote.first_round_ends_at
    if (quote.status === 'RE_BID_ROUND') targetTime = quote.rebid_round_ends_at
    
    if (!targetTime) return null
    
    const diff = new Date(targetTime) - new Date()
    if (diff <= 0) return 'Timer Expired'
    
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s remaining`
  }

  const handleApplyOverride = () => {
    if (!overrideStatus) return
    handleManualOverride(activeQuote.id, overrideStatus, overrideNotes)
    setOverrideStatus('')
    setOverrideNotes('')
  }

  const handleApprove = () => {
    handleApproval(activeQuote.id, true)
  }

  const handleReject = () => {
    handleApproval(activeQuote.id, false, rejectReason, competitorInfo)
    setShowRejectForm(false)
    setRejectReason('')
    setCompetitorInfo('')
  }

  return (
    <div className="dashboard-container">
      {/* Top Metrics Row */}
      {analytics && (
        <div className="metrics-grid">
          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Outstanding Receivables</span>
              <div className="metric-icon-box receivables"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">${analytics.receivables.toLocaleString()}</div>
            <div className="metric-trend up">Pending billing collection</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Active Payables</span>
              <div className="metric-icon-box payables"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">${analytics.payables.toLocaleString()}</div>
            <div className="metric-trend neutral">Owed to carriers</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Gross Margin Earned</span>
              <div className="metric-icon-box margin"><Percent size={16} /></div>
            </div>
            <div className="metric-val">${analytics.gross_margin_value.toLocaleString()}</div>
            <div className="metric-trend up">({analytics.average_margin_percent}% Avg Markup)</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Proposal Conversion %</span>
              <div className="metric-icon-box conversion"><UserCheck size={16} /></div>
            </div>
            <div className="metric-val">{analytics.quote_to_approval_conversion_pct}%</div>
            <div className="metric-trend neutral">Quote to Approve rate</div>
          </div>
        </div>
      )}

      {/* Kanban Pipeline Board */}
      <div className="pipeline-board-container">
        <div className="pipeline-board">
          {STAGES.map(stage => {
            const stageQuotes = getQuotesByStage(stage.id)
            return (
              <div key={stage.id} className="stage-column">
                <div className="stage-column-header">
                  <span className="stage-title">{stage.name}</span>
                  <span className="stage-count">{stageQuotes.length}</span>
                </div>
                <div className="cards-container">
                  {stageQuotes.map(quote => (
                    <div 
                      key={quote.id} 
                      className="glass-card quote-card"
                      onClick={() => selectQuote(quote.id)}
                    >
                      <div className="quote-card-header">
                        <span className="quote-id">{quote.id}</span>
                        <span className="quote-markup-badge">{quote.customer?.name?.replace("AMZPrep ", "")?.split(" (")?.[0] || 'Guest'}</span>
                      </div>
                      <div className="quote-lane">
                        <div className="lane-location">
                          {quote.origin.split(',')[0]} <ChevronRight size={10} className="lane-arrow" /> {quote.destination.split(',')[0]}
                        </div>
                      </div>
                      <div className="quote-card-details">
                        <span>Weight: {quote.weight_lbs.toLocaleString()} lbs</span>
                        <span>Class: {quote.freight_class || 'N/A'}</span>
                      </div>
                      
                      <div className="quote-card-footer">
                        {quote.sell_price > 0 ? (
                          <span className="quote-price">${quote.sell_price.toLocaleString()}</span>
                        ) : (
                          <span className="quote-price" style={{ color: 'var(--text-muted)' }}>Bidding</span>
                        )}
                        
                        {getTimerRemaining(quote) && (
                          <span className="quote-timer-alert">
                            <Timer size={10} />
                            {getTimerRemaining(quote)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {stageQuotes.length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '11px', textAlign: 'center', marginTop: '20px' }}>
                      Empty stage
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quote Details Modal */}
      {activeQuote && (
        <div className="modal-overlay" onClick={() => selectQuote(null)}>
          <div className="glass-card modal-container" onClick={e => e.stopPropagation()}>
            <header className="modal-header">
              <div className="modal-title-row">
                <span className="modal-quote-id">Quote details: {activeQuote.id}</span>
                <span className={`badge ${activeQuote.status.toLowerCase()}`}>{activeQuote.status}</span>
              </div>
              <button className="modal-close" onClick={() => selectQuote(null)}>
                <XCircle size={22} />
              </button>
            </header>

            <div className="modal-body">
              <div className="modal-grid">
                {/* Left Side: General Info, Bids, and RAG */}
                <div>
                  {/* Shipment Details Section */}
                  <div className="detail-section">
                    <h3 className="section-title"><Info size={14} /> Shipment Specifications</h3>
                    <div className="shipment-details-grid">
                      <div className="detail-item">
                        <span className="detail-lbl">Customer</span>
                        <span className="detail-val">{activeQuote.customer?.name} ({activeQuote.customer?.email})</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-lbl">Pickup Date</span>
                        <span className="detail-val">
                          <Calendar size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          {new Date(activeQuote.pickup_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-lbl">Origin / Destination</span>
                        <span className="detail-val">{activeQuote.origin} to {activeQuote.destination}</span>
                      </div>
                      <div className="detail-item">
                        <span className="detail-lbl">Weight & Class</span>
                        <span className="detail-val">{activeQuote.weight_lbs.toLocaleString()} lbs | Class {activeQuote.freight_class || 'N/A'}</span>
                      </div>
                      {activeQuote.accessorials && (
                        <div className="detail-item" style={{ gridColumn: 'span 2' }}>
                          <span className="detail-lbl">Accessorials required</span>
                          <span className="detail-val" style={{ color: 'var(--warning)' }}>{activeQuote.accessorials}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* pgvector RAG Benchmarking Section */}
                  <div className="detail-section">
                    <h3 className="section-title"><ShieldCheck size={14} /> pgvector RAG Lane Benchmark</h3>
                    {historicalRag && historicalRag.length > 0 ? (
                      <div className="rag-benchmarks-list">
                        {historicalRag.map((rag, i) => (
                          <div key={i} className="benchmark-card">
                            <div className="benchmark-header">
                              <span className="benchmark-match">Similarity Match: {rag.similarity}%</span>
                              <span className={`badge ${rag.status.toLowerCase()}`}>{rag.status}</span>
                            </div>
                            <div className="benchmark-lane">
                              {rag.origin} to {rag.destination} ({rag.weight_lbs} lbs)
                            </div>
                            <div className="benchmark-prices">
                              <span>Carrier: {rag.winning_carrier}</span>
                              <span>Cost: ${rag.cost_price} | Sell: <b>${rag.sell_price}</b> (Margin: {rag.margin_pct}%)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--text-muted)' }}>
                        No historical quotes found on similar lanes. As quotes complete, similarity matching automatically activates.
                      </p>
                    )}
                  </div>

                  {/* Carrier Bids Section */}
                  <div className="detail-section">
                    <h3 className="section-title"><DollarSign size={14} /> Carrier Quotes & Bids</h3>
                    {activeQuote.bids && activeQuote.bids.length > 0 ? (
                      <div className="bids-list">
                        {activeQuote.bids.map(bid => (
                          <div key={bid.id} className={`bid-item ${bid.is_winning ? 'winner' : ''}`}>
                            <div>
                              <span className="bid-carrier-name">{bid.carrier?.name}</span>
                              <div className="bid-carrier-sub">
                                Transit: {bid.transit_time_days} days | Round {bid.round} | {bid.service_level}
                              </div>
                            </div>
                            <div className="bid-amount-col">
                              <span className={`bid-val-lbl ${bid.is_winning ? 'win' : ''}`}>
                                ${bid.bid_amount.toLocaleString()}
                              </span>
                              {bid.is_winning && <div style={{ fontSize: '9px', fontWeight: 'bold' }}>WINNING BID</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ fontStyle: 'italic', fontSize: '12px', color: 'var(--text-muted)' }}>
                        RFQ active. No bids received yet. Use the Simulator page to trigger carrier replies.
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Side: State Transitions Audit & Action Panel */}
                <div>
                  {/* Actions Panel */}
                  <div className="detail-section">
                    <h3 className="section-title"><Settings size={14} /> Workflow Console</h3>
                    <div className="control-actions">
                      {/* Customer approval trigger */}
                      {activeQuote.status === 'AWAITING_APPROVAL' && (
                        <>
                          <button className="action-btn success" onClick={handleApprove}>
                            <CheckCircle2 size={16} /> Approve (Book Carrier)
                          </button>
                          
                          {!showRejectForm ? (
                            <button className="action-btn danger" onClick={() => setShowRejectForm(true)}>
                              <XCircle size={16} /> Reject (Mark Lost)
                            </button>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <div className="form-group">
                                <label className="form-lbl">Lost Reason</label>
                                <input 
                                  className="input-field" 
                                  placeholder="e.g. Rate too high, Carrier performance" 
                                  value={rejectReason}
                                  onChange={e => setRejectReason(e.target.value)}
                                />
                              </div>
                              <div className="form-group">
                                <label className="form-lbl">Competitor Info</label>
                                <input 
                                  className="input-field" 
                                  placeholder="e.g. UPS matched at $850" 
                                  value={competitorInfo}
                                  onChange={e => setCompetitorInfo(e.target.value)}
                                />
                              </div>
                              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                                <button className="action-btn danger" style={{ padding: '6px', flex: 1, fontSize: '11px' }} onClick={handleReject}>Confirm Loss</button>
                                <button className="action-btn secondary" style={{ padding: '6px', flex: 1, fontSize: '11px' }} onClick={() => setShowRejectForm(false)}>Cancel</button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Display Financial outcome once priced */}
                      {activeQuote.sell_price > 0 && (
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-glass)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Carrier Cost:</span>
                            <span>${activeQuote.cost_price}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span>Customer Rate ({activeQuote.markup_percent}% markup):</span>
                            <span>${activeQuote.sell_price}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--success)' }}>
                            <span>Broker Profit:</span>
                            <span>${activeQuote.margin_amt} ({activeQuote.margin_pct}%)</span>
                          </div>
                        </div>
                      )}

                      {/* Manual Override Controls */}
                      <div style={{ marginTop: '14px', borderTop: '1px solid var(--border-glass)', paddingTop: '14px' }}>
                        <h4 className="form-lbl" style={{ marginBottom: '8px', fontWeight: 'bold' }}>MANUAL STATE OVERRIDE</h4>
                        <div className="form-group" style={{ marginBottom: '8px' }}>
                          <select 
                            className="input-field" 
                            value={overrideStatus}
                            onChange={e => setOverrideStatus(e.target.value)}
                          >
                            <option value="">Select Target Stage</option>
                            {STAGES.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <input 
                            className="input-field" 
                            placeholder="Reason for manual transition override" 
                            value={overrideNotes}
                            onChange={e => setOverrideNotes(e.target.value)}
                          />
                        </div>
                        <button 
                          className="action-btn secondary" 
                          style={{ width: '100%', padding: '8px', fontSize: '12px' }}
                          onClick={handleApplyOverride}
                          disabled={!overrideStatus}
                        >
                          Execute Force Transition
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* State Transition History Section */}
                  <div className="detail-section">
                    <h3 className="section-title"><History size={14} /> Audit Trail Log</h3>
                    <div className="timeline-list">
                      {activeQuote.transitions && activeQuote.transitions.map(t => (
                        <div key={t.id} className="timeline-item">
                          <div className="timeline-header">
                            <span className="timeline-states">{t.from_status} → {t.to_status}</span>
                            <span className="timeline-time">
                              {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          {t.notes && <div className="timeline-notes">{t.notes}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
