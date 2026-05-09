// api/lib/db.js — Vercel Blob SDK
const { put, del, list, head } = require('@vercel/blob');
const fs = require('fs'), path = require('path');

function load(fn) { return JSON.parse(fs.readFileSync(path.join(process.cwd(),'data',fn),'utf-8')); }
let _d,_t,_l;
function diapers() { if(!_d)_d=load('diapers.json'); return _d; }
function terms() { if(!_t)_t=load('terms.json'); return _t; }
function levels() { if(!_l)_l=load('levels.json'); return _l; }

async function readCollection(key) {
  const { blobs } = await list({ prefix: `db/${key}/` });
  if (blobs.length === 0) return [];
  const latest = blobs.sort((a,b) => b.uploadedAt - a.uploadedAt)[0];
  const res = await fetch(latest.url);
  try { return JSON.parse(await res.text()); } catch { return []; }
}

async function writeCollection(key, data) {
  const blobKey = `db/${key}/${Date.now()}.json`;
  await put(blobKey, JSON.stringify(data), { access: 'public' });
  // Cleanup old
  const { blobs } = await list({ prefix: `db/${key}/` });
  if (blobs.length > 3) {
    for (const old of blobs.sort((a,b) => b.uploadedAt - a.uploadedAt).slice(3)) {
      await del(old.url);
    }
  }
}

async function listAll(k) { return readCollection(k); }
async function listPush(k, v) { const d = await readCollection(k); d.push(v); await writeCollection(k, d); }
async function listRemove(k, p) { const d = await readCollection(k); await writeCollection(k, d.filter(x => !p(x))); }
async function getJson(k) {
  try {
    const { blobs } = await list({ prefix: `kv/${k}/` });
    if (blobs.length === 0) return null;
    const latest = blobs.sort((a,b) => b.uploadedAt - a.uploadedAt)[0];
    const res = await fetch(latest.url);
    return JSON.parse(await res.text());
  } catch { return null; }
}
async function setJson(k, v) { await put(`kv/${k}/${Date.now()}.json`, JSON.stringify(v), { access: 'public' }); }
async function delJson(k) { const { blobs } = await list({ prefix: `kv/${k}/` }); for (const b of blobs) await del(b.url); }
async function nextId(k) {
  try {
    const { blobs } = await list({ prefix: `ctr/${k}/` });
    const c = blobs.length > 0 ? Number(await (await fetch(blobs.sort((a,b) => b.uploadedAt - a.uploadedAt)[0].url)).text()) : 0;
    const n = c + 1;
    await put(`ctr/${k}/${Date.now()}.json`, String(n), { access: 'public' });
    return n;
  } catch { return 1; }
}

module.exports = { diapers, terms, levels, getJson, setJson, delJson, listPush, listAll, listRemove, nextId };
