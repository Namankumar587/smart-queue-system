import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  style = {},
  headerStyle = {},
  bodyStyle = {},
  ...props
}) => {
  return (
    <div
      className={`clinical-card ${className}`}
      style={{
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        ...style
      }}
      {...props}
    >
      {(title || subtitle || action) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: subtitle ? '12px' : '8px',
            borderBottom: '1px solid var(--border-subtle)',
            ...headerStyle
          }}
        >
          <div>
            {title && (
              <h2
                style={{
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.01em'
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {subtitle}
              </p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ ...bodyStyle }}>{children}</div>
    </div>
  );
};
