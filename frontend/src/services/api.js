import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
})

export const getQuotes = () => api.get('/quotes').then(res => res.data)
export const getQuote = (id) => api.get(`/quotes/${id}`).then(res => res.data)
export const createQuote = (payload) => api.post('/quotes', payload).then(res => res.data)
export const approveQuote = (id, payload) => api.post(`/quotes/${id}/approve`, payload).then(res => res.data)
export const manualOverride = (id, to_status, notes) => api.post(`/quotes/${id}/manual-override`, { to_status, notes }).then(res => res.data)
export const getHistoricalRag = (id) => api.get(`/quotes/${id}/historical-rag`).then(res => res.data)

export const getCarriers = () => api.get('/carriers').then(res => res.data)
export const getCustomers = () => api.get('/customers').then(res => res.data)

export const getConnectors = () => api.get('/connectors').then(res => res.data)
export const getConnector = (id) => api.get(`/connectors/${id}`).then(res => res.data)
export const createConnector = (payload) => api.post('/connectors', payload).then(res => res.data)
export const updateConnector = (id, payload) => api.put(`/connectors/${id}`, payload).then(res => res.data)
export const deleteConnector = (id) => api.delete(`/connectors/${id}`).then(res => res.data)

export const getAnalytics = () => api.get('/analytics').then(res => res.data)

export const sendMockEmail = (payload) => api.post('/simulator/send-mock-email', payload).then(res => res.data)
export const fastForwardTimers = () => api.post('/simulator/fast-forward').then(res => res.data)
export const resetSimulatorDatabase = () => api.post('/simulator/reset-database').then(res => res.data)
export const getSimulatorLogs = () => api.get('/simulator/logs').then(res => res.data)

export const getEmailCredentials = () => api.get('/email-credentials').then(res => res.data)
export const saveEmailCredentials = (payload) => api.post('/email-credentials', payload).then(res => res.data)
export const deleteEmailCredentials = () => api.delete('/email-credentials').then(res => res.data)
export const testEmailCredentials = (payload) => api.post('/email-credentials/test', payload).then(res => res.data)
export const testExistingEmailCredentials = () => api.post('/email-credentials/test-existing').then(res => res.data)

export default api

