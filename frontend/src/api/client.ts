import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8082/api',
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