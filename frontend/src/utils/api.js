import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;
    const code = error.response?.data?.code;

    if (status === 401 && code === 'TOKEN_EXPIRED' && !original?._retry) {
      original._retry = true;
      refreshPromise ||= api.post('/auth/refresh').finally(() => {
        refreshPromise = null;
      });
      await refreshPromise;
      return api(original);
    }

    return Promise.reject(error);
  }
);

export const unwrap = (response) => response.data?.data ?? response.data;

export const getErrorMessage = (error) =>
  error.response?.data?.message || error.message || 'Request failed';

export const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};
