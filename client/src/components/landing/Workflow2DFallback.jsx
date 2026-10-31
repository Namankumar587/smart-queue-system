import React from 'react';
import { Ticket, CheckCircle2, Search, BellRing, Stethoscope, ArrowRight, ShieldCheck, Database } from 'lucide-react';
import { WORKFLOW_STATIONS } from './WorkflowData';

const STATION_ICONS = {
  book: Ticket,
  confirm: CheckCircle2,
  track: Search,
  notify: BellRing,
  consult: Stethoscope
};

/**
 * Workflow2DFallback:
 * Accessible 2D interactive roadmap for the 5-station clinic journey.
 * Serves as the complete fallback for Scene B when WebGL is unavailable,
 * on low-power devices, or when prefers-reduced-motion is active.
 */
export default function Workflow2DFallback({
  activeStationId = 'book',
  onSelectStation,
  reason = 'default'
}) {
  const activeStation =
    WORKFLOW_STATIONS.find((s) => s.id === activeStationId) || WORKFLOW_STATIONS[0];
  const ActiveIcon = STATION_ICONS[activeStation.id] || Ticket;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(32, 6, 16, 0.78) 0%, rgba(14, 2, 7, 0.92) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 60, 95, 0.25)',
        borderRadius: '20px',
        padding: '1.75rem',
        color: '#f8fafc',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 45, 85, 0.12)'
      }}
      aria-label="Five Station Clinic Workflow Journey"
    >
      {/* Fallback indicator badge */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          gap: '0.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <span
            className="beacon-pulse"
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: activeStation.accentColor,
              display: 'inline-block'
            }}
          />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2B4BE', letterSpacing: '0.04em' }}>
            SCENE B: 5-STATION CLINICAL PIPELINE
          </span>
        </div>
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: 600,
            background: 'rgba(255, 45, 85, 0.12)',
            color: '#FF6B8B',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 65, 100, 0.3)',
            boxShadow: '0 0 12px rgba(255, 45, 85, 0.15)'
          }}
        >
          {reason === 'reduced-motion'
            ? 'Reduced Motion Mode (Accessible 2D)'
            : 'Interactive Workflow View'}
        </span>
      </div>

      {/* 5-Station Stepper Navigation Bar */}
      <div
        role="tablist"
        aria-label="Workflow Stations"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          background: 'rgba(16, 3, 8, 0.75)',
          padding: '0.5rem',
          borderRadius: '14px',
          border: '1px solid rgba(255, 60, 95, 0.18)'
        }}
      >
        {WORKFLOW_STATIONS.map((station) => {
          const isSelected = station.id === activeStation.id;
          const IconComponent = STATION_ICONS[station.id] || Ticket;

          return (
            <button
              key={station.id}
              role="tab"
              aria-selected={isSelected}
              id={`station-tab-${station.id}`}
              aria-controls={`station-panel-${station.id}`}
              onClick={() => onSelectStation && onSelectStation(station.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.55rem',
                padding: '0.65rem 0.85rem',
                borderRadius: '10px',
                border: isSelected
                  ? `1.5px solid ${station.accentColor}`
                  : '1px solid rgba(255, 60, 95, 0.12)',
                background: isSelected
                  ? `linear-gradient(135deg, rgba(255, 45, 85, 0.22) 0%, rgba(120, 15, 40, 0.18) 100%)`
                  : 'rgba(255, 255, 255, 0.02)',
                color: isSelected ? '#FFFFFF' : '#E2B4BE',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '0.85rem',
                fontWeight: isSelected ? 700 : 500,
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isSelected ? `0 0 18px ${station.accentColor}33` : 'none',
                transform: isSelected ? 'translateY(-1px)' : 'none'
              }}
            >
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '7px',
                  background: isSelected ? station.accentColor : 'rgba(255, 60, 95, 0.15)',
                  color: isSelected ? '#FFFFFF' : '#FF6B8B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  boxShadow: isSelected ? `0 0 12px ${station.accentColor}66` : 'none',
                  transition: 'all 0.2s ease',
                  position: 'relative'
                }}
              >
                {isSelected && <span className="ring-pulse-halo" style={{ color: station.accentColor }} />}
                <IconComponent size={14} />
              </div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {station.shortName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Station Detail Card */}
      <div
        id={`station-panel-${activeStation.id}`}
        role="tabpanel"
        aria-labelledby={`station-tab-${activeStation.id}`}
        style={{
          background: 'linear-gradient(135deg, rgba(42, 8, 20, 0.72) 0%, rgba(18, 3, 9, 0.88) 100%)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          border: `1px solid ${activeStation.accentColor}55`,
          borderRadius: '16px',
          padding: '1.65rem',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 15px 40px rgba(0, 0, 0, 0.6), 0 0 30px ${activeStation.accentColor}18`
        }}
      >
        {/* Animated Top glow accent */}
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

        <div key={activeStation.id} className="stage-content-enter">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.15rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                className="cosmic-glow-breathing"
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '14px',
                  background: `linear-gradient(135deg, ${activeStation.accentColor}26 0%, ${activeStation.accentColor}10 100%)`,
                  border: `1.5px solid ${activeStation.accentColor}88`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: activeStation.accentColor
                }}
              >
                <ActiveIcon size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      color: activeStation.accentColor,
                      letterSpacing: '0.05em'
                    }}
                  >
                    {activeStation.badge}
                  </span>
                  <span style={{ color: '#E2B4BE', opacity: 0.5, fontSize: '0.8rem' }}>&bull;</span>
                  <span style={{ fontSize: '0.75rem', color: '#E2B4BE' }}>
                    Stage {activeStation.stepNumber} of 5
                  </span>
                </div>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0 0 0' }}>
                  {activeStation.title}
                </h3>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                background: 'rgba(255, 45, 85, 0.12)',
                padding: '0.4rem 0.85rem',
                borderRadius: '9999px',
                border: '1px solid rgba(255, 70, 100, 0.3)',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#FF6B8B',
                boxShadow: '0 0 15px rgba(255, 45, 85, 0.15)'
              }}
            >
              <ShieldCheck size={14} color="#FF6B8B" />
              <span>Clinic Guard Enforced</span>
            </div>
          </div>

          <p style={{ fontSize: '1rem', color: '#FFFFFF', lineHeight: 1.6, marginBottom: '1.25rem' }}>
            {activeStation.summary}
          </p>

          <p style={{ fontSize: '0.9rem', color: '#E2B4BE', lineHeight: 1.55, marginBottom: '1.5rem' }}>
            {activeStation.details}
          </p>

          {/* Technical Implementation Callouts */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '0.75rem',
              paddingTop: '1rem',
              borderTop: '1px solid rgba(255, 60, 95, 0.2)'
            }}
          >
            <div
              style={{
                background: 'rgba(18, 3, 9, 0.75)',
                padding: '0.85rem 1.1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 60, 95, 0.2)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#E2B4BE', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <Database size={13} color="#FF6B8B" />
                <span>CONTRACT BEHAVIOR</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#f8fafc', fontFamily: 'monospace' }}>
                {activeStation.contractNote}
              </div>
            </div>

            <div
              style={{
                background: 'rgba(18, 3, 9, 0.75)',
                padding: '0.85rem 1.1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 60, 95, 0.2)',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.4)'
              }}
            >
              <div style={{ fontSize: '0.75rem', color: '#E2B4BE', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.35rem' }}>
                <ShieldCheck size={13} color="#10B981" />
                <span>PRIVACY &amp; SECURITY</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#f8fafc' }}>
                {activeStation.privacyNote}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
