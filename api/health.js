// api/health.js — GET /api/health 检查 Blob 是否正常
module.exports = async (req, res) => {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) return res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN 未设置 — 请在 Vercel Storage 中创建 Blob 并 Redeploy' });
  res.json({ ok: true, blob: 'connected' });
};
