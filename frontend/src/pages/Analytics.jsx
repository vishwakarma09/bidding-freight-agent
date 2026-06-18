import React from 'react'
import { useApp } from '../context/AppContext'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Legend } from 'recharts'
import { BarChart3, Clock, TrendingUp, Trophy, UserCheck, ShieldAlert } from 'lucide-react'

const Analytics = () => {
  const { analytics } = useApp()

  if (!analytics) {
    return (
      <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>
        Loading Analytics metrics...
      </div>
    )
  }

  // 1. Transform Pipeline Stage Distribution
  const stageData = Object.keys(analytics.pipeline_stages).map(key => ({
    name: key.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
    value: analytics.pipeline_stages[key]
  })).filter(item => item.value > 0)

  // Colors for Pie chart
  const PIE_COLORS = [
    '#6366f1', '#a855f7', '#ec4899', '#f43f5e', 
    '#ef4444', '#f97316', '#f59e0b', '#10b981', 
    '#06b6d4', '#3b82f6'
  ]

  // 2. Transform Carrier Competitiveness Data
  const carrierChartData = analytics.carrier_stats.map(c => ({
    name: c.name,
    Bids: c.total_bids,
    Wins: c.wins,
    'Win Rate %': c.win_rate_pct
  }))

  // 3. Transform Customer Volumes Data
  const customerChartData = analytics.customer_stats.map(cust => ({
    name: cust.name?.replace("AMZPrep ", "")?.split(" (")?.[0] || 'Unknown',
    Quotes: cust.total_quotes,
    Won: cust.approved_quotes
  }))

  return (
    <div className="analytics-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Overview Metric Highlights */}
      <div className="metrics-grid">
        <div className="glass-card metric-card">
          <div className="metric-label-row">
            <span className="metric-lbl">Avg Intake-to-Quote Sent</span>
            <div className="metric-icon-box receivables"><Clock size={16} /></div>
          </div>
          <div className="metric-val" style={{ fontSize: '24px' }}>
            {analytics.average_turnaround_time}
          </div>
          <div className="metric-trend up">60%+ faster than manual SLA</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-label-row">
            <span className="metric-lbl">Lead Conversion Rate</span>
            <div className="metric-icon-box conversion"><UserCheck size={16} /></div>
          </div>
          <div className="metric-val">{analytics.quote_to_approval_conversion_pct}%</div>
          <div className="metric-trend up">Quote approvals conversion</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-label-row">
            <span className="metric-lbl">Total Margin Earned</span>
            <div className="metric-icon-box margin"><TrendingUp size={16} /></div>
          </div>
          <div className="metric-val">${analytics.gross_margin_value.toLocaleString()}</div>
          <div className="metric-trend up">Average {analytics.average_margin_percent}% margin</div>
        </div>

        <div className="glass-card metric-card">
          <div className="metric-label-row">
            <span className="metric-lbl">Most Competitive Carrier</span>
            <div className="metric-icon-box payables"><Trophy size={16} /></div>
          </div>
          <div className="metric-val" style={{ fontSize: '18px', paddingTop: '6px' }}>
            {analytics.carrier_stats.length > 0
              ? [...analytics.carrier_stats].sort((a, b) => b.win_rate_pct - a.win_rate_pct)[0]?.name || "N/A"
              : "N/A"
            }
          </div>
          <div className="metric-trend neutral">Highest bid-to-win ratio</div>
        </div>
      </div>

      {/* Visual Chart Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Stage distribution (Pie Chart) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}><BarChart3 size={16} /> Pipeline Distribution</h3>
          {stageData.length > 0 ? (
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={stageData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stageData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '260px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No active quotes in pipeline.
            </div>
          )}
        </div>

        {/* Customer Transaction Volume (Bar Chart) */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 className="section-title" style={{ marginBottom: '16px' }}><BarChart3 size={16} /> Customer Volume Overview</h3>
          {customerChartData.length > 0 ? (
            <div style={{ width: '100%', height: '260px' }}>
              <ResponsiveContainer>
                <BarChart data={customerChartData}>
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-glass)', borderRadius: '6px' }}
                  />
                  <Legend />
                  <Bar dataKey="Quotes" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Won" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ display: 'flex', height: '260px', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No customer logs recorded.
            </div>
          )}
        </div>
      </div>

      {/* Grid: Carrier Performance Grid */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 className="section-title" style={{ marginBottom: '16px' }}><Trophy size={16} /> Carrier Performance & Win-Rates</h3>
        {analytics.carrier_stats.length > 0 ? (
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="table-th">Carrier Name</th>
                  <th className="table-th">Email</th>
                  <th className="table-th" style={{ textAlign: 'center' }}>Total RFQ Responses</th>
                  <th className="table-th" style={{ textAlign: 'center' }}>Wins</th>
                  <th className="table-th" style={{ textAlign: 'center' }}>Win Rate %</th>
                  <th className="table-th" style={{ textAlign: 'right' }}>Avg Quote Price</th>
                </tr>
              </thead>
              <tbody>
                {analytics.carrier_stats.map(carrier => (
                  <tr key={carrier.id} className="table-tr">
                    <td className="table-td" style={{ fontWeight: '600' }}>{carrier.name}</td>
                    <td className="table-td" style={{ color: 'var(--text-secondary)' }}>{carrier.email}</td>
                    <td className="table-td" style={{ textAlign: 'center' }}>{carrier.total_bids}</td>
                    <td className="table-td" style={{ textAlign: 'center', color: 'var(--success)', fontWeight: 'bold' }}>{carrier.wins}</td>
                    <td className="table-td" style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <div style={{ width: '60px', background: 'rgba(255, 255, 255, 0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${carrier.win_rate_pct}%`, background: 'var(--primary)', height: '100%' }}></div>
                        </div>
                        <span style={{ fontSize: '13px', fontWeight: '600' }}>{carrier.win_rate_pct}%</span>
                      </div>
                    </td>
                    <td className="table-td" style={{ textAlign: 'right', fontFamily: 'var(--font-display)', fontWeight: '500' }}>
                      ${carrier.avg_bid.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
            No carrier statistics recorded yet.
          </div>
        )}
      </div>

    </div>
  )
}

export default Analytics
