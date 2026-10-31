import React from 'react';
import { Clock, PhoneCall, Stethoscope, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export const StatusBadge = ({ status }) => {
  const configs = {
    WAITING: {
      label: 'Waiting',
      bg: 'var(--amber-light)',
      border: 'var(--amber-border)',
      color: 'var(--amber)',
      icon: Clock
    },
    CALLED: {
      label: 'Now Calling',
      bg: 'var(--primary-light)',
      border: 'var(--primary-border)',
      color: 'var(--primary)',
      icon: PhoneCall
    },
    IN_CONSULTATION: {
      label: 'In Consultation',
      bg: 'var(--emerald-light)',
      border: 'var(--emerald-border)',
      color: 'var(--emerald)',
      icon: Stethoscope
    },
    COMPLETED: {
      label: 'Completed',
      bg: '#f1f5f9',
      border: '#cbd5e1',
      color: '#475569',
      icon: CheckCircle
    },
    SKIPPED: {
      label: 'Skipped / Recalled',
      bg: 'var(--rose-light)',
      border: 'var(--rose-border)',
      color: 'var(--rose)',
      icon: AlertTriangle
    },
    CANCELLED: {
      label: 'Cancelled',
      bg: '#f1f5f9',
      border: '#e2e8f0',
      color: '#94a3b8',
      icon: XCircle
    }
  };

  const config = configs[status] || configs.WAITING;
  const Icon = config.icon;

  return (
    <span
      className="badge"
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
        color: config.color,
        borderWidth: '1px',
        borderStyle: 'solid'
      }}
    >
      <Icon size={13} />
      {config.label}
    </span>
  );
};
