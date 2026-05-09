// api/feelings/[id].js — DELETE /api/feelings/:id
const { listAll, listRemove } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const id = Number(req.query.id);
  const all = await listAll('feelings');
  const f = all.find(f => f.id === id);
  if (!f) return res.status(404).json({ error: '记录不存在' });
  if (f.user_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: '无权删除' });
  await listRemove('feelings', f => f.id === id);
  res.json({ message: '删除成功' });
});
