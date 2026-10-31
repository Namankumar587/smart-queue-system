import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUp,
  ShieldCheck,
  Stethoscope,
  Ticket,
  Search,
  Lock,
  Layers,
  FileText,
  Activity,
  HeartPulse,
  ExternalLink,
  QrCode
} from 'lucide-react';

export const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer
      style={{
        backgroundColor: 'rgba(12, 2, 6, 0.96)',
        borderTop: '1px solid rgba(255, 60, 95, 0.22)',
        position: 'relative',
        zIndex: 20,
        overflow: 'hidden',
        color: '#E2B4BE'
      }}
    >
      {/* Top Ambient Nebular Glow */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '700px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(255, 45, 85, 0.12) 0%, transparent 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }}
      />

      <div className="container" style={{ maxWidth: '1240px', margin: '0 auto', padding: '4rem 1.5rem 2rem 1.5rem', position: 'relative', zIndex: 1 }}>
        {/* Main 4-Column Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '2.5rem',
            marginBottom: '3rem'
          }}
        >
          {/* Column 1: Brand & Academic Mission */}
          <div style={{ maxWidth: '340px' }}>
            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                marginBottom: '1rem'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(28, 6, 14, 0.85)',
                  border: '1px solid rgba(255, 70, 105, 0.35)',
                  boxShadow: '0 0 16px rgba(255, 45, 85, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  flexShrink: 0
                }}
              >
                <img
                  src="/smart-queue-emblem.png"
                  alt="Smart Queue Logo"
                  style={{
                    width: '32px',
                    height: '32px',
                    objectFit: 'contain'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: '1.05rem',
                    letterSpacing: '-0.02em',
                    color: '#FFFFFF'
                  }}
                >
                  Smart Queue &amp; Token
                </span>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#FF6B8B',
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase'
                  }}
                >
                  Local Clinic System
                </span>
              </div>
            </Link>

            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Eliminating physical waiting room overcrowding through deterministic sequence numbering, scannable QR verification, and verified zero-PII queue telemetry.
            </p>

            {/* Live Status Indicator */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                background: 'rgba(16, 185, 129, 0.1)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.76rem',
                fontWeight: 600,
                color: '#34D399'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#10B981',
                  boxShadow: '0 0 8px #10B981',
                  display: 'inline-block'
                }}
              />
              <span>System Operational &bull; Live Telemetry</span>
            </div>
          </div>

          {/* Column 2: Patient Portals */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Ticket size={14} color="#FF6B8B" />
              <span>Patient Services</span>
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <Link
                  to="/book"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <span>Book Appointment Token</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <span>Track Active Queue Live</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/display"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <span>Waiting Hall TV Display</span>
                </Link>
              </li>
              <li>
                <span style={{ fontSize: '0.875rem', color: '#8A5D67' }}>
                  Self-Check-in via QR Pass
                </span>
              </li>
              <li>
                <span style={{ fontSize: '0.875rem', color: '#8A5D67' }}>
                  Senior Citizen Priority Triage
                </span>
              </li>
            </ul>
          </div>

          {/* Column 3: Clinical & Staff Portals */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <Stethoscope size={14} color="#FF6B8B" />
              <span>Clinical Operations</span>
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <li>
                <Link
                  to="/staff/login"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <span>Staff &amp; Physician Sign In</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/doctor"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Doctor Consultation Console
                </Link>
              </li>
              <li>
                <Link
                  to="/staff"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Reception Desk Walk-in Queue
                </Link>
              </li>
              <li>
                <Link
                  to="/scanner"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <QrCode size={13} color="#FF6B8B" />
                  <span>Optical QR Scanner Desk</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin"
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-muted)',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.color = '#FFFFFF')}
                  onMouseOut={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  Admin Clinic Governance
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Academic Affiliation & Documents */}
          <div>
            <h4
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: '#FFFFFF',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem'
              }}
            >
              <ShieldCheck size={14} color="#FF6B8B" />
              <span>Academic Governance</span>
            </h4>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: '1rem' }}>
              <strong style={{ color: '#FFFFFF', display: 'block' }}>GL Bajaj Institute of Tech &amp; Mgmt</strong>
              Greater Noida, Uttar Pradesh &bull; CSE (Data Science)
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <a
                href="/SMART_QUEUE_VIVA_DEFENSE_COMPENDIUM.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  color: '#FF6B8B',
                  background: 'rgba(255, 45, 85, 0.1)',
                  border: '1px solid rgba(255, 70, 100, 0.3)',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 45, 85, 0.2)';
                  e.currentTarget.style.color = '#FFFFFF';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 45, 85, 0.1)';
                  e.currentTarget.style.color = '#FF6B8B';
                }}
              >
                <FileText size={13} />
                <span>Viva Defense Compendium (PDF)</span>
                <ExternalLink size={11} />
              </a>

              <div style={{ fontSize: '0.75rem', color: '#8A5D67' }}>
                Academic Project Batch 2026
              </div>
            </div>
          </div>
        </div>

        {/* Security & Compliance Badges Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            padding: '1.25rem',
            background: 'rgba(28, 5, 14, 0.65)',
            backdropFilter: 'blur(16px)',
            borderRadius: '14px',
            border: '1px solid rgba(255, 60, 95, 0.18)',
            marginBottom: '2.5rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Lock size={16} color="#FF6B8B" />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Zero-PII Isolation</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Masked public tracking payloads</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Activity size={16} color="#10B981" />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Atomic Sequences</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Collision-free daily token counters</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Layers size={16} color="#F59E0B" />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>Carrier-Safe SMS</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Flag-gated non-blocking alerts</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ShieldCheck size={16} color="#60A5FA" />
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FFFFFF' }}>RBAC Staff Security</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>bcrypt + JWT multi-role guard</div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright & Back-to-Top */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
            paddingTop: '1.5rem',
            borderTop: '1px solid rgba(255, 60, 95, 0.15)',
            fontSize: '0.78rem',
            color: 'var(--text-dim)'
          }}
        >
          <div>
            &copy; {new Date().getFullYear()} Smart Queue &amp; Token System &bull; Academic Mini Project &bull; GLBITM Greater Noida
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <span>Node.js / Express / React / Three.js / MongoDB</span>
            <button
              type="button"
              onClick={scrollToTop}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                background: 'rgba(255, 45, 85, 0.1)',
                color: '#FF8FA3',
                border: '1px solid rgba(255, 70, 100, 0.3)',
                padding: '0.35rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 45, 85, 0.25)';
                e.currentTarget.style.color = '#FFFFFF';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 45, 85, 0.1)';
                e.currentTarget.style.color = '#FF8FA3';
              }}
              title="Scroll back to top"
            >
              <span>Back to Top</span>
              <ArrowUp size={12} />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

