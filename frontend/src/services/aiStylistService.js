import { fetchApi } from './apiClient';

export const aiStylistService = {
  recommendStyle: (data) =>
    fetchApi('/api/public/ai/recommend-style', {
      method: 'POST',
      body: data,
      skipAuth: true
    })
};

