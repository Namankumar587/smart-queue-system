import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';

export const TextField = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder = '',
  required = false,
  disabled = false,
  error = '',
  helperText = '',
  name,
  id: explicitId,
  autoComplete,
  className = '',
  style = {},
  ...props
}) => {
  const generatedId = useId();
  const inputId = explicitId || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`form-group ${className}`} style={{ ...style }}>
      {label && (
        <label htmlFor={inputId} className="form-label">
          <span>
            {label}
            {required && <span className="required-dot" aria-hidden="true">*</span>}
          </span>
          {required && <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 400 }}>Required</span>}
        </label>
      )}

      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : helperText ? helperId : undefined}
        className={`input-field ${error ? 'input-error' : ''}`}
        {...props}
      />

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
