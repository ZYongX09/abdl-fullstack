// api/feelings/me.js — GET /api/feelings/me/:diaperId/:size
const { listAll } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const { diaperId, size } = req.query;
  const all = await listAll('feelings');
  const f = all.find(f => f.user_id === req.user.id && f.diaper_id === Number(diaperId) && f.size === size);
  res.json({ feeling: f || null });
});
