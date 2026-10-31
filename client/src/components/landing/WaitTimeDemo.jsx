import React, { useState, useEffect, Suspense } from 'react';
import WaitTime2DFallback from './WaitTime2DFallback';
import { Sliders, Clock, Users, Eye, Layers, Minus, Plus, Info, AlertCircle } from 'lucide-react';

// Lazy-load the Scene C 3D Canvas
const WaitTime3DCanvas = React.lazy(() => import('./WaitTime3DCanvas'));

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
 * WaitTimeDemo:
 * PROMPT 29 Scene C: Interactive Wait-Time Simulator.
 * Features:
 * - Two accessible keyboard-operable sliders: patientsAhead and averageMinutes.
 * - Computes displayed result in ordinary deterministic frontend code: patientsAhead * averageMinutes.
 * - Prominently labeled: "sample values, not real clinic data".
 * - 3D animation visualizes the same values without calculating or owning the result.
 * - Complete 2D equivalent and prefers-reduced-motion support.
 */
export default function WaitTimeDemo() {
  const [patientsAhead, setPatientsAhead] = useState(4);
  const [averageMinutes, setAverageMinutes] = useState(8);
  const [force2D, setForce2D] = useState(false);
  const [fallbackReason, setFallbackReason] = useState(null);

  // ORDINARY DETERMINISTIC FRONTEND CALCULATION (Owned strictly by React)
  const estimatedWaitMinutes = patientsAhead * averageMinutes;

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

    // 3. Low power check
    if (
      typeof navigator !== 'undefined' &&
      (navigator.connection?.saveData ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2))
    ) {
      setFallbackReason('low-power');
      setForce2D(true);
    }
  }, []);

  // Presets for quick exploration
  const applyPreset = (ahead, mins) => {
    setPatientsAhead(ahead);
    setAverageMinutes(mins);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Header with Title & Mode Toggle */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem'
        }}
      >
        <div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#FBBF24',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              padding: '0.35rem 0.85rem',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              marginBottom: '0.6rem',
              boxShadow: '0 0 15px rgba(245, 158, 11, 0.15)'
            }}
          >
            <Clock size={13} color="#FBBF24" />
            Scene C &bull; Interactive Deterministic Estimator
          </div>
          <h2
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            Simulate Your Clinic Queue &amp; Wait Time
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.35rem 0 0 0' }}>
            Adjust patient queue depth and doctor consultation duration to preview the deterministic mathematical formula.
          </p>
        </div>

        {/* View Mode Toggle */}
        <button
          type="button"
          onClick={() => setForce2D(!force2D)}
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
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 45, 85, 0.15)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 95, 130, 0.6)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.7), 0 0 25px rgba(255, 45, 85, 0.35)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 70, 100, 0.35)';
            e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.5), 0 0 15px rgba(255, 45, 85, 0.15)';
            e.currentTarget.style.transform = 'none';
          }}
          title={force2D ? 'Switch to 3D perspective' : 'Switch to 2D diagram'}
        >
          {force2D ? <Eye size={15} color="#FF6B8B" /> : <Layers size={15} color="#FF6B8B" />}
          <span>{force2D ? 'Switch to 3D' : 'Switch to 2D'}</span>
        </button>
      </div>

      {/* Main Grid: Controls & Visualizer */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
          gap: '1.5rem',
          alignItems: 'start'
        }}
      >
        {/* Left Column: Accessible Sliders & Math Breakdown */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          {/* Prominent Mandatory Label */}
          <div
            style={{
              background: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              marginBottom: '1.5rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.65rem'
            }}
          >
            <AlertCircle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                sample values, not real clinic data
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem', lineHeight: 1.4 }}>
                This interactive demo runs client-side calculations for evaluation and project demonstration purposes.
              </div>
            </div>
          </div>

          {/* Slider 1: Patients Ahead */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                htmlFor="slider-patients-ahead"
                style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Users size={16} color="var(--primary)" />
                <span>Patients Ahead in Queue</span>
              </label>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: 'var(--primary)',
                  background: 'var(--primary-light)',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '6px'
                }}
              >
                {patientsAhead} {patientsAhead === 1 ? 'patient' : 'patients'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPatientsAhead((v) => Math.max(0, v - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', minWidth: '36px' }}
                aria-label="Decrease patients ahead"
                disabled={patientsAhead <= 0}
              >
                <Minus size={14} />
              </button>

              <input
                id="slider-patients-ahead"
                type="range"
                min="0"
                max="15"
                step="1"
                value={patientsAhead}
                onChange={(e) => setPatientsAhead(Number(e.target.value))}
                aria-label="Patients ahead in queue"
                aria-valuemin="0"
                aria-valuemax="15"
                aria-valuenow={patientsAhead}
                aria-valuetext={`${patientsAhead} patients ahead`}
                style={{
                  flex: 1,
                  accentColor: 'var(--primary)',
                  cursor: 'pointer'
                }}
              />

              <button
                type="button"
                onClick={() => setPatientsAhead((v) => Math.min(15, v + 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', minWidth: '36px' }}
                aria-label="Increase patients ahead"
                disabled={patientsAhead >= 15}
              >
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              <span>0 (Up next)</span>
              <span>15 (Busy queue)</span>
            </div>
          </div>

          {/* Slider 2: Average Consultation Minutes */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label
                htmlFor="slider-avg-minutes"
                style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Clock size={16} color="#059669" />
                <span>Avg. Consultation Time</span>
              </label>
              <span
                style={{
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  color: '#059669',
                  background: '#d1fae5',
                  padding: '0.15rem 0.6rem',
                  borderRadius: '6px'
                }}
              >
                {averageMinutes} mins / patient
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setAverageMinutes((v) => Math.max(2, v - 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', minWidth: '36px' }}
                aria-label="Decrease average consultation minutes"
                disabled={averageMinutes <= 2}
              >
                <Minus size={14} />
              </button>

              <input
                id="slider-avg-minutes"
                type="range"
                min="2"
                max="25"
                step="1"
                value={averageMinutes}
                onChange={(e) => setAverageMinutes(Number(e.target.value))}
                aria-label="Average consultation minutes"
                aria-valuemin="2"
                aria-valuemax="25"
                aria-valuenow={averageMinutes}
                aria-valuetext={`${averageMinutes} minutes per consultation`}
                style={{
                  flex: 1,
                  accentColor: '#059669',
                  cursor: 'pointer'
                }}
              />

              <button
                type="button"
                onClick={() => setAverageMinutes((v) => Math.min(25, v + 1))}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.65rem', minWidth: '36px' }}
                aria-label="Increase average consultation minutes"
                disabled={averageMinutes >= 25}
              >
                <Plus size={14} />
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              <span>2 mins (Fast checkup)</span>
              <span>25 mins (Detailed review)</span>
            </div>
          </div>

          {/* Quick Scenario Presets */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
              Quick Presets
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => applyPreset(4, 8)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Standard (4 &times; 8 = 32m)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(1, 6)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Quick (1 &times; 6 = 6m)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(8, 10)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Peak (8 &times; 10 = 80m)
              </button>
              <button
                type="button"
                onClick={() => applyPreset(0, 8)}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}
              >
                Up Next (0 &times; 8 = 0m)
              </button>
            </div>
          </div>

          {/* Deterministic Calculation Output Box */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(42, 8, 20, 0.85) 0%, rgba(18, 3, 9, 0.95) 100%)',
              color: '#ffffff',
              borderRadius: '14px',
              padding: '1.35rem',
              border: '1.5px solid rgba(255, 60, 95, 0.35)',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6), 0 0 25px rgba(255, 45, 85, 0.2)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Top shimmer accent */}
            <div
              className="cosmic-shimmer-border"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '3px'
              }}
            />

            <div style={{ fontSize: '0.75rem', color: '#E2B4BE', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
              Deterministic Result
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#FF2D55', textShadow: '0 0 20px rgba(255, 45, 85, 0.5)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                ~{estimatedWaitMinutes} mins
              </div>
              <div style={{ fontSize: '0.75rem', color: '#E2B4BE', opacity: 0.8 }}>
                estimate, not a guarantee
              </div>
            </div>

            <div
              style={{
                fontFamily: 'monospace',
                fontSize: '0.85rem',
                color: '#FFFFFF',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                borderTop: '1px solid rgba(255, 60, 95, 0.2)'
              }}
            >
              {patientsAhead} patients ahead &times; {averageMinutes} min/patient = {estimatedWaitMinutes} mins
            </div>
          </div>
        </div>

        {/* Right Column: Visualizer (3D Canvas or 2D Diagram) */}
        <div>
          {force2D ? (
            <WaitTime2DFallback
              patientsAhead={patientsAhead}
              averageMinutes={averageMinutes}
              estimatedWaitMinutes={estimatedWaitMinutes}
            />
          ) : (
            <Suspense
              fallback={
                <WaitTime2DFallback
                  patientsAhead={patientsAhead}
                  averageMinutes={averageMinutes}
                  estimatedWaitMinutes={estimatedWaitMinutes}
                />
              }
            >
              <WaitTime3DCanvas
                patientsAhead={patientsAhead}
                estimatedWaitMinutes={estimatedWaitMinutes}
              />
              <div style={{ marginTop: '0.75rem' }}>
                <WaitTime2DFallback
                  patientsAhead={patientsAhead}
                  averageMinutes={averageMinutes}
                  estimatedWaitMinutes={estimatedWaitMinutes}
                />
              </div>
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
