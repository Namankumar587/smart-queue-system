import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { TokenCard } from '../components/ui/TokenCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import {
  RefreshCw,
  Search,
  ShieldCheck,
  Ticket,
  AlertTriangle,
  Clock,
  Radio,
  CheckCircle2,
  Home,
  HelpCircle,
  Sparkles,
  XCircle,
  Zap,
  WifiOff
} from 'lucide-react';

export const TrackPage = () => {
  const { trackingUuid, id } = useParams();
  const navigate = useNavigate();

  // Support both /track/:trackingUuid and /track/:id route params
  const activeTrackingId = (trackingUuid || id || '').trim();

  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [networkWarning, setNetworkWarning] = useState(null);
  const [rateLimitedUntil, setRateLimitedUntil] = useState(0);
  const [manualUuid, setManualUuid] = useState('');
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');

  // Real-time Push & Offline Pass States
  const [isSseActive, setIsSseActive] = useState(false);
  const [isOfflineCached, setIsOfflineCached] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState(null);

  // Patient FAQ Assistant State (PROMPT 27 - Optional / Future Phase)
  const [faqQuery, setFaqQuery] = useState('');
  const [faqResult, setFaqResult] = useState(null);
  const [faqLoading, setFaqLoading] = useState(false);

  const handleAskFaq = async (e) => {
    if (e) e.preventDefault();
    if (!faqQuery.trim()) return;

    setFaqLoading(true);
    try {
      const res = await apiClient.post('/assistant/patient-faq', {
        query: faqQuery,
        tokenTrackingUuid: activeTrackingId && activeTrackingId !== 'search' ? activeTrackingId : null
      });
      setFaqResult(res?.data || res);
    } catch (err) {
      setFaqResult({
        reply: 'Unable to reach clinic FAQ service. Please check with reception.',
        source: 'ERROR'
      });
    } finally {
      setFaqLoading(false);
    }
  };

  // Refs for tracking changes across polls without re-renders
  const prevDataRef = useRef(null);
  const pollTimerRef = useRef(null);
  const isComponentMountedRef = useRef(true);

  // Helper to handle screen reader and visual announcements
  const handleStatusAnnouncement = (data) => {
    if (!prevDataRef.current) return;
    const prev = prevDataRef.current;
    let announcement = '';

    if (data.status === 'CALLED' && prev.status !== 'CALLED') {
      announcement = `Attention: Token ${data.displayCode || data.tokenNumber} is now CALLED! Please proceed to ${data.doctor?.roomNumber || 'the consultation desk'}.`;
    } else if (data.status === 'IN_CONSULTATION' && prev.status !== 'IN_CONSULTATION') {
      announcement = `Token ${data.displayCode || data.tokenNumber} is now in consultation with ${data.doctor?.name || 'the specialist'}.`;
    } else if (data.status === 'COMPLETED' && prev.status !== 'COMPLETED') {
      announcement = `Your consultation with ${data.doctor?.name || 'the specialist'} has completed.`;
    } else if (data.status === 'SKIPPED' && prev.status !== 'SKIPPED') {
      announcement = `Token was skipped as no-show. Please see the clinic receptionist.`;
    } else if (data.status === 'CANCELLED' && prev.status !== 'CANCELLED') {
      announcement = `Token ${data.displayCode || data.tokenNumber} has been cancelled.`;
    } else if (data.positionAhead !== prev.positionAhead) {
      if (data.positionAhead === 0) {
        announcement = `Queue update: You are next in line. Expected wait under 5 minutes.`;
      } else {
        announcement = `Queue update: ${data.positionAhead} patients ahead of you. Estimated wait: ${data.estimatedWaitDisplay || `~${data.estimatedWaitMinutes} minutes`}.`;
      }
    } else if (data.currentServingCode && data.currentServingCode !== prev.currentServingCode) {
      announcement = `Doctor is now serving token ${data.currentServingCode}.`;
    }

    if (announcement) {
      setAriaAnnouncement(announcement);
    }

    prevDataRef.current = {
      status: data.status,
      positionAhead: data.positionAhead,
      currentServingCode: data.currentServingCode
    };
  };

  // Authoritative status retrieval from public tracking contract
  const fetchStatus = async (isManual = false) => {
    if (!activeTrackingId || activeTrackingId === 'search') {
      setLoading(false);
      return;
    }

    // Rate-limiting throttle check
    if (Date.now() < rateLimitedUntil) {
      const waitSec = Math.ceil((rateLimitedUntil - Date.now()) / 1000);
      setNetworkWarning(`Rate limit active. Next automatic refresh in ${waitSec}s.`);
      return;
    }

    if (isManual) setRefreshing(true);

    try {
      const data = await apiClient.get(`/tokens/track/${activeTrackingId}`);

      if (!isComponentMountedRef.current) return;

      if (!data) {
        setError('Token record not found. It may have expired or been purged after clinic hours.');
        setTokenData(null);
      } else {
        handleStatusAnnouncement(data);

        setTokenData(data);
        setError(null);
        setNetworkWarning(null);
        setIsOfflineCached(false);

        // Cache pass locally for offline resiliency in clinic basements
        try {
          localStorage.setItem(`glb_pass_${activeTrackingId}`, JSON.stringify(data));
        } catch {}
      }
    } catch (err) {
      if (!isComponentMountedRef.current) return;

      const errMsg = err.message || 'Unable to retrieve token status from clinic server.';

      // Check offline cache fallback
      try {
        const cached = localStorage.getItem(`glb_pass_${activeTrackingId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setTokenData(parsed);
          setIsOfflineCached(true);
          setError(null);
          setNetworkWarning('Displaying offline cached pass. Scannable QR code is valid for reception check-in.');
          return;
        }
      } catch {}

      // Handle Rate Limiting (429)
      if (err.statusCode === 429 || errMsg.includes('429') || errMsg.includes('Too many')) {
        const lockoutUntil = Date.now() + 30000;
        setRateLimitedUntil(lockoutUntil);
        setNetworkWarning('Rate limit reached. Live polling paused for 30 seconds.');
      } else if (tokenData) {
        setNetworkWarning('Connection to clinic interrupted. Retrying in 10s...');
      } else {
        setError(errMsg);
      }
    } finally {
      if (isComponentMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Patient-Initiated Cancellation Handler
  const handleCancelAppointment = async () => {
    setCancelLoading(true);
    try {
      const res = await apiClient.post(`/tokens/track/${activeTrackingId}/cancel`, {
        reason: cancelReason || 'Patient cancelled via live tracker'
      });
      const updated = res?.data || res;
      setTokenData((prev) => ({ ...prev, status: 'CANCELLED', ...updated }));
      setShowCancelModal(false);
      setCancelSuccessMsg('Your appointment has been successfully cancelled.');
    } catch (err) {
      alert(err.message || 'Failed to cancel appointment. Please check with reception.');
    } finally {
      setCancelLoading(false);
    }
  };

  // Real-time SSE Stream (<100ms push) with 10s Polling Fallback
  useEffect(() => {
    isComponentMountedRef.current = true;
    fetchStatus();

    // 1. Establish SSE Connection for instant push updates
    let eventSource = null;
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

    if (typeof EventSource !== 'undefined' && activeTrackingId && activeTrackingId !== 'search') {
      try {
        eventSource = new EventSource(`${apiBase}/tokens/stream/${activeTrackingId}`);

        eventSource.onopen = () => {
          if (isComponentMountedRef.current) setIsSseActive(true);
        };

        eventSource.addEventListener('initial', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && isComponentMountedRef.current) {
              setTokenData(data);
              setError(null);
              setIsOfflineCached(false);
            }
          } catch {}
        });

        eventSource.addEventListener('token_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && isComponentMountedRef.current) {
              handleStatusAnnouncement(data);
              setTokenData(data);
            }
          } catch {}
        });

        eventSource.addEventListener('queue_update', (e) => {
          try {
            const data = JSON.parse(e.data);
            if (data && isComponentMountedRef.current) {
              setTokenData(data);
            }
          } catch {}
        });

        eventSource.onerror = () => {
          if (isComponentMountedRef.current) setIsSseActive(false);
        };
      } catch {
        setIsSseActive(false);
      }
    }

    // 2. Fallback polling timer (guarantees updates even if SSE is blocked by proxies)
    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        if (prevDataRef.current?.status === 'COMPLETED' || prevDataRef.current?.status === 'CANCELLED') {
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
          return;
        }

        fetchStatus(false);
      }, 10000);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus(false);
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    startPolling();

    return () => {
      isComponentMountedRef.current = false;
      stopPolling();
      if (eventSource) eventSource.close();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [activeTrackingId]);

  const handleManualSearch = (e) => {
    e.preventDefault();
    if (manualUuid.trim()) {
      navigate(`/track/${manualUuid.trim()}`);
    }
  };

  // 1. Search Portal View (/track or /track/search)
  if (!activeTrackingId || activeTrackingId === 'search') {
    return (
      <div className="container" style={{ padding: '40px 16px', maxWidth: '580px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'var(--blue-subtle)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              color: 'var(--cyan-accent)',
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '4px 12px',
              borderRadius: 'var(--radius-pill)',
              marginBottom: '10px'
            }}
          >
            <Search size={14} />
            <span>Public Token Tracking Portal</span>
          </div>
          <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
            Find Your Queue Position
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            Paste your private tracking UUID from your confirmation SMS or ticket.
          </p>
        </div>

        <Card>
          <form onSubmit={handleManualSearch}>
            <TextField
              label="Private Tracking UUID / Reference"
              placeholder="e.g., 7a639076-3df3-4420-81dc-39b10aeb432f"
              value={manualUuid}
              onChange={(e) => setManualUuid(e.target.value)}
              required
              helperText="This opaque UUID ensures zero personal information is ever broadcast."
            />

            <div style={{ marginTop: '20px' }}>
              <Button type="submit" variant="primary" size="lg" fullWidth icon={Search}>
                Track My Token
              </Button>
            </div>
          </form>
        </Card>
      </div>
    );
  }

  // 2. Initial Loading Skeleton
  if (loading) {
    return (
      <div className="container" style={{ padding: '40px 16px', maxWidth: '580px' }}>
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton height="32px" width="50%" />
            <Skeleton height="100px" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Skeleton height="60px" />
              <Skeleton height="60px" />
            </div>
            <Skeleton height="120px" />
          </div>
        </Card>
      </div>
    );
  }

  // 3. Error / Invalid ID / Expired Token State
  if (error) {
    return (
      <div className="container" style={{ padding: '40px 16px', maxWidth: '580px' }}>
        <ErrorState
          title="Token Not Found or Expired"
          message={error}
          onRetry={() => fetchStatus(true)}
          retryLabel="Retry Verification"
        />

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            marginTop: '20px',
            textAlign: 'center'
          }}
        >
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Tokens expire upon consultation completion or at clinic closing hours.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              size="md"
              icon={Ticket}
              onClick={() => navigate('/book')}
            >
              Book a New Token
            </Button>
            <Button
              variant="secondary"
              size="md"
              icon={Search}
              onClick={() => navigate('/track/search')}
            >
              Search by ID
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Determine if active polling is running
  const isTerminalState = tokenData?.status === 'COMPLETED' || tokenData?.status === 'CANCELLED';

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '640px' }}>
      {/* Accessible aria-live Announcer (Screen Readers Only) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0
        }}
      >
        {ariaAnnouncement}
      </div>

      {/* Network / Rate Limit Warning Banner */}
      {networkWarning && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: 'var(--warning-subtle)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '0.8125rem',
            color: 'var(--warning-amber)',
            marginBottom: '16px'
          }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span>{networkWarning}</span>
        </div>
      )}

      {/* Live Polling Refresh Control Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isTerminalState ? 'var(--text-dim)' : 'var(--success)',
              boxShadow: isTerminalState ? 'none' : '0 0 8px var(--success)'
            }}
            aria-hidden="true"
          />
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            {isTerminalState
              ? 'Consultation concluded'
              : isSseActive
              ? 'Real-time WebSocket/SSE connected'
              : 'Auto-polling every 10s'}
          </span>

          {isSseActive && !isTerminalState && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#22c55e',
                fontSize: '0.6875rem',
                fontWeight: 700
              }}
            >
              <Zap size={11} />
              <span>LIVE PUSH</span>
            </span>
          )}

          {isOfflineCached && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                color: '#f59e0b',
                fontSize: '0.6875rem',
                fontWeight: 700
              }}
            >
              <WifiOff size={11} />
              <span>OFFLINE PASS</span>
            </span>
          )}
        </div>

        <Button
          variant="secondary"
          size="sm"
          loading={refreshing}
          icon={RefreshCw}
          onClick={() => fetchStatus(true)}
        >
          {refreshing ? 'Updating...' : 'Refresh Now'}
        </Button>
      </div>

      {/* Real Public API Token Card Display (Zero PII, Scannable QR, No Three.js) */}
      <TokenCard tokenData={tokenData} showQr={true} showCopy={true} />

      {/* Cancellation Success Feedback */}
      {cancelSuccessMsg && (
        <div
          role="status"
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            backgroundColor: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.4)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--success)',
            fontSize: '0.875rem',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{cancelSuccessMsg}</span>
        </div>
      )}

      {/* Patient Voluntary Cancellation Action */}
      {!isTerminalState && tokenData && (tokenData.status === 'WAITING' || tokenData.status === 'CALLED') && (
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Button
            variant="secondary"
            size="sm"
            icon={XCircle}
            onClick={() => setShowCancelModal(true)}
            style={{
              borderColor: 'rgba(239, 68, 68, 0.4)',
              color: '#ef4444',
              backgroundColor: 'rgba(239, 68, 68, 0.06)'
            }}
          >
            Cancel Appointment / Surrender Token
          </Button>
        </div>
      )}

      {/* Patient Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(5px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              backgroundColor: 'var(--bg-surface-elevated, #16040b)',
              border: '1px solid rgba(255, 45, 85, 0.3)',
              borderRadius: '20px',
              padding: '24px',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              animation: 'contentStageTransition 200ms ease forwards'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', marginBottom: '12px' }}>
              <XCircle size={22} />
              <h3 id="cancel-modal-title" style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Cancel Appointment?
              </h3>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
              Are you sure you want to cancel token <strong>{tokenData?.displayCode || tokenData?.tokenNumber}</strong>? Your queue position will be immediately given to the next waiting patient.
            </p>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'block', marginBottom: '6px' }}>
                Reason for Cancellation (Optional):
              </label>
              <input
                type="text"
                placeholder="e.g., Feeling better, delayed in transit..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.8125rem',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  outline: 'none'
                }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowCancelModal(false)}
                disabled={cancelLoading}
              >
                Keep Spot
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={cancelLoading}
                onClick={handleCancelAppointment}
                style={{ backgroundColor: '#ef4444', borderColor: '#ef4444', color: '#ffffff' }}
              >
                Confirm Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Patient FAQ Assistant (PROMPT 27 - Optional / Future Phase) */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HelpCircle size={18} style={{ color: 'var(--cyan-accent)' }} />
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
              Clinic FAQ & Token Assistant
            </h2>
          </div>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: 'var(--radius-pill)',
              backgroundColor: 'rgba(34, 211, 238, 0.15)',
              border: '1px solid rgba(34, 211, 238, 0.3)',
              color: 'var(--cyan-accent)'
            }}
          >
            OPTIONAL / FUTURE PHASE
          </span>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
          Ask about clinic timings, location, active doctors, or your current token queue wait time. (Medical diagnosis, prescriptions, and emergency triage are strictly excluded).
        </p>

        <form onSubmit={handleAskFaq} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="input-field"
            placeholder="e.g., What are clinic hours? or How long is my wait?"
            value={faqQuery}
            onChange={(e) => setFaqQuery(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '0.8125rem',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)'
            }}
          />
          <Button type="submit" variant="primary" size="sm" loading={faqLoading}>
            Ask FAQ
          </Button>
        </form>

        {faqResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: faqResult.source === 'SAFETY_HANDOFF' ? 'rgba(239, 68, 68, 0.08)' : 'rgba(34, 211, 238, 0.08)',
              border: `1px solid ${faqResult.source === 'SAFETY_HANDOFF' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 211, 238, 0.25)'}`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  backgroundColor: faqResult.source === 'SAFETY_HANDOFF' ? 'var(--danger-red)' : 'var(--cyan-accent)',
                  color: '#000'
                }}
              >
                {faqResult.source || 'CLINIC_KB'}
              </span>
              <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                {faqResult.source === 'CALLER_TOKEN_STATUS'
                  ? 'Grounded in your token record'
                  : faqResult.source === 'SAFETY_HANDOFF'
                  ? 'Clinic Safety Protocol'
                  : 'Approved Clinic Knowledge Base'}
              </span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
              {faqResult.reply}
            </p>
          </div>
        )}
      </div>

      {/* Quick Navigation Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          marginTop: '24px',
          fontSize: '0.8125rem'
        }}
      >
        <Link
          to="/book"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--cyan-accent)',
            fontWeight: 600
          }}
        >
          <Ticket size={15} />
          <span>Book Another Token</span>
        </Link>

        <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>

        <Link
          to="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            color: 'var(--text-muted)'
          }}
        >
          <Home size={15} />
          <span>Clinic Home</span>
        </Link>
      </div>
    </div>
  );
};
