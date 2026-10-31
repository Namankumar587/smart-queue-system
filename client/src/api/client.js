const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000/api/v1'
    : (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'http://localhost:5000/api/v1'));

const getAuthToken = (explicitToken) =>
  explicitToken || (typeof localStorage !== 'undefined' ? localStorage.getItem('glb_queue_token') : null);

const parseResponse = async (res) => {
  try {
    const json = await res.json();
    if (!res.ok) {
      const err = new Error(json.error || json.message || 'Request failed');
      err.statusCode = res.status;
      err.details = json.details || null;
      throw err;
    }
    const data = json.data !== undefined ? json.data : json;
    if (typeof data === 'object' && data !== null && !('data' in data)) {
      Object.defineProperty(data, 'data', { value: data, enumerable: false });
    }
    return data;
  } catch (err) {
    if (err.statusCode) throw err;
    const fallbackErr = new Error(res.statusText || 'Failed to parse response');
    fallbackErr.statusCode = res.status;
    throw fallbackErr;
  }
};

export const apiClient = {
  get: async (endpoint, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'GET', headers });
    return parseResponse(res);
  },

  post: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  patch: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  put: async (endpoint, data, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data)
    });
    return parseResponse(res);
  },

  delete: async (endpoint, token = null) => {
    const headers = { 'Content-Type': 'application/json' };
    const authToken = getAuthToken(token);
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { method: 'DELETE', headers });
    return parseResponse(res);
  }
};
