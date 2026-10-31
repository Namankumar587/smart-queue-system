import React from 'react';
import { Clock, User, Stethoscope, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';

/**
 * WaitTime2DFallback:
 * Accessible 2D linear queue visualizer and calculation breakdown for Scene C.
 * Adheres strictly to PROMPT 29:
 * - Deterministic display of patientsAhead * averageMinutes
 * - Prominent "sample values, not real clinic data" label
 * - Accessible representation for low-power and prefers-reduced-motion environments
 */
export default function WaitTime2DFallback({
  patientsAhead = 4,
  averageMinutes = 8,
  estimatedWaitMinutes = 32
}) {
  // Generate token card representation for up to 8 visible cards in 2D
  const maxDisplayTokens = Math.min(patientsAhead, 6);
  const overflowCount = patientsAhead - maxDisplayTokens;

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(32, 6, 16, 0.78) 0%, rgba(14, 2, 7, 0.92) 100%)',
        backdropFilter: 'blur(30px) saturate(180%)',
        WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        border: '1px solid rgba(255, 60, 95, 0.25)',
        borderRadius: '20px',
        padding: '1.5rem',
        color: '#f8fafc',
        boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(255, 45, 85, 0.12)'
      }}
      aria-label="Wait Time Visual Queue Diagram"
    >
      {/* Header and Mandatory Clinical Sample Label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
          marginBottom: '1.25rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
          <Clock size={16} color="#FF6B8B" />
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#E2B4BE', letterSpacing: '0.04em' }}>
            VISUAL QUEUE PIPELINE
          </span>
        </div>

        {/* Mandatory Prompt 29 Label */}
        <span
          style={{
            fontSize: '0.75rem',
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#fbbf24',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            padding: '0.25rem 0.65rem',
            borderRadius: '9999px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <AlertCircle size={12} />
          <span>sample values, not real clinic data</span>
        </span>
      </div>

      {/* Visual Queue Tokens Strip */}
      <div
        style={{
          background: 'rgba(16, 3, 8, 0.75)',
          border: '1px solid rgba(255, 60, 95, 0.18)',
          borderRadius: '14px',
          padding: '1.25rem 1rem',
          marginBottom: '1.5rem',
          overflowX: 'auto'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            minWidth: 'min-content'
          }}
        >
          {/* Doctor Station */}
          <div
            style={{
              background: 'linear-gradient(135deg, rgba(48, 10, 22, 0.9) 0%, rgba(20, 3, 10, 0.95) 100%)',
              border: '2px solid #FF2D55',
              borderRadius: '12px',
              padding: '0.75rem 1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              minWidth: '130px',
              flexShrink: 0,
              boxShadow: '0 0 20px rgba(255, 45, 85, 0.25)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#FF6B8B', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.25rem' }}>
              <Stethoscope size={14} />
              <span>ROOM 101</span>
            </div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#FFFFFF' }}>
              DR. SHARMA
            </div>
            <div style={{ fontSize: '0.7rem', color: '#10B981', marginTop: '0.2rem', fontWeight: 600 }}>
              ● In Consultation
            </div>
          </div>

          <ArrowRight size={16} color="rgba(255, 95, 130, 0.45)" style={{ flexShrink: 0 }} />

          {/* If 0 patients ahead: User is up next */}
          {patientsAhead === 0 ? (
            <div
              className="cosmic-glow-breathing"
              style={{
                background: 'rgba(255, 45, 85, 0.18)',
                border: '2px solid #FF2D55',
                borderRadius: '12px',
                padding: '0.75rem 1.25rem',
                minWidth: '150px',
                textAlign: 'center',
                boxShadow: '0 0 25px rgba(255, 45, 85, 0.4)'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#FF6B8B', letterSpacing: '0.05em' }}>
                YOU ARE UP NEXT
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0.2rem 0' }}>
                T-001
              </div>
              <div style={{ fontSize: '0.7rem', color: '#E2B4BE' }}>
                Proceed to Room 101
              </div>
            </div>
          ) : (
            <>
              {/* Currently Serving Token */}
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid #10B981',
                  borderRadius: '10px',
                  padding: '0.6rem 0.85rem',
                  minWidth: '100px',
                  textAlign: 'center',
                  flexShrink: 0,
                  boxShadow: '0 0 15px rgba(16, 185, 129, 0.15)'
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#10B981', fontWeight: 700 }}>
                  NOW SERVING
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF' }}>
                  T-001
                </div>
                <div style={{ fontSize: '0.65rem', color: '#A7F3D0' }}>In Room</div>
              </div>

              {/* Intermediate Waiting Tokens */}
              {Array.from({ length: maxDisplayTokens }).map((_, idx) => {
                const tokenNum = idx + 2;
                return (
                  <div
                    key={`token-ahead-${tokenNum}`}
                    style={{
                      background: 'rgba(35, 7, 16, 0.55)',
                      border: '1px solid rgba(255, 60, 95, 0.18)',
                      borderRadius: '8px',
                      padding: '0.5rem 0.75rem',
                      minWidth: '85px',
                      textAlign: 'center',
                      flexShrink: 0
                    }}
                  >
                    <div style={{ fontSize: '0.65rem', color: '#E2B4BE', opacity: 0.8 }}>
                      Ahead #{idx + 1}
                    </div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#FFFFFF' }}>
                      T-00{tokenNum}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#9E6D78' }}>Waiting</div>
                  </div>
                );
              })}

              {overflowCount > 0 && (
                <div
                  style={{
                    background: 'rgba(35, 7, 16, 0.8)',
                    borderRadius: '8px',
                    padding: '0.5rem 0.75rem',
                    color: '#E2B4BE',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    flexShrink: 0,
                    border: '1px solid rgba(255, 60, 95, 0.2)'
                  }}
                >
                  +{overflowCount} more
                </div>
              )}

              {/* The User's Token Card */}
              <div
                className="cosmic-glow-breathing"
                style={{
                  background: 'rgba(255, 45, 85, 0.18)',
                  border: '2px solid #FF2D55',
                  borderRadius: '12px',
                  padding: '0.6rem 1rem',
                  minWidth: '110px',
                  textAlign: 'center',
                  boxShadow: '0 0 20px rgba(255, 45, 85, 0.35)',
                  flexShrink: 0
                }}
              >
                <div style={{ fontSize: '0.7rem', color: '#FF6B8B', fontWeight: 800, letterSpacing: '0.05em' }}>
                  YOU
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                  T-00{patientsAhead + 1}
                </div>
                <div style={{ fontSize: '0.65rem', color: '#FF6B8B', fontWeight: 600 }}>
                  Pos #{patientsAhead + 1}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Deterministic Mathematical Formula Breakdown */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(42, 8, 20, 0.72) 0%, rgba(18, 3, 9, 0.88) 100%)',
          backdropFilter: 'blur(25px)',
          WebkitBackdropFilter: 'blur(25px)',
          border: '1px solid rgba(255, 60, 95, 0.25)',
          borderRadius: '16px',
          padding: '1.35rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
          alignItems: 'center',
          boxShadow: '0 15px 40px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div>
          <div style={{ fontSize: '0.75rem', color: '#E2B4BE', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
            Deterministic Calculation
          </div>
          <div style={{ fontSize: '1.05rem', color: '#FFFFFF', fontWeight: 700, fontFamily: 'monospace' }}>
            {patientsAhead} ahead &times; {averageMinutes} min/patient
          </div>
          <div style={{ fontSize: '0.8rem', color: '#E2B4BE', opacity: 0.75, marginTop: '0.25rem' }}>
            Formula: Wait = Patients Ahead &times; Effective Consultation Minutes
          </div>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, rgba(48, 10, 22, 0.85) 0%, rgba(20, 3, 10, 0.95) 100%)',
            border: '1.5px solid #FF2D55',
            borderRadius: '12px',
            padding: '0.85rem 1.25rem',
            textAlign: 'center',
            boxShadow: '0 0 20px rgba(255, 45, 85, 0.25)'
          }}
        >
          <div style={{ fontSize: '0.75rem', color: '#FF6B8B', fontWeight: 700 }}>
            ESTIMATED QUEUE WAIT
          </div>
          <div style={{ fontSize: '2.1rem', fontWeight: 900, color: '#FF2D55', textShadow: '0 0 15px rgba(255, 45, 85, 0.5)', lineHeight: 1.1 }}>
            ~{estimatedWaitMinutes} mins
          </div>
          <div style={{ fontSize: '0.7rem', color: '#E2B4BE', opacity: 0.8, marginTop: '0.2rem' }}>
            estimate, not a guarantee
          </div>
        </div>
      </div>
    </div>
  );
}
