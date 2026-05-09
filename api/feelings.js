// api/feelings.js — POST 创建使用感受
const { listAll, listPush, nextId } = require('./lib/db');
const { requireAuth } = require('./lib/auth');

module.exports = requireAuth(async function handler(req, res) {
  const { diaper_id, size, ...dims } = req.body || {};
  const keys = ['looseness','softness','dryness','odor_control','quietness'];
  for (const k of keys) {
    const v = dims[k];
    if (v == null || v < -5 || v > 5) return res.status(400).json({ error: `${k} 必须在 -5 到 5 之间` });
  }
  const all = await listAll('feelings');
  if (all.find(f => f.user_id === req.user.id && f.diaper_id === Number(diaper_id) && f.size === size)) {
    return res.status(409).json({ error: '已对该尺码记录过感受' });
  }
  const f = { id: await nextId('feeling'), user_id: req.user.id, diaper_id: Number(diaper_id), size, ...dims, created_at: new Date().toISOString() };
  await listPush('feelings', f);
  res.status(201).json({ message: '记录成功', id: f.id });
});
