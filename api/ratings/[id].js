// api/ratings/[id].js — DELETE /api/ratings/:id
const { listAll, listRemove } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const id = Number(req.query.id);
  const all = await listAll('ratings');
  const r = all.find(r => r.id === id);
  if (!r) return res.status(404).json({ error: '评分不存在' });
  if (r.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权删除' });
  await listRemove('ratings', r => r.id === id);
  res.json({ message: '删除成功' });
});
