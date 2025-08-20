import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// export const API_BASE_URL = 'http://localhost:5000/api/v1'; 
// export const STATIC_FILES_URL = 'http://localhost:5000/static/uploads';

export const API_BASE_URL = 'https://khsa-aljou.onrender.com/api/v1'; 
export const STATIC_FILES_URL = 'https://khsa-aljou.onrender.com/static/uploads';


const axiosClient = axios.create({
  baseURL: API_BASE_URL,
});

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return axiosClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const { refreshToken, setTokens, logout } = useAuthStore.getState();
      if (!refreshToken) {
        logout();
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });
        
        setTokens({ access: data.access_token, refresh: data.refresh_token });
        axiosClient.defaults.headers.common['Authorization'] = 'Bearer ' + data.access_token;
        originalRequest.headers['Authorization'] = 'Bearer ' + data.access_token;
        processQueue(null, data.access_token);
        return axiosClient(originalRequest);
      } catch (err) {
        processQueue(err, null);
        logout();
        window.location.href = '/login';
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(error);
  }
);

export default axiosClient;