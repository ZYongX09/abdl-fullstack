// api/recommend.js — POST AI 推荐
const { diapers, listAll } = require('./lib/db');
const { requireAuth } = require('./lib/auth');

module.exports = requireAuth(async (req, res) => {
  const { selected } = req.body || {};
  // 构建用户画像
  const user = { ...req.user, password: undefined };
  const profile = [];
  if (selected?.basic && user.age) profile.push(`年龄${user.age}岁`);
  if (selected?.basic && user.region) profile.push(`地区${user.region}`);
  if (selected?.body) {
    if (user.weight) profile.push(`体重${user.weight}kg`);
    if (user.waist) profile.push(`腰围${user.waist}cm`);
    if (user.hip) profile.push(`臀围${user.hip}cm`);
  }
  if (selected?.prefs && user.style_preference) profile.push(`偏好${user.style_preference}`);
  if (selected?.bio && user.bio) profile.push(`简介:${user.bio}`);

  // 基于用户身材+评分数据做简单推荐
  const allRatings = await listAll('ratings');
  const dims = ['absorption_score','fit_score','comfort_score','thickness_score','appearance_score','value_score'];

  let candidates = diapers().map(d => {
    const r = allRatings.filter(r => r.diaper_id === d.id);
    const avg = r.length > 0
      ? r.reduce((s, ri) => s + dims.reduce((a, dim) => a + (ri[dim]||0), 0) / dims.length, 0) / r.length
      : d.comfort * 2; // fallback: use built-in comfort score
    // 臀围匹配加分
    let matchBonus = 0;
    if (user.hip && d.sizes) {
      const matchingSize = d.sizes.find(s => user.hip >= s.hip_min && user.hip <= s.hip_max);
      if (matchingSize) matchBonus = 1;
    }
    const score = Math.round((avg + matchBonus) * 10);
    return { diaper_id: d.id, brand: d.brand, model: d.model, matchScore: Math.min(100, Math.max(1, score)), reason: '' };
  }).sort((a,b) => b.matchScore - a.matchScore).slice(0, 5);

  // 生成推荐理由
  candidates = candidates.map(c => {
    const d = diapers().find(d => d.id === c.diaper_id);
    const reasons = [];
    if (user.hip && d.sizes?.some(s => user.hip >= s.hip_min && user.hip <= s.hip_max)) reasons.push('尺码匹配');
    if (c.matchScore > 80) reasons.push('评分优秀');
    if (d.thickness <= 2) reasons.push('超薄设计');
    if (Number(d.absorbency_adult?.match(/(\d+)/)?.[1] || 0) >= 500) reasons.push('吸水量大');
    c.reason = reasons.join('，') || '综合推荐';
    return c;
  });

  res.json({
    recommendations: candidates,
    summary: profile.length > 0 ? `根据您的${profile.join('、')}，推荐以下纸尿裤` : '为您推荐热门纸尿裤'
  });
});
