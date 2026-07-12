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

export async function apiFetch(method, path, body = null, options = {}) {
  const token = localStorage.getItem('transitops_token');
  const headers = { ...(options.headers || {}) };

  if (!(body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const requestOptions = { method, headers };

  if (body instanceof FormData) {
    requestOptions.body = body;
  } else if (body !== null && body !== undefined) {
    requestOptions.body = JSON.stringify(body);
  }

  const response = await fetch(`${BASE_URL}${cleanPath}`, requestOptions);
  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : { message: await response.text() };

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `Request failed with status ${response.status}`);
  }

  return normalizeResponse(cleanPath, data);
}

export async function apiDownload(path, fallbackFilename) {
  const token = localStorage.getItem('transitops_token');
  const headers = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`${BASE_URL}${cleanPath}`, { method: 'GET', headers });

  if (!response.ok) {
    const contentType = response.headers.get('content-type') || '';
    const errorData = contentType.includes('application/json')
      ? await response.json()
      : { message: await response.text() };
    throw new Error(errorData?.error || errorData?.message || `Download failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
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
}

export const api = {
  get: (path) => apiFetch('GET', path),
  post: (path, body) => apiFetch('POST', path, body),
  put: (path, body) => apiFetch('PUT', path, body),
  delete: (path) => apiFetch('DELETE', path),
  download: apiDownload,
};
