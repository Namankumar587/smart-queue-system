import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiClient } from '../api/client';
import { TokenCard } from '../components/ui/TokenCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { CheckCircle2, Ticket, Search, ArrowRight, RefreshCw, Home } from 'lucide-react';

export const ConfirmationPage = () => {
  const { trackingUuid } = useParams();
  const navigate = useNavigate();

  const [tokenData, setTokenData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchTokenDetails = async () => {
    if (!trackingUuid) {
      setError('Invalid tracking token reference.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Authoritative API call to public tracking contract
      const data = await apiClient.get(`/tokens/track/${trackingUuid}`);
      if (!data) {
        setError('Token not found. It may have expired or been purged after clinic hours.');
      } else {
        setTokenData(data);
        try {
          localStorage.setItem(`glb_pass_${trackingUuid}`, JSON.stringify(data));
          localStorage.setItem('glb_last_active_tracking_uuid', trackingUuid);
        } catch {}
      }
    } catch (err) {
      // Offline fallback
      try {
        const cached = localStorage.getItem(`glb_pass_${trackingUuid}`);
        if (cached) {
          setTokenData(JSON.parse(cached));
          setLoading(false);
          return;
        }
      } catch {}

      setError(err.message || 'Unable to retrieve confirmed token details from clinic server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokenDetails();
  }, [trackingUuid]);

  return (
    <div className="container" style={{ padding: '36px 16px', maxWidth: '640px' }}>
      {/* Header Banner */}
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--success-subtle)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            color: 'var(--success)',
            fontSize: '0.75rem',
            fontWeight: 700,
            padding: '4px 12px',
            borderRadius: 'var(--radius-pill)',
            marginBottom: '10px'
          }}
        >
          <CheckCircle2 size={14} />
          <span>Booking Confirmed &bull; Real-Time Registration</span>
        </div>

        <h1 style={{ fontSize: '1.625rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
          Consultation Token Confirmed
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
          Please save this token code or scan the QR ticket at the reception desk.
        </p>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Skeleton height="28px" width="40%" />
            <Skeleton height="100px" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Skeleton height="70px" />
              <Skeleton height="70px" />
            </div>
            <Skeleton height="140px" />
          </div>
        </Card>
      ) : error ? (
        /* Graceful Missing/Expired Error State */
        <div>
          <ErrorState
            title="Token Not Found or Expired"
            message={error}
            onRetry={fetchTokenDetails}
            retryLabel="Retry Verification"
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '20px',
              textAlign: 'center'
            }}
          >
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Tokens expire after consultation completion or daily clinic closing hours.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <Button
                variant="primary"
                size="md"
                icon={Ticket}
                onClick={() => navigate('/book')}
              >
                Book a New Token
              </Button>
              <Button
                variant="secondary"
                size="md"
                icon={Search}
                onClick={() => navigate('/track/search')}
              >
                Track by ID
              </Button>
            </div>
          </div>
        </div>
      ) : tokenData ? (
        /* Verified Real API Confirmation Token Card */
        <div>
          <TokenCard
            tokenData={tokenData}
            showQr={true}
            showCopy={true}
            onOpenLiveTracker={() => navigate(`/track/${tokenData.trackingUuid}`)}
          />

          {/* Quick Action Navigation Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              marginTop: '24px',
              fontSize: '0.8125rem'
            }}
          >
            <Link
              to="/book"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--cyan-accent)',
                fontWeight: 600
              }}
            >
              <Ticket size={15} />
              <span>Book Another Token</span>
            </Link>

            <span style={{ color: 'var(--border-subtle)' }}>&bull;</span>

            <Link
              to="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-muted)'
              }}
            >
              <Home size={15} />
              <span>Clinic Home</span>
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
};
