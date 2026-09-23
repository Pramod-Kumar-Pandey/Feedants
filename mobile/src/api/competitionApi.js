import { apiRequest } from './client';

export const CompetitionApi = {
  getDetails: (id) => apiRequest(`/competitions/${id}`),
  join: (id) => apiRequest(`/competitions/${id}/join`, { method: 'POST' }),
  leave: (id) => apiRequest(`/competitions/${id}/join`, { method: 'DELETE' }),
  getLeaderboard: (id, page = 1) => apiRequest(`/competitions/${id}/leaderboard?page=${page}`),
};

export const AuthApi = {
  login: (email, password) => apiRequest('/auth/login', { method: 'POST', body: { email, password } }),
};
