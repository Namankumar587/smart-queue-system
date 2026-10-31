import React, { useState, useEffect, Suspense } from 'react';
import Hero2DFallback from './Hero2DFallback';

// Lazy-load the 3D Canvas strictly on the landing page
const Hero3DCanvas = React.lazy(() => import('./Hero3DCanvas'));

/**
 * Robust WebGL feature detection
 */
function checkWebGLSupport() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (err) {
    return false;
  }
}

/**
 * Checks for low-power, battery-saver or constrained hardware
 */
function checkIsLowPower() {
  if (typeof navigator === 'undefined') return false;
  try {
    // Data saver mode
    if (navigator.connection && navigator.connection.saveData) {
      return true;
    }
    // Very constrained CPU cores (e.g. <= 2)
    if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
      return true;
    }
    // Very low RAM device (<= 2 GB)
    if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
      return true;
    }
  } catch (err) {
    return false;
  }
  return false;
}

/**
 * Simple ErrorBoundary to gracefully catch WebGL context crashes
 */
class WebGLErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.warn('WebGL 3D Hero encountered an issue, falling back to 2D illustration:', error);
  }

  render() {
    if (this.state.hasError) {
      return <Hero2DFallback reason="error" />;
    }
    return this.props.children;
  }
}

/**
 * HeroSceneContainer:
 * Manages the resilient switching between the 3D WebGL Canvas and the 2D SVG Fallback.
 * Adheres strictly to PROMPT 28:
 * - Lazy-loads Canvas with React.lazy / Suspense
 * - Renders useful 2D/SVG fallback before WebGL loads, on failure, on low-power, and on prefers-reduced-motion
 */
export default function HeroSceneContainer() {
  const [useFallbackReason, setUseFallbackReason] = useState(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Check prefers-reduced-motion
    const motionQuery =
      typeof window !== 'undefined' && window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

    if (motionQuery && motionQuery.matches) {
      setUseFallbackReason('reduced-motion');
      return;
    }

    // 2. Check WebGL availability
    const hasWebGL = checkWebGLSupport();
    if (!hasWebGL) {
      setUseFallbackReason('no-webgl');
      return;
    }

    // 3. Check low-power constraint
    const isLowPower = checkIsLowPower();
    if (isLowPower) {
      setUseFallbackReason('low-power');
      return;
    }

    // Listener for reduced motion changes
    const handleMotionChange = (e) => {
      if (e.matches) {
        setUseFallbackReason('reduced-motion');
      } else if (hasWebGL && !isLowPower) {
        setUseFallbackReason(null);
      }
    };

    if (motionQuery?.addEventListener) {
      motionQuery.addEventListener('change', handleMotionChange);
    }

    return () => {
      if (motionQuery?.removeEventListener) {
        motionQuery.removeEventListener('change', handleMotionChange);
      }
    };
  }, []);

  // During SSR or before mount, render 2D fallback immediately (0 layout shift)
  if (!mounted || useFallbackReason) {
    return <Hero2DFallback reason={useFallbackReason || 'initial'} />;
  }

  return (
    <WebGLErrorBoundary>
      <Suspense fallback={<Hero2DFallback reason="loading" />}>
        <Hero3DCanvas />
      </Suspense>
    </WebGLErrorBoundary>
  );
}
