// api/auth.js — POST 注册 / 登录
const { register, login, sign } = require('./lib/auth');

module.exports = async function handler(req, res) {
  try {
    const { action } = req.query; // ?action=register 或 ?action=login
    const { username, password } = req.body || {};

    if (!username || !password) return res.status(400).json({ error: 'username 和 password 必填' });
    if (username.length < 3 || username.length > 30) return res.status(400).json({ error: '用户名 3-30 字符' });
    if (password.length < 6) return res.status(400).json({ error: '密码至少 6 位' });

    let user;
    if (action === 'register') {
      user = await register({ username, password });
    } else {
      user = await login({ username, password });
    }
    const token = sign({ userId: user.id });
    res.json({ token, user });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
};
