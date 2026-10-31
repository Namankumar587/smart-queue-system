import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  variant = 'primary', // 'primary', 'secondary', 'danger', 'ghost'
  size = 'md',        // 'sm', 'md', 'lg'
  type = 'button',
  loading = false,
  disabled = false,
  fullWidth = false,
  icon: Icon = null,
  onClick,
  ariaLabel,
  className = '',
  style = {},
  ...props
}) => {
  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontFamily: 'var(--font-sans)',
    fontWeight: 600,
    borderRadius: 'var(--radius-sm)',
    transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.05s ease',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.55 : 1,
    width: fullWidth ? '100%' : 'auto',
    textAlign: 'center',
    border: '1px solid transparent'
  };

  const sizeStyles = {
    sm: { padding: '6px 12px', fontSize: '0.8125rem' },
    md: { padding: '10px 18px', fontSize: '0.9375rem' },
    lg: { padding: '14px 24px', fontSize: '1.0625rem' }
  };

  const variantStyles = {
    primary: {
      background: 'linear-gradient(135deg, #FF2D55 0%, #D4143D 100%)',
      color: '#FFFFFF',
      borderColor: 'rgba(255, 95, 130, 0.4)',
      boxShadow: '0 4px 18px rgba(255, 45, 85, 0.4), inset 0 1px 1px rgba(255, 180, 200, 0.35)'
    },
    secondary: {
      backgroundColor: 'rgba(32, 6, 14, 0.8)',
      color: 'var(--text-primary)',
      borderColor: 'rgba(255, 60, 95, 0.3)',
      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.5)'
    },
    danger: {
      background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)',
      color: '#FFFFFF',
      borderColor: '#EF4444',
      boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--text-muted)',
      borderColor: 'transparent'
    }
  };

  const computedStyle = {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant],
    ...style
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={ariaLabel}
      onClick={onClick}
      style={computedStyle}
      className={`clinical-btn ${className}`}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 size={18} className="animate-spin" aria-hidden="true" />
          <span>Processing...</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={18} aria-hidden="true" />}
          {children}
        </>
      )}
    </button>
  );
};
