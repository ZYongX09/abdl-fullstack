// api/diapers/[id]/feelings.js — GET /api/diapers/:id/feelings
const { listAll } = require('../../lib/db');

module.exports = async function handler(req, res) {
  const id = Number(req.query.id);
  const allFeelings = await listAll('feelings');
  const allUsers = await listAll('users');
  const dFeelings = allFeelings.filter(f => f.diaper_id === id);

  const fDims = ['looseness','softness','dryness','odor_control','quietness'];
  const stats = {};
  fDims.forEach(dim => {
    const vals = dFeelings.map(f => f[dim]).filter(v => v != null);
    stats[dim] = vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length*10)/10 : 0;
  });

  const feelings = dFeelings.map(f => {
    const u = allUsers.find(u => u.id === f.user_id);
    return { ...f, username: u?.username || '已注销' };
  }).sort((a,b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({ feelings, stats, count: feelings.length });
};
