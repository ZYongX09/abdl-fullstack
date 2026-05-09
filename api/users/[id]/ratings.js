// api/users/[id]/ratings.js — GET /api/users/:id/ratings
const { listAll } = require('../../lib/db');
module.exports = async (req, res) => {
  const id = Number(req.query.id);
  const all = await listAll('ratings');
  res.json({ reviews: all.filter(r => r.user_id === id) });
};
