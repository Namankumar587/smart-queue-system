import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Stethoscope, Ticket, Search, Shield, LayoutDashboard, Sparkles, LogOut, Menu, X } from 'lucide-react';

export const Navbar = () => {
  const location = useLocation();
  const { isAuthenticated, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isActive = (path) => location.pathname === path;

  // Auto-close mobile menu on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        padding: '14px 20px',
        backgroundColor: 'transparent'
      }}
    >
      <div
        style={{
          maxWidth: '1240px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        {/* Left: Circular Glass Back / Home Button + Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to="/"
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '50%',
              backgroundColor: 'rgba(28, 6, 14, 0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 70, 105, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)',
              transition: 'all 0.2s ease',
              textDecoration: 'none'
            }}
            title="Return to Home"
            aria-label="Back to Home"
          >
            <ArrowLeft size={18} />
          </Link>

          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              textDecoration: 'none'
            }}
          >
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: 'rgba(28, 6, 14, 0.75)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 70, 105, 0.35)',
                boxShadow: '0 0 18px rgba(255, 45, 85, 0.28)',
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
                  width: '36px',
                  height: '36px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 2px 8px rgba(255, 45, 85, 0.45))'
                }}
              />
            </div>
            <span
              style={{
                fontWeight: 700,
                fontSize: '0.94rem',
                letterSpacing: '-0.01em',
                color: '#FFFFFF',
                fontFamily: 'var(--font-sans)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              Smart Queue
              <span
                style={{
                  width: '5px',
                  height: '5px',
                  borderRadius: '50%',
                  backgroundColor: '#FF2D55',
                  boxShadow: '0 0 8px #FF2D55',
                  display: 'inline-block'
                }}
              />
            </span>
          </Link>
        </div>

        {/* Center: Frosted Pill Navigation Capsule (Desktop) */}
        <nav
          className="nav-desktop-pill"
          style={{
            alignItems: 'center',
            gap: '4px',
            padding: '5px 8px',
            backgroundColor: 'rgba(20, 4, 9, 0.72)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 60, 95, 0.22)',
            borderRadius: '9999px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 1px rgba(255, 120, 150, 0.2)'
          }}
          aria-label="Main Navigation"
        >
          <Link
            to="/"
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: 500,
              color: isActive('/') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
              border: `1px solid ${isActive('/') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
              boxShadow: isActive('/') ? '0 0 14px rgba(255, 45, 85, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              textDecoration: 'none'
            }}
          >
            Home
          </Link>

          <Link
            to="/book"
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: 500,
              color: isActive('/book') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/book') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
              border: `1px solid ${isActive('/book') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
              boxShadow: isActive('/book') ? '0 0 14px rgba(255, 45, 85, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              textDecoration: 'none'
            }}
          >
            Book Token
          </Link>

          <Link
            to="/track/11111111-1111-4111-8111-111111111111"
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: 500,
              color: location.pathname.startsWith('/track') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: location.pathname.startsWith('/track') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
              border: `1px solid ${location.pathname.startsWith('/track') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
              boxShadow: location.pathname.startsWith('/track') ? '0 0 14px rgba(255, 45, 85, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              textDecoration: 'none'
            }}
          >
            Live Tracker
          </Link>

          <Link
            to="/display"
            style={{
              padding: '7px 16px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: 500,
              color: isActive('/display') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/display') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
              border: `1px solid ${isActive('/display') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
              boxShadow: isActive('/display') ? '0 0 14px rgba(255, 45, 85, 0.25)' : 'none',
              transition: 'all 0.15s ease',
              textDecoration: 'none'
            }}
          >
            OPD TV Display
          </Link>

          {/* Conditional authenticated links in pill */}
          {isAuthenticated && role === 'DOCTOR' && (
            <Link
              to="/doctor"
              style={{
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 500,
                color: isActive('/doctor') ? '#FFFFFF' : 'var(--text-muted)',
                backgroundColor: isActive('/doctor') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
                border: `1px solid ${isActive('/doctor') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
                transition: 'all 0.15s ease',
                textDecoration: 'none'
              }}
            >
              Doctor Room
            </Link>
          )}

          {isAuthenticated && (role === 'RECEPTIONIST' || role === 'ADMIN') && (
            <Link
              to="/staff"
              style={{
                padding: '7px 16px',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 500,
                color: isActive('/staff') || isActive('/reception') ? '#FFFFFF' : 'var(--text-muted)',
                backgroundColor: isActive('/staff') || isActive('/reception') ? 'rgba(255, 45, 85, 0.22)' : 'transparent',
                border: `1px solid ${isActive('/staff') || isActive('/reception') ? 'rgba(255, 75, 115, 0.45)' : 'transparent'}`,
                transition: 'all 0.15s ease',
                textDecoration: 'none'
              }}
            >
              Front Desk
            </Link>
          )}
        </nav>

        {/* Right: Quick CTA Pill & Auth Button (Desktop) */}
        <div className="nav-desktop-actions" style={{ alignItems: 'center', gap: '10px' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  backgroundColor: 'rgba(255, 45, 85, 0.12)',
                  padding: '4px 10px',
                  borderRadius: '9999px',
                  border: '1px solid rgba(255, 70, 105, 0.25)'
                }}
              >
                {role}
              </span>
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('glb_queue_token');
                  localStorage.removeItem('glb_queue_user');
                  window.location.href = '/login';
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.8rem',
                  backgroundColor: 'rgba(255, 59, 48, 0.15)',
                  color: '#FF6B8B',
                  border: '1px solid rgba(255, 70, 105, 0.3)',
                  cursor: 'pointer'
                }}
                title="Log out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '9999px',
                fontSize: '0.84rem',
                fontWeight: 600,
                backgroundColor: '#000000',
                color: '#FFFFFF',
                border: '1px solid rgba(255, 65, 105, 0.35)',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.6), 0 0 16px rgba(255, 45, 85, 0.2)',
                transition: 'all 0.2s ease',
                textDecoration: 'none'
              }}
            >
              <span>Staff Portal</span>
            </Link>
          )}

          <Link
            to="/book"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '9999px',
              fontSize: '0.84rem',
              fontWeight: 600,
              background: 'linear-gradient(135deg, #FF2D55 0%, #D4143D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 4px 20px rgba(255, 45, 85, 0.45)',
              transition: 'all 0.2s ease',
              textDecoration: 'none'
            }}
          >
            <span>Book Now</span>
          </Link>
        </div>

        {/* Right: Mobile Hamburger & Quick Action */}
        <div className="nav-mobile-toggle" style={{ alignItems: 'center', gap: '8px' }}>
          <Link
            to="/book"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '7px 14px',
              borderRadius: '9999px',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #FF2D55 0%, #D4143D 100%)',
              color: '#FFFFFF',
              boxShadow: '0 2px 10px rgba(255, 45, 85, 0.4)',
              textDecoration: 'none'
            }}
          >
            Book
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              backgroundColor: 'rgba(28, 6, 14, 0.85)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 70, 105, 0.35)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
          >
            {mobileMenuOpen ? <X size={20} color="#FF6B8B" /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu (Smooth Glass Dropdown) */}
      {mobileMenuOpen && (
        <div
          style={{
            marginTop: '10px',
            padding: '16px',
            backgroundColor: 'rgba(18, 3, 9, 0.96)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255, 60, 95, 0.35)',
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.95), 0 0 30px rgba(255, 45, 85, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              color: isActive('/') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/') ? 'rgba(255, 45, 85, 0.2)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            Home
          </Link>

          <Link
            to="/book"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              color: isActive('/book') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/book') ? 'rgba(255, 45, 85, 0.2)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            Book Token
          </Link>

          <Link
            to="/track/11111111-1111-4111-8111-111111111111"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              color: location.pathname.startsWith('/track') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: location.pathname.startsWith('/track') ? 'rgba(255, 45, 85, 0.2)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            Live Queue Tracker
          </Link>

          <Link
            to="/display"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              color: isActive('/display') ? '#FFFFFF' : 'var(--text-muted)',
              backgroundColor: isActive('/display') ? 'rgba(255, 45, 85, 0.2)' : 'transparent',
              fontWeight: 600,
              fontSize: '0.92rem',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            Waiting Room TV Display
          </Link>

          <div style={{ height: '1px', backgroundColor: 'rgba(255, 60, 95, 0.2)', margin: '6px 0' }} />

          {isAuthenticated ? (
            <>
              {role === 'DOCTOR' && (
                <Link
                  to="/doctor"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255, 45, 85, 0.15)',
                    fontWeight: 600,
                    fontSize: '0.92rem'
                  }}
                >
                  Doctor Room Console
                </Link>
              )}
              {(role === 'RECEPTIONIST' || role === 'ADMIN') && (
                <Link
                  to="/staff"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    padding: '10px 16px',
                    borderRadius: '12px',
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255, 45, 85, 0.15)',
                    fontWeight: 600,
                    fontSize: '0.92rem'
                  }}
                >
                  Front Desk &amp; Staff Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem('glb_queue_token');
                  localStorage.removeItem('glb_queue_user');
                  window.location.href = '/login';
                }}
                style={{
                  padding: '10px 16px',
                  borderRadius: '12px',
                  color: '#FF6B8B',
                  backgroundColor: 'rgba(255, 59, 48, 0.15)',
                  fontWeight: 600,
                  fontSize: '0.92rem',
                  textAlign: 'left',
                  cursor: 'pointer'
                }}
              >
                Log Out ({role})
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 16px',
                borderRadius: '12px',
                color: '#FFFFFF',
                backgroundColor: 'rgba(28, 6, 14, 0.8)',
                border: '1px solid rgba(255, 70, 105, 0.3)',
                fontWeight: 600,
                fontSize: '0.92rem'
              }}
            >
              Staff Portal Login
            </Link>
          )}
        </div>
      )}
    </header>
  );
};
