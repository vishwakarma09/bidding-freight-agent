import React, { useState } from 'react'
import { useApp } from '../context/AppContext'

const Dashboard = () => {
  const { 
    quotes, analytics, loading, activeQuote, 
    historicalRag, selectQuote, handleManualOverride, handleApproval, carriers
  } = useApp()

  const [overrideStatus, setOverrideStatus] = useState('')
  const [overrideNotes, setOverrideNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [competitorInfo, setCompetitorInfo] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showOverrideForm, setShowOverrideForm] = useState(false)

  // Kanban column definitions
  const COLUMNS = [
    { id: 'intake', name: 'Intake', color: 'text-on-surface-variant', dotColor: 'bg-on-surface-variant/30', statuses: ['INTAKE'] },
    { id: 'out_to_carriers', name: 'Out to Carriers', color: 'text-primary', dotColor: 'bg-primary animate-pulse', statuses: ['OUT_TO_CARRIERS'] },
    { id: 're_bid', name: 'Re-Bid Round', color: 'text-tertiary', dotColor: 'bg-tertiary', statuses: ['RE_BID_ROUND'] },
    { id: 'awaiting_approval', name: 'Awaiting Approval', color: 'text-on-surface', dotColor: 'bg-on-surface', statuses: ['AWAITING_APPROVAL', 'FIRST_ROUND_RECEIVED', 'QUOTE_SENT'] },
    { id: 'approved', name: 'Approved', color: 'text-secondary', dotColor: 'bg-secondary', statuses: ['APPROVED', 'IN_TRANSIT', 'COMPLETED'] },
    { id: 'lost', name: 'Lost', color: 'text-error', dotColor: 'bg-error', statuses: ['LOST'] }
  ]

  // Filter quotes belonging to a specific Kanban column
  const getQuotesForColumn = (column) => {
    return quotes.filter(q => column.statuses.includes(q.status))
  }

  // Timer helper to show remaining time for bidding rounds
  const getTimerRemaining = (quote) => {
    let targetTime = null
    if (quote.status === 'OUT_TO_CARRIERS') targetTime = quote.first_round_ends_at
    if (quote.status === 'RE_BID_ROUND') targetTime = quote.rebid_round_ends_at
    
    if (!targetTime) return null
    
    const diff = new Date(targetTime) - new Date()
    if (diff <= 0) return 'Expired'
    
    const mins = Math.floor(diff / 60000)
    const secs = Math.floor((diff % 60000) / 1000)
    return `${mins}m ${secs}s`
  }

  const handleApplyOverride = () => {
    if (!overrideStatus) return
    handleManualOverride(activeQuote.id, overrideStatus, overrideNotes)
    setOverrideStatus('')
    setOverrideNotes('')
    setShowOverrideForm(false)
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

  const handleCloseModal = () => {
    selectQuote(null)
    setShowOverrideForm(false)
    setShowRejectForm(false)
  }

  const handleOverlayClick = (e) => {
    if (e.target.id === 'modal-overlay') {
      handleCloseModal()
    }
  }

  // Calculate similarity stats if we have RAG records
  const topMatch = historicalRag && historicalRag[0]
  const similarityScore = topMatch ? (topMatch.similarity * 100).toFixed(1) : '94.2'
  const historicalAvg = topMatch ? topMatch.sell_price : 4912
  const confidence = parseFloat(similarityScore) > 85 ? 'HIGH' : 'MEDIUM'
  const matchCount = historicalRag ? historicalRag.length : 1248

  return (
    <div className="relative min-h-screen">
      {/* Background Graphic */}
      <div 
        className="pipeline-bg absolute inset-0 z-0 opacity-[0.04] pointer-events-none bg-cover bg-center mix-blend-overlay"
        style={{ 
          backgroundImage: "url('https://lh3.googleusercontent.com/aida/AP1WRLuxsm_UtvwVRdXldvCPxmrIQmdZPXSQRwE9gyrdsV_k2n_RdUizOiKj3_iCNmgIP0TS7y6Ix3cenDXN5Gr3wh-5fUXD_tNaKlfe23QdjgkcIpGOA76lsfdIKh2N5Sl5o9lLMO-mUyjQ5YPT9r5yTUmlxjRSkOJXaODOZiuTUXGqHhVdYuy4WVsKMq50iUBNMmzd5Gezlgjuw60g_jtdXhZ3re6GotcyYOOUWLnGic3Gne83qphh-qEpO6w')",
          filter: "grayscale(100%) brightness(0.4)"
        }}
      ></div>

      <div className="relative z-10">
        {/* Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-bento-gap mb-8">
          {/* Metrics 1 */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-surface-container/40 backdrop-blur-md border border-white/5 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">payments</span>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase">LIVE</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-xs mb-1">Outstanding Receivables</h3>
            <p className="font-headline-md text-2xl font-bold text-on-surface">
              ${analytics ? (analytics.receivables ?? 0).toLocaleString() : '45,200'}
            </p>
            <div className="absolute -right-4 -bottom-4 opacity-5 text-on-surface">
              <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
            </div>
          </div>

          {/* Metrics 2 */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-surface-container/40 backdrop-blur-md border border-white/5 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-tertiary bg-tertiary/10 p-2 rounded-lg">account_balance_wallet</span>
              <span className="text-[10px] text-tertiary font-bold tracking-wider uppercase">PENDING</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-xs mb-1">Active Payables</h3>
            <p className="font-headline-md text-2xl font-bold text-on-surface">
              ${analytics ? (analytics.payables ?? 0).toLocaleString() : '38,500'}
            </p>
          </div>

          {/* Metrics 3 */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-surface-container/40 backdrop-blur-md border border-white/5 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-secondary bg-secondary/10 p-2 rounded-lg">trending_up</span>
              <span className="text-[10px] text-secondary font-bold tracking-wider uppercase">
                {analytics ? `+${analytics.markup ?? analytics.average_margin_percent ?? 15}%` : '+15%'}
              </span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-xs mb-1">Gross Margin Earned</h3>
            <p className="font-headline-md text-2xl font-bold text-on-surface">
              ${analytics ? (analytics.margin ?? analytics.gross_margin_value ?? 0).toLocaleString() : '6,700'}
            </p>
            <p className="text-secondary text-[10px] mt-1 font-bold uppercase tracking-wider">
              {analytics ? `${analytics.markup ?? analytics.average_margin_percent ?? 15}% Avg Markup` : '15% Avg Markup'}
            </p>
          </div>

          {/* Metrics 4 */}
          <div className="glass-panel p-6 rounded-2xl relative overflow-hidden bg-surface-container/40 backdrop-blur-md border border-white/5 shadow-lg">
            <div className="flex justify-between items-start mb-4">
              <span className="material-symbols-outlined text-primary bg-primary/10 p-2 rounded-lg">check_circle</span>
              <span className="text-[10px] text-primary font-bold tracking-wider uppercase">OPTIMAL</span>
            </div>
            <h3 className="text-on-surface-variant font-label-md text-xs mb-1">Proposal Conversion %</h3>
            <p className="font-headline-md text-2xl font-bold text-on-surface">
              {analytics ? `${analytics.conversion_rate ?? analytics.quote_to_approval_conversion_pct ?? 78}%` : '78%'}
            </p>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-bento-gap overflow-x-auto pb-8 custom-scrollbar">
          {COLUMNS.map(col => {
            const columnQuotes = getQuotesForColumn(col)
            return (
              <div key={col.id} className="kanban-col flex flex-col gap-4 min-w-[280px] flex-1">
                {/* Column Header */}
                <div className="flex items-center justify-between px-2">
                  <h4 className={`font-label-md text-xs uppercase tracking-widest flex items-center gap-2 font-semibold ${col.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${col.dotColor}`}></span>
                    {col.name} 
                    <span className="text-[10px] opacity-50 ml-1">({columnQuotes.length})</span>
                  </h4>
                </div>

                {/* Cards Container */}
                <div className="flex flex-col gap-3 min-h-[300px] rounded-2xl bg-black/10 p-2 border border-white/[0.02]">
                  {columnQuotes.length > 0 ? (
                    columnQuotes.map(quote => {
                      const remainingTimer = getTimerRemaining(quote)
                      return (
                        <div 
                          key={quote.id} 
                          onClick={() => selectQuote(quote.id)}
                          className="glass-panel p-4 rounded-xl border-l-4 border-primary/40 bg-surface-container-low/40 hover:bg-surface-container/60 hover:border-primary transition-all duration-200 hover:scale-[1.02] cursor-pointer shadow-sm relative group border border-white/5"
                        >
                          <div className="flex justify-between mb-3 items-center">
                            <span className="font-bold text-xs text-primary">{quote.id}</span>
                            {remainingTimer && (
                              <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded font-bold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[12px]">timer</span> 
                                {remainingTimer}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-sm text-on-surface mb-1 truncate">
                            {quote.customer?.company_name || quote.customer?.name || 'Unknown Client'}
                          </p>
                          <p className="text-xs text-on-surface-variant mb-3 truncate">
                            {quote.origin} to {quote.destination}
                          </p>
                          <div className="flex justify-between items-center pt-3 border-t border-white/5">
                            <span className="text-[11px] text-on-surface-variant">
                              {(quote.weight_lbs || 0).toLocaleString()} lbs | Cl {quote.freight_class || '70'}
                            </span>
                            <span className="font-bold text-xs text-primary">
                              {['OUT_TO_CARRIERS', 'RE_BID_ROUND'].includes(quote.status) ? (
                                <span className="text-primary italic animate-pulse">Bidding...</span>
                              ) : (
                                `$${(quote.sell_price || quote.cost_price || 0).toLocaleString()}`
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <div className="flex-grow flex items-center justify-center border border-dashed border-white/5 rounded-xl p-8">
                      <p className="text-on-surface-variant/30 text-xs italic">No quotes</p>
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
        <div 
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4" 
          id="modal-overlay" 
          onClick={handleOverlayClick}
        >
          <div 
            className="glass-panel max-w-4xl w-full max-h-[90vh] rounded-3xl overflow-hidden flex flex-col shadow-2xl scale-100 transition-transform bg-surface-container/90 border border-white/10" 
            id="modal-content"
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-primary text-2xl">description</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Quote Details: {activeQuote.id}</h3>
                  <p className="text-xs text-on-surface-variant">
                    {activeQuote.customer?.company_name || activeQuote.customer?.name} | {activeQuote.origin} &rarr; {activeQuote.destination} | {(activeQuote.weight_lbs || 0).toLocaleString()} lbs
                  </p>
                </div>
              </div>
              <button 
                className="text-on-surface-variant hover:text-on-surface p-2 bg-white/5 rounded-full transition-colors active:scale-95" 
                onClick={handleCloseModal}
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Specs Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Dimensions / Accessorials</p>
                  <p className="font-bold text-on-surface">{activeQuote.dimensions || '53ft Dry Van'} {activeQuote.accessorials ? `(${activeQuote.accessorials})` : ''}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Hazardous Material</p>
                  <p className="font-bold text-on-surface">{activeQuote.hazmat ? 'Yes (HAZMAT)' : 'No'}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Sell Price (Client Target)</p>
                  <p className="font-bold text-primary">${(activeQuote.sell_price || 0).toLocaleString()}</p>
                </div>
              </div>

              {/* RAG Lane Similarity Section */}
              <div>
                <h4 className="font-label-md text-xs text-on-surface uppercase tracking-widest mb-4 flex items-center gap-2 font-bold">
                  <span className="material-symbols-outlined text-primary text-[16px]">psychology</span>
                  PGVECTOR RAG LANE SIMILARITY
                </h4>
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex gap-8">
                    <div>
                      <p className="text-[10px] text-primary/70 uppercase mb-1">Similarity Score</p>
                      <p className="text-2xl font-bold text-primary">{similarityScore}%</p>
                    </div>
                    <div className="border-l border-primary/20 pl-8">
                      <p className="text-[10px] text-primary/70 uppercase mb-1">Historical Avg Lane Price</p>
                      <p className="text-2xl font-bold text-on-surface">${(historicalAvg || 0).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="bg-primary text-on-primary text-[10px] px-3 py-1 rounded-full font-bold">
                      CONFIDENCE: {confidence}
                    </span>
                    <p className="text-[11px] text-primary/60 mt-2">Based on {matchCount} similar lane records</p>
                  </div>
                </div>
              </div>

              {/* Manual Override Controls */}
              {showOverrideForm && (
                <div className="bg-surface-container-high/60 border border-white/10 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-on-surface">Execute Manual Pipeline Override</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant mb-1 font-semibold">Target Stage</label>
                      <select 
                        value={overrideStatus}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                      >
                        <option value="">-- Select Status --</option>
                        <option value="INTAKE">Intake</option>
                        <option value="OUT_TO_CARRIERS">Out to Carriers</option>
                        <option value="RE_BID_ROUND">Re-Bid Round</option>
                        <option value="AWAITING_APPROVAL">Awaiting Approval</option>
                        <option value="APPROVED">Approved</option>
                        <option value="LOST">Lost</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant mb-1 font-semibold">Override Reason / Audit Notes</label>
                      <textarea
                        value={overrideNotes}
                        onChange={(e) => setOverrideNotes(e.target.value)}
                        placeholder="Enter justification notes for logging transitions..."
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface h-12 focus:outline-none focus:border-primary resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setShowOverrideForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleApplyOverride}
                      disabled={!overrideStatus}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-primary text-on-primary hover:brightness-110 disabled:opacity-50"
                    >
                      Apply Transition
                    </button>
                  </div>
                </div>
              )}

              {/* Reject / Lost Reason Form */}
              {showRejectForm && (
                <div className="bg-error-container/10 border border-error/20 rounded-2xl p-6 space-y-4">
                  <h4 className="font-bold text-xs uppercase tracking-widest text-error">Mark Quote as Lost</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-on-surface-variant mb-1 font-semibold">Lost Reason</label>
                      <input 
                        type="text"
                        placeholder="e.g. Price too high, Transit too slow..."
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-on-surface-variant mb-1 font-semibold">Competitor Information (Optional)</label>
                      <input
                        type="text"
                        placeholder="e.g. C.H. Robinson, TQL..."
                        value={competitorInfo}
                        onChange={(e) => setCompetitorInfo(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-error"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button 
                      onClick={() => setShowRejectForm(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:text-on-surface"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleReject}
                      className="px-4 py-2 rounded-lg text-xs font-bold bg-error text-white hover:brightness-110"
                    >
                      Confirm Lost Status
                    </button>
                  </div>
                </div>
              )}

              {/* Active Carrier Bids */}
              <div>
                <h4 className="font-label-md text-xs text-on-surface uppercase tracking-widest mb-4 font-bold">ACTIVE CARRIER BIDS</h4>
                <div className="space-y-3">
                  {activeQuote.bids && activeQuote.bids.length > 0 ? (
                    activeQuote.bids.map(bid => {
                      const carrierInfo = carriers.find(c => c.id === bid.carrier_id) || { name: `Carrier #${bid.carrier_id}`, competitiveness_score: 4.8 }
                      const isWinning = bid.is_winning
                      return (
                        <div 
                          key={bid.id} 
                          className={`flex items-center justify-between p-4 bg-white/5 border ${isWinning ? 'border-secondary/30 bg-secondary/5' : 'border-white/5'} rounded-xl hover:border-primary/30 transition-colors`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg ${isWinning ? 'bg-secondary/10' : 'bg-primary/10'} flex items-center justify-center`}>
                              <span className={`material-symbols-outlined ${isWinning ? 'text-secondary' : 'text-primary'}`}>local_shipping</span>
                            </div>
                            <div>
                              <p className="font-bold text-on-surface">{carrierInfo.name}</p>
                              <p className="text-[11px] text-on-surface-variant">Round {bid.round} | Transit: {bid.transit_time_days || 3} days</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-bold ${isWinning ? 'text-secondary' : 'text-on-surface'}`}>${(bid.bid_amount || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-on-surface-variant">{bid.service_level || 'Standard LTL'}</p>
                          </div>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-xs text-on-surface-variant italic text-center py-6 bg-black/10 rounded-xl border border-white/5">
                      No active carrier bids received for this quote request yet.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 border-t border-white/10 bg-black/20 flex gap-4 justify-end">
              <button 
                onClick={() => {
                  setShowOverrideForm(!showOverrideForm)
                  setShowRejectForm(false)
                }}
                className="px-6 py-3 rounded-xl font-semibold text-xs text-on-surface-variant hover:text-on-surface transition-colors hover:bg-white/5"
              >
                Manual Override
              </button>
              
              {/* Lost Action */}
              {activeQuote.status !== 'LOST' && (
                <button 
                  onClick={() => {
                    setShowRejectForm(!showRejectForm)
                    setShowOverrideForm(false)
                  }}
                  className="px-6 py-3 rounded-xl font-semibold text-xs border border-error/30 text-error hover:bg-error/5 transition-colors"
                >
                  Mark as Lost
                </button>
              )}

              {/* Approve Action */}
              {['AWAITING_APPROVAL', 'QUOTE_SENT', 'FIRST_ROUND_RECEIVED'].includes(activeQuote.status) && (
                <button 
                  onClick={handleApprove}
                  className="px-8 py-3 rounded-xl font-bold text-xs bg-secondary text-on-secondary hover:brightness-110 transition-all shadow-[0_0_15px_rgba(78,222,163,0.3)]"
                >
                  Approve & Book Quote
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
