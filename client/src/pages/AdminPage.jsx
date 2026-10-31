import React, { useState, useEffect } from 'react';
import { useAuth, ProtectedRoute } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import {
  ShieldAlert,
  BarChart3,
  Stethoscope,
  Users,
  Settings,
  FileText,
  PlusCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Key,
  Lock,
  Unlock,
  Building,
  Clock,
  Calendar,
  AlertTriangle,
  UserPlus
} from 'lucide-react';

export const AdminPage = () => {
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState('analytics');

  // 1. Analytics State
  const [analytics, setAnalytics] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // 2. Doctors State
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorModalOpen, setDoctorModalOpen] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: '',
    department: 'General Medicine',
    roomNumber: 'Room 101',
    avgConsultMinutes: 10
  });
  const [doctorSubmitting, setDoctorSubmitting] = useState(false);

  // 3. Staff Users State
  const [staffList, setStaffList] = useState([]);
  const [staffLoading, setStaffLoading] = useState(true);
  const [staffModalOpen, setStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: '',
    email: '',
    password: '',
    role: 'RECEPTIONIST',
    doctorProfileId: ''
  });
  const [staffSubmitting, setStaffSubmitting] = useState(false);

  // Staff Password Reset Modal State
  const [resetModal, setResetModal] = useState({
    isOpen: false,
    userId: null,
    userEmail: '',
    newPassword: '',
    loading: false
  });

  // 4. Clinic Settings State
  const [clinicSettings, setClinicSettings] = useState({
    name: '',
    code: '',
    address: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    defaultConsultationMinutes: 10,
    operatingHours: { open: '08:30', close: '17:30' },
    isActive: true
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // 5. Audit Logs State
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [auditFilter, setAuditFilter] = useState('');
  const [auditLoading, setAuditLoading] = useState(true);

  // Error States
  const [globalError, setGlobalError] = useState(null);

  // API Fetchers
  const fetchAnalytics = async () => {
    setAnalyticsLoading(true);
    try {
      const data = await apiClient.get('/admin/analytics');
      setAnalytics(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const fetchDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const data = await apiClient.get('/admin/doctors');
      setDoctors(data);
    } catch (err) {
      console.error('Failed to fetch doctors:', err);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const fetchStaff = async () => {
    setStaffLoading(true);
    try {
      const data = await apiClient.get('/admin/staff');
      setStaffList(data);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    } finally {
      setStaffLoading(false);
    }
  };

  const fetchSettings = async () => {
    setSettingsLoading(true);
    try {
      const data = await apiClient.get('/admin/settings');
      setClinicSettings(data);
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setSettingsLoading(false);
    }
  };

  const fetchAuditLogs = async (page = 1, targetType = '') => {
    setAuditLoading(true);
    try {
      const query = new URLSearchParams({ page: String(page), limit: '15' });
      if (targetType) query.append('targetType', targetType);
      const data = await apiClient.get(`/admin/audit-logs?${query.toString()}`);
      setAuditLogs(data.logs || []);
      setAuditPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  // Initial Data Load
  useEffect(() => {
    fetchAnalytics();
    fetchDoctors();
    fetchStaff();
    fetchSettings();
    fetchAuditLogs(1, auditFilter);
  }, []);

  // Action: Toggle Doctor Availability
  const handleToggleDoctorAvailability = async (doctorId, currentStatus) => {
    try {
      await apiClient.patch(`/admin/doctors/${doctorId}`, { isAvailable: !currentStatus });
      await fetchDoctors();
      await fetchAnalytics();
    } catch (err) {
      alert(`Failed to update doctor: ${err.message}`);
    }
  };

  // Action: Create New Doctor
  const handleCreateDoctorSubmit = async (e) => {
    e.preventDefault();
    setDoctorSubmitting(true);
    try {
      await apiClient.post('/admin/doctors', newDoctor);
      setDoctorModalOpen(false);
      setNewDoctor({
        name: '',
        department: 'General Medicine',
        roomNumber: 'Room 101',
        avgConsultMinutes: 10
      });
      await fetchDoctors();
      await fetchAnalytics();
    } catch (err) {
      alert(`Failed to create doctor: ${err.message}`);
    } finally {
      setDoctorSubmitting(false);
    }
  };

  // Action: Toggle Staff Account Active Status
  const handleToggleStaffStatus = async (userId, currentStatus) => {
    try {
      await apiClient.patch(`/admin/staff/${userId}/status`, { isActive: !currentStatus });
      await fetchStaff();
      await fetchAuditLogs(1, auditFilter);
    } catch (err) {
      alert(`Failed to change staff status: ${err.message}`);
    }
  };

  // Action: Create New Staff User
  const handleCreateStaffSubmit = async (e) => {
    e.preventDefault();
    setStaffSubmitting(true);
    try {
      await apiClient.post('/admin/staff', newStaff);
      setStaffModalOpen(false);
      setNewStaff({
        name: '',
        email: '',
        password: '',
        role: 'RECEPTIONIST',
        doctorProfileId: ''
      });
      await fetchStaff();
      await fetchAuditLogs(1, auditFilter);
    } catch (err) {
      alert(`Failed to create staff: ${err.message}`);
    } finally {
      setStaffSubmitting(false);
    }
  };

  // Action: Reset Staff Password
  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetModal.newPassword || resetModal.newPassword.length < 6) {
      alert('Password must be at least 6 characters long');
      return;
    }
    setResetModal((prev) => ({ ...prev, loading: true }));
    try {
      await apiClient.patch(`/admin/staff/${resetModal.userId}/reset-password`, {
        newPassword: resetModal.newPassword
      });
      alert(`Password successfully updated for ${resetModal.userEmail}`);
      setResetModal({ isOpen: false, userId: null, userEmail: '', newPassword: '', loading: false });
      await fetchAuditLogs(1, auditFilter);
    } catch (err) {
      alert(`Failed to reset password: ${err.message}`);
      setResetModal((prev) => ({ ...prev, loading: false }));
    }
  };

  // Action: Save Clinic Settings
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSuccess(false);
    try {
      const updated = await apiClient.patch('/admin/settings', clinicSettings);
      setClinicSettings(updated);
      setSettingsSuccess(true);
      setTimeout(() => setSettingsSuccess(false), 3000);
      await fetchAuditLogs(1, auditFilter);
    } catch (err) {
      alert(`Failed to save clinic settings: ${err.message}`);
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="container" style={{ padding: '24px 16px', maxWidth: '1100px' }}>
        {/* Admin Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--danger-red)',
                  display: 'flex'
                }}
              >
                <ShieldAlert size={20} />
              </div>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Clinic Administration &amp; Governance
              </h1>
            </div>
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Logged in as <strong style={{ color: 'var(--text-primary)' }}>{user?.name}</strong> ({role}) &bull;{' '}
              Clinic Security Boundary: <em>Server-Side RBAC Enforced</em>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            icon={RefreshCw}
            onClick={() => {
              fetchAnalytics();
              fetchDoctors();
              fetchStaff();
              fetchSettings();
              fetchAuditLogs(auditPagination.page, auditFilter);
            }}
          >
            Refresh All
          </Button>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '6px',
            borderBottom: '1px solid var(--border-subtle)',
            marginBottom: '24px',
            overflowX: 'auto',
            paddingBottom: '2px'
          }}
        >
          {[
            { id: 'analytics', label: 'Live Analytics', icon: BarChart3 },
            { id: 'doctors', label: 'Doctor Management', icon: Stethoscope },
            { id: 'staff', label: 'Staff Accounts', icon: Users },
            { id: 'settings', label: 'Clinic Settings & Hours', icon: Settings },
            { id: 'audit', label: 'Audit Log Viewer', icon: FileText }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  border: 'none',
                  borderBottom: `2px solid ${isSelected ? 'var(--cyan-accent)' : 'transparent'}`,
                  backgroundColor: isSelected ? 'var(--bg-surface-elevated)' : 'transparent',
                  color: isSelected ? 'var(--cyan-accent)' : 'var(--text-muted)',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: '0.875rem',
                  borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: Live Analytics & Real Queue Aggregations */}
        {activeTab === 'analytics' && (
          <div>
            {analyticsLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <Skeleton height="100px" />
                <Skeleton height="200px" />
              </div>
            ) : analytics ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Metric Summary Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '12px'
                  }}
                >
                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL VISITS TODAY</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                      {analytics.metrics?.totalToday || 0}
                    </div>
                  </Card>

                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>COMPLETED TODAY</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--success)', marginTop: '4px' }}>
                      {analytics.metrics?.completedToday || 0}
                    </div>
                  </Card>

                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>CURRENTLY WAITING</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-accent)', marginTop: '4px' }}>
                      {analytics.metrics?.waitingCurrent || 0}
                    </div>
                  </Card>

                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>COMPLETION RATE</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--blue-primary)', marginTop: '4px' }}>
                      {analytics.metrics?.completionRate || 0}%
                    </div>
                  </Card>

                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>AVG CONSULT DURATION</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning-amber)', marginTop: '4px' }}>
                      ~{analytics.metrics?.avgConsultDurationMinutes || 10}m
                    </div>
                  </Card>

                  <Card style={{ padding: '16px', backgroundColor: 'var(--bg-surface)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>AVG WAIT TIME</div>
                    <div className="tabular-nums" style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--cyan-accent)', marginTop: '4px' }}>
                      ~{analytics.metrics?.avgWaitDurationMinutes || 0}m
                    </div>
                  </Card>
                </div>

                {/* Real Department Breakdown (Native Accessible Bar Visual) */}
                <Card style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    Department Volume &amp; Completion Breakdown:
                  </div>

                  {analytics.departments?.length === 0 ? (
                    <div style={{ color: 'var(--text-dim)', fontSize: '0.875rem' }}>No token activity recorded today.</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {analytics.departments?.map((dept) => {
                        const total = analytics.metrics?.totalToday || 1;
                        const pct = Math.round((dept.total / total) * 100);
                        return (
                          <div key={dept.department}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dept.department}</span>
                              <span className="tabular-nums" style={{ color: 'var(--text-muted)' }}>
                                {dept.total} visits ({dept.completed} completed) &bull; {pct}%
                              </span>
                            </div>
                            <div
                              style={{
                                width: '100%',
                                height: '8px',
                                backgroundColor: 'var(--bg-surface-elevated)',
                                borderRadius: 'var(--radius-pill)',
                                overflow: 'hidden'
                              }}
                            >
                              <div
                                style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  backgroundColor: 'var(--cyan-accent)',
                                  borderRadius: 'var(--radius-pill)',
                                  transition: 'width 0.4s ease'
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                {/* Doctor Performance & Real Queue Depth */}
                <Card style={{ padding: '20px', backgroundColor: 'var(--bg-surface)' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
                    Doctor Workload &amp; Live Queue Depth:
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border-subtle)', textAlign: 'left', color: 'var(--text-dim)' }}>
                          <th style={{ padding: '8px 12px' }}>Doctor</th>
                          <th style={{ padding: '8px 12px' }}>Department</th>
                          <th style={{ padding: '8px 12px' }}>Room</th>
                          <th style={{ padding: '8px 12px' }}>Status</th>
                          <th style={{ padding: '8px 12px' }}>Waiting</th>
                          <th style={{ padding: '8px 12px' }}>Completed</th>
                          <th style={{ padding: '8px 12px' }}>Avg Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {analytics.doctors?.map((doc) => (
                          <tr key={doc.doctorId} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {doc.name} ({doc.doctorCode})
                            </td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{doc.department}</td>
                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>{doc.roomNumber}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-pill)',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  backgroundColor: doc.isAvailable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                                  color: doc.isAvailable ? 'var(--success)' : 'var(--danger-red)'
                                }}
                              >
                                {doc.isAvailable ? 'Available' : 'Unavailable'}
                              </span>
                            </td>
                            <td className="tabular-nums" style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--cyan-accent)' }}>
                              {doc.waitingCurrent}
                            </td>
                            <td className="tabular-nums" style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--success)' }}>
                              {doc.completedToday}
                            </td>
                            <td className="tabular-nums" style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                              {doc.avgConsultMinutes} min
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            ) : (
              <EmptyState title="No Analytics Available" message="Unable to load analytics data from backend." />
            )}
          </div>
        )}

        {/* TAB 2: Doctors Management (CRUD & Deactivation) */}
        {activeTab === 'doctors' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Configure specialist schedules, counter rooms, and online booking availability.
              </div>
              <Button
                variant="primary"
                size="md"
                icon={PlusCircle}
                onClick={() => setDoctorModalOpen(true)}
              >
                Add New Doctor
              </Button>
            </div>

            {doctorsLoading ? (
              <Skeleton height="140px" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {doctors.map((doc) => (
                  <Card
                    key={doc._id}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {doc.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--cyan-accent)', backgroundColor: 'var(--blue-subtle)', padding: '2px 8px', borderRadius: 'var(--radius-pill)' }}>
                          {doc.doctorCode}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: doc.isAvailable ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: doc.isAvailable ? 'var(--success)' : 'var(--danger-red)'
                          }}
                        >
                          {doc.isAvailable ? 'Active & Booking Open' : 'Deactivated / Off-duty'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Department: <strong>{doc.department}</strong> &bull; Location: <strong>{doc.roomNumber}</strong> &bull; Benchmark Duration:{' '}
                        <strong>{doc.avgConsultMinutes} min</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        variant={doc.isAvailable ? 'danger' : 'secondary'}
                        size="sm"
                        onClick={() => handleToggleDoctorAvailability(doc._id, doc.isAvailable)}
                      >
                        {doc.isAvailable ? 'Deactivate Doctor' : 'Activate Doctor'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Staff Accounts Management */}
        {activeTab === 'staff' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Manage staff credentials, disable compromised logins, and reset passwords securely.
              </div>
              <Button
                variant="primary"
                size="md"
                icon={UserPlus}
                onClick={() => setStaffModalOpen(true)}
              >
                Provision Staff Account
              </Button>
            </div>

            {staffLoading ? (
              <Skeleton height="140px" />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {staffList.map((member) => (
                  <Card
                    key={member._id}
                    style={{
                      padding: '16px 20px',
                      backgroundColor: 'var(--bg-surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {member.name}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor:
                              member.role === 'ADMIN'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : member.role === 'DOCTOR'
                                ? 'var(--blue-subtle)'
                                : 'var(--bg-surface-elevated)',
                            color:
                              member.role === 'ADMIN'
                                ? 'var(--danger-red)'
                                : member.role === 'DOCTOR'
                                ? 'var(--cyan-accent)'
                                : 'var(--text-secondary)'
                          }}
                        >
                          {member.role}
                        </span>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: 'var(--radius-pill)',
                            backgroundColor: member.isActive ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: member.isActive ? 'var(--success)' : 'var(--danger-red)'
                          }}
                        >
                          {member.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Email: <strong>{member.email}</strong>
                        {member.doctorProfileId && (
                          <span style={{ marginLeft: '8px' }}>
                            &bull; Linked Doctor: <strong>{member.doctorProfileId.name} ({member.doctorProfileId.doctorCode})</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        icon={Key}
                        onClick={() =>
                          setResetModal({
                            isOpen: true,
                            userId: member._id,
                            userEmail: member.email,
                            newPassword: '',
                            loading: false
                          })
                        }
                      >
                        Reset Password
                      </Button>

                      {member._id !== user?.id && (
                        <Button
                          variant={member.isActive ? 'danger' : 'secondary'}
                          size="sm"
                          icon={member.isActive ? Lock : Unlock}
                          onClick={() => handleToggleStaffStatus(member._id, member.isActive)}
                        >
                          {member.isActive ? 'Disable Account' : 'Enable Account'}
                        </Button>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Clinic Settings & Operating Hours */}
        {activeTab === 'settings' && (
          <div>
            <Card style={{ padding: '24px', backgroundColor: 'var(--bg-surface)', maxWidth: '700px' }}>
              <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  Operating Policies &amp; Benchmark Parameters
                </div>

                {settingsSuccess && (
                  <div
                    style={{
                      padding: '10px 14px',
                      backgroundColor: 'rgba(34, 197, 94, 0.15)',
                      border: '1px solid var(--success)',
                      color: 'var(--success)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    Clinic settings successfully updated and logged to audit trail.
                  </div>
                )}

                <TextField
                  label="Clinic Facility Name"
                  value={clinicSettings.name}
                  onChange={(e) => setClinicSettings({ ...clinicSettings, name: e.target.value })}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <TextField
                    label="Clinic Identifier Code"
                    value={clinicSettings.code}
                    disabled
                    helperText="Fixed system identifier"
                  />
                  <TextField
                    label="Timezone"
                    value={clinicSettings.timezone}
                    onChange={(e) => setClinicSettings({ ...clinicSettings, timezone: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <TextField
                    label="Daily Opening Time (24h)"
                    type="time"
                    value={clinicSettings.operatingHours?.open || '08:30'}
                    onChange={(e) =>
                      setClinicSettings({
                        ...clinicSettings,
                        operatingHours: { ...clinicSettings.operatingHours, open: e.target.value }
                      })
                    }
                    required
                  />
                  <TextField
                    label="Daily Closing Time (24h)"
                    type="time"
                    value={clinicSettings.operatingHours?.close || '17:30'}
                    onChange={(e) =>
                      setClinicSettings({
                        ...clinicSettings,
                        operatingHours: { ...clinicSettings.operatingHours, close: e.target.value }
                      })
                    }
                    required
                  />
                </div>

                <TextField
                  label="Default Consultation Benchmark (Minutes)"
                  type="number"
                  min="2"
                  max="60"
                  value={clinicSettings.defaultConsultationMinutes}
                  onChange={(e) =>
                    setClinicSettings({
                      ...clinicSettings,
                      defaultConsultationMinutes: parseInt(e.target.value, 10) || 10
                    })
                  }
                  helperText="Fallback duration when doctor consultation history has fewer than 3 samples."
                  required
                />

                <TextField
                  label="Contact Phone"
                  value={clinicSettings.phone || ''}
                  onChange={(e) => setClinicSettings({ ...clinicSettings, phone: e.target.value })}
                />

                <TextField
                  label="Facility Address"
                  value={clinicSettings.address || ''}
                  onChange={(e) => setClinicSettings({ ...clinicSettings, address: e.target.value })}
                />

                <div style={{ marginTop: '8px' }}>
                  <Button variant="primary" size="md" type="submit" loading={settingsSaving}>
                    Save Clinic Configuration
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* TAB 5: Audit Log Viewer */}
        {activeTab === 'audit' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Immutable audit trail of staff actions, state transitions, and credential modifications.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <select
                  value={auditFilter}
                  onChange={(e) => {
                    setAuditFilter(e.target.value);
                    fetchAuditLogs(1, e.target.value);
                  }}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem'
                  }}
                >
                  <option value="">All Target Types</option>
                  <option value="TOKEN">TOKEN Actions</option>
                  <option value="USER">USER Credential Actions</option>
                  <option value="CLINIC">CLINIC Policy Actions</option>
                  <option value="DOCTOR">DOCTOR Profile Actions</option>
                </select>
              </div>
            </div>

            {auditLoading ? (
              <Skeleton height="160px" />
            ) : auditLogs.length === 0 ? (
              <EmptyState title="No Audit Records Found" message="No audit logs match the current query." />
            ) : (
              <Card style={{ padding: '0', backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface-elevated)', textAlign: 'left', color: 'var(--text-dim)' }}>
                        <th style={{ padding: '10px 14px' }}>Timestamp</th>
                        <th style={{ padding: '10px 14px' }}>Action</th>
                        <th style={{ padding: '10px 14px' }}>Performed By</th>
                        <th style={{ padding: '10px 14px' }}>Target Type</th>
                        <th style={{ padding: '10px 14px' }}>Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLogs.map((log) => (
                        <tr key={log._id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td className="tabular-nums" style={{ padding: '10px 14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--cyan-accent)' }}>
                            {log.action}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {log.performedBy?.name || 'System Auto'}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                              {log.performedByRole}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>
                            <span style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '2px 6px', borderRadius: '4px', fontSize: '0.6875rem', fontWeight: 600 }}>
                              {log.targetType}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted)', maxWidth: '300px' }}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {JSON.stringify(log.details || {})}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    backgroundColor: 'var(--bg-surface-elevated)'
                  }}
                >
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                    Showing page {auditPagination.page} of {auditPagination.totalPages || 1} ({auditPagination.total} total logs)
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPagination.page <= 1}
                      onClick={() => fetchAuditLogs(auditPagination.page - 1, auditFilter)}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={auditPagination.page >= auditPagination.totalPages}
                      onClick={() => fetchAuditLogs(auditPagination.page + 1, auditFilter)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* Modal: Add Doctor */}
        <Modal
          isOpen={doctorModalOpen}
          onClose={() => setDoctorModalOpen(false)}
          title="Add New Doctor Specialist"
        >
          <form onSubmit={handleCreateDoctorSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <TextField
              label="Doctor Full Name"
              placeholder="e.g. Dr. Priya Sharma"
              value={newDoctor.name}
              onChange={(e) => setNewDoctor({ ...newDoctor, name: e.target.value })}
              required
            />
            <TextField
              label="Specialist Department"
              placeholder="e.g. Pediatrics"
              value={newDoctor.department}
              onChange={(e) => setNewDoctor({ ...newDoctor, department: e.target.value })}
              required
            />
            <TextField
              label="Assigned Room / Counter"
              placeholder="e.g. Room 102"
              value={newDoctor.roomNumber}
              onChange={(e) => setNewDoctor({ ...newDoctor, roomNumber: e.target.value })}
              required
            />
            <TextField
              label="Avg Consultation Duration (Minutes)"
              type="number"
              min="2"
              max="60"
              value={newDoctor.avgConsultMinutes}
              onChange={(e) => setNewDoctor({ ...newDoctor, avgConsultMinutes: parseInt(e.target.value, 10) || 10 })}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="ghost" size="md" type="button" onClick={() => setDoctorModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={doctorSubmitting}>
                Save Doctor Profile
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Provision Staff User */}
        <Modal
          isOpen={staffModalOpen}
          onClose={() => setStaffModalOpen(false)}
          title="Provision Staff Member Account"
        >
          <form onSubmit={handleCreateStaffSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <TextField
              label="Staff Member Full Name"
              placeholder="e.g. John Doe"
              value={newStaff.name}
              onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
              required
            />
            <TextField
              label="Work Email Address"
              type="email"
              placeholder="e.g. staff@glbitm.ac.in"
              value={newStaff.email}
              onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
              required
            />
            <TextField
              label="Temporary Password"
              type="password"
              placeholder="At least 6 characters"
              value={newStaff.password}
              onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
              required
            />
            <div>
              <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Staff Role
              </label>
              <select
                value={newStaff.role}
                onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem'
                }}
              >
                <option value="RECEPTIONIST">RECEPTIONIST (Front-Desk / Triage)</option>
                <option value="DOCTOR">DOCTOR (Consultation Console)</option>
                <option value="ADMIN">ADMIN (Full Governance)</option>
              </select>
            </div>

            {newStaff.role === 'DOCTOR' && (
              <div>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Link to Doctor Profile
                </label>
                <select
                  value={newStaff.doctorProfileId}
                  onChange={(e) => setNewStaff({ ...newStaff, doctorProfileId: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="">Select Doctor Profile...</option>
                  {doctors.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.name} ({d.department} - {d.roomNumber})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
              <Button variant="ghost" size="md" type="button" onClick={() => setStaffModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={staffSubmitting}>
                Create Account
              </Button>
            </div>
          </form>
        </Modal>

        {/* Modal: Reset Staff Password */}
        <Modal
          isOpen={resetModal.isOpen}
          onClose={() => setResetModal({ isOpen: false, userId: null, userEmail: '', newPassword: '', loading: false })}
          title="Reset Staff Password"
        >
          <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Enter a new secure password for <strong>{resetModal.userEmail}</strong>. This password will be hashed with bcrypt on the server and immediately unlocks the account.
            </p>
            <TextField
              label="New Password"
              type="password"
              placeholder="Minimum 6 characters"
              value={resetModal.newPassword}
              onChange={(e) => setResetModal({ ...resetModal, newPassword: e.target.value })}
              required
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
              <Button
                variant="ghost"
                size="md"
                type="button"
                onClick={() => setResetModal({ isOpen: false, userId: null, userEmail: '', newPassword: '', loading: false })}
              >
                Cancel
              </Button>
              <Button variant="primary" size="md" type="submit" loading={resetModal.loading}>
                Reset Password
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </ProtectedRoute>
  );
};

export default AdminPage;
