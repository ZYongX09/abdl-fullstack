// api/ratings.js — POST 评分 / GET 我的评分
const { listAll, listPush, listRemove, nextId } = require('./lib/db');
const { requireAuth } = require('./lib/auth');

module.exports = async function handler(req, res) {
  const { id } = req.query; // ?id=diaperId

  // GET /api/ratings?id=diaperId — 某纸尿裤的所有评分+统计
  if (req.method === 'GET' && id) {
    const allRatings = await listAll('ratings');
    const allUsers = await listAll('users');
    const reviews = allRatings.filter(r => r.diaper_id === Number(id));
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const stats = { composite: 0, count: reviews.length, dimensions: {} };
    dims.forEach(dim => {
      const vals = reviews.map(r => r[dim]).filter(v => v != null);
      stats.dimensions[dim] = { avg: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0, count: vals.length };
    });
    const allAvgs = dims.map(d => stats.dimensions[d].avg);
    stats.composite = allAvgs.length ? Math.round(allAvgs.reduce((a,b)=>a+b,0)/allAvgs.length*10)/10 : 0;

    const enriched = reviews.map(r => {
      const u = allUsers.find(u => u.id === r.user_id);
      return { ...r, username: u?.username||'已注销', role: u?.role||'user', password: undefined };
    }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ reviews: enriched, stats });
  }

  // POST /api/ratings — 创建评分
  return requireAuth(async (req2, res2) => {
    const { diaper_id, review, ...scores } = req2.body || {};
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    for (const dim of dims) {
      const v = scores[dim];
      if (v == null || v < 1 || v > 10) return res2.status(400).json({ error: `${dim} 必须在 1-10 之间` });
    }
    if (review && review.length > 500) return res2.status(400).json({ error: '评价最多 500 字' });

    const allRatings = await listAll('ratings');
    if (allRatings.find(r => r.user_id === req2.user.id && r.diaper_id === Number(diaper_id))) {
      return res2.status(409).json({ error: '已经评过分了' });
    }

    const r = { id: await nextId('rating'), user_id: req2.user.id, diaper_id: Number(diaper_id), ...scores, review: review||null, review_status: 'approved', created_at: new Date().toISOString() };
    await listPush('ratings', r);
    res2.status(201).json({ message: '评分成功', review_status: 'approved', id: r.id });
  })(req, res);
};
