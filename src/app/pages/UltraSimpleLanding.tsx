/**
 * ULTRA SIMPLE LANDING PAGE
 * Absolutely zero dependencies - pure React
 */

import { TillsupLogo } from "../components/TillsupLogo";

export function UltraSimpleLanding() {
  const handleLogin = () => {
    window.location.href = '/login';
  };

  const handleRegister = () => {
    window.location.href = '/register';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '20px',
      overflow: 'auto'
    }}>
      {/* Navigation */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '20px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <TillsupLogo />
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleLogin}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#e2e8f0',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            Sign In
          </button>
          <button
            onClick={handleRegister}
            style={{
              padding: '10px 24px',
              background: '#ef4444',
              border: 'none',
              color: 'white',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        textAlign: 'center',
        padding: '80px 20px',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <h1 style={{
          fontSize: 'clamp(32px, 8vw, 64px)',
          fontWeight: 'bold',
          lineHeight: '1.1',
          marginBottom: '24px',
          letterSpacing: '-0.02em'
        }}>
          The Modern POS That<br />
          <span style={{ color: '#ef4444' }}>Grows</span> With You
        </h1>

        <p style={{
          fontSize: '20px',
          color: '#94a3b8',
          maxWidth: '800px',
          margin: '0 auto 48px',
          lineHeight: '1.6'
        }}>
          Complete point-of-sale system with inventory management, staff tracking, 
          and powerful analytics. Built for businesses in Kenya.
        </p>

        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          marginBottom: '48px'
        }}>
          <button
            onClick={handleRegister}
            style={{
              padding: '16px 32px',
              background: '#ef4444',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '17px',
              fontWeight: 'bold',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
            }}
          >
            Start Free Trial →
          </button>
          <button
            onClick={handleLogin}
            style={{
              padding: '16px 32px',
              background: 'transparent',
              border: '2px solid #0891b2',
              color: '#0891b2',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '17px',
              fontWeight: '600'
            }}
          >
            View Demo
          </button>
        </div>

        {/* Features */}
        <div style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          fontSize: '15px',
          color: '#94a3b8',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ No Credit Card Required
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ 14-Day Free Trial
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            ✓ Cancel Anytime
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div style={{
        maxWidth: '1200px',
        margin: '80px auto',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        padding: '0 20px'
      }}>
        {[
          {
            title: '💰 Complete POS',
            desc: 'Fast checkout with barcode scanning, multiple payment methods, and receipt printing'
          },
          {
            title: '📦 Inventory Control',
            desc: 'Real-time stock tracking, low stock alerts, and automated reordering'
          },
          {
            title: '👥 Staff Management',
            desc: 'Track employee performance, manage shifts, and control access levels'
          },
          {
            title: '📊 Analytics',
            desc: 'Detailed sales reports, profit tracking, and business insights'
          },
          {
            title: '📱 M-PESA Integration',
            desc: 'Accept mobile money payments seamlessly integrated into your POS'
          },
          {
            title: '🏪 Multi-Location',
            desc: 'Manage multiple stores, transfer stock, and centralize reporting'
          }
        ].map((feature, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '32px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            <div style={{ fontSize: '24px', marginBottom: '16px', fontWeight: 'bold' }}>
              {feature.title}
            </div>
            <div style={{ color: '#94a3b8', lineHeight: '1.6' }}>
              {feature.desc}
            </div>
          </div>
        ))}
      </div>

      {/* CTA Section */}
      <div style={{
        textAlign: 'center',
        padding: '80px 20px',
        background: 'rgba(8, 145, 178, 0.1)',
        borderRadius: '16px',
        maxWidth: '1200px',
        margin: '0 auto',
        border: '1px solid rgba(8, 145, 178, 0.2)'
      }}>
        <h2 style={{
          fontSize: 'clamp(28px, 6vw, 48px)',
          fontWeight: 'bold',
          marginBottom: '24px'
        }}>
          Ready to modernize your business?
        </h2>
        <p style={{
          fontSize: '18px',
          color: '#94a3b8',
          marginBottom: '32px'
        }}>
          Join 2,400+ businesses already using Tillsup
        </p>
        <button
          onClick={handleRegister}
          style={{
            padding: '16px 48px',
            background: '#ef4444',
            border: 'none',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '18px',
            fontWeight: 'bold',
            boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
          }}
        >
          Start Your Free Trial
        </button>
      </div>

      {/* Footer */}
      <footer style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#64748b',
        fontSize: '14px',
        marginTop: '80px'
      }}>
        <div style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold', color: '#0891b2' }}>
          Tillsup
        </div>
        <div>
          © 2026 Tillsup. All rights reserved.
        </div>
        <div style={{ marginTop: '8px' }}>
          Modern POS System for African Businesses
        </div>
      </footer>
    </div>
  );
}