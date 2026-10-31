import { useState, useEffect } from 'react';

/**
 * useCanvasVisibility:
 * Pauses 3D Canvas rendering when the canvas is off-screen (via IntersectionObserver)
 * or when the browser tab is hidden / in background (via document.visibilitychange).
 * Returns `true` if active & visible, `false` to switch R3F frameloop to 'never'.
 */
export function useCanvasVisibility(containerRef) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    let isIntersecting = true;
    let isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;

    const updateVisibility = () => {
      setIsVisible(isIntersecting && isTabVisible);
    };

    const handleVisibilityChange = () => {
      isTabVisible = typeof document !== 'undefined' ? !document.hidden : true;
      updateVisibility();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    let observer = null;
    if (containerRef.current && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries && entries[0]) {
            isIntersecting = entries[0].isIntersecting;
            updateVisibility();
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(containerRef.current);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
      if (observer) {
        observer.disconnect();
      }
    };
  }, [containerRef]);

  return isVisible;
}
