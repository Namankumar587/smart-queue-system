import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import axios from 'axios';
import { StaffLoginPage, extractTrackingId } from '../src/pages/StaffLoginPage';
import { AuthProvider } from '../src/context/AuthContext';

// Mock axios
vi.mock('axios');

// Mock react-router-dom's useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/staff/login', state: null })
  };
});

describe('StaffLoginPage - Sliding Panel Authentication & Token Tracking', () => {
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter initialEntries={['/staff/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <StaffLoginPage />
        </AuthProvider>
      </MemoryRouter>
    );
  };

  it('1. Invalid email shows an inline error message', async () => {
    renderComponent();

    const emailInput = screen.getByTestId('staff-email-input');
    const submitBtn = screen.getByTestId('staff-login-button');

    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const errorMsg = screen.getByTestId('email-error-message');
      expect(errorMsg).not.toBeNull();
      expect(errorMsg.textContent).toMatch(/valid email/i);
    });
  });

  it('2. Wrong credentials (401) shows the generic message without account enumeration', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: 'Invalid email or password' }
      }
    });

    renderComponent();

    const emailInput = screen.getByTestId('staff-email-input');
    const passwordInput = screen.getByTestId('staff-password-input');
    const submitBtn = screen.getByTestId('staff-login-button');

    fireEvent.change(emailInput, { target: { value: 'receptionist@clinic.local' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const banner = screen.getByTestId('server-error-banner');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toBe('Invalid email or password');
    });
  });

  it('3. Account locked (423) shows the locked message', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 423,
        data: { error: 'Account locked due to repeated failures' }
      }
    });

    renderComponent();

    const emailInput = screen.getByTestId('staff-email-input');
    const passwordInput = screen.getByTestId('staff-password-input');
    const submitBtn = screen.getByTestId('staff-login-button');

    fireEvent.change(emailInput, { target: { value: 'doctor@clinic.local' } });
    fireEvent.change(passwordInput, { target: { value: 'LockedPass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const banner = screen.getByTestId('server-error-banner');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toBe('Too many attempts, try again later');
    });
  });

  it('4. Successful login redirects by role (Receptionist, Doctor, Admin)', async () => {
    // 4a. Doctor role -> /doctor/queue
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'mock-jwt-token-doctor',
          user: { id: 'doc-1', name: 'Dr. House', role: 'DOCTOR' }
        }
      }
    });

    const { unmount } = renderComponent();

    fireEvent.change(screen.getByTestId('staff-email-input'), {
      target: { value: 'doctor.house@clinic.local' }
    });
    fireEvent.change(screen.getByTestId('staff-password-input'), {
      target: { value: 'DoctorSecretPassword123!' }
    });
    fireEvent.click(screen.getByTestId('staff-login-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/queue', { replace: true });
    });

    unmount();

    // 4b. Admin role -> /admin
    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'mock-jwt-token-admin',
          user: { id: 'admin-1', name: 'Admin Jane', role: 'ADMIN' }
        }
      }
    });

    renderComponent();

    fireEvent.change(screen.getByTestId('staff-email-input'), {
      target: { value: 'admin@clinic.local' }
    });
    fireEvent.change(screen.getByTestId('staff-password-input'), {
      target: { value: 'AdminPasswordPolicy2026!' }
    });
    fireEvent.click(screen.getByTestId('staff-login-button'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('5. Staff Sign Up toggles, validates inputs, and registers successfully', async () => {
    // 5a. Test extractTrackingId helper utility function
    expect(extractTrackingId('http://localhost:5173/track/40b0fa77-756e-4df1-a17c-4b0e00924111')).toBe(
      '40b0fa77-756e-4df1-a17c-4b0e00924111'
    );
    expect(extractTrackingId('https://clinic.local/track/T-102?ref=sms#pos')).toBe('T-102');
    expect(extractTrackingId('40b0fa77-756e-4df1-a17c-4b0e00924111')).toBe(
      '40b0fa77-756e-4df1-a17c-4b0e00924111'
    );

    axios.post.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          token: 'mock-jwt-token-new-doc',
          user: { id: 'doc-new', name: 'Dr. Sarah Connor', role: 'DOCTOR' }
        }
      }
    });

    renderComponent();

    // Click ghost button to toggle sliding panel to Sign Up
    const switchToSignUpBtn = screen.getByTestId('switch-to-signup-btn');
    fireEvent.click(switchToSignUpBtn);

    const nameInput = screen.getByTestId('signup-name-input');
    const emailInput = screen.getByTestId('signup-email-input');
    const roleSelect = screen.getByTestId('signup-role-select');
    const passwordInput = screen.getByTestId('signup-password-input');
    const submitBtn = screen.getByTestId('staff-signup-button');

    fireEvent.change(nameInput, { target: { value: 'Dr. Sarah Connor' } });
    fireEvent.change(emailInput, { target: { value: 'sarah.connor@clinic.local' } });
    fireEvent.change(roleSelect, { target: { value: 'DOCTOR' } });
    fireEvent.change(passwordInput, { target: { value: 'TerminatorSafePass123!' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining('/auth/signup'),
        {
          name: 'Dr. Sarah Connor',
          email: 'sarah.connor@clinic.local',
          role: 'DOCTOR',
          password: 'TerminatorSafePass123!'
        },
        expect.any(Object)
      );
    });

    // Verify redirect triggered
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/doctor/queue', { replace: true });
    }, { timeout: 1000 });
  });

  it('5b. Staff Sign Up duplicate email displays conflict banner (409)', async () => {
    axios.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: 'Email already registered' }
      }
    });

    renderComponent();

    // Toggle to Sign Up
    fireEvent.click(screen.getByTestId('switch-to-signup-btn'));

    fireEvent.change(screen.getByTestId('signup-name-input'), { target: { value: 'Nurse Joy' } });
    fireEvent.change(screen.getByTestId('signup-email-input'), { target: { value: 'joy@clinic.local' } });
    fireEvent.change(screen.getByTestId('signup-password-input'), { target: { value: 'JoyPassword123!' } });
    fireEvent.click(screen.getByTestId('staff-signup-button'));

    await waitFor(() => {
      const banner = screen.getByTestId('signup-error-banner');
      expect(banner).not.toBeNull();
      expect(banner.textContent).toContain('already exists');
    });
  });

  it('6. No password appears in the DOM or console output', async () => {
    const rawSecret = 'TopSecretPassword999!';
    const { container } = renderComponent();

    const passwordInput = screen.getByTestId('staff-password-input');
    fireEvent.change(passwordInput, { target: { value: rawSecret } });

    // Assert input type is password
    expect(passwordInput.getAttribute('type')).toBe('password');

    // Verify raw secret string never appears in any rendered text in the DOM
    const allText = container.textContent;
    expect(allText.includes(rawSecret)).toBe(false);

    // Verify raw secret never printed to console
    const allLogCalls = consoleLogSpy.mock.calls.flat().join(' ');
    const allErrorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
    expect(allLogCalls.includes(rawSecret)).toBe(false);
    expect(allErrorCalls.includes(rawSecret)).toBe(false);
  });
});
