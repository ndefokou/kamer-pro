import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8082/api',
});


apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getRole = async () => {
  const response = await apiClient.get('/roles');
  return response.data;
};


export default apiClient;

export const getProducts = async (filters) => {
  const response = await apiClient.get('/products', { params: filters });
  return response.data;
};