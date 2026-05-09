import { useState, useEffect } from 'react';
import { termWikiAPI } from '../api';
import { useAuth } from '../AuthContext';
import { useToast } from '../ToastContext';

export default function TermWiki() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [terms, setTerms] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ term: '', abbreviation: '', definition: '', category: '', related_terms: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadTerms();
    termWikiAPI.categories().then(d => setCategories(d.categories)).catch(() => {});
  }, []);

  const loadTerms = () => {
    setLoading(true);
    termWikiAPI.list({ search, category })
      .then(d => setTerms(d.terms))
      .finally(() => setLoading(false));
  };

  const handleSearch = () => loadTerms();

  const handleAdd = async () => {
    setMsg('');
    try {
      await termWikiAPI.create(form);
      setMsg('术语已添加');
      setAdding(false);
      setForm({ term: '', abbreviation: '', definition: '', category: '', related_terms: '' });
      loadTerms();
    } catch (err) { setMsg(err.message); }
  };

  const handleEdit = async () => {
    setMsg('');
    try {
      await termWikiAPI.update(editingId, form);
      setMsg('术语已更新');
      setEditingId(null);
      setForm({ term: '', abbreviation: '', definition: '', category: '', related_terms: '' });
      loadTerms();
    } catch (err) { setMsg(err.message); }
  };

  const handleDelete = async (id) => {
    if (!confirm('确定删除这个术语？')) return;
    try { await termWikiAPI.delete(id); loadTerms(); }
    catch (err) { alert(err.message); }
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({ term: t.term, abbreviation: t.abbreviation || '', definition: t.definition, category: t.category || '', related_terms: t.related_terms || '' });
    setAdding(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCategories = () => {
    const cats = [];
    for (const t of terms) {
      if (t.category && !cats.includes(t.category)) cats.push(t.category);
    }
    return cats;
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 20 }}>
        <i className="fa-solid fa-book" /> ABDL 圈内术语 Wiki
      </h2>

      {msg && <div className={`alert ${msg.includes('成功') || msg.startsWith('术语') ? 'alert-success' : 'alert-danger'}`}>{msg}</div>}

      <div className="search-bar">
        <input className="form-control" placeholder="搜索术语..." value={search}
          onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <select className="form-control" value={category} onChange={e => { setCategory(e.target.value); }}>
          <option value="">全部分类</option>
          {[...new Set([...categories, ...openCategories()])].map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="btn btn-primary" onClick={handleSearch}>
          <i className="fa-solid fa-search" /> 搜索
        </button>
        {user?.role === 'admin' && (
          <button className="btn btn-accent" onClick={() => { setAdding(!adding); setEditingId(null); }}>
            <i className="fa-solid fa-plus" /> 添加
          </button>
        )}
      </div>

      {(adding || editingId) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <h3>
            {editingId ? <><i className="fa-solid fa-pen" /> 编辑术语</> : <><i className="fa-solid fa-plus" /> 添加术语</>}
          </h3>
          <div className="form-group"><label>术语名称 *</label>
            <input className="form-control" value={form.term} onChange={e => setForm(f=>({...f, term: e.target.value}))} /></div>
          <div className="form-group"><label>缩写</label>
            <input className="form-control" value={form.abbreviation} onChange={e => setForm(f=>({...f, abbreviation: e.target.value}))} /></div>
          <div className="form-group"><label>定义说明 *</label>
            <textarea className="form-control" rows={3} value={form.definition} onChange={e => setForm(f=>({...f, definition: e.target.value}))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <div className="form-group"><label>分类</label>
              <input className="form-control" value={form.category} placeholder="如：基本概念" onChange={e => setForm(f=>({...f, category: e.target.value}))} /></div>
            <div className="form-group"><label>相关术语</label>
              <input className="form-control" value={form.related_terms} placeholder="逗号分隔" onChange={e => setForm(f=>({...f, related_terms: e.target.value}))} /></div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-primary" onClick={editingId ? handleEdit : handleAdd}>
              {editingId ? <><i className="fa-solid fa-save" /> 保存</> : <><i className="fa-solid fa-plus" /> 添加</>}
            </button>
            <button className="btn btn-outline" onClick={() => { setAdding(false); setEditingId(null); }}>取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner"><div className="spinner" /><span>加载术语</span></div>
      ) : (
        <div>
          <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>共 {terms.length} 个术语</p>
          {terms.map(t => (
            <div key={t.id} className="card" style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: 0 }}>
                    {t.term}
                    {t.abbreviation && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({t.abbreviation})</span>}
                  </h3>
                  {t.category && <span className="tag" style={{ marginTop: 4 }}>{t.category}</span>}
                </div>
                {user?.role === 'admin' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => startEdit(t)}>
                      <i className="fa-solid fa-pen-to-square" /> 编辑
                    </button>
                    <button className="btn btn-outline btn-sm" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                      onClick={() => handleDelete(t.id)}>
                      <i className="fa-solid fa-trash" /> 删除
                    </button>
                  </div>
                )}
              </div>
              <p style={{ marginTop: 8, lineHeight: 1.7 }}>{t.definition}</p>
              {t.related_terms && (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  相关: {t.related_terms}
                </p>
              )}
              <div style={{ marginTop: 8 }}>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => {
                    const text = `${t.term}${t.abbreviation ? ` (${t.abbreviation})` : ''}: ${t.definition}`;
                    navigator.clipboard?.writeText(text).then(() => addToast('术语已复制到剪贴板', 'success', 2000)).catch(() => {});
                  }}
                  title="复制术语定义" aria-label={`复制 ${t.term} 定义`}
                >
                  <i className="fa-regular fa-copy" /> 复制
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
