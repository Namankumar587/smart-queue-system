import React, { Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';

// Route-level code-splitting: Keeps Three.js strictly quarantined to the Landing Page chunk
const HomePage = React.lazy(() => import('./pages/HomePage').then((m) => ({ default: m.HomePage || m.default })));
const BookPage = React.lazy(() => import('./pages/BookPage').then((m) => ({ default: m.BookPage || m.default })));
const TrackPage = React.lazy(() => import('./pages/TrackPage').then((m) => ({ default: m.TrackPage || m.default })));
const ConfirmationPage = React.lazy(() => import('./pages/ConfirmationPage').then((m) => ({ default: m.ConfirmationPage || m.default })));
const StaffLoginPage = React.lazy(() => import('./pages/StaffLoginPage'));
const StaffDashboard = React.lazy(() => import('./pages/StaffDashboard'));
const DoctorPage = React.lazy(() => import('./pages/DoctorPage'));
const AdminPage = React.lazy(() => import('./pages/AdminPage'));
const ScannerPage = React.lazy(() => import('./pages/ScannerPage'));
const DisplayPage = React.lazy(() => import('./pages/DisplayPage'));

const PageLoadingFallback = () => (
  <div style={{ padding: '6rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
    <div
      style={{
        width: '32px',
        height: '32px',
        border: '2px solid rgba(255, 45, 85, 0.15)',
        borderTopColor: '#ff2d55',
        borderRadius: '50%',
        margin: '0 auto 1rem auto',
        animation: 'spin 0.8s linear infinite'
      }}
    />
    <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
      Loading clinic service...
    </p>
  </div>
);

export function App() {
  const location = useLocation();
  const isDisplayScreen = location.pathname === '/display';

  return (
    <AuthProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {!isDisplayScreen && <Navbar />}
        <main style={{ flex: 1 }}>
          <Suspense fallback={<PageLoadingFallback />}>
            <div key={location.pathname} className="page-view-transition">
              <Routes location={location}>
                <Route path="/" element={<HomePage />} />
                <Route path="/book" element={<BookPage />} />
                <Route path="/confirmation/:trackingUuid" element={<ConfirmationPage />} />
                <Route path="/confirm/:trackingUuid" element={<ConfirmationPage />} />
                <Route path="/track/:trackingUuid" element={<TrackPage />} />
                <Route path="/track/:id" element={<TrackPage />} />
                <Route path="/display" element={<DisplayPage />} />
                <Route path="/login" element={<StaffLoginPage />} />
                <Route path="/staff/login" element={<StaffLoginPage />} />
                {/* Staff / Receptionist Queue Control Routes */}
                <Route path="/staff" element={<StaffDashboard />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                <Route path="/reception" element={<StaffDashboard />} />
                <Route path="/dashboard" element={<StaffDashboard />} />
                <Route path="/scanner" element={<ScannerPage />} />
                {/* Dedicated Doctor Console Routes */}
                <Route path="/doctor" element={<DoctorPage />} />
                <Route path="/doctor/queue" element={<DoctorPage />} />
                {/* Administrator Governance Routes */}
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/admin/*" element={<AdminPage />} />
                {/* Fallback route */}
                <Route path="*" element={<HomePage />} />
              </Routes>
            </div>
          </Suspense>
        </main>
        {!isDisplayScreen && <Footer />}
      </div>
    </AuthProvider>
  );
}

export default App;
