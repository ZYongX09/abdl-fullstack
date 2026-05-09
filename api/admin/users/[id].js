// api/admin/users/[id].js — DELETE 用户
const { listAll, listRemove } = require('../../../lib/db');
const { requireAdmin } = require('../../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method === 'DELETE') {
    return requireAdmin(async (req2, res2) => {
      const id = Number(req2.query.id);
      await listRemove('users', u => u.id === id);
      res2.json({ message: '已删除' });
    })(req, res);
  }
  res.status(405).json({ error: 'Method not allowed' });
};
