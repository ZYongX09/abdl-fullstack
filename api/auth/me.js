// api/auth/me.js — GET 当前用户信息
const { requireAuth } = require('../lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const { password, ...safe } = req.user;
  res.json({ user: safe });
});
