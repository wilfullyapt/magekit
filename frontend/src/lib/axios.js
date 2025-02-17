// src/lib/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.request.use(request => {
    console.log('Starting Request:', request.method, request.url);
    return request;
});

api.interceptors.response.use(
  (response) => {
    console.log('Response:', response.status, response.config.url);
    return response;
  },
  async (error) => {
    console.error('Response Error:', error.response?.status, error.config?.url, error);
    const originalRequest = error.config;

    // If the error is not 401 or we've already tried to refresh, reject immediately
    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    // Don't try to refresh if we're already trying to refresh
    if (isRefreshing) {
      try {
        // Wait for the ongoing refresh to complete
        await new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        });
        // Retry the original request
        return api(originalRequest);
      } catch (err) {
        // If the refresh failed, reject with the original error
        return Promise.reject(error);
      }
    }

    // Mark this request as retried
    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // Only attempt refresh if we have a refresh token
      const cookies = document.cookie.split(';');
      const hasRefreshToken = cookies.some(cookie => 
        cookie.trim().startsWith('refresh_token=')
      );

      if (!hasRefreshToken) {
        throw new Error('No refresh token available');
      }

      await api.post('/api/auth/refresh');
      
      // Process any queued requests
      processQueue();
      
      // Retry the original request
      return api(originalRequest);
    } catch (refreshError) {
      // If refresh fails, process queue with error and reject
      processQueue(refreshError);
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;
