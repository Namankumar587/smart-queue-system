import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { PhoneInput } from '../components/ui/PhoneInput';
import { PriorityBadge, PRIORITY_CONFIG } from '../components/ui/PriorityBadge';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import {
  Ticket,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Stethoscope,
  Building,
  ShieldCheck,
  ArrowRight,
  Info,
  QrCode
} from 'lucide-react';

export const BookPage = () => {
  const navigate = useNavigate();

  // Doctor & Department State
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorFetchError, setDoctorFetchError] = useState(null);

  // Selection Mode: 'DOCTOR' or 'AUTO_DEPARTMENT'
  const [assignmentMode, setAssignmentMode] = useState('DOCTOR');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');

  // Form Fields
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [priority, setPriority] = useState('STANDARD');
  const [consentGiven, setConsentGiven] = useState(true);
  const [notes, setNotes] = useState('');

  // Validation & Submission State
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [errorType, setErrorType] = useState(''); // 'DUPLICATE_409', 'RATE_LIMIT_429', 'VALIDATION_400', 'NETWORK'
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState(null);

  // 1. Fetch public available doctors on load
  const loadDoctors = async () => {
    setLoadingDoctors(true);
    setDoctorFetchError(null);
    try {
      const data = await apiClient.get('/admin/doctors/public');
      const docs = data || [];
      setDoctors(docs);

      // Extract unique active departments
      const depts = Array.from(new Set(docs.map((d) => d.department))).filter(Boolean);
      setDepartments(depts);

      if (docs.length > 0) {
        setSelectedDoctorId(docs[0]._id);
      }
      if (depts.length > 0) {
        setSelectedDepartment(depts[0]);
      }
    } catch (err) {
      setDoctorFetchError(err.message || 'Unable to connect to clinic doctor directory.');
    } finally {
      setLoadingDoctors(false);
    }
  };

  useEffect(() => {
    loadDoctors();
  }, []);

  // 2. Client-side validation for helpfulness (server validation is authoritative)
  const validateForm = () => {
    const errors = {};

    if (!patientName.trim()) {
      errors.patientName = 'Patient full name is required.';
    } else if (patientName.trim().length < 2) {
      errors.patientName = 'Name must be at least 2 characters long.';
    }

    const cleanPhone = patientPhone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
      errors.patientPhone = 'Mobile phone number is required.';
    } else if (cleanPhone.length !== 10) {
      errors.patientPhone = 'Please enter a valid 10-digit mobile number.';
    }

    if (assignmentMode === 'DOCTOR' && !selectedDoctorId) {
      errors.doctorId = 'Please select an available doctor.';
    }

    if (assignmentMode === 'AUTO_DEPARTMENT' && !selectedDepartment) {
      errors.department = 'Please select a clinical department.';
    }

    if (!consentGiven) {
      errors.consent = 'You must acknowledge the clinic queue policy to proceed.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 3. Handle Token Booking Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    setErrorType('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim(),
        priority,
        notes: notes.trim()
      };

      if (assignmentMode === 'DOCTOR') {
        payload.doctorId = selectedDoctorId;
      } else {
        payload.department = selectedDepartment;
      }

      // Authoritative API call to backend contract
      const result = await apiClient.post('/tokens/book', payload);
      if (result?.trackingUuid) {
        navigate(`/confirmation/${result.trackingUuid}`);
      } else {
        setConfirmedBooking(result);
      }
    } catch (err) {
      const msg = err.message || 'Failed to book token. Please try again.';
      setSubmitError(msg);

      if (msg.includes('already holds an active token') || msg.includes('409') || err.statusCode === 409) {
        setErrorType('DUPLICATE_409');
      } else if (msg.includes('Too many') || msg.includes('429') || err.statusCode === 429) {
        setErrorType('RATE_LIMIT_429');
      } else if (msg.includes('unavailable') || msg.includes('closed')) {
        setErrorType('UNAVAILABLE');
      } else {
        setErrorType('GENERAL');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Selected doctor details helper
  const activeDoctor = doctors.find((d) => d._id === selectedDoctorId);

  // 4. Successful Booking State View
  if (confirmedBooking) {
    return (
      <div className="container" style={{ padding: '32px 16px', maxWidth: '580px' }}>
        <Card
          style={{
            textAlign: 'center',
            borderColor: 'rgba(34, 197, 94, 0.4)',
            boxShadow: 'var(--shadow-glow)'
          }}
        >
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

          <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
            Token Confirmed
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Your place in the clinic queue has been deterministically secured.
          </p>

          {/* Ticket Pill Display */}
          <div
            style={{
              background: 'var(--bg-surface-subtle)',
              border: '2px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-card)',
              padding: '20px',
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Your Token Code
            </div>
            <div
              className="tabular-nums"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '2.5rem',
                fontWeight: 800,
                color: 'var(--cyan-accent)',
                letterSpacing: '0.04em',
                margin: '8px 0'
              }}
            >
              {confirmedBooking.displayCode || confirmedBooking.tokenNumber}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <PriorityBadge priority={confirmedBooking.priority || priority} size="sm" />
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  backgroundColor: 'var(--blue-subtle)',
                  color: 'var(--text-primary)',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                <Clock size={12} color="var(--cyan-accent)" />
                <span>Est. Wait: {confirmedBooking.estimatedWaitDisplay || `~${confirmedBooking.estimatedWaitMinutes || 0} mins`}</span>
              </span>
            </div>
          </div>

          {/* Scannable QR Code */}
          {confirmedBooking.qrCode && (
            <div style={{ marginBottom: '24px' }}>
              <div
                style={{
                  display: 'inline-block',
                  padding: '12px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: 'var(--shadow-subtle)'
                }}
              >
                <img
                  src={confirmedBooking.qrCode}
                  alt={`QR code for token ${confirmedBooking.displayCode}`}
                  style={{ width: '140px', height: '140px', display: 'block' }}
                />
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Scan upon clinic arrival for contactless receptionist check-in.
              </p>
            </div>
          )}

          {/* Navigation Action */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              icon={ArrowRight}
              onClick={() => navigate(`/track/${confirmedBooking.trackingUuid}`)}
            >
              Open Live Queue Tracker
            </Button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              SMS notification dispatch is in simulated safe demo mode.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // 5. Booking Form View
  return (
    <div className="container" style={{ padding: '32px 16px', maxWidth: '640px' }}>
      <div style={{ marginBottom: '24px', textAlign: 'center' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--blue-subtle)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            color: 'var(--cyan-accent)',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '10px'
          }}
        >
          <Ticket size={14} />
          <span>Patient Registration &bull; Standard 2-Minute Flow</span>
        </div>
        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Book a Clinic Consultation Token
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Select a doctor or department to obtain an atomic queue number and dynamic wait estimate.
        </p>
      </div>

      {/* Doctor Directory Loading State */}
      {loadingDoctors ? (
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton height="32px" width="60%" />
            <Skeleton height="44px" />
            <Skeleton height="44px" />
            <Skeleton height="80px" />
          </div>
        </Card>
      ) : doctorFetchError ? (
        <ErrorState
          title="Doctor Directory Unavailable"
          message={doctorFetchError}
          onRetry={loadDoctors}
          retryLabel="Reload Clinic Directory"
        />
      ) : doctors.length === 0 ? (
        <ErrorState
          title="Clinic Bookings Closed"
          message="No doctors are currently available for booking today. Please visit during clinic operating hours."
          onRetry={loadDoctors}
          retryLabel="Refresh Status"
        />
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <Card>
            {/* Server Error Alerts */}
            {submitError && (
              <div
                role="alert"
                style={{
                  backgroundColor: errorType === 'DUPLICATE_409' ? 'var(--warning-subtle)' : 'var(--danger-subtle)',
                  border: `1px solid ${errorType === 'DUPLICATE_409' ? 'rgba(245, 158, 11, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
                  color: errorType === 'DUPLICATE_409' ? 'var(--warning-amber)' : 'var(--danger-red)',
                  padding: '14px',
                  borderRadius: 'var(--radius-sm)',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px'
                }}
              >
                <AlertCircle size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div style={{ fontSize: '0.875rem', flex: 1 }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>
                    {errorType === 'DUPLICATE_409'
                      ? 'Duplicate Active Token Detected'
                      : errorType === 'RATE_LIMIT_429'
                      ? 'Rate Limit Exceeded'
                      : 'Booking Unsuccessful'}
                  </div>
                  <div>{submitError}</div>

                  {errorType === 'DUPLICATE_409' && (
                    <div style={{ marginTop: '10px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate('/track/search')}
                      >
                        Search Existing Token
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 1. Doctor / Department Selection Toggle */}
            <div className="form-group">
              <label className="form-label">
                <span>Doctor Assignment Preference <span className="required-dot">*</span></span>
              </label>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  marginBottom: '12px'
                }}
              >
                <button
                  type="button"
                  onClick={() => setAssignmentMode('DOCTOR')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${assignmentMode === 'DOCTOR' ? 'var(--cyan-accent)' : 'var(--border-subtle)'}`,
                    backgroundColor: assignmentMode === 'DOCTOR' ? 'var(--blue-subtle)' : 'var(--bg-surface-subtle)',
                    color: assignmentMode === 'DOCTOR' ? 'var(--cyan-accent)' : 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Stethoscope size={16} />
                  <span>Choose Doctor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssignmentMode('AUTO_DEPARTMENT')}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${assignmentMode === 'AUTO_DEPARTMENT' ? 'var(--cyan-accent)' : 'var(--border-subtle)'}`,
                    backgroundColor: assignmentMode === 'AUTO_DEPARTMENT' ? 'var(--blue-subtle)' : 'var(--bg-surface-subtle)',
                    color: assignmentMode === 'AUTO_DEPARTMENT' ? 'var(--cyan-accent)' : 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  <Building size={16} />
                  <span>Auto-Balance Dept</span>
                </button>
              </div>

              {/* Mode A: Select Specific Doctor */}
              {assignmentMode === 'DOCTOR' && (
                <div>
                  <select
                    id="doctorSelect"
                    value={selectedDoctorId}
                    onChange={(e) => setSelectedDoctorId(e.target.value)}
                    className="input-field"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', cursor: 'pointer' }}
                  >
                    {doctors.map((doc) => (
                      <option key={doc._id} value={doc._id} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        {doc.name} &bull; {doc.department} ({doc.roomNumber || 'Consultation Room'})
                      </option>
                    ))}
                  </select>

                  {activeDoctor && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <span>Room: <strong style={{ color: 'var(--text-primary)' }}>{activeDoctor.roomNumber}</strong></span>
                      <span>Avg Consult: <strong style={{ color: 'var(--cyan-accent)' }}>{activeDoctor.avgConsultMinutes || 10} mins</strong></span>
                    </div>
                  )}
                </div>
              )}

              {/* Mode B: Auto-Assign by Department */}
              {assignmentMode === 'AUTO_DEPARTMENT' && (
                <div>
                  <select
                    id="deptSelect"
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="input-field"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', cursor: 'pointer' }}
                  >
                    {departments.map((dept) => (
                      <option key={dept} value={dept} style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                        {dept} Department (Auto-routes to shortest wait)
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--cyan-accent)', marginTop: '6px' }}>
                    &bull; The server automatically assigns the available doctor with the shortest estimated queue wait.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Patient Full Name */}
            <TextField
              label="Patient Full Name"
              placeholder="e.g., Rajesh Kumar"
              value={patientName}
              onChange={(e) => {
                setPatientName(e.target.value);
                if (fieldErrors.patientName) setFieldErrors({ ...fieldErrors, patientName: '' });
              }}
              required
              error={fieldErrors.patientName}
              helperText="Enter the legal name of the patient seeking consultation."
            />

            {/* 3. Patient Phone Input */}
            <PhoneInput
              label="Contact Mobile Phone"
              value={patientPhone}
              onChange={(val) => {
                setPatientPhone(val);
                if (fieldErrors.patientPhone) setFieldErrors({ ...fieldErrors, patientPhone: '' });
              }}
              required
              error={fieldErrors.patientPhone}
            />

            {/* 4. Optional Self-Declared Priority Category */}
            <div className="form-group" style={{ marginTop: '18px' }}>
              <label className="form-label">
                <span>Self-Declared Operational Priority (Optional)</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                {Object.keys(PRIORITY_CONFIG).map((pKey) => {
                  const pConfig = PRIORITY_CONFIG[pKey];
                  const Icon = pConfig.icon;
                  const isSelected = priority === pKey;

                  return (
                    <label
                      key={pKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1px solid ${isSelected ? pConfig.border : 'var(--border-subtle)'}`,
                        backgroundColor: isSelected ? pConfig.bg : 'var(--bg-surface-subtle)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <input
                          type="radio"
                          name="priorityRadio"
                          value={pKey}
                          checked={isSelected}
                          onChange={() => setPriority(pKey)}
                          style={{ accentColor: pConfig.color, cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Icon size={14} color={pConfig.color} />
                            <strong style={{ fontSize: '0.875rem', color: isSelected ? pConfig.color : 'var(--text-primary)' }}>
                              {pConfig.label}
                            </strong>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {pConfig.description}
                          </div>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>

              {/* Mandatory Clarification Notice */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '10px 12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  fontSize: '0.75rem',
                  color: 'var(--warning-amber)'
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Notice:</strong> Self-declared priority categories are operational requests and remain unverified until physical review by clinic reception staff. Life-threatening emergencies are evaluated in-person immediately.
                </span>
              </div>
            </div>

            {/* 5. Brief Symptoms / Reason for Visit (Optional) */}
            <div className="form-group">
              <label htmlFor="notes" className="form-label">
                <span>Reason for Consultation (Optional)</span>
              </label>
              <input
                id="notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Routine blood pressure follow-up, viral cough"
                className="input-field"
                maxLength={100}
              />
            </div>

            {/* 6. Consent & Privacy Disclosure */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px',
                backgroundColor: 'var(--bg-surface-subtle)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  color: 'var(--text-muted)'
                }}
              >
                <input
                  type="checkbox"
                  checked={consentGiven}
                  onChange={(e) => {
                    setConsentGiven(e.target.checked);
                    if (fieldErrors.consent) setFieldErrors({ ...fieldErrors, consent: '' });
                  }}
                  style={{ marginTop: '3px', accentColor: 'var(--cyan-accent)', cursor: 'pointer' }}
                />
                <span>
                  I consent to receive queue updates on this phone number. I understand wait times are dynamic non-binding estimates.
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                    <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px' }} />
                    Zero-PII Guarantee: Patient identity is never broadcast publicly.
                  </span>
                </span>
              </label>
              {fieldErrors.consent && (
                <div style={{ color: 'var(--danger-red)', fontSize: '0.75rem', marginTop: '6px' }}>
                  {fieldErrors.consent}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div style={{ marginTop: '24px' }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={submitting}
                disabled={submitting}
                icon={Ticket}
              >
                Confirm &amp; Generate Token
              </Button>
            </div>
          </Card>
        </form>
      )}
    </div>
  );
};
