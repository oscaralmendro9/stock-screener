import apiClient from './client';

export const optionsChainKey = (symbol, expiration) => ['optionsChain', symbol, expiration ?? 'default'];

export const getOptionsChain = async (symbol, expiration) => (
  await apiClient.get(`/v1/options/${encodeURIComponent(symbol)}/chain`, {
    params: expiration ? { expiration } : undefined,
  })
).data;
