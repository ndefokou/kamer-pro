import axios from "axios";

const apiClient = axios.create({
  baseURL: "http://localhost:8082/api",
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getRoles = async () => {
  const response = await apiClient.get("/roles");
  return response.data;
};

export const addRole = async (role: string) => {
  const response = await apiClient.post("/roles", { role });
  return response.data;
};

export const removeRole = async (role: string) => {
  const response = await apiClient.delete(`/roles/${role}`);
  return response.data;
};

export default apiClient;

export interface ProductFilters {
  search?: string;
  category?: string;
  location?: string;
  condition?: string;
  minPrice?: string;
  maxPrice?: string;
}

export const getProducts = async (filters: ProductFilters) => {
  const response = await apiClient.get("/products", { params: filters });
  return response.data;
};
