import axios from 'axios';

// 🚀 PRODUCTION: Railway backend — live & accessible from anywhere
const BASE_URL = 'https://catalyst-ai-agent-production.up.railway.app';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120000, // 2 min — Gemini analysis can take time
  headers: { 'Content-Type': 'application/json' },
});

export const AgentAPI = {
  health: () => api.get('/health'),

  // Session
  newSession: () => api.post('/api/session/new'),

  // Sources — real user uploads
  addTextSource: (sessionId: string, name: string, content: string, sourceType = 'text') =>
    api.post('/api/sources/add-text', { session_id: sessionId, name, content, source_type: sourceType }),

  addUrlSource: (sessionId: string, url: string, name?: string) =>
    api.post('/api/sources/add-url', { session_id: sessionId, url, name }),

  uploadFile: (sessionId: string, formData: FormData) =>
    api.post('/api/sources/upload-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getSources: (sessionId: string) => api.get(`/api/sources/${sessionId}`),

  deleteSource: (sessionId: string, sourceId: string) =>
    api.delete(`/api/sources/${sessionId}/${sourceId}`),

  // Analysis — real Gemini call
  analyze: (sessionId: string) => api.post(`/api/analyze/${sessionId}`),

  // Execution
  executeChain: (sessionId: string) => api.post(`/api/execute/${sessionId}`),

  // Results
  getOutcome: (sessionId: string) => api.get(`/api/outcome/${sessionId}`),
  getTrace: (sessionId: string) => api.get(`/api/trace/${sessionId}`),

  getExecuteStreamUrl: (sessionId: string) => `${BASE_URL}/api/execute/stream/${sessionId}`,
};
