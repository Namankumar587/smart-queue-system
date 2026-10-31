import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Tv,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Radio,
  Clock,
  Building,
  Users,
  CheckCircle2,
  Stethoscope,
  Sparkles,
  ArrowRight,
  Home
} from 'lucide-react';
import { apiClient } from '../api/client';

export const DisplayPage = () => {
  const [displayData, setDisplayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAudioEnabled, setIsAudioEnabled] = useState(() => {
    try {
      return localStorage.getItem('glb_tv_audio_enabled') === 'true';
    } catch {
      return false;
    }
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSseConnected, setIsSseConnected] = useState(false);
  const [lastAnnouncedToken, setLastAnnouncedToken] = useState({});

  const audioContextRef = useRef(null);
  const prevRoomsRef = useRef({});

  // 1. Clock timer updating every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 2. Global Document Interaction Listener: Automatically unlocks browser audio autoplay
  useEffect(() => {
    const unlockAudio = () => {
      setIsAudioEnabled(true);
      try {
        localStorage.setItem('glb_tv_audio_enabled', 'true');
      } catch {}

      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          if (!audioContextRef.current) audioContextRef.current = new AudioCtx();
          if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
          }
        }
      } catch {}
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
  }, []);

  // 2. Synthesized Dual-Tone Hospital Bell Chime (Web Audio API)
  const playChime = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      // Tone 1: High Bell Note (880 Hz - A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.6);

      // Tone 2: Harmonic Chime Note (1320 Hz - E6)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.9);
    } catch (e) {
      console.warn('AudioContext chime error:', e.message);
    }
  };

  // 3. Web Speech API Voice Announcement
  const speakAnnouncement = (text) => {
    if (!isAudioEnabled) return;
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    // Play synthesized bell chime first
    playChime();

    // Voice announcement after brief pause
    setTimeout(() => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.92;
      utterance.pitch = 1.05;
      utterance.volume = 1.0;

      // Prefer high-quality English voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha'))
      );
      if (preferred) utterance.voice = preferred;

      window.speechSynthesis.speak(utterance);
    }, 450);
  };

  // 4. Authoritative Data Fetcher
  const fetchDisplayData = async () => {
    try {
      const data = await apiClient.get('/tokens/display/public');
      if (data) {
        processNewDisplayData(data);
        setError(null);
      }
    } catch (err) {
      setError(err.message || 'Unable to retrieve waiting room queue status.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Compare state and trigger voice announcements for newly called patients
  const processNewDisplayData = (data) => {
    setDisplayData(data);

    if (data?.rooms && Array.isArray(data.rooms)) {
      data.rooms.forEach((room) => {
        const prevCode = prevRoomsRef.current[room.doctorId];
        const currentCode = room.currentServing?.displayCode;

        // Trigger voice announcement if a new token was just called
        if (currentCode && currentCode !== prevCode && room.currentServing?.status === 'CALLED') {
          const announcement = `Attention please: Token ${currentCode}. Please proceed to ${room.roomNumber} for ${room.doctorName}.`;
          speakAnnouncement(announcement);
        }

        prevRoomsRef.current[room.doctorId] = currentCode;
      });
    }
  };

  // 6. Real-time SSE Stream Connection with Polling Fallback
  useEffect(() => {
    fetchDisplayData();

    let eventSource = null;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(`${apiBase}/tokens/display/stream`);
        eventSource.onopen = () => setIsSseConnected(true);

        eventSource.addEventListener('initial', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data) processNewDisplayData(data);
          } catch {}
        });

        eventSource.addEventListener('display_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data) processNewDisplayData(data);
          } catch {}
        });

        eventSource.onerror = () => setIsSseConnected(false);
      } catch {
        setIsSseConnected(false);
      }
    }

    // Fallback polling timer every 6 seconds
    const pollInterval = setInterval(() => {
      fetchDisplayData();
    }, 6000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(pollInterval);
    };
  }, [isAudioEnabled]);

  const handleTestAudio = () => {
    setIsAudioEnabled(true);
    try {
      localStorage.setItem('glb_tv_audio_enabled', 'true');
    } catch {}
    playChime();
    setTimeout(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance('Smart Queue audio announcement system is online and ready.');
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
    }, 450);
  };

  // Fullscreen toggle handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#070004',
        color: '#ffffff',
        fontFamily: 'var(--font-sans, system-ui, sans-serif)',
        padding: '24px 32px',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box'
      }}
    >
      {/* TV Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 45, 85, 0.25)',
          paddingBottom: '18px',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #ff2d55 0%, #ff6b8b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(255, 45, 85, 0.45)'
            }}
          >
            <Tv size={24} color="#ffffff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, letterSpacing: '0.02em', color: '#ffffff' }}>
              Smart Queue &bull; OPD Waiting Hall Display
            </h1>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)' }}>
              Real-time patient call system &bull; Gl Bajaj Institute Health Center
            </p>
          </div>
        </div>

        {/* Live Clock, SSE Badge & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Live Sync Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              backgroundColor: isSseConnected ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              border: `1px solid ${isSseConnected ? 'rgba(34, 197, 94, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              color: isSseConnected ? '#22c55e' : '#f59e0b',
              fontSize: '0.75rem',
              fontWeight: 700
            }}
          >
            <Radio size={12} className={isSseConnected ? 'pulse' : ''} />
            <span>{isSseConnected ? 'LIVE PUSH ACTIVE (<100ms)' : 'POLLING SYNC (5s)'}</span>
          </div>

          {/* Clock Display */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              fontFamily: 'monospace'
            }}
          >
            <Clock size={15} color="#ff2d55" />
            <span>{currentTime.toLocaleTimeString()}</span>
          </div>

          {/* Audio Chime Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextState = !isAudioEnabled;
              setIsAudioEnabled(nextState);
              try {
                localStorage.setItem('glb_tv_audio_enabled', String(nextState));
              } catch {}
              if (nextState) {
                playChime();
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: `1px solid ${isAudioEnabled ? '#22c55e' : 'rgba(255, 255, 255, 0.2)'}`,
              backgroundColor: isAudioEnabled ? 'rgba(34, 197, 94, 0.18)' : 'rgba(255, 255, 255, 0.08)',
              color: isAudioEnabled ? '#22c55e' : '#ffffff',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            {isAudioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{isAudioEnabled ? 'Audio Chime ON' : 'Audio Muted'}</span>
          </button>

          {/* Test Audio Chime & Announcement Button */}
          <button
            type="button"
            onClick={handleTestAudio}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 45, 85, 0.4)',
              backgroundColor: 'rgba(255, 45, 85, 0.15)',
              color: '#ff6b8b',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
            title="Play Test Hospital Chime & Announcement"
          >
            <Sparkles size={15} />
            <span>Test Audio</span>
          </button>

          {/* Fullscreen Toggle Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: '#ffffff',
              cursor: 'pointer'
            }}
            title="Toggle TV Fullscreen"
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>

          <Link
            to="/"
            style={{
              padding: '8px 12px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              color: 'rgba(255, 255, 255, 0.7)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none'
            }}
            title="Exit to Homepage"
          >
            <Home size={16} />
          </Link>
        </div>
      </header>

      {/* Main Grid: Multi-Doctor Consultation Rooms */}
      <main style={{ flex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'rgba(255, 255, 255, 0.6)' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: '3px solid rgba(255, 45, 85, 0.2)',
                borderTopColor: '#ff2d55',
                borderRadius: '50%',
                margin: '0 auto 16px auto',
                animation: 'spin 0.8s linear infinite'
              }}
            />
            <p>Connecting to OPD consultation desks...</p>
          </div>
        ) : displayData?.rooms && displayData.rooms.length > 0 ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                displayData.rooms.length === 1
                  ? '1fr'
                  : displayData.rooms.length === 2
                  ? 'repeat(2, 1fr)'
                  : 'repeat(auto-fit, minmax(360px, 1fr))',
              gap: '24px'
            }}
          >
            {displayData.rooms.map((room) => {
              const isServing = !!room.currentServing;
              const isCalled = room.currentServing?.status === 'CALLED';

              return (
                <div
                  key={room.doctorId}
                  style={{
                    backgroundColor: 'rgba(26, 6, 16, 0.85)',
                    border: isCalled
                      ? '2px solid #ff2d55'
                      : '1px solid rgba(255, 45, 85, 0.3)',
                    borderRadius: '24px',
                    padding: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: isCalled
                      ? '0 0 40px rgba(255, 45, 85, 0.35)'
                      : '0 10px 30px rgba(0, 0, 0, 0.6)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {/* Room Card Header */}
                  <div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                        paddingBottom: '14px',
                        marginBottom: '20px'
                      }}
                    >
                      <div>
                        <div
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#ff2d55',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: '0.875rem',
                            padding: '4px 12px',
                            borderRadius: '8px',
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            marginBottom: '6px'
                          }}
                        >
                          {room.roomNumber}
                        </div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                          {room.doctorName}
                        </h2>
                        <span style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                          {room.department}
                        </span>
                      </div>

                      <div
                        style={{
                          textAlign: 'right',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          padding: '8px 12px',
                          borderRadius: '12px'
                        }}
                      >
                        <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.5)' }}>In Waiting</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#22d3ee' }}>
                          {room.totalWaiting}
                        </div>
                      </div>
                    </div>

                    {/* Massive "NOW SERVING" Indicator */}
                    <div
                      style={{
                        backgroundColor: isServing
                          ? 'rgba(255, 45, 85, 0.1)'
                          : 'rgba(255, 255, 255, 0.03)',
                        border: isServing
                          ? '1px solid rgba(255, 45, 85, 0.4)'
                          : '1px dashed rgba(255, 255, 255, 0.15)',
                        borderRadius: '18px',
                        padding: '24px 16px',
                        textAlign: 'center',
                        marginBottom: '20px'
                      }}
                    >
                      <div
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 800,
                          color: isCalled ? '#ff2d55' : isServing ? '#22d3ee' : 'rgba(255, 255, 255, 0.4)',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                          marginBottom: '8px'
                        }}
                      >
                        {isCalled
                          ? '🚨 NOW CALLING — PLEASE ENTER'
                          : isServing
                          ? '🩺 IN CONSULTATION'
                          : 'ROOM VACANT / PREPARING'}
                      </div>

                      <div
                        style={{
                          fontSize: '3.75rem',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          color: isServing ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                          letterSpacing: '0.05em',
                          lineHeight: 1.1,
                          textShadow: isCalled ? '0 0 25px rgba(255, 45, 85, 0.8)' : 'none'
                        }}
                      >
                        {isServing ? room.currentServing.displayCode : '---'}
                      </div>

                      {isServing && (
                        <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '6px' }}>
                          Sequential Token: {room.currentServing.tokenNumber ? `T-${room.currentServing.tokenNumber}` : 'Active'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* "UP NEXT" Queue Carousel */}
                  <div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'rgba(255, 255, 255, 0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '10px'
                      }}
                    >
                      Up Next In Line:
                    </div>

                    {room.upNext && room.upNext.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(70px, 1fr))', gap: '8px' }}>
                        {room.upNext.map((nextT, idx) => (
                          <div
                            key={idx}
                            style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.06)',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              borderRadius: '10px',
                              padding: '8px 4px',
                              textAlign: 'center'
                            }}
                          >
                            <span style={{ fontSize: '0.6875rem', color: 'rgba(255, 255, 255, 0.4)', display: 'block' }}>
                              #{idx + 1}
                            </span>
                            <span
                              style={{
                                fontSize: '0.9375rem',
                                fontWeight: 800,
                                fontFamily: 'monospace',
                                color: idx === 0 ? '#22d3ee' : '#ffffff'
                              }}
                            >
                              {nextT.displayCode}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.8125rem', color: 'rgba(255, 255, 255, 0.35)', fontStyle: 'italic' }}>
                        No patients waiting in queue.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '24px',
              border: '1px dashed rgba(255, 255, 255, 0.15)'
            }}
          >
            <Stethoscope size={44} color="#ff2d55" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px 0' }}>No Active OPD Clinics</h3>
            <p style={{ fontSize: '0.875rem', color: 'rgba(255, 255, 255, 0.6)', maxWidth: '420px', margin: '0 auto' }}>
              Doctors have not opened consultations for today yet. Reception will activate the queue shortly.
            </p>
          </div>
        )}
      </main>

      {/* TV Footer Bar with Instructions */}
      <footer
        style={{
          marginTop: '24px',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          paddingTop: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.8125rem',
          color: 'rgba(255, 255, 255, 0.55)',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          📢 <strong>Patient Advisory:</strong> When your token code is announced, please enter your designated doctor's room immediately.
        </div>
        <div>
          Track on smartphone: <span style={{ color: '#22d3ee' }}>http://localhost:5173/track</span>
        </div>
      </footer>

      {/* Non-intrusive Audio Activation Reminder (satisfies browser autoplay policies) */}
      {!isAudioEnabled && (
        <div
          onClick={handleTestAudio}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') handleTestAudio();
          }}
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(255, 45, 85, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#ffffff',
            padding: '12px 28px',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 35px rgba(255, 45, 85, 0.6)',
            cursor: 'pointer',
            zIndex: 9999,
            border: '2px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          <Volume2 size={18} />
          <span>Tap anywhere on screen to enable TV voice announcements &amp; audio chimes</span>
        </div>
      )}
    </div>
  );
};

export default DisplayPage;

