import { useState, useEffect } from 'react';
import { levelsAPI } from '../api';

export default function LevelBadge({ userId, showProgress = false }) {
  const [level, setLevel] = useState(null);

  useEffect(() => {
    if (!userId) return;
    levelsAPI.user(userId).then(d => setLevel(d.level)).catch(() => {});
  }, [userId]);

  if (!level) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.75rem' }}>
      <span title={`Lv${level.level} ${level.badge_name}`} style={{ fontSize: '1rem' }}>{level.badge_icon}</span>
      <span style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>Lv{level.level}</span>
      {showProgress && (
        <div style={{ width: 50, height: 4, background: '#EEE', borderRadius: 2, overflow: 'hidden', marginLeft: 4 }}>
          <div style={{ height: '100%', background: 'var(--primary)', width: `${level.progress}%`, transition: 'width 0.3s' }} />
        </div>
      )}
    </span>
  );
}
