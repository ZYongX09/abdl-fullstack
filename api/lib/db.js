// api/lib/db.js — Vercel KV 持久化数据库层
const { kv } = require('@vercel/kv');
const fs = require('fs');
const path = require('path');

// 种子数据（只读，放仓库里）
function loadSeed(filename) {
  const filePath = path.join(process.cwd(), 'data', filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

// 懒加载种子数据
let _diapers = null, _terms = null, _levels = null;

function diapers() {
  if (!_diapers) _diapers = loadSeed('diapers.json');
  return _diapers;
}
function terms() {
  if (!_terms) _terms = loadSeed('terms.json');
  return _terms;
}
function levels() {
  if (!_levels) _levels = loadSeed('levels.json');
  return _levels;
}

// KV 操作 — 读写键值对，自动解析 JSON
async function getJson(key) {
  const raw = await kv.get(key);
  return raw || null;
}

async function setJson(key, val) {
  await kv.set(key, JSON.stringify(val));
}

async function delJson(key) {
  await kv.del(key);
}

// 集合操作 — 列表用 Redis List
async function listPush(key, item) {
  await kv.lpush(key, JSON.stringify(item));
}

async function listSet(key, index, item) {
  await kv.lset(key, index, JSON.stringify(item));
}

async function listAll(key) {
  const items = await kv.lrange(key, 0, -1);
  return items.map(i => JSON.parse(i));
}

async function listRemove(key, predicate) {
  const all = await listAll(key);
  const filtered = all.filter(x => !predicate(x));
  await kv.del(key);
  for (const item of filtered) {
    await kv.lpush(key, JSON.stringify(item));
  }
}

// 计数器
async function incr(key) {
  return await kv.incr(key);
}

// 生成 ID
async function nextId(key) {
  return await kv.incr(`counter:${key}`);
}

module.exports = { diapers, terms, levels, getJson, setJson, delJson, listPush, listAll, listRemove, listSet, incr, nextId };
