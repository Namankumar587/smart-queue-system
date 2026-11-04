import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Ticket,
  QrCode,
  Smartphone,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Bell,
  Stethoscope,
  Building,
  ArrowRight,
  ShieldCheck,
  Send,
  Sparkles,
  Zap
} from 'lucide-react';

const DEPARTMENTS = [
  { id: 'gen', name: 'General Medicine', room: 'Room 101', doctor: 'Dr. Priya Sharma', avgWait: 8 },
  { id: 'ped', name: 'Pediatrics', room: 'Room 102', doctor: 'Dr. Amit Verma', avgWait: 6 },
  { id: 'ortho', name: 'Orthopedics', room: 'Room 103', doctor: 'Dr. Rajesh Iyer', avgWait: 12 },
  { id: 'cardio', name: 'Cardiology', room: 'Room 104', doctor: 'Dr. Sneha Patel', avgWait: 15 }
];

const DOCTOR_ROSTER = [
  {
    room: 'Room 101',
    dept: 'General Medicine',
    doctor: 'Dr. Priya Sharma',
    avatar: 'PS',
    status: 'In Consultation',
    currentServing: 'T-038',
    queueLength: 4,
    avgTime: '8 mins',
    onTimeRate: '98%'
  },
  {
    room: 'Room 102',
    dept: 'Pediatrics',
    doctor: 'Dr. Amit Verma',
    avatar: 'AV',
    status: 'In Consultation',
    currentServing: 'T-021',
    queueLength: 2,
    avgTime: '6 mins',
    onTimeRate: '96%'
  },
  {
    room: 'Room 103',
    dept: 'Orthopedics',
    doctor: 'Dr. Rajesh Iyer',
    avatar: 'RI',
    status: 'Ready / Calling',
    currentServing: 'T-015',
    queueLength: 3,
    avgTime: '12 mins',
    onTimeRate: '94%'
  },
  {
    room: 'Room 104',
    dept: 'Cardiology',
    doctor: 'Dr. Sneha Patel',
    avatar: 'SP',
    status: 'In Consultation',
    currentServing: 'T-009',
    queueLength: 1,
    avgTime: '15 mins',
    onTimeRate: '99%'
  }
];

export default function InteractiveClinicHub() {
  const [activeTab, setActiveTab] = useState('token'); // 'token' | 'roster' | 'sms'

  // Token Generator State
  const [selectedDept, setSelectedDept] = useState(DEPARTMENTS[0]);
  const [priorityTier, setPriorityTier] = useState('normal'); // 'normal' | 'senior' | 'emergency'
  const [patientName, setPatientName] = useState('Alex Morgan');
  const [generatedTicket, setGeneratedTicket] = useState({
    code: 'T-042',
    dept: 'General Medicine',
    doctor: 'Dr. Priya Sharma',
    room: 'Room 101',
    ahead: 3,
    waitMins: 24,
    priority: 'Normal Walk-in',
    timestamp: 'Just now'
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // SMS Simulator State
  const [smsAheadCount, setSmsAheadCount] = useState(2);
  const [smsSent, setSmsSent] = useState(true);

  // Generate a new test token
  const handleGenerateToken = (e) => {
    e.preventDefault();
    setIsGenerating(true);

    setTimeout(() => {
      const randomNum = Math.floor(Math.random() * 50) + 40;
      const priorityLabel =
        priorityTier === 'emergency'
          ? 'Urgent Emergency (Rank 10)'
          : priorityTier === 'senior'
            ? 'Senior Citizen Priority (Rank 5)'
            : 'Standard Registration';

      const ahead = priorityTier === 'emergency' ? 0 : priorityTier === 'senior' ? 1 : 3;

      setGeneratedTicket({
        code: `T-${String(randomNum).padStart(3, '0')}`,
        dept: selectedDept.name,
        doctor: selectedDept.doctor,
        room: selectedDept.room,
        ahead,
        waitMins: ahead * selectedDept.avgWait,
        priority: priorityLabel,
        timestamp: 'Just now'
      });
      setIsGenerating(false);
    }, 280);
  };

  return (
    <div
      style={{
        marginTop: '3.5rem',
        marginBottom: '3.5rem',
        position: 'relative'
      }}
    >
      {/* Section Header */}
      <div style={{ textAlign: 'center', maxWidth: '780px', margin: '0 auto 2.5rem auto' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            background: 'rgba(255, 45, 85, 0.14)',
            color: '#FF6B8B',
            border: '1px solid rgba(255, 70, 100, 0.35)',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            marginBottom: '0.75rem',
            boxShadow: '0 0 16px rgba(255, 45, 85, 0.15)'
          }}
        >
          <Sparkles size={13} color="#FF2D55" />
          <span>Interactive Live Clinic Sandbox</span>
        </div>

        <h2
          style={{
            fontSize: 'clamp(1.6rem, 3.5vw, 2.35rem)',
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '-0.025em',
            margin: '0 0 0.75rem 0'
          }}
        >
          Try the Smart Clinic in Action
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.6, margin: 0 }}>
          Test instant token issuance, live physician availability, and real-time SMS notifications right now in your browser.
        </p>

        {/* 3-Tab Mode Switcher Pills */}
        <div
          className="clinic-hub-tabs"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(18, 3, 10, 0.85)',
            padding: '5px',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 60, 95, 0.25)',
            marginTop: '1.5rem',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.7)',
            maxWidth: '100%',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('token')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'token' ? '1px solid rgba(255, 70, 100, 0.5)' : '1px solid transparent',
              background: activeTab === 'token' ? 'linear-gradient(135deg, #FF2D55 0%, #D81B43 100%)' : 'transparent',
              color: activeTab === 'token' ? '#FFFFFF' : '#E2B4BE',
              boxShadow: activeTab === 'token' ? '0 0 15px rgba(255, 45, 85, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Ticket size={14} />
            <span>1. Instant Token Generator</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roster')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'roster' ? '1px solid rgba(255, 70, 100, 0.5)' : '1px solid transparent',
              background: activeTab === 'roster' ? 'linear-gradient(135deg, #FF2D55 0%, #D81B43 100%)' : 'transparent',
              color: activeTab === 'roster' ? '#FFFFFF' : '#E2B4BE',
              boxShadow: activeTab === 'roster' ? '0 0 15px rgba(255, 45, 85, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Stethoscope size={14} />
            <span>2. Doctor &amp; Room Roster</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sms')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.45rem 1.1rem',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: activeTab === 'sms' ? '1px solid rgba(255, 70, 100, 0.5)' : '1px solid transparent',
              background: activeTab === 'sms' ? 'linear-gradient(135deg, #FF2D55 0%, #D81B43 100%)' : 'transparent',
              color: activeTab === 'sms' ? '#FFFFFF' : '#E2B4BE',
              boxShadow: activeTab === 'sms' ? '0 0 15px rgba(255, 45, 85, 0.4)' : 'none',
              transition: 'all 0.2s ease'
            }}
          >
            <Smartphone size={14} />
            <span>3. Near-Turn SMS Simulator</span>
          </button>
        </div>
      </div>

      {/* Main Interactive Sandbox Card */}
      <div
        className="cosmic-glass"
        style={{
          padding: '28px',
          borderRadius: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* TAB 1: INSTANT TOKEN GENERATOR */}
        {activeTab === 'token' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '28px',
              alignItems: 'center'
            }}
          >
            {/* Left Controls Column */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 45, 85, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FF6B8B'
                  }}
                >
                  <Zap size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Issue Test Queue Token
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Simulates instant atomic MongoDB sequence increment
                  </div>
                </div>
              </div>

              <form onSubmit={handleGenerateToken} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Department Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                    Select Department
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {DEPARTMENTS.map((dept) => (
                      <button
                        key={dept.id}
                        type="button"
                        onClick={() => setSelectedDept(dept)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px',
                          borderRadius: '10px',
                          background: selectedDept.id === dept.id ? 'rgba(255, 45, 85, 0.22)' : 'rgba(20, 4, 10, 0.6)',
                          border: selectedDept.id === dept.id ? '1.5px solid #FF2D55' : '1px solid rgba(255, 60, 95, 0.2)',
                          cursor: 'pointer',
                          color: '#FFFFFF'
                        }}
                      >
                        <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{dept.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {dept.doctor} &bull; {dept.room}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Priority Tier Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                    Triage Priority Category
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => setPriorityTier('normal')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: priorityTier === 'normal' ? 'rgba(255, 45, 85, 0.25)' : 'rgba(20, 4, 10, 0.6)',
                        border: priorityTier === 'normal' ? '1px solid #FF2D55' : '1px solid rgba(255, 60, 95, 0.2)',
                        color: priorityTier === 'normal' ? '#FFFFFF' : 'var(--text-muted)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Normal Walk-in
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityTier('senior')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: priorityTier === 'senior' ? 'rgba(245, 158, 11, 0.25)' : 'rgba(20, 4, 10, 0.6)',
                        border: priorityTier === 'senior' ? '1px solid #F59E0B' : '1px solid rgba(245, 158, 11, 0.2)',
                        color: priorityTier === 'senior' ? '#FBBF24' : 'var(--text-muted)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Senior Citizen
                    </button>
                    <button
                      type="button"
                      onClick={() => setPriorityTier('emergency')}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '8px',
                        background: priorityTier === 'emergency' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(20, 4, 10, 0.6)',
                        border: priorityTier === 'emergency' ? '1px solid #EF4444' : '1px solid rgba(239, 68, 68, 0.2)',
                        color: priorityTier === 'emergency' ? '#F87171' : 'var(--text-muted)',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Urgent Care
                    </button>
                  </div>
                </div>

                {/* Patient Name Preview */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF', marginBottom: '6px' }}>
                    Patient Name (Simulated)
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    className="input-field"
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      backgroundColor: 'rgba(10, 1, 5, 0.75)',
                      borderColor: 'rgba(255, 60, 95, 0.25)',
                      color: '#FFFFFF'
                    }}
                    placeholder="Enter patient name..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isGenerating}
                  className="btn-pill"
                  style={{
                    padding: '12px 20px',
                    fontSize: '0.9rem',
                    backgroundColor: '#FF2D55',
                    marginTop: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  <Zap size={15} />
                  <span>{isGenerating ? 'Allocating Token...' : 'Generate Live Token Ticket'}</span>
                </button>
              </form>
            </div>

            {/* Right Ticket Preview Column */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  maxWidth: '380px',
                  width: '100%',
                  background: 'linear-gradient(135deg, rgba(32, 6, 17, 0.95) 0%, rgba(12, 1, 6, 0.98) 100%)',
                  borderRadius: '20px',
                  border: '1.5px solid rgba(255, 60, 95, 0.4)',
                  padding: '24px',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9), 0 0 35px rgba(255, 45, 85, 0.25)',
                  position: 'relative'
                }}
              >
                {/* Header with live pulsing status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#FF6B8B',
                      background: 'rgba(255, 45, 85, 0.15)',
                      padding: '3px 8px',
                      borderRadius: '9999px',
                      border: '1px solid rgba(255, 70, 100, 0.35)',
                      textTransform: 'uppercase'
                    }}
                  >
                    SmartQueue Digital Pass
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.72rem', color: '#10B981' }}>
                    <span
                      className="beacon-pulse"
                      style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}
                    />
                    <span>Live in System</span>
                  </div>
                </div>

                {/* Big Token Number */}
                <div style={{ textAlign: 'center', padding: '16px 0', borderBottom: '1px dashed rgba(255, 60, 95, 0.3)' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Token Code
                  </div>
                  <div
                    style={{
                      fontSize: '3rem',
                      fontWeight: 900,
                      color: '#FFFFFF',
                      letterSpacing: '-0.02em',
                      textShadow: '0 0 25px rgba(255, 45, 85, 0.6)'
                    }}
                  >
                    {generatedTicket.code}
                  </div>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: '#FF8FA3',
                      background: 'rgba(255, 45, 85, 0.2)',
                      padding: '3px 10px',
                      borderRadius: '9999px',
                      marginTop: '4px'
                    }}
                  >
                    {generatedTicket.priority}
                  </div>
                </div>

                {/* Ticket Details Grid */}
                <div style={{ padding: '16px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', borderBottom: '1px dashed rgba(255, 60, 95, 0.3)' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>PATIENT</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {patientName || 'Anonymous'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>DEPARTMENT</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {generatedTicket.dept}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONSULTING DOCTOR</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FFFFFF', marginTop: '2px' }}>
                      {generatedTicket.doctor}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>LOCATION</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#FF6B8B', marginTop: '2px' }}>
                      {generatedTicket.room}
                    </div>
                  </div>
                </div>

                {/* Live Wait & Ahead Telemetry */}
                <div style={{ padding: '14px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>QUEUE DEPTH</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#FFFFFF' }}>
                      {generatedTicket.ahead} patients ahead
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>EST. WAIT</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10B981' }}>
                      ~{generatedTicket.waitMins} mins
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                  <Link
                    to="/book"
                    className="btn-pill"
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      fontSize: '0.8rem',
                      backgroundColor: '#FF2D55',
                      textAlign: 'center',
                      textDecoration: 'none'
                    }}
                  >
                    <span>Book Real Token &rarr;</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: DOCTOR & ROOM ROSTER */}
        {activeTab === 'roster' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  Active Clinical Duty Board
                </h3>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Real-time synchronization with physician consoles across all outpatient consultation suites.
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: '#10B981' }}>
                <span className="beacon-pulse" style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span>All 4 Consultation Suites Active</span>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '16px'
              }}
            >
              {DOCTOR_ROSTER.map((doc, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'rgba(18, 3, 10, 0.75)',
                    border: '1px solid rgba(255, 60, 95, 0.25)',
                    borderRadius: '16px',
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    boxShadow: '0 8px 25px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <div>
                    {/* Room & Status */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: '#FF6B8B',
                          background: 'rgba(255, 45, 85, 0.15)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(255, 70, 100, 0.3)'
                        }}
                      >
                        {doc.room}
                      </span>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: doc.status.includes('Calling') ? '#F59E0B' : '#10B981',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            backgroundColor: doc.status.includes('Calling') ? '#F59E0B' : '#10B981'
                          }}
                        />
                        {doc.status}
                      </span>
                    </div>

                    {/* Doctor Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(255, 45, 85, 0.2)',
                          border: '1.5px solid rgba(255, 70, 100, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: '#FFFFFF'
                        }}
                      >
                        {doc.avatar}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#FFFFFF' }}>{doc.doctor}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{doc.dept}</div>
                      </div>
                    </div>

                    {/* Metrics Row */}
                    <div
                      style={{
                        background: 'rgba(10, 1, 5, 0.6)',
                        borderRadius: '10px',
                        padding: '10px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '8px',
                        fontSize: '0.72rem',
                        marginBottom: '14px'
                      }}
                    >
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Serving Now:</span>
                        <div style={{ color: '#FF6B8B', fontWeight: 800, fontSize: '0.85rem' }}>{doc.currentServing}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Waiting Queue:</span>
                        <div style={{ color: '#FFFFFF', fontWeight: 800, fontSize: '0.85rem' }}>{doc.queueLength} patients</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>Avg Pace:</span>
                        <div style={{ color: '#FFFFFF', fontWeight: 700 }}>{doc.avgTime}</div>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)' }}>On-Time:</span>
                        <div style={{ color: '#10B981', fontWeight: 700 }}>{doc.onTimeRate}</div>
                      </div>
                    </div>
                  </div>

                  <Link
                    to="/book"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      background: 'rgba(255, 45, 85, 0.15)',
                      border: '1px solid rgba(255, 70, 100, 0.3)',
                      color: '#FFFFFF',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    Book with {doc.doctor.split(' ')[1]} &rarr;
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: NEAR-TURN SMS SIMULATOR */}
        {activeTab === 'sms' && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))',
              gap: '28px',
              alignItems: 'center'
            }}
          >
            {/* Left Controls */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FBBF24'
                  }}
                >
                  <Bell size={16} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                    Automated Near-Turn SMS Dispatch
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    Triggered when queue position is &le; 3 patients ahead
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(16, 2, 7, 0.75)',
                  borderRadius: '14px',
                  padding: '16px',
                  border: '1px solid rgba(255, 60, 95, 0.2)',
                  marginBottom: '1.25rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label htmlFor="sms-ahead-slider" style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                    Simulate Patients Ahead:
                  </label>
                  <span
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 800,
                      color: smsAheadCount <= 3 ? '#F59E0B' : '#FFFFFF'
                    }}
                  >
                    {smsAheadCount} {smsAheadCount === 1 ? 'patient' : 'patients'}
                  </span>
                </div>

                <input
                  id="sms-ahead-slider"
                  type="range"
                  min="1"
                  max="6"
                  value={smsAheadCount}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setSmsAheadCount(val);
                    setSmsSent(val <= 3);
                  }}
                  style={{
                    width: '100%',
                    accentColor: '#FF2D55',
                    cursor: 'pointer'
                  }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  <span>1 (Next in line)</span>
                  <span style={{ color: '#F59E0B', fontWeight: 700 }}>&le; 3 (Alert Zone)</span>
                  <span>6 (Safe wait)</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span>DLT Principal Entity Header registered for telecom compliance</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span>Idempotency deduplication ensures zero duplicate messages</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span>Non-blocking async dispatch never stalls clinician queue state</span>
                </div>
              </div>
            </div>

            {/* Right Phone Mockup */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                style={{
                  width: '300px',
                  borderRadius: '32px',
                  background: '#090105',
                  border: '3px solid rgba(255, 60, 95, 0.45)',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.95), 0 0 35px rgba(255, 45, 85, 0.25)',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                {/* Phone Speaker & Notch */}
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                  <div style={{ width: '60px', height: '4px', borderRadius: '9999px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
                </div>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.6)' }}>
                  <span>10:42 AM</span>
                  <span>5G &bull; 92%</span>
                </div>

                {/* SMS Bubble Display */}
                {smsAheadCount <= 3 ? (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(38, 7, 19, 0.95) 0%, rgba(20, 3, 10, 0.95) 100%)',
                      border: '1px solid rgba(255, 70, 100, 0.45)',
                      borderRadius: '16px',
                      padding: '14px',
                      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.6), 0 0 20px rgba(255, 45, 85, 0.25)',
                      animation: 'queuePositionGlow 0.4s ease-out'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#FF6B8B' }}>SMARTQUEUE NOTIFICATION</span>
                      <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>&bull; Just now</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: '#FFFFFF', lineHeight: 1.45 }}>
                      🏥 <strong>Token T-042:</strong> Your consultation is approaching! Only <strong>{smsAheadCount} patients ahead</strong> in Room 101 with Dr. Priya Sharma. Please report to Waiting Bay A.
                    </p>
                    <div style={{ marginTop: '8px', fontSize: '0.65rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} />
                      <span>Delivered via SMS Gateway</span>
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px dashed rgba(255, 255, 255, 0.15)',
                      borderRadius: '14px',
                      padding: '24px 14px',
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <Clock size={24} color="#7E22CE" style={{ margin: '0 auto 8px auto', display: 'block' }} />
                    <div>Patient is {smsAheadCount} ahead in queue.</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      Alert triggers automatically when &le; 3 remain.
                    </div>
                  </div>
                )}

                <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.35)', marginTop: '8px' }}>
                  Simulated Carrier Dispatch
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

