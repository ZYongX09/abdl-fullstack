// api/lib/db.js — Vercel Blob REST API (零依赖)
const fs = require('fs'), path = require('path');
function load(fn) { return JSON.parse(fs.readFileSync(path.join(process.cwd(),'data',fn),'utf-8')); }
let _d,_t,_l;
function diapers() { if(!_d)_d=load('diapers.json'); return _d; }
function terms() { if(!_t)_t=load('terms.json'); return _t; }
function levels() { if(!_l)_l=load('levels.json'); return _l; }

const TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
function check() { if(!TOKEN) throw new Error('Blob not configured'); }
async function bGet(key) {
  check();
  const res = await fetch(`https://blob.vercel-storage.com/${process.env.BLOB_STORE_ID||'default'}/${key}`,{headers:{Authorization:`Bearer ${TOKEN}`}});
  if(res.status===404) return null;
  if(!res.ok) throw new Error(`Blob GET ${key}: ${res.status}`);
  return res.text();
}
async function bPut(key,data) {
  check();
  const res = await fetch(`https://blob.vercel-storage.com/${process.env.BLOB_STORE_ID||'default'}/${key}`,{method:'PUT',headers:{Authorization:`Bearer ${TOKEN}`,'Content-Type':'application/octet-stream'},body:data});
  if(!res.ok) throw new Error(`Blob PUT ${key}: ${res.status}`);
}
async function bDel(key) { await fetch(`https://blob.vercel-storage.com/${process.env.BLOB_STORE_ID||'default'}/${key}`,{method:'DELETE',headers:{Authorization:`Bearer ${TOKEN}`}}); }

async function cols(key) { const r=await bGet(`db/${key}.json`); return r?JSON.parse(r):[]; }
async function save(key,d) { await bPut(`db/${key}.json`,JSON.stringify(d)); }
async function listAll(k) { return cols(k); }
async function listPush(k,v) { const d=await cols(k); d.push(v); await save(k,d); }
async function listRemove(k,p) { const d=await cols(k); await save(k,d.filter(x=>!p(x))); }
async function getJson(k) { const r=await bGet(`kv/${k}.json`); return r?JSON.parse(r):null; }
async function setJson(k,v) { await bPut(`kv/${k}.json`,JSON.stringify(v)); }
async function delJson(k) { await bDel(`kv/${k}.json`); }
async function nextId(k) { const r=await bGet(`ctr/${k}.json`); const c=(r?Number(r):0)+1; await bPut(`ctr/${k}.json`,String(c)); return c; }

module.exports = { diapers, terms, levels, getJson, setJson, delJson, listPush, listAll, listRemove, nextId };
