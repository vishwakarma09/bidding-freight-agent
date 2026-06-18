import React from 'react'
import { useApp } from '../context/AppContext'
import { DollarSign, ShieldAlert, FileText, Check, ExternalLink } from 'lucide-react'
import * as api from '../services/api'

const Billing = () => {
  const { quotes, analytics, fetchData, addNotification } = useApp()

  // Filter quotes that are in active booking stages (Approved, In Transit, Completed)
  const billingQuotes = quotes.filter(q => 
    ["APPROVED", "IN_TRANSIT", "COMPLETED"].includes(q.status)
  )

  const handleMarkAsPaid = async (quoteId) => {
    try {
      // Direct manual override to COMPLETED (which simulates paid status)
      await api.manualOverride(quoteId, 'COMPLETED', 'Payment verified - completing transaction lifecycle')
      addNotification(`Invoice for ${quoteId} marked as PAID. Scheduling pickup!`)
      fetchData()
    } catch (err) {
      console.error(err)
      addNotification("Failed to update invoice payment", "error")
    }
  }

  return (
    <div className="billing-container">
      {/* Financial Metrics Summary */}
      {analytics && (
        <div className="metrics-grid">
          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Total Outstanding Receivables</span>
              <div className="metric-icon-box receivables"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">
              ${quotes.filter(q => q.payment_status === 'PENDING').reduce((sum, q) => sum + q.sell_price, 0).toFixed(2)}
            </div>
            <div className="metric-trend down">Uncollected customer invoices</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Total Carrier Payables</span>
              <div className="metric-icon-box payables"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">
              ${quotes.filter(q => q.payment_status === 'PENDING').reduce((sum, q) => sum + q.cost_price, 0).toFixed(2)}
            </div>
            <div className="metric-trend neutral">Owed to booked carriers</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Total Margin Captured</span>
              <div className="metric-icon-box margin"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">
              ${billingQuotes.reduce((sum, q) => sum + q.margin_amt, 0).toFixed(2)}
            </div>
            <div className="metric-trend up">Gross broker profit</div>
          </div>

          <div className="glass-card metric-card">
            <div className="metric-label-row">
              <span className="metric-lbl">Avg Margin %</span>
              <div className="metric-icon-box conversion"><DollarSign size={16} /></div>
            </div>
            <div className="metric-val">
              {analytics.average_margin_percent}%
            </div>
            <div className="metric-trend neutral">On all won business</div>
          </div>
        </div>
      )}

      {/* Main Billing Table */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '16px' }}><FileText size={16} /> Invoice Ledger & Reconciliation</h3>
        
        {billingQuotes.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-th">Deal ID</th>
                  <th className="table-th">Customer</th>
                  <th className="table-th">Carrier</th>
                  <th className="table-th" style={{ textAlign: 'right' }}>Carrier Cost</th>
                  <th className="table-th" style={{ textAlign: 'right' }}>Sell Rate</th>
                  <th className="table-th" style={{ textAlign: 'right' }}>Broker Margin</th>
                  <th className="table-th">BOL Document</th>
                  <th className="table-th">PandaDoc Invoice</th>
                  <th className="table-th">Payment</th>
                  <th className="table-th">Reconciliation</th>
                </tr>
              </thead>
              <tbody>
                {billingQuotes.map(quote => (
                  <tr key={quote.id} className="table-tr">
                    <td className="table-td" style={{ fontFamily: 'var(--font-display)', fontWeight: 'bold' }}>{quote.id}</td>
                    <td className="table-td">{quote.customer?.name?.replace("Dispatch ", "")?.split(" (")?.[0] || 'Guest'}</td>
                    <td className="table-td">{quote.winning_carrier?.name}</td>
                    <td className="table-td" style={{ textAlign: 'right', fontFamily: 'var(--font-display)' }}>
                      ${quote.cost_price.toFixed(2)}
                    </td>
                    <td className="table-td" style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: '600', color: 'var(--success)' }}>
                      ${quote.sell_price.toFixed(2)}
                    </td>
                    <td className="table-td" style={{ textAlign: 'right', color: 'var(--primary)', fontSize: '13px' }}>
                      ${quote.margin_amt.toFixed(2)} <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>({quote.margin_pct}%)</span>
                    </td>
                    <td className="table-td">
                      {quote.bol_url ? (
                        <a href={quote.bol_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '13px' }}>
                          View BOL <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Generating...</span>
                      )}
                    </td>
                    <td className="table-td">
                      {quote.invoice_url ? (
                        <a href={quote.invoice_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontSize: '13px' }}>
                          Draft Invoice <ExternalLink size={12} />
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Generating...</span>
                      )}
                    </td>
                    <td className="table-td">
                      <span className={`badge ${quote.payment_status.toLowerCase()}`}>
                        {quote.payment_status}
                      </span>
                    </td>
                    <td className="table-td">
                      {quote.payment_status === 'PENDING' ? (
                        <button 
                          className="sync-button" 
                          style={{ padding: '6px 12px', borderColor: 'var(--success)', color: 'var(--success)' }}
                          onClick={() => handleMarkAsPaid(quote.id)}
                        >
                          <Check size={12} /> Confirm Payment
                        </button>
                      ) : (
                        <span style={{ color: 'var(--success)', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Check size={14} /> Reconciled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            <ShieldAlert size={28} style={{ margin: '0 auto 10px', color: 'var(--text-muted)' }} />
            <p style={{ fontSize: '14px' }}>No quotes have been approved yet.</p>
            <p style={{ fontSize: '12px', marginTop: '4px' }}>Approve a freight proposal on the Kanban board to generate PandaDoc invoices.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Billing
