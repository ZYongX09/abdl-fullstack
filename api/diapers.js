// api/diapers.js — GET /api/diapers 列表+筛选+分页
const { diapers, listAll, incr, nextId } = require('./lib/db');

module.exports = async function handler(req, res) {
  const { search, brand, size, sort = 'id', order = 'ASC', page = 1, limit = 20 } = req.query;
  let list = [...diapers()];

  // 筛选
  if (search) { const s = search.toLowerCase(); list = list.filter(d => d.brand.toLowerCase().includes(s) || d.model.toLowerCase().includes(s)); }
  if (brand) list = list.filter(d => d.brand === brand);
  if (size) list = list.filter(d => d.sizes?.some(s => s.label === size));

  // 计算综合评分
  const allRatings = await listAll('ratings');
  const allFeelings = await listAll('feelings');

  list = list.map(d => {
    const r = allRatings.filter(r => r.diaper_id === d.id);
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const ratingAvg = r.length > 0
      ? r.reduce((s, ri) => s + dims.reduce((a, dim) => a + (ri[dim]||0), 0) / dims.length, 0) / r.length
      : 0;

    const dFeelings = allFeelings.filter(f => f.diaper_id === d.id);
    const fDims = ['looseness','softness','dryness','odor_control','quietness'];
    let feelingAvg = 0;
    if (dFeelings.length > 0) {
      const fScores = dFeelings.map(f => {
        const valid = fDims.filter(k => f[k] != null);
        if (valid.length === 0) return 0;
        return valid.reduce((s, k) => s + (f[k] + 5), 0) / valid.length;
      });
      feelingAvg = fScores.reduce((a,b)=>a+b,0) / fScores.length;
    }

    const compositeScore = dFeelings.length > 0
      ? Math.round((ratingAvg * 0.9 + feelingAvg * 0.1) * 10) / 10
      : Math.round(ratingAvg * 10) / 10;

    return { ...d, avg_score: compositeScore, rating_count: r.length, feeling_count: dFeelings.length };
  });

  // 排序
  const sortKeys = { id: 'id', avg_score: 'avg_score', rating_count: 'rating_count', thickness: 'thickness' };
  const sk = sortKeys[sort] || 'id';
  list.sort((a,b) => (order === 'DESC' ? -1 : 1) * ((a[sk]||0) - (b[sk]||0)));

  // 分页
  const total = list.length;
  const p = Math.max(1, Number(page));
  const l = Math.min(100, Math.max(1, Number(limit)));
  const start = (p - 1) * l;
  list = list.slice(start, start + l);

  res.json({ diapers: list, pagination: { page: p, limit: l, total, totalPages: Math.ceil(total/l) } });
};
