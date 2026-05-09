// api/admin/users/[id]/ban.js
const { listAll, listPush, listRemove } = require('../../../lib/db');
const { requireAdmin } = require('../../../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  const id = Number(req.query.id);
  const users = await listAll('users');
  const u = users.find(u => u.id === id);
  if (!u) return res.status(404).json({ error: '用户不存在' });
  u.banned = u.banned ? 0 : 1;
  await listRemove('users', () => true);
  for (const user of users) await listPush('users', user);
  res.json({ banned: !!u.banned });
});
