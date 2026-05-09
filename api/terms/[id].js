// api/terms/[id].js — PATCH/DELETE 术语
const { listAll, listPush, listRemove } = require('../lib/db');
const { requireAuth } = require('../lib/auth');

module.exports = async function handler(req, res) {
  const id = Number(req.query.id);

  return requireAuth(async (req2, res2) => {
    const all = await listAll('terms');
    const idx = all.findIndex(t => t.id === id);
    if (idx < 0) return res2.status(404).json({ error: '术语不存在' });

    if (req2.method === 'PATCH') {
      const { term, abbreviation, definition, category } = req2.body || {};
      if (term !== undefined) all[idx].term = term;
      if (abbreviation !== undefined) all[idx].abbreviation = abbreviation;
      if (definition !== undefined) all[idx].definition = definition;
      if (category !== undefined) all[idx].category = category;
      await listRemove('terms', () => true);
      for (const t of all) await listPush('terms', t);
      return res2.json({ message: '更新成功' });
    }

    if (req2.method === 'DELETE') {
      await listRemove('terms', t => t.id === id);
      return res2.json({ message: '已删除' });
    }

    res2.status(405).json({ error: 'Method not allowed' });
  })(req, res);
};
