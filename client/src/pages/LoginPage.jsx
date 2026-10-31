import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Shield, CheckCircle2, AlertCircle, ArrowRight, LogOut } from 'lucide-react';

export const LoginPage = () => {
  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/staff';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('DemoStaff@2026!');
  };

  if (isAuthenticated && user) {
    return (
      <div className="container" style={{ padding: '60px 16px', maxWidth: '540px' }}>
        <Card style={{ padding: '28px', textAlign: 'center' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: 'var(--success-subtle)',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px auto'
            }}
          >
            <CheckCircle2 size={32} />
          </div>

          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>
            Active Staff Session
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Authenticated as <strong>{user.name}</strong> ({user.role})
          </p>

          <div
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              textAlign: 'left',
              fontSize: '0.8125rem',
              marginBottom: '20px'
            }}
          >
            <div><strong>Email:</strong> {user.email}</div>
            <div style={{ marginTop: '6px' }}><strong>Assigned Role:</strong> {user.role}</div>
            {user.doctorProfile && (
              <div style={{ marginTop: '6px' }}>
                <strong>Linked Doctor:</strong> {user.doctorProfile.name} ({user.doctorProfile.department})
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button
              variant="primary"
              size="md"
              fullWidth
              icon={ArrowRight}
              onClick={() => navigate('/staff')}
            >
              Enter Staff Dashboard
            </Button>
            <Button
              variant="secondary"
              size="md"
              fullWidth
              icon={LogOut}
              onClick={logout}
            >
              Log Out Session
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: '48px 16px', maxWidth: '500px' }}>
      <Card style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'rgba(28, 6, 14, 0.75)',
              border: '1px solid rgba(255, 70, 105, 0.35)',
              boxShadow: '0 0 18px rgba(255, 45, 85, 0.28)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <img
              src="/smart-queue-emblem.png"
              alt="Smart Queue Logo"
              style={{
                width: '38px',
                height: '38px',
                objectFit: 'contain'
              }}
            />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Clinic Staff Portal
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Role-based console for Receptionists, Doctors & Admins
            </p>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--danger-subtle)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger-red)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.8125rem',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '14px' }}>
            <TextField
              label="Staff Email Address"
              type="email"
              placeholder="e.g. reception@glbitm.ac.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <TextField
              label="Staff Password"
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
          >
            Sign In to Staff Console
          </Button>
        </form>

        {/* Quick Demo Autofill for Evaluation */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            Demo Profiles (Academic Evaluation):
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fillDemo('reception@glbitm.ac.in')}
            >
              Reception Demo
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fillDemo('priya.sharma@glbitm.ac.in')}
            >
              Doctor Demo
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => fillDemo('admin@glbitm.ac.in')}
            >
              Admin Demo
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};
