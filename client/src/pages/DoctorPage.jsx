import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ProtectedRoute } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StatusChip } from '../components/ui/StatusChip';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import {
  Stethoscope,
  UserCheck,
  UserX,
  Play,
  CheckCircle2,
  Clock,
  RefreshCw,
  AlertTriangle,
  RotateCcw,
  Ban,
  Building,
  Calendar,
  LogOut,
  Sparkles
} from 'lucide-react';
import './StaffDashboard.css';

export const DoctorPage = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [networkWarning, setNetworkWarning] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Active consultation live timer
  const [consultationTimer, setConsultationTimer] = useState('00:00');

  // Confirmation Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null,
    tokenId: null,
    tokenCode: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);

  // Fetch doctor's own queue (server enforces ownership via JWT doctorId)
  const fetchMyQueue = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      // Notice: Do NOT pass a foreign doctorId; server uses authenticated user's doctorProfileId
      const data = await apiClient.get('/doctor/queue');
      if (!isMountedRef.current) return;
      setQueueData(data);
      setLastUpdated(Date.now());
      setError(null);
      setNetworkWarning(null);
    } catch (err) {
      if (!isMountedRef.current) return;
      console.error('Failed to fetch doctor queue:', err);
      if (err.statusCode === 401 || err.statusCode === 403) {
        setError(err.message || 'Unauthorized: Doctor access restricted to assigned profile.');
      } else {
        setNetworkWarning('Connection issue: Displaying last synced queue data');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    fetchMyQueue();

    // 5-Second Tab-Aware Polling
    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }
        fetchMyQueue(false);
      }, 5000);
    };

    const stopPolling = () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchMyQueue(false);
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
      isMountedRef.current = false;
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, []);

  // Update second freshness ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Execute State Machine Action on Real API
  const handleExecuteAction = async (tokenId, action) => {
    setActionLoading(true);
    try {
      await apiClient.patch(`/doctor/tokens/${tokenId}/action`, { action });
      // Always refresh from authoritative server state
      await fetchMyQueue(false);
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const openConfirmModal = (actionType, tokenId, tokenCode) => {
    if (actionType === 'cancel') {
      setConfirmModal({
        isOpen: true,
        title: 'Cancel Token',
        message: `Cancel token ${tokenCode}? This action removes the patient permanently from today's clinic queue.`,
        actionType: 'cancel',
        tokenId,
        tokenCode
      });
    } else if (actionType === 'skip') {
      setConfirmModal({
        isOpen: true,
        title: 'Mark Patient No-Show / Skip',
        message: `Mark patient holding token ${tokenCode} as skipped/no-show? Token can be recalled later if they arrive.`,
        actionType: 'skip',
        tokenId,
        tokenCode
      });
    }
  };

  // Queue Segmentation
  const queue = queueData?.queue || [];
  const activeServingToken = queue.find((t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION');
  const waitingTokens = queue.filter((t) => t.status === 'WAITING');
  const skippedTokens = queue.filter((t) => t.status === 'SKIPPED');
  const nextWaitingToken = waitingTokens[0] || null;

  // Active consultation duration stopwatch
  useEffect(() => {
    if (!activeServingToken || activeServingToken.status !== 'IN_CONSULTATION') {
      setConsultationTimer('00:00');
      return;
    }

    const startTime = activeServingToken.startedConsultationAt
      ? new Date(activeServingToken.startedConsultationAt).getTime()
      : Date.now();

    const interval = setInterval(() => {
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      const mins = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
      const secs = String(elapsedSeconds % 60).padStart(2, '0');
      setConsultationTimer(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeServingToken?.status, activeServingToken?.startedConsultationAt]);

  const maskPhone = (phone) => {
    if (!phone) return '—';
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 4) return phone;
    const last4 = clean.slice(-4);
    return `******${last4}`;
  };

  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
      <div className="staff-dashboard-wrapper">
        <div className="dashboard-ambient-flare-top" aria-hidden="true" />
        <div className="dashboard-ambient-flare-side" aria-hidden="true" />

        <div className="dashboard-content-layer">
          {/* Header Bar */}
          <header className="dashboard-header-bar">
            <div className="dashboard-title-area">
              <div className="dashboard-badge-row">
                <span className="dashboard-role-badge">
                  <Stethoscope size={12} />
                  <span>DOCTOR CONSOLE</span>
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #9E6D78)' }}>
                  {queueData?.doctor?.roomNumber || 'Consultation Room'} &bull; {queueData?.doctor?.department}
                </span>
              </div>
              <h1 className="dashboard-main-heading">
                <span>Doctor Consultation Console</span>
                <Sparkles size={20} style={{ color: '#FF2D55' }} />
              </h1>
              <p className="dashboard-sub-heading">
                Logged in as <strong style={{ color: '#FFFFFF' }}>{user?.name}</strong> ({role}) &bull; Active Patient Queuing
              </p>
            </div>

            <div className="dashboard-actions-row">
              <div className="live-status-indicator">
                <span className={`live-beacon-dot ${networkWarning ? 'is-warning' : ''}`} />
                <span>{networkWarning ? 'Reconnecting...' : `Live (${secondsAgo}s ago)`}</span>
              </div>

              <button
                type="button"
                className="btn-glass-action"
                onClick={() => fetchMyQueue(true)}
              >
                <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                <span>Sync</span>
              </button>
            </div>
          </header>

        {/* Network Warning Banner */}
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

        {/* Loading and Error States */}
        {loading ? (
          <Card style={{ padding: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Skeleton height="36px" width="50%" />
              <Skeleton height="160px" />
              <Skeleton height="80px" />
            </div>
          </Card>
        ) : error ? (
          <ErrorState
            title="Doctor Console Access Restricted"
            message={error}
            onRetry={() => fetchMyQueue(true)}
          />
        ) : (
          <div>
            {/* Top Action Bar: Large Call Next Button & Metrics */}
            <Card
              style={{
                padding: '20px',
                marginBottom: '20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Today's Consultations:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                    <span className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                      {queueData?.stats?.completedToday || 0}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>completed</span>
                    <span style={{ color: 'var(--border-subtle)', margin: '0 4px' }}>&bull;</span>
                    <span className="tabular-nums" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--cyan-accent)', fontFamily: 'var(--font-mono)' }}>
                      {waitingTokens.length}
                    </span>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>waiting</span>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  icon={Play}
                  disabled={!nextWaitingToken || actionLoading || Boolean(activeServingToken)}
                  loading={actionLoading}
                  onClick={() => {
                    if (nextWaitingToken) {
                      handleExecuteAction(nextWaitingToken._id, 'call_next');
                    }
                  }}
                  style={{
                    minWidth: '240px',
                    fontSize: '1rem',
                    fontWeight: 800,
                    letterSpacing: '0.02em'
                  }}
                >
                  {activeServingToken?.status === 'CALLED'
                    ? 'Patient Called (Awaiting)'
                    : activeServingToken?.status === 'IN_CONSULTATION'
                    ? 'Consultation in Progress'
                    : nextWaitingToken
                    ? `Call Next (${nextWaitingToken.displayCode || `T-${nextWaitingToken.tokenNumber}`})`
                    : 'No Patients Waiting'}
                </Button>
              </div>
            </Card>

            {/* Active Room Console (Current Patient) */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Active Consultation Room:
                </h2>
                {activeServingToken?.status === 'IN_CONSULTATION' && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: 'rgba(59, 130, 246, 0.15)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-pill)',
                      color: 'var(--blue-primary)',
                      fontSize: '0.75rem',
                      fontWeight: 700
                    }}
                  >
                    <Clock size={13} />
                    <span>Duration:</span>
                    <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
                      {consultationTimer}
                    </span>
                  </div>
                )}
              </div>

              {activeServingToken ? (
                <Card
                  style={{
                    padding: '24px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: `2px solid ${activeServingToken.status === 'CALLED' ? 'var(--cyan-accent)' : 'var(--blue-primary)'}`,
                    boxShadow: 'var(--shadow-glow)'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <StatusChip status={activeServingToken.status} />
                        <PriorityBadge priority={activeServingToken.priority} size="sm" />
                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-dim)',
                            backgroundColor: 'var(--bg-surface-subtle)',
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)'
                          }}
                        >
                          {activeServingToken.source === 'WALKIN' ? 'Walk-in' : 'Online Booking'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px' }}>
                        <div
                          className="tabular-nums"
                          style={{
                            fontSize: '2.5rem',
                            fontWeight: 800,
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--cyan-accent)',
                            lineHeight: 1
                          }}
                        >
                          {activeServingToken.displayCode || `T-${activeServingToken.tokenNumber}`}
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {activeServingToken.patientName}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '6px' }}>
                        Contact: <span className="tabular-nums">{maskPhone(activeServingToken.patientPhone)}</span>
                        {activeServingToken.notes && (
                          <span style={{ marginLeft: '10px', color: 'var(--text-dim)' }}>
                            &bull; Note: <em>{activeServingToken.notes}</em>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      {activeServingToken.status === 'CALLED' && (
                        <>
                          <Button
                            variant="primary"
                            size="md"
                            icon={UserCheck}
                            loading={actionLoading}
                            onClick={() => handleExecuteAction(activeServingToken._id, 'start_consultation')}
                          >
                            Start Consultation
                          </Button>
                          <Button
                            variant="secondary"
                            size="md"
                            icon={UserX}
                            onClick={() => openConfirmModal('skip', activeServingToken._id, activeServingToken.displayCode || activeServingToken.tokenNumber)}
                          >
                            No-Show / Skip
                          </Button>
                        </>
                      )}

                      {activeServingToken.status === 'IN_CONSULTATION' && (
                        <Button
                          variant="primary"
                          size="md"
                          icon={CheckCircle2}
                          loading={actionLoading}
                          onClick={() => handleExecuteAction(activeServingToken._id, 'complete')}
                          style={{ backgroundColor: 'var(--success)', borderColor: 'var(--success)' }}
                        >
                          Complete Consultation
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Ban}
                        onClick={() => openConfirmModal('cancel', activeServingToken._id, activeServingToken.displayCode || activeServingToken.tokenNumber)}
                        style={{ color: 'var(--danger-red)' }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </Card>
              ) : (
                <Card style={{ padding: '28px', textAlign: 'center', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    Consultation room is currently clear. Press <strong>"Call Next"</strong> when ready to summon the next patient.
                  </div>
                </Card>
              )}
            </div>

            {/* Waiting Queue List */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                  Waiting Patients ({waitingTokens.length}):
                </h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Ordered by Priority Rank (1 to 3) &bull; Earliest Booking First
                </span>
              </div>

              {waitingTokens.length === 0 ? (
                <EmptyState
                  title="No Patients Waiting"
                  message="There are currently no waiting patients in your consultation queue."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {waitingTokens.map((token, idx) => (
                    <Card
                      key={token._id}
                      style={{
                        padding: '14px 18px',
                        backgroundColor: 'var(--bg-surface)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: idx === 0 ? 'var(--blue-subtle)' : 'var(--bg-surface-elevated)',
                            color: idx === 0 ? 'var(--cyan-accent)' : 'var(--text-dim)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.75rem',
                            fontWeight: 700
                          }}
                        >
                          #{idx + 1}
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                            <span
                              className="tabular-nums"
                              style={{
                                fontSize: '1.125rem',
                                fontWeight: 800,
                                fontFamily: 'var(--font-mono)',
                                color: 'var(--cyan-accent)'
                              }}
                            >
                              {token.displayCode || `T-${token.tokenNumber}`}
                            </span>
                            <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {token.patientName}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            Contact: <span className="tabular-nums">{maskPhone(token.patientPhone)}</span>
                            {token.notes && (
                              <span style={{ marginLeft: '8px', color: 'var(--text-dim)' }}>
                                &bull; {token.notes}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <PriorityBadge priority={token.priority} size="sm" />
                        {idx === 0 && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={Play}
                            disabled={Boolean(activeServingToken)}
                            onClick={() => handleExecuteAction(token._id, 'call_next')}
                          >
                            Call
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Ban}
                          onClick={() => openConfirmModal('cancel', token._id, token.displayCode || token.tokenNumber)}
                          style={{ color: 'var(--danger-red)' }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Skipped Patients Section */}
            {skippedTokens.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--warning-amber)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Skipped / No-Show Patients ({skippedTokens.length}):
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {skippedTokens.map((token) => (
                    <Card
                      key={token._id}
                      style={{
                        padding: '12px 18px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '12px'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontSize: '1rem',
                              fontWeight: 800,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--warning-amber)'
                            }}
                          >
                            {token.displayCode || `T-${token.tokenNumber}`}
                          </span>
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {token.patientName}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Skipped earlier &bull; Contact: {maskPhone(token.patientPhone)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={RotateCcw}
                          loading={actionLoading}
                          onClick={() => handleExecuteAction(token._id, 'recall')}
                        >
                          Requeue Token
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Ban}
                          onClick={() => openConfirmModal('cancel', token._id, token.displayCode || token.tokenNumber)}
                          style={{ color: 'var(--danger-red)' }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Confirmation Modal */}
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                variant="ghost"
                size="md"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Go Back
              </Button>
              <Button
                variant="danger"
                size="md"
                loading={actionLoading}
                onClick={() => handleExecuteAction(confirmModal.tokenId, confirmModal.actionType)}
              >
                Confirm Action
              </Button>
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </ProtectedRoute>
  );
};

export default DoctorPage;
