import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import {
  QrCode,
  Camera,
  CameraOff,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowLeft,
  Search,
  ShieldCheck,
  Check
} from 'lucide-react';

export const ScannerPage = () => {
  const { user, role } = useAuth();
  const navigate = useNavigate();

  const [cameraState, setCameraState] = useState('IDLE'); // 'IDLE', 'INITIALIZING', 'ACTIVE', 'DENIED', 'UNAVAILABLE'
  const [errorMessage, setErrorMessage] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkInResult, setCheckInResult] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Initialize Camera for QR Scanning
  const startCamera = async () => {
    setCameraState('INITIALIZING');
    setErrorMessage('');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('UNAVAILABLE');
      setErrorMessage('Camera access is not supported by this browser environment. Please use manual entry.');
      return;
    }

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
      }
      setCameraState('ACTIVE');
    } catch (err) {
      console.warn('[Scanner] Camera error:', err.name, err.message);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('DENIED');
        setErrorMessage('Camera permission was denied. Please allow camera access in browser settings or use manual entry.');
      } else {
        setCameraState('UNAVAILABLE');
        setErrorMessage('No camera device available or camera is in use by another application.');
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('IDLE');
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  // Handle Token Check-in on Backend
  const handleCheckIn = async (scanPayload) => {
    const cleanRef = (scanPayload || manualCode || '').trim();
    if (!cleanRef) return;

    // Parse trackingUuid if a full URL was scanned
    let tokenIdentifier = cleanRef;
    if (cleanRef.includes('/track/')) {
      const parts = cleanRef.split('/track/');
      tokenIdentifier = parts[parts.length - 1].split('?')[0].split('#')[0];
    }

    setSubmitting(true);
    setErrorMessage('');
    setCheckInResult(null);

    try {
      const payload = tokenIdentifier.startsWith('T-')
        ? { tokenNumber: tokenIdentifier }
        : { trackingUuid: tokenIdentifier };

      const res = await apiClient.post('/reception/check-in', payload);
      setCheckInResult(res);
      setManualCode('');
    } catch (err) {
      setErrorMessage(err.message || 'Check-in failed. Please verify the token code or appointment date.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '640px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <Button
          variant="secondary"
          size="sm"
          icon={ArrowLeft}
          onClick={() => navigate('/staff')}
          ariaLabel="Return to Staff Dashboard"
        >
          Staff Dashboard
        </Button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <ShieldCheck size={14} color="var(--cyan-accent)" />
          <span>Staff Reception Terminal</span>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Contactless Patient QR Scanner
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Scan patient's digital QR ticket or enter their token code for arrival check-in.
        </p>
      </div>

      {/* Video Viewport / Camera Card */}
      <Card style={{ padding: '0', overflow: 'hidden', marginBottom: '20px', position: 'relative' }}>
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: '280px',
            backgroundColor: '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {cameraState === 'ACTIVE' && (
            <>
              <video
                ref={videoRef}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                muted
                aria-label="QR Camera Feed"
              />
              {/* Target Scan Reticle Overlay */}
              <div
                style={{
                  position: 'absolute',
                  width: '180px',
                  height: '180px',
                  border: '2px solid var(--cyan-accent)',
                  borderRadius: 'var(--radius-card)',
                  boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                  pointerEvents: 'none'
                }}
              />
            </>
          )}

          {cameraState === 'INITIALIZING' && (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              <Camera size={32} color="var(--cyan-accent)" style={{ animation: 'spin 1s linear infinite' }} />
              <p style={{ marginTop: '8px', fontSize: '0.875rem' }}>Initializing optical sensor...</p>
            </div>
          )}

          {cameraState === 'DENIED' && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <CameraOff size={36} color="var(--danger-red)" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ color: 'var(--danger-red)', fontWeight: 600, fontSize: '0.9375rem' }}>Camera Permission Denied</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '4px', maxWidth: '320px' }}>
                Please allow camera access in your browser or use the manual token fallback below.
              </p>
            </div>
          )}

          {cameraState === 'UNAVAILABLE' && (
            <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
              <AlertTriangle size={36} color="var(--warning-amber)" style={{ margin: '0 auto 8px auto' }} />
              <p style={{ color: 'var(--warning-amber)', fontWeight: 600, fontSize: '0.9375rem' }}>Camera Unavailable</p>
              <p style={{ fontSize: '0.8125rem', marginTop: '4px', maxWidth: '320px' }}>
                No active camera feed detected. Please enter the patient's token code manually.
              </p>
            </div>
          )}
        </div>

        {/* Camera Control Footer */}
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.8125rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: cameraState === 'ACTIVE' ? 'var(--success)' : 'var(--warning-amber)'
              }}
            />
            <span style={{ color: 'var(--text-muted)' }}>
              Sensor Status: <strong style={{ color: 'var(--text-primary)' }}>{cameraState}</strong>
            </span>
          </div>

          {cameraState === 'ACTIVE' ? (
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
            >
              Flip Camera
            </Button>
          ) : (
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={startCamera}>
              Retry Camera
            </Button>
          )}
        </div>
      </Card>

      {/* Check-In Success / Notification Outcome Banner */}
      {checkInResult && (
        <div
          role="status"
          style={{
            padding: '16px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}
        >
          <CheckCircle2 size={24} color="var(--success)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9375rem' }}>
              {checkInResult.alreadyCheckedIn ? 'Patient Already Checked In' : 'Check-In Confirmed'}
            </div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', marginTop: '2px' }}>
              Token <strong>{checkInResult.data?.displayCode || checkInResult.data?.tokenNumber}</strong> marked as verified arrival.
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Verified: {new Date(checkInResult.data?.checkedInAt || Date.now()).toLocaleTimeString()}
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            padding: '14px',
            backgroundColor: 'var(--danger-subtle)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-card)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            color: 'var(--danger-red)',
            fontSize: '0.875rem'
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Manual Token Code Fallback Form */}
      <Card style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
          Manual Token Code Fallback
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleCheckIn(manualCode);
          }}
        >
          <TextField
            label="Token Code or Tracking Reference"
            placeholder="e.g., DOC-001 or 8021e1e4-2980-4d50-..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            helperText="Enter the 3-letter doctor code (DOC-001) or full tracking reference."
            required
          />

          <div style={{ marginTop: '16px' }}>
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth
              loading={submitting}
              icon={Check}
            >
              Confirm Patient Check-In
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default ScannerPage;
