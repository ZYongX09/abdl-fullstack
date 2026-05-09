import { useState, useEffect } from 'react';

export default function LoadingSkeleton({ count = 3, type = 'card' }) {
  if (type === 'rank') {
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '12px 0', marginBottom: 8, borderRadius: 10, height: 52 }}>
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1 }}>
          <div className="skeleton skeleton-text" style={{ width: '50%', marginBottom: 4 }} />
          <div className="skeleton skeleton-text short" style={{ width: '30%' }} />
        </div>
        <div className="skeleton" style={{ width: 48, height: 24, borderRadius: 12 }} />
      </div>
    ));
  }
  if (type === 'list') {
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton" style={{ padding: '10px 12px', marginBottom: 6, borderRadius: 8, height: 36 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', height: '100%' }}>
          <div className="skeleton" style={{ width: 16, height: 16, borderRadius: 3 }} />
          <div className="skeleton skeleton-text" style={{ flex: 1, marginBottom: 0 }} />
          <div className="skeleton skeleton-text short" style={{ width: '20%', marginBottom: 0 }} />
        </div>
      </div>
    ));
  }
  if (type === 'feed') {
    return Array.from({ length: count }, (_, i) => (
      <div key={i} className="skeleton skeleton-card" style={{ padding: 20, background: 'white' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <div className="skeleton skeleton-avatar" />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-text" />
            <div className="skeleton skeleton-text short" />
          </div>
        </div>
        <div className="skeleton skeleton-text" style={{ width: '100%' }} />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text short" style={{ width: '40%' }} />
      </div>
    ));
  }

  return (
    <div className="diaper-grid">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton skeleton-card" style={{ padding: 20, background: 'white', height: 140 }}>
          <div className="skeleton skeleton-text" style={{ width: '40%' }} />
          <div className="skeleton skeleton-text" style={{ width: '80%', height: 20 }} />
          <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          <div className="skeleton skeleton-text short" style={{ width: '30%' }} />
        </div>
      ))}
    </div>
  );
}
