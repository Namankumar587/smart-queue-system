import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
import './StaffLoginPage.css';

/**
 * Retained for backwards-compatibility and utility imports
 */
export function extractTrackingId(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  const trackMatch = trimmed.match(/\/track\/([^/?#]+)/i);
  if (trackMatch && trackMatch[1]) {
    return decodeURIComponent(trackMatch[1].trim());
  }
  try {
    const parsed = new URL(trimmed);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      return segments[segments.length - 1];
    }
  } catch {
    // Direct token string
  }
  return trimmed;
}

// Zod Validation Schemas
export const staffLoginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(10, 'Password must be at least 10 characters to match clinic policy')
});

export const staffSignUpSchema = z.object({
  name: z
    .string()
    .min(1, 'Full name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must not exceed 80 characters'),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  role: z.enum(['RECEPTIONIST', 'DOCTOR', 'ADMIN'], {
    errorMap: () => ({ message: 'Please select an authorized staff role' })
  }),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(10, 'Password must be at least 10 characters to match clinic policy')
});

const API_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:5000/api/v1'
    : (typeof window !== 'undefined' ? `${window.location.origin}/api/v1` : 'http://localhost:5000/api/v1'));

export const StaffLoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthSession } = useAuth();

  // Sliding panel state: false = Staff Login (Side A); true = Staff Sign Up (Side B)
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successBanner, setSuccessBanner] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  const from = location.state?.from?.pathname || null;

  // React Hook Form for Staff Login
  const {
    register: registerStaff,
    handleSubmit: handleStaffSubmit,
    formState: { errors: staffErrors }
  } = useForm({
    resolver: zodResolver(staffLoginSchema),
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: ''
    }
  });

  // React Hook Form for Staff Sign Up
  const {
    register: registerSignUp,
    handleSubmit: handleSignUpSubmit,
    formState: { errors: signUpErrors }
  } = useForm({
    resolver: zodResolver(staffSignUpSchema),
    mode: 'onTouched',
    defaultValues: {
      name: '',
      email: '',
      role: 'RECEPTIONIST',
      password: ''
    }
  });

  // Handle Staff Login Submit (POST /api/v1/auth/login)
  const onStaffLogin = async (data) => {
    setServerError('');
    setSuccessBanner('');
    setIsSubmittingAuth(true);

    try {
      const response = await axios.post(
        `${API_BASE}/auth/login`,
        {
          email: data.email.trim(),
          password: data.password
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const authData = response.data?.data;
      if (!authData?.token || !authData?.user) {
        throw new Error('Authentication response missing session token');
      }

      if (setAuthSession) {
        setAuthSession(authData.token, authData.user);
      }

      const userRole = (authData.user.role || '').toUpperCase();
      if (from) {
        navigate(from, { replace: true });
      } else if (userRole === 'DOCTOR') {
        navigate('/doctor/queue', { replace: true });
      } else if (userRole === 'ADMIN') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/staff/dashboard', { replace: true });
      }
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        if (status === 401) {
          setServerError('Invalid email or password');
        } else if (status === 423) {
          setServerError('Too many attempts, try again later');
        } else if (status === 429) {
          setServerError('Too many requests. Please slow down and try again shortly.');
        } else {
          setServerError(err.response.data?.error || 'Authentication failed. Please verify credentials.');
        }
      } else if (err.request) {
        setServerError('Network error. Please check your connection and try again.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Handle Staff Sign Up Submit (POST /api/v1/auth/signup)
  const onStaffSignUp = async (data) => {
    setServerError('');
    setSuccessBanner('');
    setIsSubmittingAuth(true);

    try {
      const response = await axios.post(
        `${API_BASE}/auth/signup`,
        {
          name: data.name.trim(),
          email: data.email.trim(),
          role: data.role,
          password: data.password
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const authData = response.data?.data;
      if (!authData?.token || !authData?.user) {
        throw new Error('Sign up response missing session token');
      }

      setSuccessBanner('Account created successfully! Redirecting to dashboard...');

      if (setAuthSession) {
        setAuthSession(authData.token, authData.user);
      }

      const userRole = (authData.user.role || data.role || '').toUpperCase();
      setTimeout(() => {
        if (userRole === 'DOCTOR') {
          navigate('/doctor/queue', { replace: true });
        } else if (userRole === 'ADMIN') {
          navigate('/admin', { replace: true });
        } else {
          navigate('/staff/dashboard', { replace: true });
        }
      }, 350);
    } catch (err) {
      if (err.response) {
        const status = err.response.status;
        if (status === 409) {
          setServerError('An account with this email address already exists. Please sign in instead.');
        } else if (status === 429) {
          setServerError('Too many requests. Please slow down and try again shortly.');
        } else {
          setServerError(err.response.data?.error || 'Failed to create staff account. Please verify input.');
        }
      } else if (err.request) {
        setServerError('Network error. Please check your connection and try again.');
      } else {
        setServerError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  return (
    <div className="sliding-auth-page" data-testid="sliding-auth-page">
      {/* Background Ambient Nebular Flare */}
      <div className="auth-ambient-glow" aria-hidden="true" />

      <div className="sliding-auth-container">
        <div
          className={`sliding-auth-card ${isSignUpMode ? 'state-patient' : 'state-staff'}`}
          data-testid="sliding-auth-card"
        >
          {/* =========================================================
              SLOT 1 (Left Half): Staff Login Form
              ========================================================= */}
          <div
            className={`sliding-form-slot slot-staff ${isSignUpMode ? 'is-covered' : 'is-active'}`}
            aria-hidden={isSignUpMode}
          >
            <div className="auth-form-header">
              <h1 className="auth-form-title">Staff Login</h1>
              <p className="auth-form-subtitle">
                Authorized clinical &amp; queue administration console
              </p>
            </div>

            {/* Server Error Alert Banner */}
            {!isSignUpMode && serverError && (
              <div
                className="auth-server-banner"
                role="alert"
                aria-live="polite"
                data-testid="server-error-banner"
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{serverError}</span>
              </div>
            )}

            <form
              onSubmit={handleStaffSubmit(onStaffLogin)}
              noValidate
              aria-label="Staff Login Form"
              data-testid="staff-login-form"
            >
              {/* Email Address */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="staff-email">
                  Email Address
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="staff-email"
                    type="email"
                    autoComplete="email"
                    placeholder="doctor@clinic.local"
                    className={`auth-input ${staffErrors.email ? 'has-error' : ''}`}
                    {...registerStaff('email')}
                    disabled={isSubmittingAuth}
                    data-testid="staff-email-input"
                  />
                </div>
                {staffErrors.email && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="email-error-message"
                  >
                    <AlertCircle size={12} />
                    {staffErrors.email.message}
                  </span>
                )}
              </div>

              {/* Password */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="staff-password">
                  Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="staff-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter security password"
                    className={`auth-input ${staffErrors.password ? 'has-error' : ''}`}
                    {...registerStaff('password')}
                    disabled={isSubmittingAuth}
                    data-testid="staff-password-input"
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showLoginPassword}
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                    data-testid="toggle-password-btn"
                  >
                    {showLoginPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {staffErrors.password && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="password-error-message"
                  >
                    <AlertCircle size={12} />
                    {staffErrors.password.message}
                  </span>
                )}
              </div>

              {/* Helper Note */}
              <p className="auth-helper-note">
                Forgot password? Ask your clinic admin
              </p>

              {/* Primary Pill Button */}
              <button
                type="submit"
                className="auth-btn-pill"
                disabled={isSubmittingAuth}
                data-testid="staff-login-button"
              >
                {isSubmittingAuth ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Login</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* =========================================================
              SLOT 2 (Right Half): Staff Sign Up Form (Replaces Token Book)
              ========================================================= */}
          <div
            className={`sliding-form-slot slot-patient ${!isSignUpMode ? 'is-covered' : 'is-active'}`}
            aria-hidden={!isSignUpMode}
          >
            <div className="auth-form-header">
              <h1 className="auth-form-title">Create Account</h1>
              <p className="auth-form-subtitle">
                Register authorized staff, receptionist, or clinic doctor
              </p>
            </div>

            {/* Server Error / Success Alert Banner */}
            {isSignUpMode && serverError && (
              <div
                className="auth-server-banner"
                role="alert"
                aria-live="polite"
                data-testid="signup-error-banner"
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{serverError}</span>
              </div>
            )}

            {isSignUpMode && successBanner && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '12px 14px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  borderRadius: '10px',
                  color: '#34D399',
                  fontSize: '0.84rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                role="status"
                data-testid="signup-success-banner"
              >
                <CheckCircle2 size={16} />
                <span>{successBanner}</span>
              </div>
            )}

            <form
              onSubmit={handleSignUpSubmit(onStaffSignUp)}
              noValidate
              aria-label="Staff Sign Up Form"
              data-testid="staff-signup-form"
            >
              {/* Full Name */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="signup-name">
                  Full Name
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-name"
                    type="text"
                    autoComplete="name"
                    placeholder="e.g. Dr. Priya Sharma"
                    className={`auth-input ${signUpErrors.name ? 'has-error' : ''}`}
                    {...registerSignUp('name')}
                    disabled={isSubmittingAuth}
                    data-testid="signup-name-input"
                  />
                </div>
                {signUpErrors.name && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="signup-name-error"
                  >
                    <AlertCircle size={12} />
                    {signUpErrors.name.message}
                  </span>
                )}
              </div>

              {/* Work Email */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="signup-email">
                  Work Email
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="name@clinic.local"
                    className={`auth-input ${signUpErrors.email ? 'has-error' : ''}`}
                    {...registerSignUp('email')}
                    disabled={isSubmittingAuth}
                    data-testid="signup-email-input"
                  />
                </div>
                {signUpErrors.email && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="signup-email-error"
                  >
                    <AlertCircle size={12} />
                    {signUpErrors.email.message}
                  </span>
                )}
              </div>

              {/* Assigned Role */}
              <div className="auth-field-group">
                <label className="auth-label" htmlFor="signup-role">
                  Staff Role
                </label>
                <select
                  id="signup-role"
                  className={`auth-select ${signUpErrors.role ? 'has-error' : ''}`}
                  {...registerSignUp('role')}
                  disabled={isSubmittingAuth}
                  data-testid="signup-role-select"
                >
                  <option value="RECEPTIONIST">Receptionist (Front Desk)</option>
                  <option value="DOCTOR">Consulting Doctor</option>
                  <option value="ADMIN">Clinic Administrator</option>
                </select>
                {signUpErrors.role && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="signup-role-error"
                  >
                    <AlertCircle size={12} />
                    {signUpErrors.role.message}
                  </span>
                )}
              </div>

              {/* Security Password */}
              <div className="auth-field-group" style={{ marginBottom: '22px' }}>
                <label className="auth-label" htmlFor="signup-password">
                  Security Password
                </label>
                <div className="auth-input-wrapper">
                  <input
                    id="signup-password"
                    type={showSignUpPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Min 10 characters"
                    className={`auth-input ${signUpErrors.password ? 'has-error' : ''}`}
                    {...registerSignUp('password')}
                    disabled={isSubmittingAuth}
                    data-testid="signup-password-input"
                  />
                  <button
                    type="button"
                    className="auth-toggle-pwd"
                    onClick={() => setShowSignUpPassword((prev) => !prev)}
                    aria-label={showSignUpPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showSignUpPassword}
                    title={showSignUpPassword ? 'Hide password' : 'Show password'}
                    tabIndex={0}
                    data-testid="toggle-signup-password-btn"
                  >
                    {showSignUpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {signUpErrors.password && (
                  <span
                    className="auth-inline-error"
                    role="alert"
                    data-testid="signup-password-error"
                  >
                    <AlertCircle size={12} />
                    {signUpErrors.password.message}
                  </span>
                )}
              </div>

              {/* Sign Up Submit Pill Button */}
              <button
                type="submit"
                className="auth-btn-pill"
                disabled={isSubmittingAuth}
                data-testid="staff-signup-button"
              >
                {isSubmittingAuth ? (
                  <>
                    <span className="auth-spinner" aria-hidden="true" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Sign Up</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* =========================================================
              SLIDING IMAGE / OVERLAY PANEL
              Slides between Left and Right halves on Desktop (650ms).
              Stacks on top on Mobile with fade toggle.
              ========================================================= */}
          <div
            className={`sliding-overlay-panel ${isSignUpMode ? 'position-left' : 'position-right'}`}
            data-testid="sliding-overlay-panel"
          >
            {/*
              Calm Clinic-themed background & dark overlay
              /* PLACE REAL CLINIC IMAGE HERE: e.g. /assets/clinic-hero.jpg or public/clinic-bg.jpg *\/
            */}
            <div className="overlay-background" />
            <div className="overlay-mesh-layer" />

            <div className="overlay-content-wrapper">
              <div className="overlay-brand-icon">
                <img src="/smart-queue-emblem.png" alt="Smart Queue Clinic" />
              </div>

              {!isSignUpMode ? (
                /* Overlay Content when Staff Login is Active */
                <div data-testid="overlay-signup-prompt">
                  <h2 className="overlay-title">New Staff?</h2>
                  <p className="overlay-desc">
                    Create an authorized account to manage clinic tokens, queues, and consultations.
                  </p>
                  <button
                    type="button"
                    className="overlay-ghost-btn"
                    onClick={() => {
                      setServerError('');
                      setSuccessBanner('');
                      setIsSignUpMode(true);
                    }}
                    data-testid="switch-to-signup-btn"
                  >
                    Sign Up
                  </button>
                </div>
              ) : (
                /* Overlay Content when Sign Up Form is Active */
                <div data-testid="overlay-login-prompt">
                  <h2 className="overlay-title">Already Registered?</h2>
                  <p className="overlay-desc">
                    Log in with your existing staff credentials to manage the queue.
                  </p>
                  <button
                    type="button"
                    className="overlay-ghost-btn"
                    onClick={() => {
                      setServerError('');
                      setSuccessBanner('');
                      setIsSignUpMode(false);
                    }}
                    data-testid="switch-to-login-btn"
                  >
                    Staff Login
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginPage;
