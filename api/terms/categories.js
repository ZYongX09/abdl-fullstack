// api/terms/categories.js — GET 分类列表
const { listAll } = require('../lib/db');
const { terms } = require('../lib/db');

module.exports = async function handler(req, res) {
  let items = await listAll('terms');
  if (items.length === 0) items = terms();
  const cats = [...new Set(items.map(t => t.category).filter(Boolean))];
  res.json({ categories: cats });
};
