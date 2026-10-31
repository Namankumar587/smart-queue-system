import React, { useState } from 'react';
import { Card } from './Card';
import { StatusChip } from './StatusChip';
import { PriorityBadge } from './PriorityBadge';
import { Button } from './Button';
import {
  Clock,
  Users,
  Stethoscope,
  Building,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  QrCode,
  Share2,
  Bell,
  CheckCircle2,
  Radio,
  Printer,
  MessageCircle
} from 'lucide-react';

export const TokenCard = ({
  tokenData,
  showQr = true,
  showCopy = true,
  onOpenLiveTracker = null,
  className = '',
  style = {}
}) => {
  const [copied, setCopied] = useState(false);

  if (!tokenData) return null;

  const {
    displayCode,
    tokenNumber,
    status,
    priority,
    positionAhead = 0,
    estimatedWaitDisplay,
    estimatedWaitMinutes = 0,
    estimatedWaitRange,
    waitDisclaimer,
    doctor,
    clinic,
    trackingUuid,
    trackingUrl: backendTrackingUrl,
    qrCode,
    notificationStatus,
    currentServingCode,
    currentServingStatus,
    bookedAt
  } = tokenData;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
  const trackingUrl = backendTrackingUrl || `${currentOrigin}/track/${trackingUuid}`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(trackingUrl);
      } else {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = trackingUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy tracking link:', err);
    }
  };

  const handleShareWhatsApp = () => {
    const text = `🏥 *Clinic Token Pass: ${displayCode || tokenNumber}*\n` +
      `👨‍⚕️ Doctor: ${doctor?.name || 'Assigned Specialist'} (${doctor?.roomNumber || 'Room'})\n` +
      `⏱️ Est. Wait: ${estimatedWaitDisplay || `~${estimatedWaitMinutes} mins`}\n` +
      `📍 Status: ${status}\n` +
      `🔗 Track Live: ${trackingUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // Map notification delivery status strictly based on backend report
  const renderNotificationStatus = () => {
    if (!notificationStatus) return null;

    if (notificationStatus === 'SIMULATED') {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface-elevated)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Radio size={12} color="var(--cyan-accent)" />
          <span>SMS: Simulated (Demo Carrier)</span>
        </div>
      );
    }

    if (notificationStatus === 'DELIVERED') {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--success)',
            backgroundColor: 'var(--success-subtle)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <CheckCircle2 size={12} />
          <span>SMS: Confirmed Delivered</span>
        </div>
      );
    }

    if (notificationStatus === 'SENT') {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--cyan-accent)',
            backgroundColor: 'var(--blue-subtle)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(34, 211, 238, 0.3)'
          }}
        >
          <CheckCircle2 size={12} />
          <span>SMS: Sent to Carrier</span>
        </div>
      );
    }

    if (notificationStatus === 'FAILED') {
      return (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--danger-red)',
            backgroundColor: 'var(--danger-subtle)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-pill)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <AlertTriangle size={12} />
          <span>SMS: Delivery Unsuccessful</span>
        </div>
      );
    }

    return null;
  };

  return (
    <Card
      className={`clinical-token-card motion-reveal ${className}`}
      style={{
        padding: '24px',
        maxWidth: '540px',
        margin: '0 auto',
        backgroundColor: 'var(--bg-surface)',
        borderColor: status === 'CALLED' ? 'var(--cyan-accent)' : 'var(--border-subtle)',
        boxShadow: status === 'CALLED' ? 'var(--shadow-glow)' : 'var(--shadow-card)',
        ...style
      }}
    >
      {/* Top Header: Status & Priority Badges */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '8px',
          marginBottom: '16px'
        }}
      >
        <StatusChip status={status} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <PriorityBadge priority={priority} size="sm" />
          {renderNotificationStatus()}
        </div>
      </div>

      {/* Dynamic Status Alert Banners */}
      {status === 'CALLED' && (
        <div
          role="alert"
          style={{
            padding: '12px 16px',
            backgroundColor: 'rgba(34, 211, 238, 0.12)',
            border: '1px solid var(--cyan-accent)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--cyan-accent)', fontWeight: 800, fontSize: '1rem', letterSpacing: '0.02em' }}>
            NOW CALLING - YOUR TURN!
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.875rem', marginTop: '2px' }}>
            Please proceed immediately to <strong>{doctor?.roomNumber || 'the consultation desk'}</strong>
          </div>
        </div>
      )}

      {status === 'IN_CONSULTATION' && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--blue-subtle)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--blue-primary)', fontWeight: 700, fontSize: '0.9375rem' }}>
            Currently in Consultation
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '2px' }}>
            Consultation with {doctor?.name || 'the specialist'} is currently in progress.
          </div>
        </div>
      )}

      {status === 'COMPLETED' && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--success)', fontWeight: 800, fontSize: '1rem' }}>
            Consultation Completed
          </div>
          <div style={{ color: 'var(--text-primary)', fontSize: '0.8125rem', marginTop: '4px' }}>
            Your visit has concluded. Collect your prescription at the pharmacy counter.
          </div>
        </div>
      )}

      {status === 'SKIPPED' && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--warning-subtle)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--warning-amber)', fontWeight: 800, fontSize: '0.9375rem' }}>
            Token Skipped (No-Show)
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '4px' }}>
            You were not present when your token was called. Please report to the receptionist counter to requeue your token.
          </div>
        </div>
      )}

      {status === 'CANCELLED' && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '16px',
            textAlign: 'center'
          }}
        >
          <div style={{ color: 'var(--danger-red)', fontWeight: 800, fontSize: '0.9375rem' }}>
            Token Cancelled
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', marginTop: '4px' }}>
            This consultation token has been cancelled. Please book a new token if care is needed.
          </div>
        </div>
      )}

      {/* Currently Serving Counter Display */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 14px',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '16px',
          fontSize: '0.8125rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: currentServingCode ? 'var(--cyan-accent)' : 'var(--text-dim)',
              boxShadow: currentServingCode ? '0 0 8px var(--cyan-accent)' : 'none'
            }}
            aria-hidden="true"
          />
          <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Now Serving (Counter):</span>
        </div>
        <span
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.9375rem',
            color: currentServingCode ? 'var(--cyan-accent)' : 'var(--text-dim)'
          }}
        >
          {currentServingCode || 'Preparing Consultation'}
        </span>
      </div>

      {/* Main Token Code Section */}
      <div
        style={{
          textAlign: 'center',
          padding: '20px 12px',
          background: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-card)',
          border: '1px dashed var(--border-subtle)',
          marginBottom: '20px'
        }}
      >
        <span
          style={{
            fontSize: '0.75rem',
            color: 'var(--text-dim)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}
        >
          Official Token Code
        </span>

        <div
          className="tabular-nums"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '2.75rem',
            fontWeight: 800,
            color: 'var(--cyan-accent)',
            letterSpacing: '0.04em',
            margin: '6px 0 2px 0',
            lineHeight: 1.1
          }}
        >
          {displayCode || tokenNumber}
        </div>

        {tokenNumber && displayCode !== tokenNumber && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            Sequential: <span className="tabular-nums" style={{ fontFamily: 'var(--font-mono)' }}>{tokenNumber}</span>
          </div>
        )}
      </div>

      {/* Primary Metrics Grid (Queue Position & Estimated Wait) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '20px'
        }}
      >
        {/* Metric 1: Patients Ahead with queue-position-highlight */}
        <div
          className="queue-position-highlight"
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Users size={14} color="var(--cyan-accent)" />
            <span>Patients Ahead</span>
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: positionAhead === 0 ? 'var(--success)' : 'var(--text-primary)'
            }}
          >
            {positionAhead === 0 ? 'Turn Next' : positionAhead}
          </div>
        </div>

        {/* Metric 2: Estimated Wait */}
        <div
          style={{
            padding: '12px',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '4px' }}>
            <Clock size={14} color="var(--warning-amber)" />
            <span>Estimated Wait</span>
          </div>
          <div
            className="tabular-nums"
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--warning-amber)'
            }}
          >
            {positionAhead === 0 ? '< 5 mins' : (estimatedWaitDisplay || `~${estimatedWaitMinutes} mins`)}
          </div>
        </div>
      </div>

      {/* Queue Progress Bar (240ms smooth progress change) */}
      {typeof positionAhead === 'number' && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>Queue Progress</span>
            <span style={{ fontWeight: 600, color: positionAhead === 0 ? 'var(--success)' : 'var(--cyan-accent)' }}>
              {positionAhead === 0 ? 'Turn Next • Ready' : `${positionAhead} waiting ahead`}
            </span>
          </div>
          <div
            style={{
              height: '6px',
              backgroundColor: 'var(--bg-surface-subtle)',
              borderRadius: '9999px',
              overflow: 'hidden',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <div
              className="progress-bar-fill"
              style={{
                height: '100%',
                width: `${Math.max(12, Math.min(100, 100 - positionAhead * 15))}%`,
                backgroundColor: positionAhead === 0 ? 'var(--success)' : 'var(--cyan-accent)',
                borderRadius: '9999px'
              }}
            />
          </div>
        </div>
      )}

      {/* Mandatory Non-Promissory Wording Disclaimer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          padding: '10px 12px',
          backgroundColor: 'rgba(34, 211, 238, 0.06)',
          border: '1px solid rgba(34, 211, 238, 0.2)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          color: 'var(--cyan-accent)',
          marginBottom: '20px'
        }}
      >
        <Clock size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
        <span>
          <strong>Notice:</strong> {waitDisclaimer || 'Estimated wait is dynamic based on consultation pace and is an estimate, not a guarantee.'}
        </span>
      </div>

      {/* Doctor & Location Details */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '14px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '0.875rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Stethoscope size={16} color="var(--cyan-accent)" style={{ flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--text-primary)' }}>{doctor?.name || 'Assigned Specialist'}</strong>
            <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({doctor?.department || 'Outpatient'})</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
          <div style={{ color: 'var(--text-muted)' }}>
            Location: <strong style={{ color: 'var(--text-primary)' }}>{doctor?.roomNumber || 'Consultation Counter'}</strong>
            {clinic?.name && ` &bull; ${clinic.name}`}
          </div>
        </div>
      </div>

      {/* Scannable QR Code Section (Approved Tracking Reference Only) */}
      {showQr && qrCode && (
        <div
          style={{
            textAlign: 'center',
            padding: '16px',
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              position: 'relative',
              display: 'inline-block',
              padding: '10px',
              backgroundColor: '#FFFFFF',
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'var(--shadow-subtle)'
            }}
          >
            <img
              src={qrCode}
              alt={`Scannable QR tracking code for token ${displayCode || tokenNumber}`}
              style={{ width: '130px', height: '130px', display: 'block' }}
            />
            {/* QR Success Tick Badge (<= 220ms micro-interaction) */}
            <div
              className="qr-success-tick"
              title="Verified Scannable Reference"
              aria-label="QR Validated"
              style={{
                position: 'absolute',
                bottom: '-6px',
                right: '-6px',
                backgroundColor: 'var(--bg-surface)',
                border: '2px solid var(--success)',
                borderRadius: '50%',
                padding: '3px',
                boxShadow: 'var(--shadow-subtle)'
              }}
            >
              <CheckCircle2 size={16} color="var(--success)" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
            Scan at reception desk for contactless check-in.
          </div>
        </div>
      )}

      {/* Copy Tracking Link Action */}
      {showCopy && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface-subtle)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '4px 6px 4px 12px',
              gap: '8px'
            }}
          >
            <span
              style={{
                flex: 1,
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {trackingUrl}
            </span>

            <Button
              variant={copied ? 'primary' : 'secondary'}
              size="sm"
              icon={copied ? Check : Copy}
              onClick={handleCopyLink}
              style={{ flexShrink: 0 }}
            >
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
          </div>

          {/* Quick Share to WhatsApp & Print Pass Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <Button
              variant="secondary"
              size="sm"
              icon={MessageCircle}
              onClick={handleShareWhatsApp}
              style={{
                color: '#25D366',
                borderColor: 'rgba(37, 211, 102, 0.3)',
                backgroundColor: 'rgba(37, 211, 102, 0.08)'
              }}
            >
              Share WhatsApp
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Printer}
              onClick={handlePrintSlip}
            >
              Print Slip
            </Button>
          </div>
        </div>
      )}

      {/* Privacy Notice: Do Not Share Private Link */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--bg-surface-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.75rem',
          color: 'var(--text-dim)',
          marginBottom: onOpenLiveTracker ? '16px' : '0'
        }}
      >
        <ShieldCheck size={14} color="var(--success)" style={{ flexShrink: 0 }} />
        <span>
          <strong>Private Token:</strong> Do not share this tracking URL with strangers. Your personal phone number is never exposed.
        </span>
      </div>

      {/* Optional Navigation Action */}
      {onOpenLiveTracker && (
        <div style={{ marginTop: '16px' }}>
          <Button
            variant="primary"
            size="md"
            fullWidth
            onClick={onOpenLiveTracker}
          >
            View Live Polling Queue
          </Button>
        </div>
      )}
    </Card>
  );
};
