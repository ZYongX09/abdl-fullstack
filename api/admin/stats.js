// api/admin/stats.js
const { listAll } = require('../lib/db');
const { diapers } = require('../lib/db');
const { requireAdmin } = require('../lib/auth');

module.exports = requireAdmin(async (req, res) => {
  const [users, posts, comments, ratings] = await Promise.all([
    listAll('users'), listAll('posts'), listAll('comments'), listAll('ratings')
  ]);
  res.json({ users: users.length, posts: posts.length, comments: comments.length, diapers: diapers().length, ratings: ratings.length });
});
