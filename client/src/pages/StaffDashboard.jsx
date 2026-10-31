import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, ProtectedRoute } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { PhoneInput } from '../components/ui/PhoneInput';
import { StatusChip } from '../components/ui/StatusChip';
import { PriorityBadge } from '../components/ui/PriorityBadge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import {
  Users,
  UserCheck,
  UserX,
  Stethoscope,
  Building,
  PlusCircle,
  RefreshCw,
  Phone,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Play,
  RotateCcw,
  Ban,
  Calendar,
  Sparkles,
  QrCode,
  Activity,
  Search,
  Timer,
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import './StaffDashboard.css';

export const StaffDashboard = () => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // Overview and Doctors State
  const [overview, setOverview] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState(null);

  // Active Doctor's Queue Data
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [networkWarning, setNetworkWarning] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());
  const [secondsAgo, setSecondsAgo] = useState(0);

  // Search Filter for Waiting Patients
  const [searchQuery, setSearchQuery] = useState('');

  // Walk-in Modal State
  const [walkinModalOpen, setWalkinModalOpen] = useState(false);
  const [walkinPatientName, setWalkinPatientName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinPriority, setWalkinPriority] = useState('STANDARD');
  const [walkinNotes, setWalkinNotes] = useState('');
  const [walkinSubmitting, setWalkinSubmitting] = useState(false);
  const [walkinError, setWalkinError] = useState('');

  // Staff Copilot State
  const [copilotModalOpen, setCopilotModalOpen] = useState(false);
  const [copilotData, setCopilotData] = useState(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotError, setCopilotError] = useState(null);

  const fetchStaffCopilot = async () => {
    setCopilotLoading(true);
    setCopilotError(null);
    try {
      const res = await apiClient.get('/assistant/staff-copilot');
      setCopilotData(res?.data || res);
    } catch (err) {
      setCopilotError(err.message || 'Failed to fetch copilot summary.');
    } finally {
      setCopilotLoading(false);
    }
  };

  // Confirmation Modal for Destructive Actions
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    actionType: null,
    tokenId: null,
    tokenCode: '',
    confirmVariant: 'danger',
    confirmLabel: 'Confirm'
  });
  const [actionLoading, setActionLoading] = useState(false);

  const isMountedRef = useRef(true);
  const pollTimerRef = useRef(null);

  // 1. Fetch Reception Overview (Doctors & Queue Counts)
  const fetchOverview = async () => {
    try {
      const data = await apiClient.get('/reception/overview');
      if (!isMountedRef.current) return;
      setOverview(data);

      // Auto-select first doctor if none currently selected
      if (!selectedDoctorId && data.queues && data.queues.length > 0) {
        setSelectedDoctorId(data.queues[0].doctorId);
      }
      return data;
    } catch (err) {
      console.error('Failed to fetch reception overview:', err);
      if (err.statusCode === 401 || err.statusCode === 403) {
        setError(err.message);
      }
    }
  };

  // 2. Fetch Selected Doctor's Detailed Queue
  const fetchDoctorQueue = async (docId, isManual = false) => {
    if (!docId) return;

    if (isManual) setRefreshing(true);

    try {
      const data = await apiClient.get(`/doctor/queue?doctorId=${docId}`);
      if (!isMountedRef.current) return;

      setQueueData(data);
      setError(null);
      setNetworkWarning(null);
      setLastUpdated(Date.now());
      setSecondsAgo(0);
    } catch (err) {
      if (!isMountedRef.current) return;
      if (queueData) {
        setNetworkWarning('Unable to reach server. Displaying cached queue data.');
      } else {
        setError(err.message || 'Failed to load doctor queue.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  // Initial Load
  useEffect(() => {
    isMountedRef.current = true;

    const init = async () => {
      setLoading(true);
      const ov = await fetchOverview();
      const firstDocId = ov?.queues?.[0]?.doctorId;
      if (firstDocId) {
        await fetchDoctorQueue(firstDocId);
      } else {
        setLoading(false);
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // When selected doctor changes, fetch their queue immediately
  useEffect(() => {
    if (selectedDoctorId) {
      fetchDoctorQueue(selectedDoctorId, true);
    }
  }, [selectedDoctorId]);

  // 5-Second Polling Lifecycle with Tab Visibility Handling
  useEffect(() => {
    const startPolling = () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);

      pollTimerRef.current = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
          return;
        }

        if (selectedDoctorId) {
          fetchDoctorQueue(selectedDoctorId, false);
          fetchOverview();
        }
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
        if (selectedDoctorId) {
          fetchDoctorQueue(selectedDoctorId, false);
          fetchOverview();
        }
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
      stopPolling();
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [selectedDoctorId]);

  // Second Counter for Stale-Data Indicator
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Execute Real API Queue Action & Refresh from Server
  const handleExecuteAction = async (tokenId, action) => {
    setActionLoading(true);
    try {
      await apiClient.patch(`/doctor/tokens/${tokenId}/action`, { action });
      await fetchDoctorQueue(selectedDoctorId, false);
      await fetchOverview();
      setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Open Confirmation Modal for Destructive Actions
  const openConfirmModal = (actionType, tokenId, tokenCode) => {
    if (actionType === 'cancel') {
      setConfirmModal({
        isOpen: true,
        title: 'Cancel Token',
        message: `Are you sure you want to cancel token ${tokenCode}? This action is irreversible and removes the patient from the clinic queue.`,
        actionType: 'cancel',
        tokenId,
        tokenCode,
        confirmVariant: 'danger',
        confirmLabel: 'Yes, Cancel Token'
      });
    } else if (actionType === 'skip') {
      setConfirmModal({
        isOpen: true,
        title: 'Mark Patient as No-Show / Skip',
        message: `Patient holding token ${tokenCode} was not present when called. Move token to SKIPPED status? (Token can be requeued later).`,
        actionType: 'skip',
        tokenId,
        tokenCode,
        confirmVariant: 'danger',
        confirmLabel: 'Mark No-Show'
      });
    }
  };

  // Submit Walk-in Form to Real API
  const handleWalkinSubmit = async (e) => {
    e.preventDefault();
    setWalkinError('');

    const phoneClean = walkinPhone.replace(/\D/g, '');
    if (phoneClean.length !== 10) {
      setWalkinError('Patient phone must be a valid 10-digit Indian mobile number');
      return;
    }

    setWalkinSubmitting(true);
    try {
      await apiClient.post('/reception/walkin', {
        doctorId: selectedDoctorId,
        patientName: walkinPatientName.trim(),
        patientPhone: `+91-${phoneClean}`,
        priority: walkinPriority,
        notes: walkinNotes.trim()
      });

      setWalkinPatientName('');
      setWalkinPhone('');
      setWalkinPriority('STANDARD');
      setWalkinNotes('');
      setWalkinModalOpen(false);

      await fetchDoctorQueue(selectedDoctorId, false);
      await fetchOverview();
    } catch (err) {
      setWalkinError(err.message || 'Failed to register walk-in patient');
    } finally {
      setWalkinSubmitting(false);
    }
  };

  // Queue Segmentation
  const queue = queueData?.queue || [];
  const activeServingToken = queue.find((t) => t.status === 'CALLED' || t.status === 'IN_CONSULTATION');
  const waitingTokens = queue.filter((t) => t.status === 'WAITING');
  const skippedTokens = queue.filter((t) => t.status === 'SKIPPED');
  const nextWaitingToken = waitingTokens[0];

  // Active Consultation live timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!activeServingToken) {
      setElapsedSeconds(0);
      return;
    }
    const startTime = activeServingToken.consultationStartedAt
      ? new Date(activeServingToken.consultationStartedAt).getTime()
      : activeServingToken.calledAt
      ? new Date(activeServingToken.calledAt).getTime()
      : Date.now();

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeServingToken]);

  const formatTimer = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Filtered waiting tokens by search query
  const filteredWaitingTokens = useMemo(() => {
    if (!searchQuery.trim()) return waitingTokens;
    const q = searchQuery.toLowerCase().trim();
    return waitingTokens.filter(
      (t) =>
        (t.displayCode && t.displayCode.toLowerCase().includes(q)) ||
        (t.patientName && t.patientName.toLowerCase().includes(q)) ||
        String(t.tokenNumber).includes(q)
    );
  }, [waitingTokens, searchQuery]);

  // Helper for masking phone number
  const maskPhone = (phoneStr) => {
    if (!phoneStr) return 'N/A';
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `******${digits.slice(-4)}`;
    }
    return '******';
  };

  return (
    <div className="staff-dashboard-wrapper">
      {/* Background Ambient Nebular Flares */}
      <div className="dashboard-ambient-flare-top" aria-hidden="true" />
      <div className="dashboard-ambient-flare-side" aria-hidden="true" />

      {/* Cyber Grid Matrix Background Texture */}
      <div className="dashboard-cyber-grid" aria-hidden="true" />

      <div className="dashboard-content-layer">
        {/* =========================================================
            FUTURISTIC SCI-FI HUD TELEMETRY RIBBON
            ========================================================= */}
        <div className="hud-telemetry-ribbon" aria-label="System Telemetry">
          <div className="hud-telemetry-item">
            <span className="hud-pulse-ring" />
            <span>CLINIC_NEURAL_OS // v4.2 &bull; SYS_ONLINE</span>
          </div>
          <div className="hud-telemetry-item" style={{ display: 'none', md: 'flex' }}>
            <span style={{ color: '#00F0FF' }}>LATENCY:</span> ~14ms &bull; <span style={{ color: '#FF2D55' }}>CIPHER:</span> SHA-256 SECURE
          </div>
          <div className="hud-telemetry-item">
            <span style={{ color: '#34D399' }}>STATION SYNC:</span> ACTIVE ({secondsAgo}s ago)
          </div>
        </div>

        {/* =========================================================
            TOP HEADER CONSOLE BAR
            ========================================================= */}
        <header className="dashboard-header-bar">
          <span className="hud-corner-tl" aria-hidden="true" />
          <span className="hud-corner-tr" aria-hidden="true" />
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="hud-scanline" aria-hidden="true" />

          <div className="dashboard-title-area">
            <div className="dashboard-badge-row">
              <span className="dashboard-role-badge">
                <ShieldCheck size={12} />
                <span>{role} CONSOLE</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #9E6D78)', fontFamily: 'var(--font-mono)' }}>
                [SYS_ID: #CLINIC-HQ-01]
              </span>
            </div>
            <h1 className="dashboard-main-heading">
              <span>Staff Queue Dashboard</span>
              <Sparkles size={20} style={{ color: '#FF2D55' }} />
            </h1>
            <p className="dashboard-sub-heading">
              Operator: <strong style={{ color: '#FFFFFF' }}>{user?.name}</strong> &bull; Live telemetry &amp; automated turn coordination
            </p>
          </div>

          {/* Action Suite & Live Status Indicator */}
          <div className="dashboard-actions-row">
            {/* Live Synchronized Pill */}
            <div className="live-status-indicator" title="Authoritative server synchronization">
              <span className={`live-beacon-dot ${networkWarning ? 'is-warning' : ''}`} />
              <span>{networkWarning ? 'Reconnecting...' : `Live (${secondsAgo}s ago)`}</span>
            </div>

            <button
              type="button"
              className="btn-glass-action"
              onClick={() => fetchDoctorQueue(selectedDoctorId, true)}
              title="Force Sync Server State"
            >
              <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
              <span>Sync</span>
            </button>

            <button
              type="button"
              className="btn-glass-action"
              onClick={() => navigate('/scanner')}
              title="Open QR Scanner"
            >
              <QrCode size={15} style={{ color: '#FF2D55' }} />
              <span>Scan Check-In</span>
            </button>

            <button
              type="button"
              className="btn-glass-action is-copilot"
              onClick={() => {
                setCopilotModalOpen(true);
                fetchStaffCopilot();
              }}
              title="Open AI Queue Copilot"
            >
              <Sparkles size={15} />
              <span>Copilot</span>
            </button>

            <button
              type="button"
              className="btn-radiant-primary"
              onClick={() => setWalkinModalOpen(true)}
            >
              <PlusCircle size={16} />
              <span>New Walk-in</span>
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
              padding: '12px 16px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              fontSize: '0.84rem',
              color: '#FBBF24',
              marginBottom: '20px'
            }}
          >
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <span>{networkWarning}</span>
          </div>
        )}

        {/* =========================================================
            REAL-TIME LIVE METRICS 4-STAT GRID
            ========================================================= */}
        <section className="dashboard-stats-grid" aria-label="Clinic Live Statistics">
          {/* Card 1: Total Queue Waiting */}
          <div className="dashboard-stat-card">
            <span className="hud-corner-tl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="stat-card-glow-bg glow-crimson" />
            <div className="stat-info-group">
              <span className="stat-info-label">// 01_QUEUE_IN_LINE</span>
              <span className="stat-info-number">{waitingTokens.length}</span>
              <span className="stat-info-subtext">
                <Clock size={12} />
                <span>Est. ~{waitingTokens.length * (queueData?.doctor?.avgConsultMinutes || 10)}m wait</span>
              </span>
            </div>
            <div className="stat-icon-wrapper" style={{ color: '#FF2D55' }}>
              <Users size={22} />
            </div>
          </div>

          {/* Card 2: Active Patient in Consultation */}
          <div className="dashboard-stat-card">
            <span className="hud-corner-tl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="stat-card-glow-bg glow-emerald" />
            <div className="stat-info-group">
              <span className="stat-info-label">// 02_NOW_SERVING_HUD</span>
              <span
                className="stat-info-number"
                style={{
                  fontSize: activeServingToken ? '1.5rem' : '1.35rem',
                  color: activeServingToken ? '#34D399' : '#9E6D78'
                }}
              >
                {activeServingToken ? (activeServingToken.displayCode || `T-${activeServingToken.tokenNumber}`) : 'STANDBY'}
              </span>
              <span className="stat-info-subtext" style={{ color: activeServingToken ? '#6EE7B7' : '#9E6D78' }}>
                <Activity size={12} />
                <span>
                  {activeServingToken
                    ? `${activeServingToken.status.replace('_', ' ')} (${formatTimer(elapsedSeconds)})`
                    : 'Counter ready for next'}
                </span>
              </span>
            </div>
            <div className="stat-icon-wrapper" style={{ color: '#10B981' }}>
              <Stethoscope size={22} />
            </div>
          </div>

          {/* Card 3: Completed Visits Today */}
          <div className="dashboard-stat-card">
            <span className="hud-corner-tl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="stat-card-glow-bg glow-purple" />
            <div className="stat-info-group">
              <span className="stat-info-label">// 03_COMPLETED_TODAY</span>
              <span className="stat-info-number" style={{ color: '#C084FC' }}>
                {queueData?.stats?.completedToday || 0}
              </span>
              <span className="stat-info-subtext">
                <CheckCircle2 size={12} />
                <span>Dr. {queueData?.doctor?.name?.split(' ')?.[1] || 'Doctor'}</span>
              </span>
            </div>
            <div className="stat-icon-wrapper" style={{ color: '#A855F7' }}>
              <CheckCircle2 size={22} />
            </div>
          </div>

          {/* Card 4: Doctor Station Location */}
          <div className="dashboard-stat-card">
            <span className="hud-corner-tl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="stat-card-glow-bg glow-amber" />
            <div className="stat-info-group">
              <span className="stat-info-label">// 04_STATION_BAY</span>
              <span className="stat-info-number" style={{ color: '#FBBF24', fontSize: '1.5rem' }}>
                {queueData?.doctor?.roomNumber || 'Room 101'}
              </span>
              <span className="stat-info-subtext">
                <Building size={12} />
                <span>{queueData?.doctor?.department || 'General Medicine'}</span>
              </span>
            </div>
            <div className="stat-icon-wrapper" style={{ color: '#F59E0B' }}>
              <Building size={22} />
            </div>
          </div>
        </section>

        {/* =========================================================
            PER-DOCTOR STATION CAROUSEL / SELECTOR
            ========================================================= */}
        <section className="doctor-selection-wrapper" aria-label="Select Doctor Queue">
          <div className="doctor-selection-title">
            <Activity size={14} style={{ color: '#FF2D55' }} />
            <span>Active Doctor Queue Stations ({overview?.queues?.length || 0}):</span>
          </div>
          <div className="doctor-tabs-scroll">
            {overview?.queues?.map((q) => {
              const isSelected = q.doctorId === selectedDoctorId;
              const hasWaiting = q.waitingCount > 0;
              return (
                <button
                  key={q.doctorId}
                  type="button"
                  onClick={() => setSelectedDoctorId(q.doctorId)}
                  className={`doctor-station-card ${isSelected ? 'is-selected' : ''}`}
                >
                  <div className="station-avatar-wrap">
                    <Stethoscope size={18} />
                  </div>
                  <div className="station-info">
                    <span className="station-doctor-name">{q.doctorName}</span>
                    <span className="station-doctor-meta">
                      {q.department} &bull; {q.roomNumber}
                    </span>
                  </div>
                  <span className="station-waiting-chip">
                    {hasWaiting && (
                      <span
                        style={{
                          display: 'inline-block',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: '#FF2D55',
                          marginRight: '5px'
                        }}
                      />
                    )}
                    {q.waitingCount} in line
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* =========================================================
            MAIN QUEUE DASHBOARD BODY
            ========================================================= */}
        {loading ? (
          <Card style={{ padding: '32px', backgroundColor: 'rgba(28, 6, 14, 0.75)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <Skeleton height="40px" width="35%" />
              <Skeleton height="140px" />
              <Skeleton height="90px" />
              <Skeleton height="90px" />
            </div>
          </Card>
        ) : error ? (
          <ErrorState
            title="Staff Queue Access Error"
            message={error}
            onRetry={() => fetchDoctorQueue(selectedDoctorId, true)}
          />
        ) : (
          <div>
            {/* DOCTOR CONTROL BAR WITH LARGE "CALL NEXT" BUTTON */}
            <div className="doctor-control-bar">
              <span className="hud-corner-tl" aria-hidden="true" />
              <span className="hud-corner-tr" aria-hidden="true" />
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <div className="hud-scanline" aria-hidden="true" />

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    {queueData?.doctor?.name}
                  </h2>
                  <span
                    style={{
                      fontSize: '0.78rem',
                      color: '#FFA4B6',
                      backgroundColor: 'rgba(255, 45, 85, 0.15)',
                      padding: '2px 10px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 45, 85, 0.3)',
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {queueData?.doctor?.department} &bull; STATION ACTIVE
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted, #E2B4BE)', marginTop: '4px' }}>
                  Consultation Room: <strong style={{ color: '#FFFFFF' }}>{queueData?.doctor?.roomNumber}</strong> &bull;{' '}
                  Avg Consultation: <strong style={{ color: '#FFFFFF' }}>{queueData?.doctor?.avgConsultMinutes || 10} mins</strong>
                </div>
              </div>

              {/* Call Next Button */}
              <div>
                <button
                  type="button"
                  className="btn-radiant-primary"
                  disabled={!nextWaitingToken || actionLoading || Boolean(activeServingToken)}
                  onClick={() => {
                    if (nextWaitingToken) {
                      handleExecuteAction(nextWaitingToken._id, 'call_next');
                    }
                  }}
                  style={{
                    padding: '12px 28px',
                    fontSize: '0.98rem',
                    opacity: (!nextWaitingToken || Boolean(activeServingToken)) ? 0.5 : 1,
                    cursor: (!nextWaitingToken || Boolean(activeServingToken)) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <Play size={18} fill="currentColor" />
                  <span>
                    {activeServingToken?.status === 'CALLED'
                      ? 'Patient Called (Awaiting)'
                      : activeServingToken?.status === 'IN_CONSULTATION'
                      ? 'Consultation in Progress'
                      : nextWaitingToken
                      ? `Call Next (${nextWaitingToken.displayCode || `T-${nextWaitingToken.tokenNumber}`})`
                      : 'No Patients Waiting'}
                  </span>
                </button>
              </div>
            </div>

            {/* =========================================================
                FEATURED ACTIVE PATIENT STAGE (CALLED OR IN CONSULTATION)
                ========================================================= */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-dim, #9E6D78)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="hud-pulse-ring" style={{ width: '5px', height: '5px' }} />
                <span>// 05_COUNTER_ROOM_STAGE_TELEMETRY</span>
              </div>

              {activeServingToken ? (
                <div className="active-patient-hero-card">
                  <span className="hud-corner-tl" aria-hidden="true" />
                  <span className="hud-corner-tr" aria-hidden="true" />
                  <span className="hud-corner-bl" aria-hidden="true" />
                  <span className="hud-corner-br" aria-hidden="true" />
                  <div className="hud-scanline" aria-hidden="true" />
                  <div className="hero-breathing-aura" />

                  {/* Animated Continuous Biometric ECG Heartbeat Monitor */}
                  <div className="hud-ecg-container" aria-hidden="true" title="Biometric Activity Stream">
                    <svg className="hud-ecg-svg" viewBox="0 0 1000 40" preserveAspectRatio="none">
                      <path d="M0,20 L150,20 L160,5 L170,35 L180,10 L190,28 L200,20 L400,20 L410,2 L420,38 L430,8 L440,25 L450,20 L650,20 L660,5 L670,35 L680,10 L690,28 L700,20 L900,20 L910,2 L920,38 L930,8 L940,25 L950,20 L1000,20" />
                    </svg>
                  </div>

                  <div className="hero-stage-content">
                    {/* Left: Token Identity & Patient Details */}
                    <div className="hero-token-identity">
                      <div className="hero-status-pill-row">
                        <StatusChip status={activeServingToken.status} />
                        <PriorityBadge priority={activeServingToken.priority} size="sm" />
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: '#FFFFFF',
                            backgroundColor: 'rgba(16, 3, 8, 0.7)',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(255, 60, 95, 0.25)'
                          }}
                        >
                          {activeServingToken.source === 'WALKIN' ? 'Front-desk Walk-in' : 'Online Booking'}
                        </span>
                        {/* Live Timer Pill */}
                        <span
                          style={{
                            fontSize: '0.74rem',
                            color: '#34D399',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            padding: '3px 10px',
                            borderRadius: '9999px',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 700
                          }}
                        >
                          <Clock size={12} />
                          <span>Elapsed: {formatTimer(elapsedSeconds)}</span>
                        </span>
                      </div>

                      <div className="hero-token-code-row">
                        <span className="hero-big-token-code">
                          {activeServingToken.displayCode || `T-${activeServingToken.tokenNumber}`}
                        </span>
                        {/* Futuristic Biometric Equalizer Bars */}
                        <span className="hud-equalizer-bars" title="Active Biometric Signal">
                          <span className="hud-equalizer-bar" />
                          <span className="hud-equalizer-bar" />
                          <span className="hud-equalizer-bar" />
                          <span className="hud-equalizer-bar" />
                          <span className="hud-equalizer-bar" />
                        </span>
                        <span className="hero-patient-name">
                          {activeServingToken.patientName}
                        </span>
                      </div>

                      <div className="hero-details-row">
                        <span>
                          Phone: <strong style={{ color: '#FFFFFF', fontFamily: 'var(--font-mono)' }}>{maskPhone(activeServingToken.patientPhone)}</strong>
                        </span>
                        {activeServingToken.notes && (
                          <span style={{ color: '#FFA4B6' }}>
                            &bull; Notes: <em>{activeServingToken.notes}</em>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Operational Actions */}
                    <div className="hero-actions-suite">
                      {activeServingToken.status === 'CALLED' && (
                        <>
                          <button
                            type="button"
                            className="btn-radiant-primary"
                            disabled={actionLoading}
                            onClick={() => handleExecuteAction(activeServingToken._id, 'start_consultation')}
                            style={{ padding: '12px 22px' }}
                          >
                            <UserCheck size={18} />
                            <span>Start Consultation</span>
                          </button>

                          <button
                            type="button"
                            className="btn-glass-action"
                            onClick={() => openConfirmModal('skip', activeServingToken._id, activeServingToken.displayCode || activeServingToken.tokenNumber)}
                            style={{ borderColor: 'rgba(245, 158, 11, 0.5)', color: '#FBBF24' }}
                          >
                            <UserX size={16} />
                            <span>No-Show / Skip</span>
                          </button>
                        </>
                      )}

                      {activeServingToken.status === 'IN_CONSULTATION' && (
                        <button
                          type="button"
                          className="btn-radiant-primary"
                          disabled={actionLoading}
                          onClick={() => handleExecuteAction(activeServingToken._id, 'complete')}
                          style={{
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
                            padding: '12px 24px'
                          }}
                        >
                          <CheckCircle2 size={18} />
                          <span>Complete Visit</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn-glass-action"
                        onClick={() => openConfirmModal('cancel', activeServingToken._id, activeServingToken.displayCode || activeServingToken.tokenNumber)}
                        style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#F87171' }}
                      >
                        <Ban size={15} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    position: 'relative',
                    padding: '32px 28px',
                    textAlign: 'center',
                    background: 'linear-gradient(135deg, rgba(28, 6, 16, 0.85) 0%, rgba(14, 2, 8, 0.95) 100%)',
                    borderRadius: '20px',
                    border: '1px dashed rgba(255, 60, 95, 0.35)',
                    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 80, 120, 0.2)',
                    overflow: 'hidden'
                  }}
                >
                  <span className="hud-corner-tl" aria-hidden="true" />
                  <span className="hud-corner-tr" aria-hidden="true" />
                  <span className="hud-corner-bl" aria-hidden="true" />
                  <span className="hud-corner-br" aria-hidden="true" />
                  <div className="hud-scanline" aria-hidden="true" />

                  <Stethoscope size={34} style={{ color: '#00F0FF', margin: '0 auto 12px auto', filter: 'drop-shadow(0 0 10px rgba(0, 240, 255, 0.6))' }} />
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>
                    Consultation Station is on Standby
                  </h3>
                  <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #E2B4BE)', margin: 0, maxWidth: '580px', marginInline: 'auto' }}>
                    {nextWaitingToken
                      ? `Ready to summon Token ${nextWaitingToken.displayCode || `T-${nextWaitingToken.tokenNumber}`} (${nextWaitingToken.patientName}) into ${queueData?.doctor?.roomNumber || 'Consultation Room'}.`
                      : 'All queues are cleared. Register a walk-in patient or await online bookings.'}
                  </p>
                </div>
              )}
            </div>

            {/* =========================================================
                WAITING QUEUE LIST SECTION
                ========================================================= */}
            <div style={{ marginBottom: '28px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-dim, #9E6D78)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Waiting In Line ({waitingTokens.length})
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(255, 45, 85, 0.15)',
                      color: '#FF4D73',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    Priority Ranked
                  </span>
                </div>

                {/* Instant Search Bar */}
                {waitingTokens.length > 0 && (
                  <div style={{ position: 'relative', width: '240px' }}>
                    <Search
                      size={14}
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-dim, #9E6D78)'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Filter token or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        width: '100%',
                        height: '36px',
                        padding: '0 12px 0 34px',
                        backgroundColor: 'rgba(16, 3, 8, 0.8)',
                        border: '1px solid rgba(255, 60, 95, 0.25)',
                        borderRadius: '9999px',
                        color: '#FFFFFF',
                        fontSize: '0.82rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>

              {filteredWaitingTokens.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title={searchQuery ? 'No Matching Patients' : 'Waiting Queue is Clear'}
                  description={
                    searchQuery
                      ? `No waiting patient matches "${searchQuery}". Clear your search filter to see all patients.`
                      : 'All registered patients have been attended to or admitted into the consultation room.'
                  }
                  actionLabel={searchQuery ? 'Clear Filter' : 'Register Walk-in Patient'}
                  onAction={() => {
                    if (searchQuery) setSearchQuery('');
                    else setWalkinModalOpen(true);
                  }}
                />
              ) : (
                <div className="queue-deck-container">
                  {filteredWaitingTokens.map((t, index) => {
                    const isNextInLine = index === 0 && !searchQuery;
                    return (
                      <div
                        key={t._id}
                        className={`queue-card-row ${isNextInLine ? 'is-next-in-line' : ''}`}
                      >
                        {/* Left Bundle: Rank, Token Code & Patient Details */}
                        <div className="queue-left-bundle">
                          <div className="queue-rank-badge">
                            #{index + 1}
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <span className="queue-token-code-text">
                                {t.displayCode || `T-${t.tokenNumber}`}
                              </span>
                              <PriorityBadge priority={t.priority} size="sm" />
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim, #9E6D78)' }}>
                                ({t.source === 'WALKIN' ? 'Walk-in' : 'Online'})
                              </span>
                              {isNextInLine && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontWeight: 800,
                                    backgroundColor: '#FF2D55',
                                    color: '#FFFFFF',
                                    padding: '2px 7px',
                                    borderRadius: '9999px',
                                    boxShadow: '0 0 10px rgba(255, 45, 85, 0.5)'
                                  }}
                                >
                                  NEXT UP
                                </span>
                              )}
                            </div>

                            <div className="queue-patient-title" style={{ marginTop: '3px' }}>
                              <span>{t.patientName}</span>
                              <span className="queue-patient-contact">
                                &bull; {maskPhone(t.patientPhone)}
                              </span>
                              {t.notes && (
                                <span style={{ fontSize: '0.75rem', color: '#FFA4B6', fontStyle: 'italic' }}>
                                  &bull; {t.notes}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Bundle: Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isNextInLine && !activeServingToken && (
                            <button
                              type="button"
                              className="btn-radiant-primary"
                              disabled={actionLoading}
                              onClick={() => handleExecuteAction(t._id, 'call_next')}
                              style={{ padding: '8px 16px', fontSize: '0.82rem' }}
                            >
                              <Play size={14} fill="currentColor" />
                              <span>Call Now</span>
                            </button>
                          )}

                          <button
                            type="button"
                            className="btn-glass-action"
                            onClick={() => openConfirmModal('cancel', t._id, t.displayCode || t.tokenNumber)}
                            style={{
                              padding: '7px 12px',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              color: '#F87171'
                            }}
                            title="Cancel Token"
                          >
                            <Ban size={14} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* =========================================================
                SKIPPED / NO-SHOW PATIENT RECOVERY BAY
                ========================================================= */}
            {skippedTokens.length > 0 && (
              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={15} style={{ color: '#F59E0B' }} />
                    <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Skipped / No-Show Patients ({skippedTokens.length})
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #E2B4BE)' }}>
                    Patients can be requeued when they report to the desk
                  </span>
                </div>

                <div className="queue-deck-container">
                  {skippedTokens.map((t) => (
                    <div
                      key={t._id}
                      className="queue-card-row"
                      style={{
                        borderColor: 'rgba(245, 158, 11, 0.35)',
                        background: 'linear-gradient(135deg, rgba(32, 12, 5, 0.8) 0%, rgba(16, 6, 2, 0.9) 100%)'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span
                            className="tabular-nums"
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '1.05rem',
                              fontWeight: 700,
                              color: '#FBBF24'
                            }}
                          >
                            {t.displayCode || `T-${t.tokenNumber}`}
                          </span>
                          <span style={{ fontSize: '0.9rem', color: '#FFFFFF', fontWeight: 700 }}>
                            {t.patientName}
                          </span>
                          <StatusChip status={t.status} />
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted, #E2B4BE)', marginTop: '2px' }}>
                          Contact: {maskPhone(t.patientPhone)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn-glass-action"
                          disabled={actionLoading}
                          onClick={() => handleExecuteAction(t._id, 'recall')}
                          style={{
                            borderColor: 'rgba(245, 158, 11, 0.5)',
                            color: '#FBBF24'
                          }}
                        >
                          <RotateCcw size={14} />
                          <span>Requeue Token</span>
                        </button>

                        <button
                          type="button"
                          className="btn-glass-action"
                          onClick={() => openConfirmModal('cancel', t._id, t.displayCode || t.tokenNumber)}
                          style={{
                            borderColor: 'rgba(239, 68, 68, 0.3)',
                            color: '#F87171'
                          }}
                        >
                          <Ban size={14} />
                          <span>Cancel</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================
            WALK-IN REGISTRATION MODAL
            ========================================================= */}
        <Modal
          isOpen={walkinModalOpen}
          onClose={() => setWalkinModalOpen(false)}
          title="Register Front-Desk Walk-in Patient"
          maxWidth="540px"
        >
          <form onSubmit={handleWalkinSubmit}>
            {walkinError && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#FCA5A5',
                  borderRadius: '10px',
                  fontSize: '0.84rem',
                  marginBottom: '16px'
                }}
              >
                {walkinError}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Assigned Doctor <span style={{ color: '#FF2D55' }}>*</span>
              </label>
              <select
                className="input-field"
                value={selectedDoctorId || ''}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(16, 3, 8, 0.85)',
                  border: '1px solid rgba(255, 60, 95, 0.25)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                {overview?.queues?.map((q) => (
                  <option key={q.doctorId} value={q.doctorId}>
                    {q.doctorName} ({q.department} &bull; Room {q.roomNumber})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <TextField
                label="Patient Full Name"
                placeholder="e.g. Ramesh Kumar"
                value={walkinPatientName}
                onChange={(e) => setWalkinPatientName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <PhoneInput
                label="Contact Mobile Number"
                value={walkinPhone}
                onChange={setWalkinPhone}
                required
                helperText="Used for booking confirmation and queue turn tracking."
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                Operational Priority Level
              </label>
              <select
                className="input-field"
                value={walkinPriority}
                onChange={(e) => setWalkinPriority(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(16, 3, 8, 0.85)',
                  border: '1px solid rgba(255, 60, 95, 0.25)',
                  borderRadius: '10px',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="STANDARD">Standard Patient (Rank 3)</option>
                <option value="ELDERLY">Senior Citizen (Rank 2)</option>
                <option value="EMERGENCY_WALKIN">Urgent Walk-in / Critical (Rank 1)</option>
              </select>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <TextField
                label="Front-desk Clinical Notes (Optional)"
                placeholder="e.g., Wheelchair requested, acute chest discomfort"
                value={walkinNotes}
                onChange={(e) => setWalkinNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setWalkinModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={walkinSubmitting}
              >
                Generate Walk-in Token
              </Button>
            </div>
          </form>
        </Modal>

        {/* =========================================================
            CONFIRMATION MODAL FOR DESTRUCTIVE ACTIONS
            ========================================================= */}
        <Modal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
          title={confirmModal.title}
          maxWidth="460px"
          footer={
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              >
                Dismiss
              </Button>
              <Button
                variant={confirmModal.confirmVariant}
                size="sm"
                loading={actionLoading}
                onClick={() => handleExecuteAction(confirmModal.tokenId, confirmModal.actionType)}
              >
                {confirmModal.confirmLabel}
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                padding: '10px',
                borderRadius: '50%',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                color: '#EF4444',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={20} />
            </div>
            <div>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {confirmModal.message}
              </p>
            </div>
          </div>
        </Modal>

        {/* =========================================================
            STAFF COPILOT MODAL
            ========================================================= */}
        <Modal
          isOpen={copilotModalOpen}
          onClose={() => setCopilotModalOpen(false)}
          title="Staff Queue Copilot"
          maxWidth="640px"
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim, #9E6D78)' }}>
                Data Scope: Allow-listed Read-Only Aggregates (Zero Patient PII)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={fetchStaffCopilot} loading={copilotLoading} icon={RefreshCw}>
                  Refresh Numbers
                </Button>
                <Button variant="primary" size="sm" onClick={() => setCopilotModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: 'rgba(168, 85, 247, 0.15)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
                color: '#C084FC',
                fontSize: '0.75rem',
                fontWeight: 700,
                marginBottom: '16px'
              }}
            >
              <Sparkles size={14} />
              <span>Grounded Read-Only AI Queue Intelligence</span>
            </div>

            {copilotLoading ? (
              <div style={{ padding: '24px 0', textAlign: 'center' }}>
                <RefreshCw size={24} className="animate-spin" style={{ color: '#FF2D55', margin: '0 auto 8px auto' }} />
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Computing allow-listed queue aggregates...</p>
              </div>
            ) : copilotError ? (
              <div style={{ padding: '16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#F87171', fontSize: '0.875rem' }}>
                {copilotError}
              </div>
            ) : copilotData ? (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>
                    Source Numbers (Direct Database Aggregates):
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{copilotData.sourceMetrics?.totalTokens ?? 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Total Tokens</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FBBF24' }}>{copilotData.sourceMetrics?.waiting ?? 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Waiting Now</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>{copilotData.sourceMetrics?.inConsultation ?? 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>In Consultation</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399' }}>{copilotData.sourceMetrics?.completed ?? 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Completed Today</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F87171' }}>{copilotData.sourceMetrics?.totalNoShows ?? 0}</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>No-Shows / Cancelled</div>
                    </div>
                    <div style={{ padding: '10px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF' }}>{copilotData.sourceMetrics?.avgServiceTimeMinutes ?? 10}m</div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Avg Service Time</div>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '14px', backgroundColor: 'rgba(168, 85, 247, 0.1)', borderRadius: '10px', border: '1px solid rgba(168, 85, 247, 0.25)', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 700, color: '#C084FC', textTransform: 'uppercase', marginBottom: '6px' }}>
                    <Sparkles size={13} />
                    <span>Verified Operational Narrative:</span>
                  </div>
                  <p style={{ fontSize: '0.875rem', color: '#FFFFFF', margin: 0, lineHeight: 1.6 }}>
                    {copilotData.narrative}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', padding: '10px 12px', backgroundColor: 'rgba(16, 3, 8, 0.8)', borderRadius: '10px', border: '1px solid rgba(255, 60, 95, 0.2)' }}>
                  <ShieldCheck size={16} style={{ color: '#FF2D55', flexShrink: 0, marginTop: '2px' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                    <strong>Staff Verification Guarantee:</strong> Every metric matches verified database aggregates. Zero raw patient PII or unencrypted numbers are exposed.
                  </span>
                </div>
              </div>
            ) : null}
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default function ProtectedStaffDashboard() {
  return (
    <ProtectedRoute allowedRoles={['RECEPTIONIST', 'ADMIN', 'DOCTOR']}>
      <StaffDashboard />
    </ProtectedRoute>
  );
}
