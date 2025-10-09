import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3001/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = async (email, password) => {
  const response = await apiClient.post('/auth/register', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const login = async (email, password) => {
  const response = await apiClient.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

export const getRole = async () => {
  const response = await apiClient.get('/roles');
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

export default apiClient;

export const getProducts = async (filters) => {
  const response = await apiClient.get('/products', { params: filters });
  return response.data;
};