/**
 * API 数据层 v5 — 纯前端版
 * 数据来源：静态 JSON + localStorage
 * 后续迁移：JSON → B's API
 */
const API_BASE = ''; // 留空，用相对路径读 public 目录

// ====== 静态数据 ======
let _diapers = null, _terms = null, _levels = null;

async function loadJSON(path) {
  const res = await fetch(path);
  return res.json();
}

export async function loadData() {
  const [d, t, l] = await Promise.all([
    loadJSON('/data/diapers.json'),
    loadJSON('/data/terms.json'),
    loadJSON('/data/levels.json'),
  ]);
  _diapers = d; _terms = t; _levels = l;
  return { diapers: d, terms: t, levels: l };
}

// ====== localStorage 工具 ======
const LS = {
  get(key) { try { return JSON.parse(localStorage.getItem('abdl_' + key)); } catch { return null; } },
  set(key, val) { localStorage.setItem('abdl_' + key, JSON.stringify(val)); },
  del(key) { localStorage.removeItem('abdl_' + key); },
};

// ====== 认证 ======
export const authAPI = {
  register: async ({ username, password, ...profile }) => {
    const users = LS.get('users') || {};
    if (users[username]) throw new Error('用户名已被使用');
    const user = { id: Date.now(), username, password, role: username === 'ZhX' || username === 'ZYongX' ? 'admin' : 'user', ...profile, created_at: new Date().toISOString() };
    users[username] = user;
    LS.set('users', users);
    LS.set('currentUser', user);
    return { token: 'local-' + user.id, user: { ...user, password: undefined } };
  },
  login: async ({ username, password }) => {
    const users = LS.get('users') || {};
    const user = users[username];
    if (!user || user.password !== password) throw new Error('用户名或密码错误');
    LS.set('currentUser', user);
    return { token: 'local-' + user.id, user: { ...user, password: undefined } };
  },
  me: async () => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('未登录');
    return { user: { ...user, password: undefined } };
  },
  updateProfile: async (body) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('未登录');
    Object.assign(user, body);
    const users = LS.get('users') || {};
    users[user.username] = user;
    LS.set('users', users);
    LS.set('currentUser', user);
    return { user: { ...user, password: undefined } };
  },
  getUser: async (id) => {
    const users = LS.get('users') || {};
    const u = Object.values(users).find(u => u.id === id);
    if (!u) throw new Error('用户不存在');
    return { user: { ...u, password: undefined } };
  },
};

// ====== 纸尿裤 ======
export const diapersAPI = {
  list: async (params = {}) => {
    if (!_diapers) await loadData();
    let list = [..._diapers];
    if (params.search) { const s = params.search.toLowerCase(); list = list.filter(d => d.brand.toLowerCase().includes(s) || d.model.toLowerCase().includes(s)); }
    if (params.brand) list = list.filter(d => d.brand === params.brand);
    if (params.size) list = list.filter(d => d.sizes?.some(s => s.label === params.size));
    const page = Number(params.page) || 1, limit = Number(params.limit) || 20;
    const total = list.length;
    list = list.slice((page-1)*limit, page*limit);
    // 附加评分 + 感受加权（感受权重 10%）
    const ratings = LS.get('ratings') || {};
    const allFeelings = LS.get('feelings') || {};
    list = list.map(d => {
      const r = Object.values(ratings).filter(r => r.diaper_id === d.id);
      const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
      const avgScore = r.length > 0
        ? r.reduce((s, ri) => s + dims.reduce((a, dim) => a + (ri[dim]||0), 0) / dims.length, 0) / r.length
        : 0;
      // Feeling scores (convert -5..5 to 0..10 for combination)
      const dFeelings = Object.values(allFeelings).filter(f => f.diaper_id === d.id);
      const fDims = ['looseness','softness','dryness','odor_control','quietness'];
      let feelingAvg = 0;
      if (dFeelings.length > 0) {
        const fScores = dFeelings.map(f => {
          const valid = fDims.filter(k => f[k] != null);
          if (valid.length === 0) return 0;
          return valid.reduce((s, k) => s + (f[k] + 5) * 10 / 10, 0) / valid.length; // Convert -5..5 → 0..10
        });
        feelingAvg = fScores.reduce((a, b) => a + b, 0) / fScores.length;
      }
      const compositeScore = dFeelings.length > 0
        ? Math.round((avgScore * 0.9 + feelingAvg * 0.1) * 10) / 10
        : Math.round(avgScore * 10) / 10;
      return { ...d, avg_score: compositeScore, rating_count: r.length, feeling_count: dFeelings.length };
    });
    return { diapers: list, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } };
  },
  get: async (id) => {
    if (!_diapers) await loadData();
    const d = _diapers.find(d => d.id === Number(id));
    if (!d) throw new Error('纸尿裤不存在');
    const ratings = LS.get('ratings') || {};
    const r = Object.values(ratings).filter(r => r.diaper_id === d.id);
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const avgScore = r.length > 0 ? r.reduce((s, ri) => s + dims.reduce((a, dim) => a + (ri[dim]||0), 0) / dims.length, 0) / r.length : 0;
    // Feeling scores (10% weight)
    const allFeelings = LS.get('feelings') || {};
    const dFeelings = Object.values(allFeelings).filter(f => f.diaper_id === d.id);
    const fDims = ['looseness','softness','dryness','odor_control','quietness'];
    let feelingAvg = 0;
    if (dFeelings.length > 0) {
      const fScores = dFeelings.map(f => {
        const valid = fDims.filter(k => f[k] != null);
        if (valid.length === 0) return 0;
        return valid.reduce((s, k) => s + (f[k] + 5) * 10 / 10, 0) / valid.length;
      });
      feelingAvg = fScores.reduce((a, b) => a + b, 0) / fScores.length;
    }
    const compositeScore = dFeelings.length > 0
      ? Math.round((avgScore * 0.9 + feelingAvg * 0.1) * 10) / 10
      : Math.round(avgScore * 10) / 10;
    const reviews = r.map(ri => {
      const users = LS.get('users') || {};
      const u = Object.values(users).find(u => u.id === ri.user_id);
      return { ...ri, username: u?.username || '已注销', role: u?.role || 'user' };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    return { diaper: { ...d, avg_score: compositeScore, rating_count: r.length, feeling_count: dFeelings.length }, reviews, wiki: null };
  },
  brands: async () => { if (!_diapers) await loadData(); return { brands: [...new Set(_diapers.map(d => d.brand))] }; },
  sizes: async () => { if (!_diapers) await loadData(); return { sizes: [...new Set(_diapers.flatMap(d => d.sizes?.map(s => s.label)||[]))] }; },
  matchSize: ({ hip }) => {
    const STANDARDS = [{label:'S',hip_min:80,hip_max:95},{label:'M',hip_min:95,hip_max:110},{label:'L',hip_min:110,hip_max:125},{label:'XL',hip_min:125,hip_max:140},{label:'XXL',hip_min:140,hip_max:160}];
    const matched = STANDARDS.find(s => hip >= s.hip_min && hip <= s.hip_max);
    return { matched_size: matched?.label || '超出范围', size_standards: STANDARDS, matching_diapers: [] };
  },
};

// ====== 评分（localStorage） ======
export const ratingsAPI = {
  create: ({ diaper_id, review, ...scores }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const ratings = LS.get('ratings') || {};
    const key = `${user.id}-${diaper_id}`;
    if (ratings[key]) throw new Error('已经评过分了');
    ratings[key] = { id: Date.now(), user_id: user.id, diaper_id, ...scores, review: review||null, review_status: 'approved', created_at: new Date().toISOString() };
    LS.set('ratings', ratings);
    return { message: '评分成功', review_status: 'approved' };
  },
  getForDiaper: async (id) => {
    if (!_diapers) await loadData();
    const ratings = LS.get('ratings') || {};
    const reviews = Object.values(ratings).filter(r => r.diaper_id === Number(id));
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const stats = { composite: 0, count: reviews.length, dimensions: {} };
    dims.forEach(dim => {
      const vals = reviews.map(r => r[dim]).filter(v => v != null);
      stats.dimensions[dim] = { avg: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0, weighted: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0, count: vals.length };
    });
    const allAvgs = dims.map(d => stats.dimensions[d].weighted).filter(v => v > 0);
    stats.composite = allAvgs.length ? Math.round(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length*10)/10 : 0;
    return { reviews, stats };
  },
  getForUser: (userId) => {
    const ratings = LS.get('ratings') || {};
    const reviews = Object.values(ratings).filter(r => r.user_id === Number(userId));
    return Promise.resolve({ reviews });
  },
  getStats: async (id) => { const d = await ratingsAPI.getForDiaper(id); return { stats: d.stats }; },
  getMyRating: (diaperId) => {
    const user = LS.get('currentUser');
    if (!user) return { rating: null };
    const ratings = LS.get('ratings') || {};
    const key = `${user.id}-${diaperId}`;
    return { rating: ratings[key] || null };
  },
  delete: (id) => {
    const ratings = LS.get('ratings') || {};
    const key = Object.keys(ratings).find(k => ratings[k].id === id);
    if (key) { delete ratings[key]; LS.set('ratings', ratings); }
    return { message: '删除成功' };
  },
};

// ====== 排行榜（基于评分数据计算） ======
export const rankingsAPI = {
  hot: async () => {
    const { diapers } = await diapersAPI.list({ limit: 100 });
    const ranked = [...diapers].sort((a,b) => b.avg_score - a.avg_score);
    return { rankings: ranked.slice(0, 20), cached: true };
  },
  absorbency: async () => {
    if (!_diapers) await loadData();
    const extract = t => { if(!t)return 0; const m=t.match(/(\d+)\s*ml/gi); return m?Math.max(...m.map(x=>parseInt(x))):0; };
    const ranked = [..._diapers].sort((a,b) => (extract(b.absorbency_adult)||extract(b.absorbency_mfr)||0) - (extract(a.absorbency_adult)||extract(a.absorbency_mfr)||0));
    return { rankings: ranked.slice(0,20), cached: true };
  },
  popular: async () => {
    const { diapers } = await diapersAPI.list({ limit: 100 });
    const ranked = [...diapers].sort((a,b) => b.rating_count - a.rating_count);
    return { rankings: ranked.slice(0,20), cached: true };
  },
  dimension: async (dim) => {
    const { diapers } = await diapersAPI.list({ limit: 100 });
    const ranked = [...diapers].sort((a,b) => {
      const ratings = LS.get('ratings') || {};
      const avg = (id) => { const r = Object.values(ratings).filter(x => x.diaper_id === id).map(x => x[dim]).filter(v=>v!=null); return r.length ? r.reduce((a,b)=>a+b,0)/r.length : 0; };
      return avg(b.id) - avg(a.id);
    });
    return { rankings: ranked.slice(0,20), cached: true, dimension: dim };
  },
};

// ====== 论坛（localStorage） ======
export const forumAPI = {
  feed: async ({ page=1, limit=20, search } = {}) => {
    let posts = LS.get('posts') || [];
    if (search) { const s = search.toLowerCase(); posts = posts.filter(p => p.content?.toLowerCase().includes(s)); }
    posts.sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    const total = posts.length;
    const users = LS.get('users') || {};
    const allComments = LS.get('comments') || {};
    const enriched = posts.slice((page-1)*limit, page*limit).map(p => {
      const u = Object.values(users).find(u => u.id === p.user_id);
      const likes = LS.get('likes') || {};
      const likeCount = Object.values(likes).filter(l => l.target_type === 'post' && l.target_id === p.id).length;
      const commentCount = Object.values(allComments).filter(c => c.post_id === p.id).length;
      const currentUser = LS.get('currentUser');
      const hasLiked = currentUser ? Object.values(likes).some(l => l.user_id === currentUser.id && l.target_type === 'post' && l.target_id === p.id) : false;
      return { ...p, images: [], user: { id: u?.id, username: u?.username }, like_count: likeCount, has_liked: hasLiked, comment_count: commentCount, diaper: null };
    });
    return { posts: enriched, pagination: { page, limit, total, totalPages: Math.ceil(total/limit) } };
  },
  getPost: (id) => {
    const posts = LS.get('posts') || [];
    const post = posts.find(p => p.id === Number(id));
    if (!post) throw new Error('帖子不存在');
    const users = LS.get('users') || {};
    const u = Object.values(users).find(u => u.id === post.user_id);
    const likes = LS.get('likes') || {};
    const likeCount = Object.values(likes).filter(l => l.target_type === 'post' && l.target_id === post.id).length;
    const currentUser = LS.get('currentUser');
    const hasLiked = currentUser ? Object.values(likes).some(l => l.user_id === currentUser.id && l.target_type === 'post' && l.target_id === post.id) : false;

    const comments = LS.get('comments') || {};
    const postComments = Object.values(comments).filter(c => c.post_id === post.id).map(c => {
      const cu = Object.values(users).find(u => u.id === c.user_id);
      const cl = Object.values(likes).filter(l => l.target_type === 'comment' && l.target_id === c.id).length;
      return { ...c, username: cu?.username, like_count: cl, has_liked: false };
    });

    return { post: { ...post, images: [], user: { id: u?.id, username: u?.username }, like_count: likeCount, has_liked, comment_count: postComments.length, diaper: null }, comments: postComments };
  },
  create: ({ content, diaper_id }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const posts = LS.get('posts') || [];
    const post = { id: Date.now(), user_id: user.id, content, diaper_id: diaper_id||null, created_at: new Date().toISOString() };
    posts.unshift(post);
    LS.set('posts', posts);
    return { id: post.id, message: '发布成功' };
  },
  delete: (id) => {
    let posts = LS.get('posts') || [];
    posts = posts.filter(p => p.id !== Number(id));
    LS.set('posts', posts);
    return { message: '已删除' };
  },
  comment: (postId, { content, parent_id, image_url }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const comments = LS.get('comments') || {};
    const c = { id: Date.now(), post_id: Number(postId), user_id: user.id, parent_id: parent_id||null, content, image_url: image_url||null, created_at: new Date().toISOString() };
    comments[c.id] = c;
    LS.set('comments', comments);
    return { message: '评论成功' };
  },
  like: ({ target_type, target_id }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const likes = LS.get('likes') || {};
    const key = `${user.id}-${target_type}-${target_id}`;
    if (likes[key]) { delete likes[key]; LS.set('likes', likes); return { liked: false }; }
    likes[key] = { user_id: user.id, target_type, target_id, created_at: new Date().toISOString() };
    LS.set('likes', likes);
    return { liked: true };
  },
  notifications: () => { return { notifications: [], unread_count: 0 }; },
  readAllNotifications: () => Promise.resolve(),
};

// ====== 等级（基于经验值） ======
export const levelsAPI = {
  me: () => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('未登录');
    const exp = LS.get('exp') || {};
    const ue = exp[user.id] || { current_exp: 0, total_exp: 0, current_level: 1 };
    const badgeIcons = ['','🍼','👶','🧣','🧸','🦽','🛏️','👑'];
    const badgeNames = ['','婴儿奶瓶','安抚奶嘴','婴儿围兜','毛绒玩偶','学步车','小童床','儿童王座'];
    return { level: { level: ue.current_level, exp: ue.current_exp, totalExp: ue.total_exp, badge_name: badgeNames[ue.current_level], badge_icon: badgeIcons[ue.current_level], next_level: Math.min(ue.current_level+1,7), next_exp_required: [0,0,100,300,600,1000,1500,2100][Math.min(ue.current_level+1,7)], progress: 50 }, badges: [] };
  },
  user: (id) => levelsAPI.me(),
  all: () => loadJSON('/data/levels.json'),
};

// ====== 术语（localStorage 读写） ======
export const termWikiAPI = {
  list: async (params = {}) => {
    if (!_terms) await loadData();
    let list = [..._terms];
    // Merge in any user-added terms
    const custom = LS.get('customTerms') || [];
    list = [...list, ...custom];
    if (params.search) { const s = params.search.toLowerCase(); list = list.filter(t => t.term.toLowerCase().includes(s) || t.definition.toLowerCase().includes(s)); }
    if (params.category) list = list.filter(t => t.category === params.category);
    return { terms: list };
  },
  categories: async () => { if (!_terms) await loadData(); return { categories: [...new Set(_terms.map(t => t.category))] }; },
  create: async (form) => {
    const user = LS.get('currentUser');
    if (!user || user.role !== 'admin') throw new Error('仅管理员可添加术语');
    if (!form.term || !form.definition) throw new Error('术语名称和定义为必填');
    const custom = LS.get('customTerms') || [];
    const term = { id: Date.now(), ...form, created_by: user.id, created_at: new Date().toISOString() };
    custom.push(term);
    LS.set('customTerms', custom);
    return { message: '术语已添加', term };
  },
  update: async (id, form) => {
    const user = LS.get('currentUser');
    if (!user || user.role !== 'admin') throw new Error('仅管理员可编辑术语');
    if (!form.term || !form.definition) throw new Error('术语名称和定义为必填');
    const custom = LS.get('customTerms') || [];
    const idx = custom.findIndex(t => t.id === id);
    if (idx === -1) throw new Error('术语不存在（仅可编辑自定义添加的术语）');
    custom[idx] = { ...custom[idx], ...form, updated_at: new Date().toISOString() };
    LS.set('customTerms', custom);
    return { message: '术语已更新' };
  },
  delete: async (id) => {
    const user = LS.get('currentUser');
    if (!user || user.role !== 'admin') throw new Error('仅管理员可删除术语');
    let custom = LS.get('customTerms') || [];
    const before = custom.length;
    custom = custom.filter(t => t.id !== id);
    if (custom.length === before) throw new Error('术语不存在');
    LS.set('customTerms', custom);
    return { message: '已删除' };
  },
};

// ====== 猜你喜欢 ======
export const guessAPI = {
  get: async () => {
    const { diapers } = await diapersAPI.list({ limit: 100 });
    const sorted = diapers.sort((a,b) => (b.avg_score||0) - (a.avg_score||0) || b.rating_count - a.rating_count);
    const items = sorted.slice(0, 5).map(d => ({ ...d, reason: d.avg_score >= 8 ? '综合评分超高，社区力荐' : d.thickness <= 2 ? '超薄设计，适合日常穿着' : '热门之选' }));
    return { recommendations: items };
  },
};

// ====== 对比 ======
export const compareAPI = {
  compare: async (ids) => {
    if (!_diapers) await loadData();
    const idArr = Array.isArray(ids) ? ids : (ids.ids || []);
    const ratings = LS.get('ratings') || {};
    const items = idArr.map(id => {
      const d = _diapers.find(dd => dd.id === Number(id));
      if (!d) return null;
      const r = Object.values(ratings).filter(rr => rr.diaper_id === d.id);
      const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
      const dimensions = {};
      dims.forEach(dim => {
        const vals = r.map(rr => rr[dim]).filter(v => v != null);
        dimensions[dim] = { weighted: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0 };
      });
      return { ...d, dimensions, avg_score: d.avg_score || 0, rating_count: r.length };
    }).filter(Boolean);
    return { diapers: items };
  },
};

// ====== 使用感受（Feelings）-5到5 ======
const FEELING_DIMS = [
  { key: 'looseness', label: '宽松度', icon: 'fa-ruler', desc: '腰围/腿围的松紧感受', lowLabel: '勒得太紧', highLabel: '太松了' },
  { key: 'softness', label: '柔软度', icon: 'fa-feather', desc: '面料亲肤程度，是否磨皮肤', lowLabel: '粗糙磨人', highLabel: '像棉花一样软' },
  { key: 'dryness', label: '干爽度', icon: 'fa-droplet-slash', desc: '吸收后表面是否返潮', lowLabel: '湿漉漉的', highLabel: '干爽如初' },
  { key: 'odor_control', label: '气味控制', icon: 'fa-wind', desc: '是否能锁住异味不散发', lowLabel: '味道很明显', highLabel: '完全闻不到' },
  { key: 'quietness', label: '声音大小', icon: 'fa-ear-deaf', desc: '走动时纸尿裤发出的摩擦声/沙沙声', lowLabel: '沙沙声很大', highLabel: '寂静无声' },
];

export const feelingsAPI = {
  getDimensions: () => FEELING_DIMS,
  create: ({ diaper_id, size, ...feelings }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const allFeelings = LS.get('feelings') || {};
    const key = `${user.id}-${diaper_id}-${size}`;
    allFeelings[key] = { id: Date.now(), user_id: user.id, diaper_id, size, ...feelings, created_at: new Date().toISOString() };
    LS.set('feelings', allFeelings);
    return { message: '感受记录成功' };
  },
  getForDiaper: async (diaperId) => {
    const allFeelings = LS.get('feelings') || {};
    const feelings = Object.values(allFeelings).filter(f => f.diaper_id === Number(diaperId));
    const users = LS.get('users') || {};
    const enriched = feelings.map(f => {
      const u = Object.values(users).find(u => u.id === f.user_id);
      return { ...f, username: u?.username || '已注销' };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    // Aggregate stats
    const stats = {};
    FEELING_DIMS.forEach(dim => {
      const vals = feelings.map(f => f[dim.key]).filter(v => v != null);
      stats[dim.key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
    });
    return { feelings: enriched, stats, count: feelings.length };
  },
  getForUser: (userId) => {
    const allFeelings = LS.get('feelings') || {};
    const feelings = Object.values(allFeelings).filter(f => f.user_id === Number(userId));
    return Promise.resolve({ feelings: feelings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) });
  },
  getMyFeeling: (diaperId, size) => {
    const user = LS.get('currentUser');
    if (!user) return { feeling: null };
    const allFeelings = LS.get('feelings') || {};
    const key = `${user.id}-${diaperId}-${size}`;
    return { feeling: allFeelings[key] || null };
  },
  delete: (id) => {
    const allFeelings = LS.get('feelings') || {};
    const key = Object.keys(allFeelings).find(k => allFeelings[k].id === id);
    if (key) { delete allFeelings[key]; LS.set('feelings', allFeelings); }
    return { message: '删除成功' };
  },
};

// ====== AI 推荐 (SSE) - DeepSeek ======
export function getRecommendStream(userDataSelection, onChunk, onDone, onError) {
  const user = LS.get('currentUser');
  if (!user) { onError('请先登录'); return null; }

  const diapers = _diapers;
  if (!diapers) { onError('数据未加载'); return null; }

  // Build profile based on user selection
  const profile = [];
  const selected = userDataSelection || {};
  if (selected.basic && user.age) profile.push(`年龄: ${user.age}岁`);
  if (selected.basic && user.region) profile.push(`地区: ${user.region}`);
  if (selected.body) {
    if (user.weight) profile.push(`体重: ${user.weight}kg`);
    if (user.waist) profile.push(`腰围: ${user.waist}cm`);
    if (user.hip) profile.push(`臀围: ${user.hip}cm`);
  }
  if (selected.prefs && user.style_preference) profile.push(`偏好款式: ${user.style_preference}`);
  if (selected.bio && user.bio) profile.push(`简介: ${user.bio}`);

  // Feelings data
  let feelingsSummary = '';
  if (selected.feelings) {
    const allFeelings = LS.get('feelings') || {};
    const myFeelings = Object.values(allFeelings).filter(f => f.user_id === user.id);
    if (myFeelings.length > 0) {
      feelingsSummary = '\n【用户使用感受记录】\n';
      feelingsSummary += myFeelings.map(f => {
        const d = diapers.find(dd => dd.id === f.diaper_id);
        const dims = ['looseness','softness','dryness','odor_control','quietness'];
        const labels = ['宽松度','柔软度','干爽度','气味控制','静音度'];
        const parts = dims.map((k, i) => f[k] != null ? `${labels[i]}:${f[k]}` : null).filter(Boolean);
        return `- ${d?.brand||'?'} ${d?.model||'?'} 尺码${f.size}: ${parts.join(', ')}`;
      }).join('\n');
    }
  }

  if (profile.length === 0 && !feelingsSummary) {
    onError('请在权限窗口中选择至少一项数据');
    return null;
  }

  const prompt = `你是一个ABDL纸尿裤推荐专家。根据用户信息和纸尿裤数据库，推荐3-5款最合适的纸尿裤。

【用户信息】
${profile.join('\n')}${feelingsSummary}

【纸尿裤数据库】
${JSON.stringify(diapers.map(d => ({ id: d.id, brand: d.brand, model: d.model, thickness: d.thickness, absorbency: d.absorbency_adult, price: d.avg_price, sizes: d.sizes?.map(s => ({ label: s.label, waist: `${s.waist_min}-${s.waist_max}cm` })) })))}

【要求】
1. 综合考虑身材数据、偏好、尺码匹配度、吸水量、舒适度
2. 如果提供了使用感受数据，结合用户对宽松度、柔软度等的偏好进行推荐
3. 为每款提供匹配理由（如"吸水量适合夜用"）

以JSON格式回复，不要包含其他文字：
{"recommendations":[{"diaper_id":数字,"brand":"品牌","model":"型号","reason":"推荐理由","matchScore":1-100}],"summary":"一句话总结"}`;

  const loadingMsgs = ['正在分析您的个人数据...', '匹配最适合的产品...', '计算推荐评分...', '生成推荐理由...'];
  let msgIdx = 0;
  const msgTimer = setInterval(() => { msgIdx = Math.min(msgIdx+1, loadingMsgs.length-1); onChunk(loadingMsgs[msgIdx]); }, 2500);
  onChunk(loadingMsgs[0]);

  const ctrl = new AbortController();

  fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_DEEPSEEK_KEY || ''}` },
    body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: '你是一个专业的ABDL纸尿裤推荐助手。请始终以 JSON 格式回复。' }, { role: 'user', content: prompt }], stream: true, max_tokens: 2000, temperature: 0.7 }),
    signal: ctrl.signal,
  }).then(async res => {
    if (!res.ok) { clearInterval(msgTimer); const e = await res.text(); onError('AI 服务暂时不可用'); return; }
    const reader = res.body.getReader(), dec = new TextDecoder();
    let buf = '', full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const d = line.slice(6);
        if (d === '[DONE]') continue;
        try {
          const p = JSON.parse(d);
          const c = p.choices?.[0]?.delta?.content || '';
          if (c) full += c; // 积累但不显示原始 JSON
        } catch {}
      }
    }
    clearInterval(msgTimer);
    onChunk('分析完成！');
    const m = full.match(/\{[\s\S]*\}/);
    if (m) { try { onDone(JSON.parse(m[0])); } catch { onDone({ error: '解析失败', raw: full }); } }
    else onDone({ error: '返回格式异常', raw: full });
  }).catch(e => { if (e.name !== 'AbortError') onError('请求失败: '+e.message); });

  return ctrl;
}

// ====== 消息（localStorage） ======
export function uploadImage() { return Promise.resolve({ url: '' }); }

export const messagesAPI = {
  conversations: () => { const convs = LS.get('conversations')||[]; return { conversations: convs }; },
  withUser: (userId) => { const msgs = LS.get('messages')||{}; return { messages: msgs[userId]||[], other: { id: userId, username: '用户'+userId } }; },
  send: ({ receiver_id, content }) => {
    const user = LS.get('currentUser');
    if (!user) throw new Error('请先登录');
    const msgs = LS.get('messages')||{};
    if (!msgs[receiver_id]) msgs[receiver_id] = [];
    msgs[receiver_id].push({ id: Date.now(), sender_id: user.id, content, created_at: new Date().toISOString() });
    LS.set('messages', msgs);
    return { message: '发送成功' };
  },
  unread: () => ({ unread: 0 }),
};

// ====== 管理员（localStorage简化版） ======
export const adminAPI = {
  stats: () => {
    const users = LS.get('users')||{};
    const posts = LS.get('posts')||[];
    const ratings = LS.get('ratings')||{};
    return { users: Object.keys(users).length, posts: posts.length, comments: Object.keys(LS.get('comments')||{}).length, diapers: 11, ratings: Object.keys(ratings).length };
  },
  users: () => {
    const users = LS.get('users')||{};
    return { users: Object.values(users).map(u => ({ ...u, password: undefined, post_count: 0, comment_count: 0 })) };
  },
  banUser: () => ({ message: '功能简化中' }),
  deleteUser: (id) => ({ message: '已删除' }),
  posts: () => { const p = LS.get('posts')||[]; const comments = LS.get('comments')||{}; const likes = LS.get('likes')||{}; return { posts: p.map(post => ({ ...post, username: 'user', comment_count: Object.values(comments).filter(c => c.post_id === post.id).length, like_count: Object.values(likes).filter(l => l.target_type === 'post' && l.target_id === post.id).length })) }; },
  pinPost: () => ({ message: '已置顶' }),
  deletePost: (id) => { let p = LS.get('posts')||[]; p = p.filter(x => x.id !== id); LS.set('posts', p); return { message: '已删除' }; },
  comments: () => ({ comments: [] }),
  deleteComment: () => ({ message: '已删除' }),
  aiCompleteDiaper: async (diaperData) => {
    const key = import.meta.env.VITE_DEEPSEEK_KEY;
    if (!key) throw new Error('API key 未配置');
    
    const prompt = `你是一个纸尿裤产品数据库专家。请根据以下纸尿裤的部分信息，补全缺失的字段并验证已有数据的一致性。

当前数据：
${JSON.stringify(diaperData, null, 2)}

参考数据库中已有的纸尿裤数据：
${JSON.stringify(_diapers?.map(d => ({ brand: d.brand, model: d.model, product_type: d.product_type, thickness: d.thickness, absorbency_adult: d.absorbency_adult, avg_price: d.avg_price, material: d.material, features: d.features, sizes: d.sizes })), null, 2)}

请以JSON格式返回，包含：
1. suggestions: 建议补全的字段（只返回确实缺失或明显错误的字段）
2. verification: 数据一致性验证结果（列出任何不一致的地方）
3. summary: 一句话总结

格式：{"suggestions": {"字段名": "建议值"}, "verification": ["不一致描述"], "summary": "总结"}`;

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

// ====== Wiki（占位，后续调用 B's API） ======
export const wikiAPI = {
  list: () => ({ wikis: [] }),
  get: () => (null),
  save: () => ({ message: 'Wiki 由合作方提供' }),
  delete: () => {},
  requestEdit: () => {},
  pendingRequests: () => ({ requests: [] }),
  approveRequest: () => {},
};
