import React, { useId } from 'react';
import { AlertCircle, CheckCircle2, Phone } from 'lucide-react';

export const PhoneInput = ({
  label = 'Mobile Phone Number',
  value,
  onChange,
  placeholder = '98765 43210',
  required = true,
  disabled = false,
  error = '',
  helperText = 'We send scannable ticket and near-turn alerts to this number via SMS.',
  name = 'patientPhone',
  id: explicitId,
  className = '',
  style = {}
}) => {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  // Sanitizes input to digits only
  const handleInputChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    // Allow up to 10 digits for Indian standard
    const truncated = raw.slice(0, 10);
    onChange(truncated);
  };

  const isComplete = value && value.length === 10;

  return (
    <div className={`form-group ${className}`} style={{ ...style }}>
      <label htmlFor={inputId} className="form-label">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Phone size={14} color="var(--cyan-accent)" aria-hidden="true" />
          {label}
          {required && <span className="required-dot" aria-hidden="true">*</span>}
        </span>
        <span style={{ fontSize: '0.75rem', color: isComplete ? 'var(--success)' : 'var(--text-dim)' }}>
          {value ? `${value.length}/10 digits` : '10 digits'}
        </span>
      </label>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: 'var(--bg-surface-subtle)',
          border: `1px solid ${error ? 'var(--danger-red)' : isComplete ? 'var(--success)' : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
        }}
      >
        <span
          style={{
            padding: '10px 12px',
            background: 'var(--bg-surface-elevated)',
            borderRight: '1px solid var(--border-subtle)',
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--cyan-accent)',
            userSelect: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          aria-hidden="true"
        >
          🇮🇳 +91
        </span>

        <input
          id={inputId}
          name={name}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete="tel-national"
          aria-invalid={!!error}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          style={{
            flex: 1,
            padding: '10px 14px',
            backgroundColor: 'transparent',
            border: 'none',
            color: 'var(--text-primary)',
            fontSize: '0.9375rem',
            fontFamily: 'var(--font-mono)',
            outline: 'none',
            fontVariantNumeric: 'tabular-nums'
          }}
        />

        {isComplete && !error && (
          <div style={{ paddingRight: '12px', color: 'var(--success)', display: 'flex' }} aria-label="Valid phone number">
            <CheckCircle2 size={18} aria-hidden="true" />
          </div>
        )}
      </div>

      {error ? (
        <div
          id={errorId}
          role="alert"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.75rem',
            color: 'var(--danger-red)',
            marginTop: '4px'
          }}
        >
          <AlertCircle size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      ) : helperText ? (
        <p id={helperId} className="form-hint" style={{ marginTop: '4px' }}>
          {helperText}
        </p>
      ) : null}
    </div>
  );
};
