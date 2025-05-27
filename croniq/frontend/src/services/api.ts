import axios from 'axios';

// The base URL for the API, configurable via environment variables
// Vite uses `VITE_` prefix for environment variables exposed to the client
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token to Authorization header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Optional: Response interceptor for global error handling (e.g., 401 unauthorized)
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Handle unauthorized errors, e.g., redirect to login
      console.error('Unauthorized access - 401. Redirecting to login might be needed.');
      // localStorage.removeItem('authToken'); // Clear token
      // window.location.href = '/login'; // Or use React Router's navigate
    }
    return Promise.reject(error);
  }
);

export default apiClient;
