// api/rankings.js — GET 排行榜 (hot/absorbency/popular/dimension)
const { diapers, listAll } = require('./lib/db');

module.exports = async function handler(req, res) {
  const { type, dimension, limit = 20 } = req.query;

  if (!['hot','absorbency','popular','dimension'].includes(type)) {
    return res.status(400).json({ error: 'type 必须为 hot/absorbency/popular/dimension' });
  }
  if (type === 'dimension' && !dimension) {
    return res.status(400).json({ error: 'type=dimension 时必须传 dimension' });
  }

  const allRatings = await listAll('ratings');
  const allFeelings = await listAll('feelings');

  const withScores = diapers().map(d => {
    const r = allRatings.filter(r => r.diaper_id === d.id);
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const ratingAvg = r.length > 0
      ? r.reduce((s, ri) => s + dims.reduce((a, dim) => a + (ri[dim]||0), 0) / dims.length, 0) / r.length : 0;
    const dFeelings = allFeelings.filter(f => f.diaper_id === d.id);
    const fDims = ['looseness','softness','dryness','odor_control','quietness'];
    let feelingAvg = 0;
    if (dFeelings.length > 0) {
      const fScores = dFeelings.map(f => {
        const valid = fDims.filter(k => f[k] != null);
        return valid.length ? valid.reduce((s,k)=>s+(f[k]+5),0)/valid.length : 0;
      });
      feelingAvg = fScores.reduce((a,b)=>a+b,0)/fScores.length;
    }
    const composite = dFeelings.length > 0
      ? Math.round((ratingAvg*0.9+feelingAvg*0.1)*10)/10 : Math.round(ratingAvg*10)/10;
    return { ...d, avg_score: composite, rating_count: r.length, dimension_score: r.length ? r.reduce((s,ri)=>s+(ri[dimension]||0),0)/r.length : 0 };
  });

  let ranked;
  if (type === 'hot') ranked = withScores.sort((a,b) => b.avg_score - a.avg_score);
  else if (type === 'absorbency') {
    const extract = t => { if(!t)return 0; const m=t.match(/(\d+)\s*ml/gi); return m?Math.max(...m.map(x=>parseInt(x))):0; };
    ranked = withScores.sort((a,b) => (extract(b.absorbency_adult)||extract(b.absorbency_mfr))-(extract(a.absorbency_adult)||extract(a.absorbency_mfr)));
  } else if (type === 'popular') ranked = withScores.sort((a,b) => b.rating_count - a.rating_count);
  else ranked = withScores.sort((a,b) => b.dimension_score - a.dimension_score);

  res.json({ rankings: ranked.slice(0, Math.min(Number(limit), 50)).map(d => ({
    id: d.id, brand: d.brand, model: d.model, avg_score: d.avg_score, rating_count: d.rating_count, thickness: d.thickness, absorbency_adult: d.absorbency_adult
  })), type, cached: false });
};
