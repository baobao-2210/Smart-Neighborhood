import axios from 'axios';
import { useAuthStore } from '@/store/useAuthStore';

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 4000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const { user, accessToken } = useAuthStore.getState();
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  config.headers['x-user-id'] = user.id;
  config.headers['x-neighborhood-id'] = user.neighborhoodId;
  config.headers['x-user-role'] = user.role;
  return config;
});
