// api/lib/db.js — Vercel Blob REST API 直连（零依赖，无 native 模块）
const fs = require('fs');
const path = require('path');

// 种子数据
function loadSeed(filename) {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', filename), 'utf-8'));
}
let _diapers, _terms, _levels;
function diapers() { if (!_diapers) _diapers = loadSeed('diapers.json'); return _diapers; }
function terms() { if (!_terms) _terms = loadSeed('terms.json'); return _terms; }
function levels() { if (!_levels) _levels = loadSeed('levels.json'); return _levels; }

// Blob REST API
const BLOB_BASE = 'https://blob.vercel-storage.com';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';

function blobUrl(storeId, key) {
  // storeId 从 token 中提取（格式: vercel_blob_rw_xxxxx_xxxxx）
  // 也支持通过 BLOB_STORE_ID 环境变量直接指定
  const sid = process.env.BLOB_STORE_ID || BLOB_TOKEN.split('_').slice(2, 4).join('_') || 'default';
  return `${BLOB_BASE}/${sid}/${key}`;
}

async function blobGet(key) {
  if (!BLOB_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN 未设置 — 请创建 Vercel Blob 存储并 Redeploy');
  const res = await fetch(blobUrl(null, key), {
    headers: { Authorization: `Bearer ${BLOB_TOKEN}` }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Blob GET ${key}: ${res.status}`);
  return res.text();
}

async function blobPut(key, data) {
  if (!BLOB_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN 未设置');
  const res = await fetch(blobUrl(null, key), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${BLOB_TOKEN}`,
      'Content-Type': 'application/octet-stream',
      'x-vercel-blob-access': 'public'
    },
    body: data
  });
  if (!res.ok) throw new Error(`Blob PUT ${key}: ${res.status}`);
  const json = await res.json();
  return json.url;
}

async function blobDelete(key) {
  const res = await fetch(blobUrl(null, key), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${BLOB_TOKEN}` }
  });
  return res.ok;
}

// 集合 API — 整个集合存为一个 JSON Blob
async function readCollection(name) {
  const raw = await blobGet(`db/${name}.json`);
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

async function writeCollection(name, data) {
  await blobPut(`db/${name}.json`, JSON.stringify(data));
}

async function listAll(key) { return readCollection(key); }
async function listPush(key, item) { const d = await readCollection(key); d.push(item); await writeCollection(key, d); }
async function listRemove(key, pred) { const d = await readCollection(key); await writeCollection(key, d.filter(x => !pred(x))); }
async function listSet(key, idx, item) { const d = await readCollection(key); d[idx] = item; await writeCollection(key, d); }

// 键值 API
async function getJson(key) {
  const raw = await blobGet(`kv/${key}.json`);
  return raw ? JSON.parse(raw) : null;
}
async function setJson(key, val) { await blobPut(`kv/${key}.json`, JSON.stringify(val)); }
async function delJson(key) { await blobDelete(`kv/${key}.json`); }

// 计数器
async function nextId(key) {
  const raw = await blobGet(`counter/${key}.json`);
  const current = raw ? Number(raw) : 0;
  const next = current + 1;
  await blobPut(`counter/${key}.json`, String(next));
  return next;
}

module.exports = { diapers, terms, levels, getJson, setJson, delJson, listPush, listAll, listRemove, listSet, nextId };
