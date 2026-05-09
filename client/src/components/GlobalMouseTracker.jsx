import { useEffect } from 'react';

/** Tracks global mouse position and sets CSS custom properties for glass light effects */
export default function GlobalMouseTracker() {
  useEffect(() => {
    let raf;
    let mx = 0.5, my = 0.5;
    let tMx = 0.5, tMy = 0.5;

    const onMove = (e) => {
      tMx = e.clientX / window.innerWidth;
      tMy = e.clientY / window.innerHeight;
    };

    const tick = () => {
      // Smooth follow (lerp)
      mx += (tMx - mx) * 0.06;
      my += (tMy - my) * 0.06;
      document.documentElement.style.setProperty('--glass-light-x', mx.toFixed(4));
      document.documentElement.style.setProperty('--glass-light-y', my.toFixed(4));
      raf = requestAnimationFrame(tick);
    };

    // Default to top-left area (like the OpenGL lightPos)
    document.documentElement.style.setProperty('--glass-light-x', '0.25');
    document.documentElement.style.setProperty('--glass-light-y', '0.25');

    window.addEventListener('mousemove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
