/**
 * API 数据层 v6 — Vercel Serverless 后端版
 * API_BASE 空串 = 同源（Vercel 前后端同域名）
 */
const API_BASE = '';
const AUTH_TOKEN = () => localStorage.getItem('abdl_token') || '';

async function apiCall(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = AUTH_TOKEN();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(API_BASE + path, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || '请求失败');
  return data;
}

function get(path) { return apiCall('GET', path); }
function post(path, body) { return apiCall('POST', path, body); }
function patch(path, body) { return apiCall('PATCH', path, body); }
function del(path) { return apiCall('DELETE', path); }

// ====== 认证 ======
export const authAPI = {
  register: async ({ username, password }) => {
    const data = await post(`/api/auth?action=register`, { username, password });
    localStorage.setItem('abdl_token', data.token);
    localStorage.setItem('abdl_user', JSON.stringify(data.user));
    return data;
  },
  login: async ({ username, password }) => {
    const data = await post(`/api/auth?action=login`, { username, password });
    localStorage.setItem('abdl_token', data.token);
    localStorage.setItem('abdl_user', JSON.stringify(data.user));
    return data;
  },
  me: async () => {
    const data = await get('/api/auth/me');
    localStorage.setItem('abdl_user', JSON.stringify(data.user));
    return data;
  },
  updateProfile: async (body) => {
    const data = await patch('/api/users/me', body);
    localStorage.setItem('abdl_user', JSON.stringify(data.user));
    return data;
  },
  getUser: async (id) => get(`/api/users/${id}`),
};

// ====== 纸尿裤 ======
export const diapersAPI = {
  list: async (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return get(`/api/diapers?${q}`);
  },
  get: async (id) => get(`/api/diapers/${id}`),
  brands: async () => get('/api/diapers/brands'),
  sizes: async () => get('/api/diapers/sizes'),
  matchSize: ({ hip }) => {
    // 纯前端计算即可
    const STANDARDS = [{label:'S',hip_min:80,hip_max:95},{label:'M',hip_min:95,hip_max:110},{label:'L',hip_min:110,hip_max:125},{label:'XL',hip_min:125,hip_max:140},{label:'XXL',hip_min:140,hip_max:160}];
    const matched = STANDARDS.find(s => hip >= s.hip_min && hip <= s.hip_max);
    return { matched_size: matched?.label || '超出范围', size_standards: STANDARDS, matching_diapers: [] };
  },
};

// ====== 评分 ======
export const ratingsAPI = {
  create: ({ diaper_id, review, ...scores }) => post('/api/ratings', { diaper_id, review, ...scores }),
  getForDiaper: async (id) => get(`/api/ratings?id=${id}`),
  getForUser: async (userId) => get(`/api/users/${userId}/ratings`),
  getStats: async (id) => {
    const data = await get(`/api/ratings?id=${id}`);
    return { stats: data.stats };
  },
  getMyRating: async (diaperId) => {
    const me = await get('/api/auth/me').catch(() => ({ user: null }));
    if (!me.user) return { rating: null };
    const data = await get(`/api/ratings/my/${diaperId}`).catch(() => ({ rating: null }));
    return data;
  },
  delete: async (id) => del(`/api/ratings/${id}`),
};

// ====== 排行榜 ======
export const rankingsAPI = {
  hot: async () => get('/api/rankings?type=hot'),
  absorbency: async () => get('/api/rankings?type=absorbency'),
  popular: async () => get('/api/rankings?type=popular'),
  dimension: async (dim) => get(`/api/rankings?type=dimension&dimension=${dim}`),
};

// ====== 论坛 ======
export const forumAPI = {
  feed: async ({ page = 1, limit = 20, search } = {}) => {
    const q = new URLSearchParams({ page, limit });
    if (search) q.set('search', search);
    return get(`/api/posts?${q}`);
  },
  getPost: async (id) => get(`/api/posts/${id}`),
  create: async ({ content, diaper_id }) => post('/api/posts', { content, diaper_id }),
  deletePost: async (id) => del(`/api/posts/${id}`),
  addComment: async (postId, { content, parent_id }) => post(`/api/posts/${postId}/comments`, { content, parent_id }),
  like: async ({ target_type, target_id }) => post('/api/likes', { target_type, target_id }),
  // 简化版
  notifications: async () => ({ notifications: [], unread_count: 0 }),
  readAllNotifications: async () => ({}),
};

// ====== 推荐 ======
export const recommendAPI = {
  recommend: async (selected) => post('/api/recommend', { selected }),
  guess: async () => get('/api/recommend/guess'),
};

// ====== 对比 ======
export const compareAPI = {
  compare: async (ids) => get(`/api/diapers/compare?ids=${ids.join(',')}`),
};

// ====== 感受 ======
import { feelingsAPI } from './feelingsAPI';
export { feelingsAPI };

// ====== 消息（简化） ======
export function uploadImage() { return Promise.resolve({ url: '' }); }
export const messagesAPI = {
  conversations: async () => ({ conversations: [] }),
  withUser: async (userId) => ({ messages: [] }),
  send: async () => ({ message: '暂不可用' }),
  unread: async () => ({ unread: 0 }),
};

// ====== 管理员 ======
export const adminAPI = {
  stats: async () => get('/api/admin/stats'),
  users: async () => get('/api/admin/users'),
  banUser: async (id) => post(`/api/admin/users/${id}/ban`, {}),
  deleteUser: async (id) => del(`/api/admin/users/${id}`),
  posts: async () => get('/api/admin/posts'),
  pinPost: async (id) => post(`/api/admin/posts/${id}/pin`, {}),
  deletePost: async (id) => del(`/api/admin/posts/${id}`),
  comments: async () => get('/api/admin/comments'),
  deleteComment: async (id) => del(`/api/admin/comments/${id}`),
  aiCompleteDiaper: async (diaperData) => {
    // AI 补全 — 调用 DeepSeek
    const key = import.meta.env.VITE_DEEPSEEK_KEY;
    if (!key) throw new Error('API key 未配置');
    const prompt = `你是一个纸尿裤产品数据库专家。请根据以下纸尿裤的部分信息，补全缺失的字段并验证已有数据的一致性。\n当前数据：\n${JSON.stringify(diaperData, null, 2)}\n请以JSON格式返回：{"suggestions":{"字段名":"建议值"},"verification":["不一致描述"],"summary":"总结"}`;
    const res = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: '你是一个纸尿裤数据库专家。只返回JSON，不要其他文字。' }, { role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.3 }),
    });
    if (!res.ok) throw new Error('AI 服务暂不可用');
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    const match = content.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('AI 返回格式异常');
  },
};

// ====== Wiki ======
export const wikiAPI = {
  list: async () => get('/api/pages'),
  get: async (slug) => get(`/api/pages/${slug}`),
  save: async () => ({ message: '待实现' }),
  delete: async () => {},
  requestEdit: async () => {},
  pendingRequests: async () => ({ requests: [] }),
  approveRequest: async () => {},
};

// ====== 术语 ======
export const termWikiAPI = {
  list: async ({ search, category } = {}) => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (category) q.set('category', category);
    return get(`/api/terms?${q}`);
  },
  categories: async () => get('/api/terms/categories'),
  create: async (body) => post('/api/terms', body),
  update: async (id, body) => patch(`/api/terms/${id}`, body),
  delete: async (id) => del(`/api/terms/${id}`),
};

// ====== 起始数据加载 ======
export async function loadData() {
  try {
    const [d, t, l] = await Promise.all([
      get('/api/diapers?limit=100'),
      termWikiAPI.list(),
      Promise.resolve({ levels: [] }),
    ]);
    return { diapers: d.diapers || [], terms: t.terms || [], levels: l.levels || [] };
  } catch {
    return { diapers: [], terms: [], levels: [] };
  }
}
