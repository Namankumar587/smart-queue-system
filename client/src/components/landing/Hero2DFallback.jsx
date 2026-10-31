import React from 'react';

/**
 * Hero2DFallback:
 * A rich, clinical 2D/SVG isometric visual fallback that renders:
 * 1. Before WebGL/Canvas finishes loading (instant Suspense fallback, 0ms delay).
 * 2. When WebGL context creation fails or WebGL is disabled/unsupported.
 * 3. On low-power / battery-saver devices.
 * 4. When the user has enabled prefers-reduced-motion: reduce.
 *
 * Designed with the exact same clinical palette (#0B1220, #06B6D4, #F59E0B, #10B981)
 * portraying translucent queue token cards receding toward a glowing doctor consultation counter.
 */
export const Hero2DFallback = ({ reason = 'standard' }) => {
  return (
    <div
      className="hero-2d-fallback"
      role="img"
      aria-label="Clinical Queue Visualization showing translucent token cards receding toward the doctor consultation desk"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: '380px',
        maxHeight: '480px',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0b1220 0%, #0f172a 100%)',
        border: '1px solid rgba(56, 189, 248, 0.15)',
        boxShadow: '0 20px 40px -15px rgba(2, 6, 23, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <svg
        viewBox="0 0 800 480"
        style={{ width: '100%', height: '100%', display: 'block' }}
        preserveAspectRatio="xMidYMid meet"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Subtle background radial glow behind the doctor counter */}
          <radialGradient id="counterGlow" cx="50%" cy="30%" r="50%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
            <stop offset="40%" stopColor="#0284c7" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#0b1220" stopOpacity="0" />
          </radialGradient>

          {/* Cyan Glow for "YOU" card */}
          <linearGradient id="youCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0e3a4f" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#082333" stopOpacity="0.85" />
          </linearGradient>

          {/* Amber Glow for Senior Priority card */}
          <linearGradient id="amberCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3b2308" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#241403" stopOpacity="0.85" />
          </linearGradient>

          {/* Standard Slate Card */}
          <linearGradient id="slateCardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#0f172a" stopOpacity="0.75" />
          </linearGradient>

          {/* Glowing Doctor Room Portal */}
          <linearGradient id="doctorPortalGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.1" />
          </linearGradient>

          {/* Perspective floor grid fade */}
          <linearGradient id="floorFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0" />
            <stop offset="50%" stopColor="#0284c7" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.25" />
          </linearGradient>

          {/* Drop filter for cards */}
          <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="130%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#020617" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* 1. Perspective Background & Ambient Glow */}
        <rect width="800" height="480" fill="#0b1220" />
        <ellipse cx="400" cy="150" rx="320" ry="140" fill="url(#counterGlow)" />

        {/* 2. Receding Perspective Floor Lines */}
        <g stroke="url(#floorFade)" strokeWidth="1.2">
          {/* Horizon grid line */}
          <line x1="160" y1="210" x2="640" y2="210" opacity="0.3" />
          <line x1="80" y1="300" x2="720" y2="300" opacity="0.5" />
          <line x1="0" y1="420" x2="800" y2="420" opacity="0.8" />

          {/* Converging perspective rays toward doctor counter */}
          <line x1="400" y1="165" x2="400" y2="480" strokeDasharray="4 6" opacity="0.4" />
          <line x1="400" y1="165" x2="220" y2="480" opacity="0.3" />
          <line x1="400" y1="165" x2="580" y2="480" opacity="0.3" />
          <line x1="400" y1="165" x2="60" y2="480" opacity="0.2" />
          <line x1="400" y1="165" x2="740" y2="480" opacity="0.2" />
        </g>

        {/* 3. Glowing Doctor Consultation Station (Vanishing Point, Center-Top) */}
        <g transform="translate(300, 95)">
          {/* Backlit doorway / portal */}
          <rect x="25" y="0" width="150" height="95" rx="8" fill="url(#doctorPortalGrad)" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.4" />

          {/* Consultation Desk */}
          <rect x="10" y="65" width="180" height="30" rx="6" fill="#0f172a" stroke="#0ea5e9" strokeWidth="1.5" />
          <rect x="20" y="68" width="160" height="4" rx="2" fill="#38bdf8" opacity="0.8" />

          {/* Active Consultation Light */}
          <circle cx="100" cy="30" r="5" fill="#22c55e" />
          <circle cx="100" cy="30" r="10" fill="#22c55e" opacity="0.25" />

          {/* Desk signage */}
          <text x="100" y="50" textAnchor="middle" fill="#93c5fd" fontSize="10" fontWeight="700" letterSpacing="0.08em" fontFamily="system-ui, sans-serif">
            CONSULTATION ROOM 1
          </text>
          <text x="100" y="85" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="600" letterSpacing="0.05em" fontFamily="system-ui, sans-serif">
            DR. SHARMA &bull; ACTIVE
          </text>
        </g>

        {/* 4. Token Cards Receding Along Queue Corridor */}

        {/* CARD 4: T-001 (Currently Being Served, Near Station) */}
        <g transform="translate(330, 205)" filter="url(#cardShadow)">
          <rect width="140" height="75" rx="8" fill="#064e3b" fillOpacity="0.85" stroke="#10b981" strokeWidth="1.5" />
          <circle cx="18" cy="22" r="4" fill="#34d399" />
          <text x="28" y="25" fill="#a7f3d0" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif">NOW SERVING</text>
          <text x="70" y="54" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="800" letterSpacing="0.05em" fontFamily="system-ui, sans-serif">T-001</text>
          <text x="70" y="67" textAnchor="middle" fill="#6ee7b7" fontSize="8" fontWeight="600" fontFamily="system-ui, sans-serif">In Consultation</text>
        </g>

        {/* CARD 3: T-003 (Regular In-Queue Card, Mid-Left) */}
        <g transform="translate(140, 260)" filter="url(#cardShadow)">
          <rect width="160" height="90" rx="10" fill="url(#slateCardGrad)" stroke="#475569" strokeWidth="1.2" />
          <rect x="12" y="12" width="55" height="16" rx="4" fill="#334155" />
          <text x="39" y="24" textAnchor="middle" fill="#cbd5e1" fontSize="9" fontWeight="700" fontFamily="system-ui, sans-serif">WAITING</text>
          <text x="80" y="62" textAnchor="middle" fill="#ffffff" fontSize="26" fontWeight="800" fontFamily="system-ui, sans-serif">T-003</text>
          <text x="80" y="79" textAnchor="middle" fill="#94a3b8" fontSize="10" fontFamily="system-ui, sans-serif">Est. 6m remaining</text>
        </g>

        {/* CARD 2: SENIOR PRIORITY CARD (Amber, Mid-Right) */}
        <g transform="translate(480, 260)" filter="url(#cardShadow)">
          <rect width="180" height="100" rx="10" fill="url(#amberCardGrad)" stroke="#f59e0b" strokeWidth="2" />
          {/* Senior badge */}
          <rect x="14" y="12" width="112" height="18" rx="4" fill="#78350f" stroke="#d97706" strokeWidth="0.8" />
          <text x="70" y="25" textAnchor="middle" fill="#fbbf24" fontSize="9" fontWeight="800" letterSpacing="0.05em" fontFamily="system-ui, sans-serif">
            &#9733; SENIOR PRIORITY
          </text>
          <text x="90" y="66" textAnchor="middle" fill="#ffffff" fontSize="30" fontWeight="800" fontFamily="system-ui, sans-serif">T-002</text>
          <text x="90" y="86" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="600" fontFamily="system-ui, sans-serif">Next in Queue &bull; Est. 3m</text>
        </g>

        {/* CARD 1: YOU CARD (Foreground, Cyan Highlight, Center-Left) */}
        <g transform="translate(230, 340)" filter="url(#cardShadow)">
          <rect width="250" height="120" rx="12" fill="url(#youCardGrad)" stroke="#06b6d4" strokeWidth="2.5" />
          {/* Cyan Glow Header Ribbon */}
          <rect x="14" y="14" width="120" height="22" rx="6" fill="#0891b2" />
          <circle cx="26" cy="25" r="4" fill="#a5f3fc" />
          <text x="74" y="29" textAnchor="middle" fill="#ecfeff" fontSize="11" fontWeight="800" letterSpacing="0.08em" fontFamily="system-ui, sans-serif">
            YOU &bull; T-004
          </text>

          {/* Prominent Token Display */}
          <text x="125" y="82" textAnchor="middle" fill="#ffffff" fontSize="38" fontWeight="900" letterSpacing="-0.02em" fontFamily="system-ui, sans-serif">
            T-004
          </text>

          {/* Subtext and live position status */}
          <text x="125" y="106" textAnchor="middle" fill="#38bdf8" fontSize="12" fontWeight="700" fontFamily="system-ui, sans-serif">
            2 Ahead &bull; Estimated wait: 12 mins
          </text>
        </g>

        {/* Clinical Info Badge in Corner */}
        <g transform="translate(24, 24)">
          <rect width="180" height="26" rx="13" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle cx="14" cy="13" r="4" fill="#06b6d4" />
          <text x="24" y="17" fill="#94a3b8" fontSize="10" fontWeight="600" fontFamily="system-ui, sans-serif">
            {reason === 'reduced-motion'
              ? 'Motion-Reduced Queue View'
              : reason === 'low-power'
              ? 'Low-Power Optimized View'
              : 'Deterministic Queue Visualizer'}
          </text>
        </g>
      </svg>
    </div>
  );
};

export default Hero2DFallback;
