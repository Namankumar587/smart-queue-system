import React from 'react';
import { Clock, BellRing, Stethoscope, CheckCircle2, UserX, XCircle } from 'lucide-react';

export const STATUS_CONFIG = {
  WAITING: {
    label: 'Waiting in Queue',
    color: 'var(--warning-amber)',
    bg: 'var(--warning-subtle)',
    border: 'rgba(245, 158, 11, 0.3)',
    icon: Clock
  },
  CALLED: {
    label: 'Now Called',
    color: 'var(--cyan-accent)',
    bg: 'var(--cyan-glow)',
    border: 'rgba(34, 211, 238, 0.4)',
    icon: BellRing
  },
  IN_CONSULTATION: {
    label: 'In Consultation',
    color: 'var(--blue-primary)',
    bg: 'var(--blue-subtle)',
    border: 'rgba(59, 130, 246, 0.4)',
    icon: Stethoscope
  },
  COMPLETED: {
    label: 'Completed',
    color: 'var(--success)',
    bg: 'var(--success-subtle)',
    border: 'rgba(34, 197, 94, 0.3)',
    icon: CheckCircle2
  },
  SKIPPED: {
    label: 'Skipped / No-Show',
    color: 'var(--text-muted)',
    bg: 'rgba(148, 163, 184, 0.1)',
    border: 'rgba(148, 163, 184, 0.25)',
    icon: UserX
  },
  CANCELLED: {
    label: 'Cancelled',
    color: 'var(--danger-red)',
    bg: 'var(--danger-subtle)',
    border: 'rgba(239, 68, 68, 0.3)',
    icon: XCircle
  }
};

export const StatusChip = ({ status = 'WAITING', size = 'md', className = '', style = {} }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.WAITING;
  const IconComponent = config.icon;
  const isSmall = size === 'sm';

  return (
    <span
      role="status"
      aria-label={`Status: ${config.label}`}
      className={`status-chip ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 8px' : '4px 12px',
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: 'var(--radius-pill)',
        color: config.color,
        fontSize: isSmall ? '0.6875rem' : '0.8125rem',
        fontWeight: 700,
        letterSpacing: '0.02em',
        userSelect: 'none',
        ...style
      }}
    >
      <IconComponent size={isSmall ? 12 : 14} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{config.label}</span>
    </span>
  );
};
