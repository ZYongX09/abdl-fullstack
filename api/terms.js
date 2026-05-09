// api/terms.js — GET 列表 / POST 创建
const { listAll, listPush, nextId } = require('./lib/db');
const { getUser } = require('./lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    const { search, category } = req.query;
    let items = await listAll('terms');
    if (search) { const s = search.toLowerCase(); items = items.filter(t => t.term.toLowerCase().includes(s) || t.definition.toLowerCase().includes(s)); }
    if (category) items = items.filter(t => t.category === category);
    // For first run, seed from JSON if DB is empty
    if (items.length === 0) {
      const { terms } = require('./lib/db');
      items = terms();
    }
    return res.json({ terms: items });
  }

  const { requireAuth } = require('./lib/auth');
  return requireAuth(async (req2, res2) => {
    const { term, abbreviation, definition, category } = req2.body || {};
    if (!term || term.length > 50) return res2.status(400).json({ error: 'term 必填且 ≤50 字符' });
    if (!definition || definition.length > 2000) return res2.status(400).json({ error: 'definition 必填且 ≤2000 字符' });
    const t = { id: await nextId('term'), term, abbreviation: abbreviation || null, definition, category: category || null, created_by: req2.user.id, created_at: new Date().toISOString() };
    await listPush('terms', t);
    res2.status(201).json({ message: '创建成功', id: t.id });
  })(req, res);
};
