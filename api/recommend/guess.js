// api/recommend/guess.js — GET 猜你喜欢
const { diapers, listAll } = require('../lib/db');
module.exports = async (req, res) => {
  const allRatings = await listAll('ratings');
  const allFeelings = await listAll('feelings');
  const withScores = diapers().map(d => {
    const r = allRatings.filter(r => r.diaper_id === d.id);
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const avg = r.length > 0 ? dims.reduce((a, dim) => a + (r.reduce((s,ri) => s+(ri[dim]||0),0)/r.length), 0) / dims.length : 0;
    return { ...d, avg_score: Math.round(avg*10)/10, rating_count: r.length };
  }).sort((a,b) => b.avg_score - a.avg_score).slice(0, 5).map(d => ({
    id: d.id, brand: d.brand, model: d.model, avg_score: d.avg_score, rating_count: d.rating_count, thickness: d.thickness,
    reason: d.avg_score >= 8 ? '综合评分超高，社区力荐' : d.thickness <= 2 ? '超薄设计，适合日常穿着' : '热门之选'
  }));
  res.json({ recommendations: withScores });
};
