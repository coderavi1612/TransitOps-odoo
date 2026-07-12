import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const COLLECTION_KEYS_BY_PATH = [
  ['/api/vehicles', 'vehicles'],
  ['/api/drivers', 'drivers'],
  ['/api/trips', 'trips'],
  ['/api/maintenance', 'maintenance_logs'],
  ['/api/fuel', 'fuel_logs'],
  ['/api/documents', 'documents'],
  ['/api/dashboard/vehicle-performance', 'vehicles'],
];

function normalizeResponse(path, data) {
  if (!data || Array.isArray(data) || typeof data !== 'object') {
    return data;
  }

  const cleanPath = path.split('?')[0];
  const match = COLLECTION_KEYS_BY_PATH.find(([prefix]) => cleanPath === prefix);
  if (match && Array.isArray(data[match[1]])) {
    return data[match[1]];
  }

  return data;
}

// Create Axios Instance
const axiosInstance = axios.create({
  baseURL: BASE_URL,
});

// Request Interceptor to inject Token
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('transitops_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  get: async (path) => {
    try {
      const response = await axiosInstance.get(path);
      return normalizeResponse(path, response.data);
    } catch (error) {
      const data = error.response?.data;
      throw new Error(data?.error || data?.message || error.message || 'Request failed', { cause: error });
    }
  },
  post: async (path, body) => {
    try {
      const response = await axiosInstance.post(path, body);
      return normalizeResponse(path, response.data);
    } catch (error) {
      const data = error.response?.data;
      throw new Error(data?.error || data?.message || error.message || 'Request failed', { cause: error });
    }
  },
  put: async (path, body) => {
    try {
      const response = await axiosInstance.put(path, body);
      return normalizeResponse(path, response.data);
    } catch (error) {
      const data = error.response?.data;
      throw new Error(data?.error || data?.message || error.message || 'Request failed', { cause: error });
    }
  },
  delete: async (path) => {
    try {
      const response = await axiosInstance.delete(path);
      return normalizeResponse(path, response.data);
    } catch (error) {
      const data = error.response?.data;
      throw new Error(data?.error || data?.message || error.message || 'Request failed', { cause: error });
    }
  },
  download: async (path, fallbackFilename) => {
    try {
      const token = localStorage.getItem('transitops_token');
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await axios({
        method: 'get',
        url: `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`,
        responseType: 'blob',
        headers,
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] });
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
      const filename = filenameMatch?.[1] || fallbackFilename || 'download';
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(error.response?.data?.error || error.message || 'Download failed', { cause: error });
    }
  }
};
