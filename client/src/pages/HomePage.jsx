import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  Search,
  Eye,
  Sliders,
  Sparkles,
  Users,
  Activity,
  Clock,
  ShieldCheck,
  Stethoscope,
  HeartPulse,
  UserCheck
} from 'lucide-react';
import WorkflowJourney from '../components/landing/WorkflowJourney';
import InteractiveClinicHub from '../components/landing/InteractiveClinicHub';
import WaitTimeDemo from '../components/landing/WaitTimeDemo';

export const HomePage = () => {
  const [uuidInput, setUuidInput] = useState('');
  const [showServingCode, setShowServingCode] = useState(true);
  const navigate = useNavigate();

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (uuidInput.trim()) {
      navigate(`/track/${uuidInput.trim()}`);
    }
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', paddingBottom: '6rem' }}>
      {/* Background Ambient Nebular Halo Lights (Matches Screenshot Flares) */}
      <div
        style={{
          position: 'absolute',
          top: '120px',
          left: '50%',
          transform: 'translateX(-50%)',
          maxWidth: '750px',
          width: '100%',
          height: '450px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255, 45, 85, 0.28) 0%, rgba(180, 15, 50, 0.12) 50%, transparent 75%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
          zIndex: 0
        }}
      />

      {/* Main Container */}
      <div className="container" style={{ position: 'relative', zIndex: 1, maxWidth: '1240px', paddingTop: '2.5rem' }}>
        {/* Hero Section: Centered Title & Pill CTA */}
        <div style={{ textAlign: 'center', maxWidth: '820px', margin: '0 auto 3rem auto' }}>
          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5.5vw, 4.2rem)',
              fontWeight: 800,
              lineHeight: 1.12,
              letterSpacing: '-0.035em',
              color: '#FFFFFF',
              margin: '0 0 1.25rem 0',
              textShadow: '0 2px 20px rgba(0, 0, 0, 0.8), 0 0 40px rgba(255, 45, 85, 0.2)'
            }}
          >
            Take Control<br />
            for your Clinic Flow
          </h1>

          <p
            style={{
              fontSize: 'clamp(1rem, 1.8vw, 1.15rem)',
              color: 'var(--text-muted)',
              lineHeight: 1.6,
              maxWidth: '560px',
              margin: '0 auto 2rem auto',
              fontWeight: 400
            }}
          >
            Discover an intelligent, user-friendly platform for tracking live clinic queues, dynamic wait times, and verified zero-PII patient flow.
          </p>

          {/* Center Pill CTA Button (Matches Reference Capsule Button) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', justifyContent: 'center' }}>
            <Link to="/book" className="btn-pill" style={{ padding: '12px 24px', fontSize: '1rem' }}>
              <span>Start free now</span>
              <span className="btn-pill-icon">
                <ArrowRight size={14} />
              </span>
            </Link>
          </div>
        </div>

        {/* 3D Floating Glassmorphic Dashboard Composition (Exact match to reference layout) */}
        <div
          style={{
            position: 'relative',
            maxWidth: '1100px',
            margin: '0 auto',
            minHeight: '480px',
            padding: '20px 0'
          }}
        >
          {/* Flanking Ambient Glowing Glass Backdrop Flares (Creating Depth like Screenshot) */}
          <div
            style={{
              position: 'absolute',
              top: '80px',
              left: '12%',
              maxWidth: '240px',
              width: '100%',
              height: '320px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.35) 0%, rgba(160, 20, 50, 0.15) 100%)',
              filter: 'blur(35px)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '80px',
              right: '12%',
              maxWidth: '240px',
              width: '100%',
              height: '320px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, rgba(255, 45, 85, 0.35) 0%, rgba(160, 20, 50, 0.15) 100%)',
              filter: 'blur(35px)',
              pointerEvents: 'none',
              zIndex: 1
            }}
          />

          {/* Grid Layout for Floating Cards */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: '20px',
              alignItems: 'center'
            }}
          >
            {/* Top Left Card: "Expenses Report" -> "Clinic Flow Report" */}
            <div
              className="cosmic-glass"
              style={{
                gridColumn: 'span 4',
                padding: '24px',
                minHeight: '210px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Queue Load Report</span>
                <Activity size={16} color="#FF6B8B" />
              </div>

              {/* Glowing Circular Gauge / Donut Ring */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0' }}>
                <div style={{ position: 'relative', maxWidth: '110px', width: '100%', height: '110px' }}>
                  <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                    <circle cx="50" cy="50" r="40" stroke="rgba(255, 60, 95, 0.18)" strokeWidth="8" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#FF2D55"
                      strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset="75"
                      strokeLinecap="round"
                      fill="none"
                      style={{ filter: 'drop-shadow(0 0 8px rgba(255, 45, 85, 0.8))' }}
                    />
                  </svg>
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>78%</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Optimal
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Avg Wait: ~9 mins</span>
                <span style={{ color: '#10B981', fontWeight: 600 }}>Normal Flow</span>
              </div>
            </div>

            {/* CENTER ELEVATED HERO CARD: "Total Balance" -> "Live Queue Status & Serving Token" */}
            <div
              className="cosmic-glass-hero"
              style={{
                gridColumn: 'span 4',
                padding: '28px 26px',
                minHeight: '260px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transform: 'scale(1.05)',
                zIndex: 5
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255, 230, 235, 0.85)', fontWeight: 500 }}>
                    Live Queue Status
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowServingCode(!showServingCode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 230, 235, 0.7)',
                      cursor: 'pointer',
                      padding: '2px'
                    }}
                    title="Toggle Token View"
                    aria-label="Toggle Token Code Visibility"
                  >
                    <Eye size={18} />
                  </button>
                </div>

                <div
                  style={{
                    fontSize: 'clamp(1.75rem, 3.2vw, 2.35rem)',
                    fontWeight: 800,
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF',
                    fontFamily: 'var(--font-mono)',
                    margin: '4px 0 16px 0',
                    textShadow: '0 2px 20px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 100, 140, 0.5)'
                  }}
                >
                  {showServingCode ? 'T-001 • CALLED' : 'DOC-GEN-101'}
                </div>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 120, 150, 0.25)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255, 220, 230, 0.75)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Dr. Priya Sharma
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                    Room 101
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'rgba(255, 220, 230, 0.75)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Est. Wait Time
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#FF94AA', marginTop: '2px' }}>
                    ~10 mins
                  </div>
                </div>
              </div>
            </div>

            {/* Top Right Card: "Assets" -> "Doctors On Duty" */}
            <div
              className="cosmic-glass"
              style={{
                gridColumn: 'span 4',
                padding: '24px',
                minHeight: '210px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Doctors On Duty</span>
                <span style={{ fontSize: '0.75rem', color: '#FF6B8B', fontWeight: 600 }}>3 Active</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '10px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        maxWidth: '28px',
                        width: '100%',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 45, 85, 0.2)',
                        border: '1px solid rgba(255, 70, 105, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FF6B8B'
                      }}
                    >
                      <Stethoscope size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Dr. Priya Sharma</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>General Med • Rm 101</div>
                    </div>
                  </div>
                  <span
                    style={{
                      maxWidth: '32px',
                      width: '100%',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 45, 85, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#FFFFFF'
                    }}
                  >
                    38%
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        maxWidth: '28px',
                        width: '100%',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 45, 85, 0.2)',
                        border: '1px solid rgba(255, 70, 105, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FF6B8B'
                      }}
                    >
                      <HeartPulse size={14} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#FFFFFF' }}>Dr. Amit Verma</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Pediatrics • Rm 102</div>
                    </div>
                  </div>
                  <span
                    style={{
                      maxWidth: '32px',
                      width: '100%',
                      height: '32px',
                      borderRadius: '50%',
                      border: '2px solid rgba(255, 45, 85, 0.7)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#FFFFFF'
                    }}
                  >
                    65%
                  </span>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <Link to="/book" style={{ fontSize: '0.75rem', color: '#FF6B8B', fontWeight: 600, textDecoration: 'none' }}>
                  See all schedules &rarr;
                </Link>
              </div>
            </div>

            {/* Bottom Left Card: "Saving Budget" -> "Emergency & Priority Triage" */}
            <div
              className="cosmic-glass"
              style={{
                gridColumn: 'span 4',
                padding: '24px',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Priority &amp; Triage</span>
                <Sliders size={15} color="var(--text-muted)" />
              </div>

              <div>
                <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.01em' }}>
                  4 Priority Slots
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Senior citizens, differently-abled &amp; urgent walk-in
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#FBBF24', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.35)' }}>
                  Elderly (Rank 5)
                </span>
                <span style={{ fontSize: '0.72rem', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '3px 8px', borderRadius: '6px', border: '1px solid rgba(239, 68, 68, 0.35)' }}>
                  Emergency (Rank 10)
                </span>
              </div>
            </div>

            {/* Bottom Center Search Bar: Directly paste UUID to track */}
            <div
              className="cosmic-glass"
              style={{
                gridColumn: 'span 4',
                padding: '20px',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 45, 85, 0.2)'
              }}
            >
              <form onSubmit={handleTrackSubmit}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Search size={15} color="#FF2D55" />
                  <span>Have a Token? Track Live</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    value={uuidInput}
                    onChange={(e) => setUuidInput(e.target.value)}
                    placeholder="Enter Tracking UUID..."
                    className="input-field"
                    style={{
                      padding: '8px 12px',
                      fontSize: '0.82rem',
                      backgroundColor: 'rgba(15, 3, 7, 0.8)',
                      borderColor: 'rgba(255, 70, 105, 0.3)'
                    }}
                  />
                  <button
                    type="submit"
                    className="btn-pill"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.82rem',
                      whiteSpace: 'nowrap',
                      backgroundColor: '#FF2D55'
                    }}
                  >
                    Track
                  </button>
                </div>
              </form>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '8px' }}>
                Zero PII: Safe, encrypted patient tracking
              </div>
            </div>

            {/* Bottom Right Card: "You Goals" -> "Daily Clinic Goals & Progress" */}
            <div
              className="cosmic-glass"
              style={{
                gridColumn: 'span 4',
                padding: '24px',
                minHeight: '160px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Daily Consultation Goal</span>
                <span style={{ fontSize: '0.75rem', color: '#10B981', fontWeight: 600 }}>Active</span>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '1.45rem', fontWeight: 800, color: '#FFFFFF' }}>142 / 180</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tokens Served</span>
                </div>

                {/* Progress Bar with Glowing Crimson / Ruby Gradient */}
                <div
                  style={{
                    width: '100%',
                    height: '8px',
                    borderRadius: '9999px',
                    backgroundColor: 'rgba(255, 60, 95, 0.15)',
                    overflow: 'hidden',
                    margin: '8px 0 4px 0'
                  }}
                >
                  <div
                    style={{
                      width: '78%',
                      height: '100%',
                      borderRadius: '9999px',
                      background: 'linear-gradient(90deg, #FF2D55 0%, #FF6B8B 100%)',
                      boxShadow: '0 0 12px rgba(255, 45, 85, 0.8)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                <span>38 remaining capacity</span>
                <span>Near-turn alerts: Enabled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scene B: Five-Stage Patient Journey Workflow */}
        <section style={{ marginTop: '3.5rem', borderTop: '1px solid rgba(255, 60, 95, 0.2)', paddingTop: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Patient Journey: 5-Stage Healthcare Workflow
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
              Step-by-step token progression from arrival to verified doctor consultation.
            </p>
          </div>
          <WorkflowJourney />
        </section>

        {/* Interactive Clinic Sandbox & Live Duty Hub */}
        <section style={{ marginTop: '2rem', borderTop: '1px solid rgba(255, 60, 95, 0.2)', paddingTop: '2rem' }}>
          <InteractiveClinicHub />
        </section>

        {/* Scene C: Dynamic Wait-Time Simulator */}
        <section className="motion-reveal" style={{ marginTop: '2.5rem', paddingTop: '1.5rem' }}>
          <div className="cosmic-glass" style={{ padding: '24px' }}>
            <WaitTimeDemo />
          </div>
        </section>

        {/* Core Pillars Feature Section */}
        <div style={{ marginTop: '3.5rem', borderTop: '1px solid rgba(255, 60, 95, 0.2)', paddingTop: '2.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
              Architected for Reliability &amp; Patient Privacy
            </h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.95rem' }}>
              Deterministic queue state machines with zero data loss and automated near-turn alerts.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            <div className="cosmic-glass" style={{ padding: '24px' }}>
              <div
                style={{
                  maxWidth: '42px',
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 45, 85, 0.2)',
                  border: '1px solid rgba(255, 70, 105, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF6B8B',
                  marginBottom: '1rem'
                }}
              >
                <Clock size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Dynamic Wait Estimations
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Wait times recalculate dynamically per doctor based on historical consultation durations and active priority-weighted queue positions.
              </p>
            </div>

            <div className="cosmic-glass" style={{ padding: '24px' }}>
              <div
                style={{
                  maxWidth: '42px',
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 45, 85, 0.2)',
                  border: '1px solid rgba(255, 70, 105, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF6B8B',
                  marginBottom: '1rem'
                }}
              >
                <ShieldCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Zero-PII Public Tracking
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Public trackers use unguessable cryptographic UUIDs and strict `no-store` HTTP headers, completely shielding patient identity.
              </p>
            </div>

            <div className="cosmic-glass" style={{ padding: '24px' }}>
              <div
                style={{
                  maxWidth: '42px',
                  width: '100%',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(255, 45, 85, 0.2)',
                  border: '1px solid rgba(255, 70, 105, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FF6B8B',
                  marginBottom: '1rem'
                }}
              >
                <UserCheck size={22} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '0.5rem' }}>
                Staff &amp; Doctor Control
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Dedicated portals for front desk receptionists and doctors with real-time token transitions (`CALLED` &rarr; `IN_CONSULTATION` &rarr; `COMPLETED`).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
