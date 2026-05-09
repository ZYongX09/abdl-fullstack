// api/lib/db.js — Vercel Blob 持久化数据库层
const { put, list, del, head } = require('@vercel/blob');
const fs = require('fs');
const path = require('path');

// 种子数据（只读，放仓库里）
function loadSeed(filename) {
  const filePath = path.join(process.cwd(), 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

let _diapers = null, _terms = null, _levels = null;
function diapers() { if (!_diapers) _diapers = loadSeed('diapers.json'); return _diapers; }
function terms() { if (!_terms) _terms = loadSeed('terms.json'); return _terms; }
function levels() { if (!_levels) _levels = loadSeed('levels.json'); return _levels; }

// Blob 操作 — 用 token 避免并发冲突
const BLOB_PREFIX = 'db/';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';

// 检查 Blob 是否已配置
function checkToken() {
  if (!BLOB_TOKEN) throw new Error('Vercel Blob 未配置：请在 Vercel 项目 Storage 中创建 Blob 并 Redeploy');
}

async function readCollection(key) {
  checkToken();
  const { blobs } = await list({ prefix: BLOB_PREFIX + key, token: BLOB_TOKEN });
  if (blobs.length === 0) return [];
  // 找最新的 blob
  const latest = blobs.sort((a,b) => b.uploadedAt - a.uploadedAt)[0];
  const res = await fetch(latest.url);
  const text = await res.text();
  try { return JSON.parse(text); } catch { return []; }
}

async function writeCollection(key, data) {
  checkToken();
  const blobKey = BLOB_PREFIX + key + '/' + Date.now() + '.json';
  await put(blobKey, JSON.stringify(data), { access: 'public', token: BLOB_TOKEN });
  // 清理旧版本（保留最近3个）
  try {
    const { blobs } = await list({ prefix: BLOB_PREFIX + key, token: BLOB_TOKEN });
    const sorted = blobs.sort((a,b) => b.uploadedAt - a.uploadedAt);
    for (const old of sorted.slice(3)) {
      await del(old.url, { token: BLOB_TOKEN });
    }
  } catch {}
}

// 集合操作
async function listAll(key) {
  return await readCollection(key);
}

async function listPush(key, item) {
  const data = await listAll(key);
  data.push(item);
  await writeCollection(key, data);
}

async function listRemove(key, predicate) {
  let data = await listAll(key);
  data = data.filter(x => !predicate(x));
  await writeCollection(key, data);
}

async function listSet(key, index, item) {
  const data = await listAll(key);
  data[index] = item;
  await writeCollection(key, data);
}

// 计数器 — 用 /api/counter 端点存
async function nextId(key) {
  const counterKey = 'counter_' + key;
  const all = await listAll(counterKey);
  const current = all.length > 0 ? all[0] : 0;
  const next = current + 1;
  await writeCollection(counterKey, [next]);
  return next;
}

// 单值操作
async function getJson(key) {
  const data = await listAll('kv_' + key);
  return data.length > 0 ? data[0] : null;
}

async function setJson(key, val) {
  await writeCollection('kv_' + key, [val]);
}

async function delJson(key) {
  await writeCollection('kv_' + key, []);
}

module.exports = { diapers, terms, levels, getJson, setJson, delJson, listPush, listAll, listRemove, listSet, nextId };
