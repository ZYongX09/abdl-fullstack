import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { diapersAPI, rankingsAPI, compareAPI } from '../api';
import LoadingSkeleton from '../components/LoadingSkeleton';

const DIMS = [
  { key: 'absorption_score', label: '吸水量' },
  { key: 'fit_score', label: '贴合' },
  { key: 'comfort_score', label: '舒适' },
  { key: 'thickness_score', label: '厚度' },
  { key: 'appearance_score', label: '外观' },
  { key: 'value_score', label: '性价比' },
];

function MiniRadar({ diapers }) {
  const size = 180, cx = size/2, cy = size/2, r = 68;
  const colors = ['#A8D8F0','#FFB7C5','#7BC67E','#F0C040'];
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[1,2,3,4,5].map(lvl => {
        const rr = r * lvl / 5;
        const pts = DIMS.map((_,i) => {
          const a = Math.PI*2*i/DIMS.length - Math.PI/2;
          return `${cx+rr*Math.cos(a)},${cy+rr*Math.sin(a)}`;
        }).join(' ');
        return <polygon key={lvl} points={pts} fill="none" stroke="var(--border)" strokeWidth="1" />;
      })}
      {DIMS.map((_,i) => {
        const a = Math.PI*2*i/DIMS.length - Math.PI/2;
        return <line key={i} x1={cx} y1={cy} x2={cx+r*Math.cos(a)} y2={cy+r*Math.sin(a)} stroke="var(--border)" strokeWidth="1" />;
      })}
      {diapers.map((d, idx) => {
        const pts = DIMS.map((dim, i) => {
          const val = d.dimensions?.[dim.key]?.weighted || 0;
          const a = Math.PI*2*i/DIMS.length - Math.PI/2;
          return `${cx+r*val/10*Math.cos(a)},${cy+r*val/10*Math.sin(a)}`;
        }).join(' ');
        return <polygon key={idx} points={pts} fill={colors[idx]} fillOpacity="0.25" stroke={colors[idx]} strokeWidth="2" />;
      })}
    </svg>
  );
}

export default function Home() {
  const [diapers, setDiapers] = useState([]);
  const [hotRankings, setHotRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [brands, setBrands] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [brandFilter, setBrandFilter] = useState(searchParams.get('brand') || '');
  const [sizeFilter, setSizeFilter] = useState(searchParams.get('size') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || 'popularity');

  // Compare state
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelected, setCompareSelected] = useState([]);
  const [compareResult, setCompareResult] = useState([]);
  const [compareLoading, setCompareLoading] = useState(false);

  const loadDiapers = useCallback(async (s, bf, sf, so) => {
    setLoading(true);
    try {
      const d = await diapersAPI.list({ search: s, brand: bf, size: sf, sort: so, limit: 50 });
      setDiapers(d.diapers);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  // Read URL params
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== undefined) setSearch(q || '');
    const b = searchParams.get('brand');
    if (b !== undefined) setBrandFilter(b || '');
    const sz = searchParams.get('size');
    if (sz !== undefined) setSizeFilter(sz || '');
    const st = searchParams.get('sort');
    if (st !== undefined) setSort(st || 'popularity');
  }, [searchParams]);

  // Sync URL
  useEffect(() => {
    const params = {};
    if (search) params.search = search;
    if (brandFilter) params.brand = brandFilter;
    if (sizeFilter) params.size = sizeFilter;
    if (sort && sort !== 'popularity') params.sort = sort;
    setSearchParams(params, { replace: true });
  }, [search, brandFilter, sizeFilter, sort]);

  // Load filter options once
  useEffect(() => {
    Promise.all([rankingsAPI.hot(), diapersAPI.brands(), diapersAPI.sizes()])
      .then(([rData, bData, sData]) => {
        setHotRankings(rData.rankings?.slice(0, 5) || []);
        setBrands(bData.brands);
        setSizes(sData.sizes);
      }).catch(() => {});
  }, []);

  // Load diapers on filter change
  useEffect(() => { loadDiapers(search, brandFilter, sizeFilter, sort); }, [search, brandFilter, sizeFilter, sort]);

  const handleSearch = () => loadDiapers(search, brandFilter, sizeFilter, sort);

  // Compare handlers
  const toggleCompare = (id) => {
    setCompareSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const doCompare = async () => {
    if (compareSelected.length < 2) return;
    setCompareLoading(true);
    try {
      const d = await compareAPI.compare(compareSelected);
      setCompareResult(d.diapers);
    } catch {} finally { setCompareLoading(false); }
  };

  return (
    <div>
      {/* Header + Search */}
      <div className="hero-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          <h2 style={{ margin: 0, color: 'var(--hero-text)', fontSize: '1.3rem' }}>
            <i className="fa-solid fa-magnifying-glass" /> 探索纸尿裤
          </h2>
          <button className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => { setCompareMode(!compareMode); setCompareSelected([]); setCompareResult([]); }}>
            <i className="fa-solid fa-code-compare" /> {compareMode ? '退出对比' : '对比模式'}
          </button>
        </div>
        <div className="search-bar">
          <input className="form-control" placeholder="搜索品牌、型号..." value={search}
            onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
          <select className="form-control" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}>
            <option value="">全部品牌</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
          <select className="form-control" value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
            <option value="">全部尺码</option>
            {sizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="form-control" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="popularity">热度</option>
            <option value="avg_price">价格</option>
            <option value="thickness">厚度</option>
          </select>
          <button className="btn btn-primary" onClick={handleSearch}>
            <i className="fa-solid fa-search" /> 搜索
          </button>
        </div>
        {(brandFilter || sizeFilter || sort !== 'popularity' || search) && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
            {search && (
              <span className="filter-tag">
                搜索: {search}
                <button className="tag-close" onClick={() => setSearch('')} aria-label="清除搜索">
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            )}
            {brandFilter && (
              <span className="filter-tag">
                {brandFilter}
                <button className="tag-close" onClick={() => setBrandFilter('')} aria-label="清除品牌筛选">
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            )}
            {sizeFilter && (
              <span className="filter-tag">
                {sizeFilter}码
                <button className="tag-close" onClick={() => setSizeFilter('')} aria-label="清除尺码筛选">
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            )}
            {sort !== 'popularity' && (
              <span className="filter-tag">
                排序: {sort === 'avg_price' ? '价格' : sort === 'thickness' ? '厚度' : sort}
                <button className="tag-close" onClick={() => setSort('popularity')} aria-label="重置排序">
                  <i className="fa-solid fa-xmark" />
                </button>
              </span>
            )}
            <button className="btn btn-outline btn-sm" style={{ fontSize: '0.75rem', padding: '5px 14px' }}
              onClick={() => { setSearch(''); setBrandFilter(''); setSizeFilter(''); setSort('popularity'); }}>
              <i className="fa-solid fa-rotate-left" /> 清除全部
            </button>
          </div>
        )}
      </div>

      {/* Compare mode header */}
      {compareMode && (
        <div className="card" style={{ padding: 12, marginBottom: 12, background: 'var(--primary-light)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: '0.9rem' }}>
              <i className="fa-solid fa-code-compare" /> 选择 2-4 款对比 (已选 {compareSelected.length}/4)
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {compareSelected.length >= 2 && (
                <button className="btn btn-accent btn-sm" onClick={doCompare} disabled={compareLoading}>
                  {compareLoading ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-chart-simple" />}
                  开始对比
                </button>
              )}
              <button className="btn btn-outline btn-sm" onClick={() => { setCompareSelected([]); setCompareResult([]); }}>
                <i className="fa-solid fa-rotate-left" /> 清空
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Results */}
      {compareResult.length > 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}><i className="fa-solid fa-table-list" /> 对比结果</h3>
            <button className="btn btn-outline btn-sm" onClick={() => setCompareResult([])}>
              <i className="fa-solid fa-xmark" /> 关闭
            </button>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={{ padding: 6, borderBottom: '2px solid var(--border)', textAlign: 'left' }}>参数</th>
                  {compareResult.map(d => (
                    <th key={d.id} style={{ padding: 6, borderBottom: '2px solid var(--border)', textAlign: 'center' }}>
                      {d.brand}<br/>{d.model}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['类型', 'product_type'],
                  ['厚度', d => `${d.thickness}/5`],
                  ['成人吸水量', d => d.absorbency_adult || d.absorbency_mfr || '-'],
                  ['价格', 'avg_price'],
                  ['综合评分', d => <span><i className="fa-solid fa-star" style={{ color: 'var(--warning)', fontSize: '0.7rem' }} /> {Number(d.avg_score||0).toFixed(1)}</span>],
                ].map((row, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: 6, fontWeight: 600 }}>{row[0]}</td>
                    {compareResult.map(d => (
                      <td key={d.id} style={{ padding: 6, textAlign: 'center' }}>
                        {typeof row[1] === 'function' ? row[1](d) : d[row[1]] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
            <MiniRadar diapers={compareResult} />
            <div style={{ fontSize: '0.85rem' }}>
              {compareResult.map((d, i) => (
                <div key={d.id} style={{ marginBottom: 4 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                    background: ['#A8D8F0','#FFB7C5','#7BC67E','#F0C040'][i], marginRight: 6 }} />
                  {d.brand} {d.model}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && diapers.length === 0 ? <LoadingSkeleton count={6} type="card" /> : (
        <>
          {!loading && diapers.length === 0 ? (
            <div className="empty-state">
              <div className="icon"><i className="fa-solid fa-magnifying-glass" /></div>
              <h3>没有找到匹配的纸尿裤</h3>
              <p>试试调整筛选条件或搜索其他关键词</p>
            </div>
          ) : (
            <>
          {hotRankings.length > 0 && !compareMode && (
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ marginBottom: 12 }}><i className="fa-solid fa-fire" /> 热门 TOP 5</h3>
              <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
                {hotRankings.map((d, i) => (
                  <Link to={`/diaper/${d.id}`} key={d.id} className="stagger-item" style={{ textDecoration: 'none', color: 'inherit', minWidth: 200, animationDelay: `${i * 0.06}s` }}>
                    <div className="diaper-card">
                      <div className="brand">TOP {i + 1}</div>
                      <div className="model">{d.brand} {d.model}</div>
                      <div className="meta">
                        <span className="score-badge"><i className="fa-solid fa-star" style={{ color: 'var(--warning)' }} /> {Number(d.avg_score||0).toFixed(1)}</span>
                        <span>{d.sizes?.[0]?.label || ''}码</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <h3 style={{ marginBottom: 12 }}>
            <i className="fa-solid fa-box" /> 全部纸尿裤 ({diapers.length})
          </h3>
          <div className="diaper-grid">
            {diapers.map((d, i) => (
              <div key={d.id} className="stagger-item" style={{ position: 'relative', animationDelay: `${i * 0.04}s` }}>
                {compareMode && (
                  <label style={{
                    position: 'absolute', top: 8, left: 8, zIndex: 2,
                    background: 'var(--bg-card)', borderRadius: '50%', width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', border: '2px solid var(--border)',
                    boxShadow: 'var(--shadow)',
                  }}>
                    <input type="checkbox" checked={compareSelected.includes(d.id)}
                      onChange={() => toggleCompare(d.id)}
                      disabled={!compareSelected.includes(d.id) && compareSelected.length >= 4}
                      style={{ width: 14, height: 14, accentColor: 'var(--primary)' }} />
                  </label>
                )}
                <Link to={`/diaper/${d.id}`} className="diaper-card" style={compareMode ? { paddingTop: 32 } : {}}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div className="brand">{d.brand}</div>
                    {d.is_baby_diaper === 1 && (
                      <span style={{ fontSize: '0.65rem', background: 'var(--badge-bg)', color: 'var(--badge-color)', padding: '1px 6px', borderRadius: 8 }}>
                        <i className="fa-solid fa-baby" /> 婴儿款
                      </span>
                    )}
                  </div>
                  <div className="model">{d.model}</div>
                  <div className="meta">
                    <span className="tag">{d.product_type}</span>
                    {d.sizes && d.sizes.length > 0 && (
                      <span className="tag">{d.sizes.map(s=>s.label).join(' / ')}</span>
                    )}
                    <span className="tag"><i className="fa-solid fa-layer-group" /> 厚 {d.thickness}/5</span>
                    {d.absorbency_adult && <span className="tag"><i className="fa-solid fa-droplet" /> {d.absorbency_adult}</span>}
                  </div>
                  <div className="meta" style={{ marginTop: 8 }}>
                    {d.avg_score > 0 && (
                      <span className="score-badge"><i className="fa-solid fa-star" style={{ color: 'var(--warning)' }} /> {Number(d.avg_score).toFixed(1)}</span>
                    )}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{d.rating_count} 评价</span>
                    {d.avg_price && <span style={{ fontWeight: 600 }}>{d.avg_price}</span>}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </>
          )}
        </>
      )}
    </div>
  );
}
