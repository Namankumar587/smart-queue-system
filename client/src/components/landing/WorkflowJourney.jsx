import React, { useState, useEffect, useRef, Suspense, useCallback } from 'react';
import Workflow2DFallback from './Workflow2DFallback';
import { WORKFLOW_STATIONS } from './WorkflowData';
import {
  Ticket,
  CheckCircle2,
  Activity,
  BellRing,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  Eye,
  Layers,
  ShieldCheck,
  Cpu,
  Lock,
  X,
  Database
} from 'lucide-react';

// Lazy-load the Scene B 3D Background Canvas
const Workflow3DCanvas = React.lazy(() => import('./Workflow3DCanvas'));

const STATION_ICONS = {
  book: Ticket,
  confirm: CheckCircle2,
  track: Activity,
  notify: BellRing,
  consult: Stethoscope
};

function checkWebGL() {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch (_) {
    return false;
  }
}

/**
 * WorkflowJourney:
 * Premium scroll-driven 3D interaction matching the cyber corridor reference video.
 * - Sticky full-viewport corridor pinned during scroll progression
 * - Central luminous vertical laser rail with traveling glowing node
 * - Alternating left/right floating glassmorphic stage cards tethered to the spine
 * - 60 FPS continuous sub-pixel smooth translation and dynamic active station illumination
 * - Interactive architectural specs inspector modal
 * - Robust 2D fallback with prefers-reduced-motion support
 */
export default function WorkflowJourney() {
  const [activeStationId, setActiveStationId] = useState('book');
  const [force2D, setForce2D] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);
  const [visualProgress, setVisualProgress] = useState(0);
  const [continuousProgress, setContinuousProgress] = useState(0);
  const [selectedSpecStation, setSelectedSpecStation] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const trackRef = useRef(null);
  const scrollProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const activeStationIdRef = useRef('book');
  const isAutoScrollingRef = useRef(false);
  const rafIdRef = useRef(null);

  // Responsive breakpoint check
  useEffect(() => {
    const updateSize = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 840);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // System capability & accessibility check
  useEffect(() => {
    // 1. Reduced motion check
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setFallbackReason('reduced-motion');
      setForce2D(true);
      return;
    }

    // 2. WebGL check
    if (!checkWebGL()) {
      setFallbackReason('no-webgl');
      setForce2D(true);
      return;
    }

    // 3. Low-power check
    if (
      typeof navigator !== 'undefined' &&
      (navigator.connection?.saveData ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2))
    ) {
      setFallbackReason('low-power');
      setForce2D(true);
    }
  }, []);

  const currentIndex = WORKFLOW_STATIONS.findIndex((s) => s.id === activeStationId);
  const safeCurrentIndex = currentIndex >= 0 ? currentIndex : 0;
  const activeStation = WORKFLOW_STATIONS[safeCurrentIndex] || WORKFLOW_STATIONS[0];

  // 60 FPS Continuous Damped Motion Engine
  useEffect(() => {
    if (force2D) return;

    let isRunning = true;

    const tick = () => {
      if (!isRunning) return;

      const target = scrollProgressRef.current;
      const current = smoothProgressRef.current;
      // Damped exponential interpolation (lerp)
      const next = current + (target - current) * 0.12;
      smoothProgressRef.current = next;

      const continuous = next * 4.0;
      setContinuousProgress(continuous);
      setVisualProgress(next);

      // Determine active checkpoint
      const targetIdx = Math.min(
        WORKFLOW_STATIONS.length - 1,
        Math.max(0, Math.round(continuous))
      );
      const targetStation = WORKFLOW_STATIONS[targetIdx];
      if (
        targetStation &&
        targetStation.id !== activeStationIdRef.current &&
        !isAutoScrollingRef.current
      ) {
        activeStationIdRef.current = targetStation.id;
        setActiveStationId(targetStation.id);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
    return () => {
      isRunning = false;
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
    };
  }, [force2D]);

  // Scroll listener tracking window scroll through the pinned track
  useEffect(() => {
    const onScroll = () => {
      if (!trackRef.current || force2D || typeof window === 'undefined') return;

      const rect = trackRef.current.getBoundingClientRect();
      const vh = window.innerHeight;
      const stickyTop = isMobile ? 56 : 68;
      const totalScrollable = rect.height - vh;

      if (totalScrollable <= 0) return;

      const scrolled = stickyTop - rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / totalScrollable));
      scrollProgressRef.current = progress;
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [force2D, isMobile]);

  // Direct scrubbing from canvas, mouse wheel, or touch
  const handleDirectScrub = useCallback(
    (deltaProgress) => {
      if (!trackRef.current || force2D || typeof window === 'undefined') return;

      const rect = trackRef.current.getBoundingClientRect();
      const totalScrollable = rect.height - window.innerHeight;
      if (totalScrollable <= 0) return;

      const currentProgress = scrollProgressRef.current;
      const nextProgress = Math.max(0, Math.min(1, currentProgress + deltaProgress));
      scrollProgressRef.current = nextProgress;

      const currentScrollY = window.scrollY;
      const trackTop = currentScrollY + rect.top;
      const stickyTop = isMobile ? 56 : 68;
      const targetScrollY = trackTop - stickyTop + totalScrollable * nextProgress;

      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'instant'
      });
    },
    [force2D, isMobile]
  );

  // Jump to specific station smoothly
  const handleSelectStation = (stationId) => {
    const idx = WORKFLOW_STATIONS.findIndex((s) => s.id === stationId);
    if (idx === -1) return;

    activeStationIdRef.current = stationId;
    setActiveStationId(stationId);

    const checkpointFraction = idx / (WORKFLOW_STATIONS.length - 1);
    // Instant 3D camera & node animation trigger
    scrollProgressRef.current = checkpointFraction;

    if (!force2D && trackRef.current && typeof window !== 'undefined') {
      isAutoScrollingRef.current = true;
      const rect = trackRef.current.getBoundingClientRect();
      const currentScrollY = window.scrollY;
      const trackTop = currentScrollY + rect.top;
      const totalScrollable = rect.height - window.innerHeight;
      const stickyTop = isMobile ? 56 : 68;

      const targetScrollY = trackTop - stickyTop + totalScrollable * checkpointFraction;

      window.scrollTo({
        top: Math.max(0, targetScrollY),
        behavior: 'smooth'
      });

      setTimeout(() => {
        isAutoScrollingRef.current = false;
      }, 750);
    }
  };

  const touchStartYRef = useRef(null);

  const handleContainerWheel = useCallback(
    (e) => {
      if (force2D || typeof window === 'undefined' || !trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const stickyTop = isMobile ? 56 : 68;
      // When pinned in the viewport, allow mouse wheel to scrub stages directly
      if (rect.top <= stickyTop + 2 && rect.bottom >= window.innerHeight - 2) {
        handleDirectScrub(e.deltaY * 0.0006);
      }
    },
    [force2D, isMobile, handleDirectScrub]
  );

  const handleTouchStart = (e) => {
    if (e.touches && e.touches[0]) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchMove = (e) => {
    if (touchStartYRef.current === null || !e.touches || !e.touches[0]) return;
    const currentY = e.touches[0].clientY;
    const deltaY = touchStartYRef.current - currentY;
    touchStartYRef.current = currentY;
    handleDirectScrub(deltaY * 0.0012);
  };

  const handleTouchEnd = () => {
    touchStartYRef.current = null;
  };

  const handlePrev = () => {
    const prevIndex = (safeCurrentIndex - 1 + WORKFLOW_STATIONS.length) % WORKFLOW_STATIONS.length;
    handleSelectStation(WORKFLOW_STATIONS[prevIndex].id);
  };

  const handleNext = () => {
    const nextIndex = (safeCurrentIndex + 1) % WORKFLOW_STATIONS.length;
    handleSelectStation(WORKFLOW_STATIONS[nextIndex].id);
  };

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        height: force2D ? 'auto' : (isMobile ? '240vh' : '360vh'),
        width: '100%',
        marginBottom: '0'
      }}
    >
      {/* Sticky Viewport Container */}
      <div
        onWheel={handleContainerWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: force2D ? 'relative' : 'sticky',
          top: isMobile ? '56px' : '68px',
          height: force2D ? 'auto' : (isMobile ? 'calc(100vh - 64px)' : 'calc(100vh - 76px)'),
          width: '100%',
          overflow: 'hidden',
          borderRadius: isMobile ? '16px' : '24px',
          background: '#060105',
          border: '1px solid rgba(255, 60, 95, 0.25)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 45, 85, 0.15)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {force2D ? (
          <div style={{ padding: '24px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1rem'
              }}
            >
              <h2 style={{ fontSize: '1.65rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                The Five-Stage Patient Journey
              </h2>
              <button
                type="button"
                onClick={() => setForce2D(false)}
                style={{
                  padding: '0.5rem 0.95rem',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  background: 'linear-gradient(135deg, rgba(35, 7, 16, 0.8) 0%, rgba(18, 3, 9, 0.9) 100%)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 70, 100, 0.35)',
                  borderRadius: '9999px',
                  cursor: 'pointer'
                }}
              >
                <Eye size={15} color="#FF6B8B" />
                <span>Switch to 3D</span>
              </button>
            </div>
            <Workflow2DFallback
              activeStationId={activeStationId}
              onSelectStation={handleSelectStation}
              reason={fallbackReason || 'manual'}
            />
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: '100%',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {/* 3D Background Canvas Layer */}
            <Suspense
              fallback={
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: '#070105',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF6B8B'
                  }}
                >
                  Initializing 3D Corridor...
                </div>
              }
            >
              <Workflow3DCanvas
                activeStationId={activeStationId}
                onSelectStation={handleSelectStation}
                scrollProgressRef={scrollProgressRef}
                onScrub={handleDirectScrub}
              />
            </Suspense>

            {/* Dark Vignette Overlay for Crisp Contrast */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background:
                  'radial-gradient(ellipse at center, rgba(6, 1, 5, 0.25) 0%, rgba(6, 1, 5, 0.88) 85%, #060105 100%)',
                pointerEvents: 'none',
                zIndex: 2
              }}
            />

            {/* Top Floating HUD Capsule Bar */}
            <div
              style={{
                position: 'absolute',
                top: isMobile ? '8px' : '16px',
                left: isMobile ? '8px' : '18px',
                right: isMobile ? '8px' : '18px',
                zIndex: 30,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem',
                padding: isMobile ? '8px 12px' : '12px 18px',
                borderRadius: '16px',
                background: 'rgba(18, 3, 10, 0.85)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 60, 95, 0.3)',
                boxShadow: '0 10px 30px rgba(0, 0, 0, 0.8), 0 0 20px rgba(255, 45, 85, 0.12)'
              }}
            >
              {/* Title & Badge */}
              <div>
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'rgba(255, 45, 85, 0.15)',
                    color: '#FF6B8B',
                    border: '1px solid rgba(255, 70, 100, 0.35)',
                    padding: '0.2rem 0.65rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    marginBottom: '0.2rem'
                  }}
                >
                  <span
                    className="beacon-pulse"
                    style={{
                      width: '6px',
                      height: '6px',
                      borderRadius: '50%',
                      backgroundColor: activeStation.accentColor,
                      display: 'inline-block'
                    }}
                  />
                  <span>Scene B &bull; Five-Station Workflow</span>
                </div>
                <h2
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: '#FFFFFF',
                    letterSpacing: '-0.02em',
                    margin: 0
                  }}
                >
                  The Five-Stage Patient Journey
                </h2>
              </div>

              {/* Checkpoints Stepper Track */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'rgba(10, 1, 5, 0.85)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 60, 95, 0.22)',
                  overflowX: isMobile ? 'auto' : 'visible',
                  maxWidth: isMobile ? '100%' : 'none',
                  scrollbarWidth: 'none'
                }}
              >
                {WORKFLOW_STATIONS.map((st, i) => {
                  const isCurrent = i === safeCurrentIndex;
                  const isPassed = i <= safeCurrentIndex;
                  return (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleSelectStation(st.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: isCurrent ? '#FFFFFF' : isPassed ? '#FF8FA3' : '#73434E',
                        cursor: 'pointer',
                        padding: '0.25rem 0.55rem',
                        borderRadius: '9999px',
                        background: isCurrent ? 'rgba(255, 45, 85, 0.3)' : 'transparent',
                        border: isCurrent ? '1px solid rgba(255, 70, 100, 0.5)' : '1px solid transparent',
                        transition: 'all 0.2s ease'
                      }}
                      title={st.title}
                    >
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isCurrent ? st.accentColor : isPassed ? '#FF6B8B' : '#421620'
                        }}
                      />
                      <span>0{i + 1} {st.shortName}</span>
                    </button>
                  );
                })}
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    color: '#FF6B8B',
                    fontFamily: 'monospace',
                    paddingLeft: '0.4rem'
                  }}
                >
                  {Math.round(visualProgress * 100)}%
                </span>
              </div>

              {/* View Mode Toggle & Next/Prev Navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setForce2D(true)}
                  style={{
                    padding: '0.45rem 0.85rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(32, 6, 15, 0.85)',
                    color: '#FFFFFF',
                    border: '1px solid rgba(255, 70, 100, 0.35)',
                    borderRadius: '9999px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5)'
                  }}
                  title="Switch to 2D diagram"
                >
                  <Layers size={14} color="#FF6B8B" />
                  <span>2D Mode</span>
                </button>

                <div style={{ display: 'flex', gap: '0.3rem' }}>
                  <button
                    type="button"
                    onClick={handlePrev}
                    style={{
                      padding: '0.45rem 0.65rem',
                      background: 'rgba(32, 6, 15, 0.85)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 70, 100, 0.35)',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Previous workflow station"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    style={{
                      padding: '0.45rem 0.65rem',
                      background: 'rgba(32, 6, 15, 0.85)',
                      color: '#FFFFFF',
                      border: '1px solid rgba(255, 70, 100, 0.35)',
                      borderRadius: '9999px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    aria-label="Next workflow station"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Central Timeline Spine: Illuminated Neon Laser Rail */}
            <div
              style={{
                position: 'absolute',
                left: isMobile ? '32px' : '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                width: '3px',
                height: '360px',
                background:
                  'linear-gradient(180deg, rgba(255, 45, 85, 0.05) 0%, rgba(255, 45, 85, 0.9) 70%, #ffffff 100%)',
                boxShadow:
                  '0 0 10px rgba(255, 45, 85, 0.85), 0 0 25px rgba(168, 85, 247, 0.6), 0 0 45px rgba(255, 45, 85, 0.35)',
                zIndex: 10,
                pointerEvents: 'none'
              }}
            >
              {/* Traveling Glowing Head Node (Matching Reference Video) */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '-5px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  boxShadow:
                    '0 0 10px #FFFFFF, 0 0 22px #FF2D55, 0 0 38px #FF2D55, 0 0 55px rgba(255, 45, 85, 0.8)'
                }}
              >
                <div
                  className="beacon-pulse"
                  style={{
                    position: 'absolute',
                    inset: '-5px',
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255, 45, 85, 0.8)'
                  }}
                />
              </div>
            </div>

            {/* Floating Alternating Stage Cards along the Spine */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 15,
                pointerEvents: 'none'
              }}
            >
              {WORKFLOW_STATIONS.map((station, index) => {
                const IconComponent = STATION_ICONS[station.id] || Ticket;
                const delta = index - continuousProgress;
                const absDelta = Math.abs(delta);
                const isActive = absDelta < 0.48;

                // Spacing and position along vertical track
                const cardSpacing = isMobile ? 160 : 190;
                const offsetY = delta * cardSpacing;
                const scale = Math.max(0.88, Math.min(1.02, 1.02 - absDelta * 0.08));
                const opacity = Math.max(0.28, Math.min(1, 1 - absDelta * 0.52));

                // Alternating sides on desktop: Even indices on LEFT, Odd indices on RIGHT
                const isLeft = !isMobile && index % 2 === 0;

                return (
                  <div
                    key={station.id}
                    onClick={() => handleSelectStation(station.id)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      ...(isMobile
                        ? {
                            left: '60px',
                            right: '18px',
                            maxWidth: '440px'
                          }
                        : isLeft
                        ? {
                            right: 'calc(50% + 36px)',
                            width: 'clamp(320px, 34vw, 420px)'
                          }
                        : {
                            left: 'calc(50% + 36px)',
                            width: 'clamp(320px, 34vw, 420px)'
                          }),
                      transform: `translateY(calc(-50% + ${offsetY}px)) scale(${scale})`,
                      opacity,
                      transition: 'border 0.25s ease, box-shadow 0.25s ease, background 0.25s ease',
                      willChange: 'transform, opacity',
                      borderRadius: '16px',
                      padding: isMobile ? '16px' : '20px 22px',
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(28, 5, 14, 0.92) 0%, rgba(12, 1, 6, 0.96) 100%)'
                        : 'rgba(14, 2, 7, 0.65)',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: isActive
                        ? `1.5px solid ${station.accentColor}`
                        : '1px solid rgba(255, 255, 255, 0.08)',
                      boxShadow: isActive
                        ? `0 18px 45px rgba(0, 0, 0, 0.85), 0 0 35px ${station.accentColor}55, inset 0 0 15px ${station.accentColor}15`
                        : '0 8px 25px rgba(0, 0, 0, 0.5)',
                      cursor: 'pointer',
                      pointerEvents: absDelta < 1.6 ? 'auto' : 'none'
                    }}
                  >
                    {/* Horizontal Connector Tether to Central Laser Rail */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        height: '1.5px',
                        ...(isMobile
                          ? {
                              left: '-28px',
                              width: '28px',
                              background: isActive
                                ? `linear-gradient(90deg, #FFFFFF, ${station.accentColor})`
                                : 'rgba(255, 255, 255, 0.12)'
                            }
                          : isLeft
                          ? {
                              right: '-36px',
                              width: '36px',
                              background: isActive
                                ? `linear-gradient(90deg, ${station.accentColor}, #FFFFFF)`
                                : 'rgba(255, 255, 255, 0.12)'
                            }
                          : {
                              left: '-36px',
                              width: '36px',
                              background: isActive
                                ? `linear-gradient(90deg, #FFFFFF, ${station.accentColor})`
                                : 'rgba(255, 255, 255, 0.12)'
                            }),
                        boxShadow: isActive ? `0 0 8px ${station.accentColor}` : 'none'
                      }}
                    >
                      {/* Connection Dot Anchor */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '-2.5px',
                          ...(isMobile
                            ? { left: '-3px' }
                            : isLeft
                            ? { right: '-3px' }
                            : { left: '-3px' }),
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.3)',
                          boxShadow: isActive ? '0 0 8px #FFFFFF' : 'none'
                        }}
                      />
                    </div>

                    {/* Card Body: Icon + Information Layout */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                      {/* Circular Station Icon Avatar */}
                      <div
                        style={{
                          width: isMobile ? '44px' : '52px',
                          height: isMobile ? '44px' : '52px',
                          borderRadius: '50%',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: `1.5px solid ${isActive ? station.accentColor : 'rgba(255, 255, 255, 0.12)'}`,
                          background: isActive
                            ? 'rgba(255, 45, 85, 0.22)'
                            : 'rgba(255, 255, 255, 0.03)',
                          boxShadow: isActive ? `0 0 16px ${station.accentColor}66` : 'none',
                          transition: 'all 0.25s ease'
                        }}
                      >
                        <IconComponent
                          size={isMobile ? 20 : 24}
                          color={isActive ? station.accentColor : '#8A5D67'}
                        />
                      </div>

                      {/* Station Text Details */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Title Row with Step Number */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span
                              style={{
                                color: isActive ? station.accentColor : '#8A5D67',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                fontSize: '0.95rem'
                              }}
                            >
                              0{station.stepNumber} /
                            </span>
                            <span
                              style={{
                                color: isActive ? '#FFFFFF' : 'rgba(255, 255, 255, 0.65)',
                                fontWeight: 800,
                                letterSpacing: '0.04em',
                                fontSize: isMobile ? '0.92rem' : '1.05rem'
                              }}
                            >
                              {station.shortName.toUpperCase()}
                            </span>
                          </div>

                          {isActive && (
                            <span
                              style={{
                                fontSize: '0.68rem',
                                padding: '2px 8px',
                                borderRadius: '9999px',
                                background: 'rgba(255, 45, 85, 0.18)',
                                color: '#FF8FA3',
                                border: '1px solid rgba(255, 70, 100, 0.35)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.03em'
                              }}
                            >
                              {station.badge}
                            </span>
                          )}
                        </div>

                        {/* Station Summary */}
                        <p
                          style={{
                            margin: '6px 0 0 0',
                            fontSize: isMobile ? '0.78rem' : '0.84rem',
                            color: isActive
                              ? 'rgba(255, 255, 255, 0.82)'
                              : 'rgba(255, 255, 255, 0.45)',
                            lineHeight: 1.45
                          }}
                        >
                          {station.summary}
                        </p>

                        {/* Active Features & Specs Button */}
                        {isActive && (
                          <div
                            style={{
                              marginTop: '10px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '6px'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '0.7rem',
                                color: '#FF8FA3',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShieldCheck size={13} color="#10B981" />
                              <span>Clinic Guard Active</span>
                            </span>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSpecStation(station);
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                padding: 0,
                                color: '#FF6B8B',
                                fontSize: '0.73rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              <span>Specs &amp; Details &rarr;</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Traversal Status Pill */}
            <div
              style={{
                position: 'absolute',
                bottom: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                background: 'rgba(12, 1, 6, 0.85)',
                border: '1px solid rgba(255, 60, 95, 0.3)',
                borderRadius: '9999px',
                padding: '6px 14px',
                backdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 45, 85, 0.15)',
                color: '#E2B4BE',
                fontSize: '0.75rem',
                pointerEvents: 'none'
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '14px',
                  borderRadius: '5px',
                  border: '1.5px solid #FF6B8B',
                  display: 'flex',
                  justifyContent: 'center',
                  paddingTop: '2px'
                }}
              >
                <div className="mouse-wheel-dot" />
              </div>
              <span>Scroll down to navigate through the 5 stages</span>
            </div>

            {/* Architectural Specs Drawer Modal */}
            {selectedSpecStation && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 50,
                  background: 'rgba(6, 1, 5, 0.8)',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px'
                }}
                onClick={() => setSelectedSpecStation(null)}
              >
                <div
                  style={{
                    maxWidth: '560px',
                    width: '100%',
                    background: 'linear-gradient(135deg, rgba(32, 6, 17, 0.95) 0%, rgba(14, 2, 7, 0.98) 100%)',
                    borderRadius: '20px',
                    border: '1px solid rgba(255, 70, 100, 0.4)',
                    boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 40px rgba(255, 45, 85, 0.25)',
                    padding: '24px',
                    color: '#FFFFFF'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}
                  >
                    <div>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#FF6B8B',
                          background: 'rgba(255, 45, 85, 0.15)',
                          padding: '3px 8px',
                          borderRadius: '9999px',
                          border: '1px solid rgba(255, 70, 100, 0.35)',
                          textTransform: 'uppercase'
                        }}
                      >
                        {selectedSpecStation.badge} &bull; Stage {selectedSpecStation.stepNumber} of 5
                      </span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '6px 0 0 0' }}>
                        {selectedSpecStation.title}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSpecStation(null)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: 'none',
                        color: '#FFFFFF',
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label="Close specifications sheet"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <p style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: '0.9rem', lineHeight: 1.55 }}>
                    {selectedSpecStation.details}
                  </p>

                  <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div
                      style={{
                        background: 'rgba(10, 1, 5, 0.75)',
                        border: '1px solid rgba(255, 60, 95, 0.2)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#FF8FA3',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Database size={13} />
                        <span>CONTRACT BEHAVIOR &amp; ENDPOINT</span>
                      </div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          color: '#E2B4BE',
                          background: 'rgba(0, 0, 0, 0.4)',
                          padding: '6px 8px',
                          borderRadius: '6px'
                        }}
                      >
                        {selectedSpecStation.contractNote}
                      </div>
                    </div>

                    <div
                      style={{
                        background: 'rgba(10, 1, 5, 0.75)',
                        border: '1px solid rgba(255, 60, 95, 0.2)',
                        borderRadius: '12px',
                        padding: '12px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#10B981',
                          marginBottom: '4px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Lock size={13} />
                        <span>ZERO-PII PRIVACY &amp; SECURITY GUARANTEE</span>
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#E2B4BE' }}>
                        {selectedSpecStation.privacyNote}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSpecStation(null)}
                      className="btn-pill"
                      style={{
                        padding: '8px 20px',
                        fontSize: '0.82rem',
                        backgroundColor: '#FF2D55'
                      }}
                    >
                      Close Specifications
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
