// api/users.js — /api/users, /api/terms (用户+术语)
const { listAll, listPush, listRemove, nextId, terms } = require('./lib/db');
const { requireAuth } = require('./lib/auth');
const { router } = require('./lib/router');

const r = router()
  // 用户信息
  .get('/api/users/:id', async (req, res) => {
    const users = await listAll('users');
    const u = users.find(u=>u.id===Number(req.params.id));
    if(!u) return res.status(404).json({error:'用户不存在'});
    const { password, ...safe } = u;
    res.json({ user: safe });
  })
  // 修改自己
  .patch('/api/users/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    if(req.user.id!==id) return res.status(403).json({error:'只能修改自己'});
    const users = await listAll('users');
    const idx = users.findIndex(u=>u.id===id);
    if(idx<0) return res.status(404).json({error:'不存在'});
    const fields = ['avatar','age','region','weight','waist','hip','style_preference','bio'];
    fields.forEach(f=>{ if(req.body&&req.body[f]!==undefined) users[idx][f]=req.body[f]; });
    await listRemove('users',()=>true);
    for(const u of users) await listPush('users',u);
    const { password, ...safe } = users[idx];
    res.json({ user: safe });
  }))
  .patch('/api/users/me', requireAuth(async (req, res) => {
    const users = await listAll('users');
    const idx = users.findIndex(u=>u.id===req.user.id);
    if(idx<0) return res.status(404).json({error:'不存在'});
    const fields = ['avatar','age','region','weight','waist','hip','style_preference','bio'];
    fields.forEach(f=>{ if(req.body&&req.body[f]!==undefined) users[idx][f]=req.body[f]; });
    await listRemove('users',()=>true);
    for(const u of users) await listPush('users',u);
    const { password, ...safe } = users[idx];
    res.json({ user: safe });
  }))
  // 删除自己账户
  .del('/api/users/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    if(req.user.id!==id) return res.status(403).json({error:'只能删除自己的账户'});
    await listRemove('users',u=>u.id===id);
    await listRemove('posts',p=>p.user_id===id);
    await listRemove('comments',c=>c.user_id===id);
    await listRemove('ratings',r=>r.user_id===id);
    await listRemove('feelings',f=>f.user_id===id);
    res.json({ message:'账户已删除' });
  }))
  // 用户评分
  .get('/api/users/:id/ratings', async (req, res) => {
    const ratings = await listAll('ratings');
    res.json({ reviews: ratings.filter(r=>r.user_id===Number(req.params.id)) });
  })
  // 用户感受
  .get('/api/users/:id/feelings', async (req, res) => {
    const feelings = await listAll('feelings');
    res.json({ feelings: feelings.filter(f=>f.user_id===Number(req.params.id)).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)) });
  })
  // 术语列表
  .get('/api/terms', async (req, res) => {
    const { search, category } = req.query;
    let items = await listAll('terms');
    if(items.length===0) items = terms();
    if(search){ const s=search.toLowerCase(); items=items.filter(t=>t.term.toLowerCase().includes(s)||t.definition.toLowerCase().includes(s)); }
    if(category) items=items.filter(t=>t.category===category);
    res.json({ terms: items });
  })
  // 创建术语
  .post('/api/terms', requireAuth(async (req, res) => {
    const { term, abbreviation, definition, category } = req.body||{};
    if(!term||term.length>50) return res.status(400).json({error:'term必填≤50'});
    if(!definition||definition.length>2000) return res.status(400).json({error:'definition必填≤2000'});
    const t = { id:await nextId('term'), term, abbreviation:abbreviation||null, definition, category:category||null, created_by:req.user.id, created_at:new Date().toISOString() };
    await listPush('terms', t);
    res.status(201).json({ message:'创建成功', id:t.id });
  }))
  // 编辑/删除术语
  .patch('/api/terms/:id', requireAuth(async (req, res) => {
    const all = await listAll('terms');
    const idx = all.findIndex(t=>t.id===Number(req.params.id));
    if(idx<0) return res.status(404).json({error:'不存在'});
    const { term, abbreviation, definition, category } = req.body||{};
    if(term!==undefined) all[idx].term=term;
    if(abbreviation!==undefined) all[idx].abbreviation=abbreviation;
    if(definition!==undefined) all[idx].definition=definition;
    if(category!==undefined) all[idx].category=category;
    await listRemove('terms',()=>true);
    for(const t of all) await listPush('terms',t);
    res.json({message:'更新成功'});
  }))
  .del('/api/terms/:id', requireAuth(async (req, res) => {
    const id = Number(req.params.id);
    await listRemove('terms',t=>t.id===id);
    res.json({message:'已删除'});
  }))
  .get('/api/terms/categories', async (req, res) => {
    let items = await listAll('terms'); if(items.length===0) items=terms();
    res.json({ categories: [...new Set(items.map(t=>t.category).filter(Boolean))] });
  });

module.exports = (req, res) => r.handle(req, res);
