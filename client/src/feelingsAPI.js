/**
 * feelingsAPI — 使用感受（Vercel 后端版）
 * 五个维度：looseness, softness, dryness, odor_control, quietness
 * 每个维度 -5 到 5
 */
const AUTH_TOKEN = () => localStorage.getItem('abdl_token') || '';

async function apiCall(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = AUTH_TOKEN();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

const DIMENSIONS = [
  { key: 'looseness', label: '松紧度', desc: '太紧 ← → 太松', icon: '🔗', low: '过紧', high: '过松' },
  { key: 'softness', label: '柔软度', desc: '粗糙 ← → 柔软', icon: '☁️', low: '粗糙', high: '柔软' },
  { key: 'dryness', label: '干爽度', desc: '潮湿 ← → 干爽', icon: '💧', low: '潮湿', high: '干爽' },
  { key: 'odor_control', label: '锁味性', desc: '有异味 ← → 锁味好', icon: '👃', low: '有异味', high: '锁味好' },
  { key: 'quietness', label: '静音性', desc: '有沙沙声 ← → 静音', icon: '🔇', low: '有声', high: '静音' },
];

export const feelingsAPI = {
  getDimensions: () => DIMENSIONS,
  create: ({ diaper_id, size, ...feelings }) =>
    apiCall('POST', '/api/feelings', { diaper_id, size, ...feelings }),
  getForDiaper: (id) => apiCall('GET', `/api/diapers/${id}/feelings`),
  getForUser: (userId) => apiCall('GET', `/api/users/${userId}/feelings`),
  getMyFeeling: (diaperId, size) => apiCall('GET', `/api/feelings/me/${diaperId}/${size}`),
  delete: (id) => apiCall('DELETE', `/api/feelings/${id}`),
};
