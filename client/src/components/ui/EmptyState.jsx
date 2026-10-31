import React from 'react';
import { Inbox } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No items found',
  message = 'There are no active records in this view right now.',
  actionLabel = null,
  onAction = null,
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`clinical-card ${className}`}
      style={{
        padding: '36px 20px',
        textAlign: 'center',
        border: '1px dashed var(--border-subtle)',
        backgroundColor: 'var(--bg-surface-subtle)',
        borderRadius: 'var(--radius-card)',
        ...style
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: 'var(--bg-surface-elevated)',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto'
        }}
        aria-hidden="true"
      >
        <Icon size={24} />
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 16px auto' }}>
        {message}
      </p>

      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
