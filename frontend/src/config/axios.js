import axios from 'axios';

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: {
    'Content-Type': 'application/json',
    // Skip ngrok browser warning page
    'ngrok-skip-browser-warning': 'true'
  }
});

// Add request interceptor to add auth token
axiosInstance.interceptors.request.use(
  (config) => {
    // Token will be added by individual components when needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default axiosInstance;
