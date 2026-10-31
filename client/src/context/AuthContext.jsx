import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored =
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('glb_queue_user') : null) ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('glb_queue_user') : null);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    try {
      return (
        (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('glb_queue_token') : null) ||
        (typeof localStorage !== 'undefined' ? localStorage.getItem('glb_queue_token') : null) ||
        null
      );
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  const setAuthSession = (authToken, authUser) => {
    setToken(authToken);
    setUser(authUser);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('glb_queue_token', authToken);
        sessionStorage.setItem('glb_queue_user', JSON.stringify(authUser));
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('glb_queue_token', authToken);
        localStorage.setItem('glb_queue_user', JSON.stringify(authUser));
      }
    } catch {
      // Storage unavailable in private browsing mode fallback
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const data = await apiClient.post('/auth/login', { email, password });
      setAuthSession(data.token, data.user);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('glb_queue_token');
        sessionStorage.removeItem('glb_queue_user');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('glb_queue_token');
        localStorage.removeItem('glb_queue_user');
      }
    } catch {
      // Ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        loading,
        login,
        setAuthSession,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    // Redirect to login page preserving attempted location
    return (
      <div className="container" style={{ padding: '60px 16px', maxWidth: '480px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Staff Authentication Required
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Please log in with authorized clinic credentials to access queue management controls.
        </p>
        <button
          className="btn btn-primary"
          style={{ width: '100%' }}
          onClick={() => navigate('/login', { state: { from: location } })}
        >
          Go to Staff Login
        </button>
      </div>
    );
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="container" style={{ padding: '60px 16px', maxWidth: '480px', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger-red)', marginBottom: '8px' }}>
          Access Restricted (403)
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Your current account role (<strong>{role}</strong>) does not have privileges for this console.
        </p>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/')}
        >
          Return to Home
        </button>
      </div>
    );
  }

  return children;
};
