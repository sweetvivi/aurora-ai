import axios from 'axios';

export interface ApiEnvelope<T> {
  data: T;
  requestId: string;
  timestamp: string;
}

export interface HealthSnapshot {
  dependencies: {
    database: 'down' | 'not_connected' | 'up';
    redis: 'down' | 'not_connected' | 'up';
  };
  service: string;
  status: 'ok';
  timestamp: string;
}

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 8_000,
});

export async function fetchHealth(): Promise<HealthSnapshot> {
  const response = await apiClient.get<ApiEnvelope<HealthSnapshot>>('/api/v1/health');

  return response.data.data;
}
