// api/users/[id].js — GET 用户信息 / PATCH 更新自己
const { listAll, listPush, getJson, setJson } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const id = Number(req.query.id);

  if (req.method === 'GET') {
    const allUsers = await listAll('users');
    const u = allUsers.find(u => u.id === id);
    if (!u) return res.status(404).json({ error: '用户不存在' });
    const { password, ...safe } = u;
    return res.json({ user: safe });
  }

  return requireAuth(async (req2, res2) => {
    if (req2.user.id !== id) return res2.status(403).json({ error: '只能修改自己的信息' });
    const fields = ['avatar','age','region','weight','waist','hip','style_preference','bio'];
    const body = req2.body || {};
    const allUsers = await listAll('users');
    const idx = allUsers.findIndex(u => u.id === id);
    if (idx < 0) return res2.status(404).json({ error: '用户不存在' });
    fields.forEach(f => { if (body[f] !== undefined) allUsers[idx][f] = body[f]; });
    // Rewrite collection
    const { listRemove } = require('../lib/db');
    await listRemove('users', () => true); // clear
    for (const u of allUsers) await listPush('users', u);
    const { password, ...safe } = allUsers[idx];
    res2.json({ user: safe });
  })(req, res);
};
