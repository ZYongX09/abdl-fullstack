// api/diapers/compare.js — GET /api/diapers/compare?ids=1,2,3
const { diapers, listAll } = require('../lib/db');

module.exports = async function handler(req, res) {
  const ids = (req.query.ids || '').split(',').map(Number).filter(n => n > 0).slice(0, 5);
  if (ids.length === 0) return res.status(400).json({ error: 'ids 必填' });

  const allRatings = await listAll('ratings');
  const result = ids.map(id => {
    const d = diapers().find(d => d.id === id);
    if (!d) return null;
    const r = allRatings.filter(r => r.diaper_id === d.id);
    const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];
    const dimensions = {};
    dims.forEach(dim => {
      const vals = r.map(ri => ri[dim]).filter(v => v != null);
      dimensions[dim] = { weighted: vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0 };
    });
    const avg = r.length > 0 ? dims.reduce((a, dim) => a + dimensions[dim].weighted, 0) / dims.length : 0;
    return { id: d.id, brand: d.brand, model: d.model, thickness: d.thickness, absorbency_adult: d.absorbency_adult, avg_price: d.avg_price, sizes: d.sizes, dimensions, avg_score: Math.round(avg*10)/10, rating_count: r.length };
  }).filter(Boolean);

  res.json({ diapers: result });
};
