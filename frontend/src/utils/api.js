import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

const COLLECTION_KEYS_BY_PATH = [
  ['/api/vehicles', 'vehicles'],
  ['/api/drivers', 'drivers'],
  ['/api/trips', 'trips'],
  ['/api/maintenance', 'maintenance_logs'],
  ['/api/fuel', 'fuel_logs'],
  ['/api/expenses', 'expenses'],
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

// Response Interceptor to handle Token Refresh on 401 Unauthorized
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('transitops_refresh_token');
      if (!refreshToken) {
        isRefreshing = false;
        return Promise.reject(error);
      }

      try {
        const refreshResponse = await axios.post(`${BASE_URL}/api/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token, refresh_token: newRefreshToken } = refreshResponse.data.session;
        localStorage.setItem('transitops_token', access_token);
        localStorage.setItem('transitops_refresh_token', newRefreshToken);

        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        processQueue(null, access_token);
        isRefreshing = false;
        return axiosInstance(originalRequest);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        isRefreshing = false;
        localStorage.removeItem('transitops_token');
        localStorage.removeItem('transitops_refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshErr);
      }
    }
    return Promise.reject(error);
  }
);

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
