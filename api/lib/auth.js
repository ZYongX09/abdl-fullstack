// api/lib/auth.js — JWT 认证
const { getJson, setJson, listPush, nextId } = require('./db');
const SECRET = process.env.JWT_SECRET || 'abdl-dev-secret-2026';
const crypto = require('crypto');

function sign(payload) {
  const h = Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url');
  const b = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url');
  return `${h}.${b}.${s}`;
}
function verify(token) {
  try { const [h,b,s]=token.split('.'); const e=crypto.createHmac('sha256',SECRET).update(`${h}.${b}`).digest('base64url'); if(s!==e)return null; return JSON.parse(Buffer.from(b,'base64url').toString()); } catch { return null; }
}
async function getUser(req) {
  const t = (req.headers.authorization||'').replace('Bearer ','');
  if(!t) return null;
  const p = verify(t); if(!p) return null;
  return getJson(`user:${p.userId}`);
}
async function register({username,password}) {
  const ex = await getJson(`user:byName:${username}`); if(ex) throw new Error('用户名已被使用');
  const id = await nextId('user');
  const h = crypto.createHash('sha256').update(password+SECRET).digest('hex');
  const u = {id,username,password:h,role:'user',created_at:new Date().toISOString()};
  await setJson(`user:${id}`,u); await setJson(`user:byName:${username}`,id); await listPush('users',{id,username,role:u.role,created_at:u.created_at});
  return {id,username,role:u.role,created_at:u.created_at};
}
async function login({username,password}) {
  const uid = await getJson(`user:byName:${username}`); if(!uid) throw new Error('用户名或密码错误');
  const u = await getJson(`user:${uid}`);
  const h = crypto.createHash('sha256').update(password+SECRET).digest('hex');
  if(u.password!==h) throw new Error('用户名或密码错误');
  return {id:u.id,username:u.username,role:u.role,created_at:u.created_at};
}
function requireAuth(h) { return async(r,e)=>{ const u=await getUser(r); if(!u) return e.status(401).json({error:'请先登录'}); r.user=u; return h(r,e); }; }
function requireAdmin(h) { return requireAuth(async(r,e)=>{ if(r.user.role!=='admin') return e.status(403).json({error:'管理员权限'}); return h(r,e); }); }

module.exports = { sign, getUser, register, login, requireAuth, requireAdmin };
