import { useEffect } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useEffect(() => {
    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1));

      const scrollToHashTarget = () => {
        const target = document.getElementById(targetId);
        if (target) {
          target.scrollIntoView({ block: 'start' });
          return;
        }

        window.scrollTo(0, 0);
      };

      const frameId = window.requestAnimationFrame(scrollToHashTarget);
      return () => window.cancelAnimationFrame(frameId);
    }

    if (navType !== 'POP') {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash, navType]);

  return null;
}
