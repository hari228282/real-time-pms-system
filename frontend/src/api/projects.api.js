import api from './axios.js';

export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (payload) => api.post('/projects', payload),
  update: (id, payload) => api.patch(`/projects/${id}`, payload),
  remove: (id) => api.delete(`/projects/${id}`),
  addMember: (id, payload) => api.post(`/projects/${id}/members`, payload),
  removeMember: (id, userId) => api.delete(`/projects/${id}/members/${userId}`),
};
