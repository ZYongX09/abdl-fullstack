import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { guessAPI } from '../api';

export default function GuessYouLike() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    guessAPI.get().then(d => setItems(d.recommendations || []))
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading || items.length === 0) return null;

  return (
    <div className="hero-card" style={{ marginBottom: 16 }}>
      <h3 style={{ marginBottom: 12 }}>
        <i className="fa-solid fa-lightbulb" style={{ color: 'var(--warning)' }} /> 猜你喜欢 · 为你甄选
      </h3>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'stretch' }}>
        {items.map(d => (
          <Link to={`/diaper/${d.id}`} key={d.id} style={{ textDecoration: 'none', color: 'inherit', minWidth: 200, maxWidth: 220, flex: '0 0 auto' }}>
            <div className="diaper-card" style={{ padding: 14, height: '100%', display: 'flex', flexDirection: 'column' }}>
              <div className="brand">{d.brand}</div>
              <div className="model" style={{ fontSize: '1rem' }}>{d.model}</div>
              <div className="meta" style={{ marginTop: 4 }}>
                {d.avg_score > 0 && (
                  <span className="score-badge">
                    <i className="fa-solid fa-star" style={{ color: 'var(--warning)', fontSize: '0.7rem' }} /> {Number(d.avg_score).toFixed(1)}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{d.rating_count}评</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--primary-dark)', marginTop: 6 }}>
                <i className="fa-solid fa-thumbs-up" /> {d.reason}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
