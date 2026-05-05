const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

async function readJsonResponse(res) {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (contentType.includes('application/json')) {
    return text ? JSON.parse(text) : {};
  }

  return {
    message: text || `Request failed with status ${res.status}`,
    raw: text,
  };
}

export const api = {
  // Authentication
  register: async (data) => {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return readJsonResponse(res)
  },

  login: async (username, password) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    return readJsonResponse(res)
  },

  // Batches
  createBatch: async (token, batchData) => {
    const res = await fetch(`${API_BASE_URL}/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(batchData)
    })
    return readJsonResponse(res)
  },

  getBatches: async (token) => {
    const res = await fetch(`${API_BASE_URL}/batches`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getBatchDetail: async (token, batchId) => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const res = await fetch(`${API_BASE_URL}/batches/${safeBatchId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getMedicines: async (token) => {
    const res = await fetch(`${API_BASE_URL}/medicines`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  createMedicine: async (token, data) => {
    const res = await fetch(`${API_BASE_URL}/medicines`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    return readJsonResponse(res)
  },

  verifyBatch: async (token, batchId) => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const res = await fetch(`${API_BASE_URL}/batches/${safeBatchId}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  publicVerifyBatch: async (batchId, token = '') => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const headers = {}

    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const res = await fetch(`${API_BASE_URL}/batches/public/${safeBatchId}/verify`, {
      method: 'POST',
      headers
    })
    return readJsonResponse(res)
  },

  // Inventory
  getInventory: async (token) => {
    const res = await fetch(`${API_BASE_URL}/inventory`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  addToInventory: async (token, data) => {
    const res = await fetch(`${API_BASE_URL}/inventory/add`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    })
    return readJsonResponse(res)
  },

  getInventoryStats: async (token) => {
    const res = await fetch(`${API_BASE_URL}/inventory/stats`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  verifyInventoryItem: async (token, batchId) => {
    const res = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(String(batchId).trim())}/verify`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  sellFromInventory: async (token, batchId, quantitySold) => {
    const res = await fetch(`${API_BASE_URL}/inventory/${encodeURIComponent(String(batchId).trim())}/sell`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ quantity_sold: quantitySold })
    })
    return readJsonResponse(res)
  },

  getExpiringSoon: async (token) => {
    const res = await fetch(`${API_BASE_URL}/inventory/expiring-soon`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getProfile: async (token) => {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getUsers: async (token, role = '') => {
    const url = role ? `${API_BASE_URL}/auth/users?role=${encodeURIComponent(role)}` : `${API_BASE_URL}/auth/users`
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getManufacturerAnalytics: async (token, days = 30) => {
    const res = await fetch(`${API_BASE_URL}/analytics/manufacturer?days=${days}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getRetailerAnalytics: async (token, days = 30) => {
    const res = await fetch(`${API_BASE_URL}/analytics/retailer?days=${days}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  getRetailerInventoryAnalytics: async (token) => {
    const res = await fetch(`${API_BASE_URL}/analytics/retailer/inventory`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  searchMedicineStock: async (medicine = '', city = '') => {
    const params = new URLSearchParams()

    if (medicine.trim()) params.set('medicine', medicine.trim())
    if (city.trim()) params.set('city', city.trim())

    const query = params.toString()
    const res = await fetch(`${API_BASE_URL}/inventory/search${query ? `?${query}` : ''}`)
    return readJsonResponse(res)
  },

  dispatchBatch: async (token, batchId, dispatchData) => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const res = await fetch(`${API_BASE_URL}/batches/${safeBatchId}/dispatch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(dispatchData)
    })
    return readJsonResponse(res)
  },

  getBatchDispatches: async (token, batchId) => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const res = await fetch(`${API_BASE_URL}/batches/${safeBatchId}/dispatches`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  recallBatch: async (token, batchId) => {
    const safeBatchId = encodeURIComponent(String(batchId).trim())
    const res = await fetch(`${API_BASE_URL}/batches/${safeBatchId}/recall`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return readJsonResponse(res)
  },

  // Fake Medicine Reports
  submitReport: async (data) => {
    const res = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    return readJsonResponse(res)
  },

  getReports: async () => {
    const res = await fetch(`${API_BASE_URL}/reports`)
    return readJsonResponse(res)
  }
}

export default api
