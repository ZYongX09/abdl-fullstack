// api/admin/users.js — GET 用户列表
const { listAll } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  const users = await listAll('users');
  res.json({ users: users.map(u => { const { password, ...safe } = u; return safe; }) });
});
