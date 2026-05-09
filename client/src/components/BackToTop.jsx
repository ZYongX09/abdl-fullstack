import { useState, useEffect } from 'react';

export default function BackToTop() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    let timer;
    const onScroll = () => {
      const shouldShow = window.scrollY > 400;
      if (shouldShow) {
        setExiting(false);
        setVisible(true);
      } else if (visible) {
        setExiting(true);
        timer = setTimeout(() => { setVisible(false); setExiting(false); }, 250);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); clearTimeout(timer); };
  }, [visible]);

  if (!visible) return null;

  return (
    <button
      className={`back-to-top ${exiting ? 'back-to-top-exit' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      title="回到顶部" aria-label="回到顶部"
    >
      <i className="fa-solid fa-arrow-up" />
    </button>
  );
}
