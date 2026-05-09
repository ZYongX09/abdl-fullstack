// api/diapers/[id].js — GET 详情 + 评分 + Wiki
const { diapers, listAll } = require('../lib/db');

module.exports = async function handler(req, res) {
  const id = Number(req.query.id);
  const d = diapers().find(d => d.id === id);
  if (!d) return res.status(404).json({ error: '纸尿裤不存在' });

  const allRatings = await listAll('ratings');
  const allFeelings = await listAll('feelings');
  const allUsers = await listAll('users');

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

  const reviews = r.map(ri => {
    const u = allUsers.find(u => u.id === ri.user_id);
    return { ...ri, username: u?.username || '已注销', role: u?.role || 'user', password: undefined };
  }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    diaper: { ...d, avg_score: compositeScore, rating_count: r.length, feeling_count: dFeelings.length },
    reviews,
    wiki: null
  });
};
