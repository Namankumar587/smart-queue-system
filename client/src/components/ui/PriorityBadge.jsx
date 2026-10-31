import React from 'react';
import { AlertTriangle, HeartPulse, Accessibility, Clock } from 'lucide-react';

export const PRIORITY_CONFIG = {
  EMERGENCY_WALKIN: {
    label: 'Urgent Walk-in',
    shortLabel: 'Urgent',
    color: 'var(--danger-red)',
    bg: 'var(--danger-subtle)',
    border: 'rgba(239, 68, 68, 0.35)',
    icon: AlertTriangle,
    description: 'Requires human clinical verification on arrival'
  },
  ELDERLY: {
    label: 'Senior Citizen (65+)',
    shortLabel: 'Senior',
    color: 'var(--warning-amber)',
    bg: 'var(--warning-subtle)',
    border: 'rgba(245, 158, 11, 0.35)',
    icon: HeartPulse,
    description: 'Special seating and accelerated boarding'
  },
  DIFFERENTLY_ABLED: {
    label: 'Assisted Access',
    shortLabel: 'Assisted',
    color: 'var(--priority-violet)',
    bg: 'var(--violet-subtle)',
    border: 'rgba(139, 92, 246, 0.35)',
    icon: Accessibility,
    description: 'Mobility or hearing assistance required'
  },
  STANDARD: {
    label: 'Standard Queue',
    shortLabel: 'Standard',
    color: 'var(--cyan-accent)',
    bg: 'var(--cyan-glow)',
    border: 'rgba(34, 211, 238, 0.3)',
    icon: Clock,
    description: 'Standard FIFO queue slot'
  }
};

export const PriorityBadge = ({
  priority = 'STANDARD',
  size = 'md', // 'sm', 'md'
  showDescription = false,
  className = '',
  style = {}
}) => {
  const config = PRIORITY_CONFIG[priority] || PRIORITY_CONFIG.STANDARD;
  const IconComponent = config.icon;

  const isSmall = size === 'sm';

  return (
    <span
      role="status"
      aria-label={`Priority Level: ${config.label}`}
      className={`priority-badge ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 8px' : '4px 10px',
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
      title={config.description}
    >
      <IconComponent size={isSmall ? 12 : 14} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span>{isSmall ? config.shortLabel : config.label}</span>
    </span>
  );
};
