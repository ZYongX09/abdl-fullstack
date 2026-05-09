// api/health.js — GET /api/health
module.exports = (req, res) => {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) return res.status(500).json({ ok: false, error: 'BLOB_READ_WRITE_TOKEN not set' });
  res.json({ ok: true, blob: 'connected' });
};
