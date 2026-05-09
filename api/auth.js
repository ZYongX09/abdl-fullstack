// api/auth.js — /api/auth(/me)? (register, login, me)
const { register, login, sign, requireAuth } = require('./lib/auth');
const { router } = require('./lib/router');

const r = router()
  .post('/api/auth', async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) return res.status(400).json({ error: '用户名和密码必填' });
    const action = req.query.action || 'login';
    const user = action === 'register' ? await register({ username, password }) : await login({ username, password });
    const token = sign({ userId: user.id });
    res.json({ token, user });
  })
  .get('/api/auth/me', requireAuth(async (req, res) => {
    const { password, ...safe } = req.user;
    res.json({ user: safe });
  }));

module.exports = (req, res) => r.handle(req, res);
