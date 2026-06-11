import api from './axios.js';

export const tasksApi = {
  list: (projectId) => api.get(`/projects/${projectId}/tasks`),
  create: (projectId, payload) => api.post(`/projects/${projectId}/tasks`, payload),
  update: (taskId, payload) => api.patch(`/tasks/${taskId}`, payload),
  // The core real-time action — move between columns / reorder.
  move: (taskId, payload) => api.patch(`/tasks/${taskId}/status`, payload),
  remove: (taskId) => api.delete(`/tasks/${taskId}`),
};
