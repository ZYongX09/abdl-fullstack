// api/ratings/my.js — GET /api/ratings/my/:diaperId
const { listAll } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const { diaperId } = req.query;
  const all = await listAll('ratings');
  const r = all.find(r => r.user_id === req.user.id && r.diaper_id === Number(diaperId));
  res.json({ rating: r || null });
});
