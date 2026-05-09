// api/lib/auth.js — 简单的 JWT 认证
const { getJson, setJson, nextId } = require('./db');

// 密钥（生产环境用环境变量，测试用固定值）
const SECRET = process.env.JWT_SECRET || 'abdl-dev-secret-2026';
const crypto = require('crypto');

function sign(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

function verify(token) {
  try {
    const [header, body, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', SECRET).update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  } catch { return null; }
}

// 从请求中提取用户
async function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.replace('Bearer ', '');
  if (!token) return null;
  const payload = verify(token);
  if (!payload) return null;
  return await getJson(`user:${payload.userId}`);
}

// 注册
async function register({ username, password }) {
  const existing = await getJson(`user:byName:${username}`);
  if (existing) throw new Error('用户名已被使用');
  const id = await nextId('user');
  const hash = crypto.createHash('sha256').update(password + SECRET).digest('hex');
  const user = { id, username, password: hash, role: 'user', created_at: new Date().toISOString() };
  await setJson(`user:${id}`, user);
  await setJson(`user:byName:${username}`, id);
  return { id, username, role: user.role, created_at: user.created_at };
}

// 登录
async function login({ username, password }) {
  const userId = await getJson(`user:byName:${username}`);
  if (!userId) throw new Error('用户名或密码错误');
  const user = await getJson(`user:${userId}`);
  const hash = crypto.createHash('sha256').update(password + SECRET).digest('hex');
  if (user.password !== hash) throw new Error('用户名或密码错误');
  return { id: user.id, username: user.username, role: user.role, created_at: user.created_at };
}

// 中间件
function requireAuth(handler) {
  return async (req, res) => {
    const user = await getUser(req);
    if (!user) return res.status(401).json({ error: '请先登录' });
    req.user = user;
    return handler(req, res);
  };
}

function requireAdmin(handler) {
  return requireAuth(async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
    return handler(req, res);
  });
}

module.exports = { sign, getUser, register, login, requireAuth, requireAdmin };
