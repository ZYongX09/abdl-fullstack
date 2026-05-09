// api/users/[id]/feelings.js — GET /api/users/:id/feelings
const { listAll } = require('../../lib/db');
module.exports = async (req, res) => {
  const id = Number(req.query.id);
  const all = await listAll('feelings');
  res.json({ feelings: all.filter(f => f.user_id === id).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)) });
};
