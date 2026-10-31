import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export const ErrorState = ({
  title = 'Something went wrong',
  message = 'We encountered an error while communicating with the clinic server.',
  onRetry = null,
  retryLabel = 'Try Again',
  className = '',
  style = {}
}) => {
  return (
    <div
      role="alert"
      className={`clinical-card ${className}`}
      style={{
        padding: '24px',
        textAlign: 'center',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        backgroundColor: 'rgba(239, 68, 68, 0.06)',
        borderRadius: 'var(--radius-card)',
        ...style
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '50%',
          backgroundColor: 'var(--danger-subtle)',
          color: 'var(--danger-red)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 12px auto'
        }}
        aria-hidden="true"
      >
        <AlertTriangle size={24} />
      </div>

      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
        {title}
      </h3>

      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 16px auto' }}>
        {message}
      </p>

      {onRetry && (
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
};
