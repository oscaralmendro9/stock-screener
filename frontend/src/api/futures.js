import apiClient from './client';

export const futuresKeys = {
  dashboard: ['futures', 'dashboard'],
  contracts: ['futures', 'contracts'],
  history: (root, period) => ['futures', 'history', root, period],
};

export const getFuturesDashboard = async () => (await apiClient.get('/v1/futures')).data;

export const getFuturesContracts = async () => (await apiClient.get('/v1/futures/contracts')).data;

export const getFuturesHistory = async (root, period = '1y') => (
  await apiClient.get(`/v1/futures/${encodeURIComponent(root)}/history`, { params: { period } })
).data;

export const queueFuturesRefresh = async () => (await apiClient.post('/v1/futures/refresh')).data;
