/**
 * SIMPLEST POSSIBLE LANDING PAGE - DEBUG VERSION
 */

export function SimpleLandingDirect() {
  console.log("✅ SimpleLandingDirect component rendering!");
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'system-ui, sans-serif',
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#00719C',
        padding: '20px 40px',
        borderRadius: '12px',
        marginBottom: '32px'
      }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          margin: '0'
        }}>
          Tillsup
        </h1>
      </div>
      
      <h2 style={{
        fontSize: '32px',
        marginBottom: '16px',
        color: '#e2e8f0'
      }}>
        Modern POS System
      </h2>
      
      <p style={{
        fontSize: '18px',
        color: '#94a3b8',
        maxWidth: '600px',
        marginBottom: '32px',
        lineHeight: '1.6'
      }}>
        Complete point-of-sale system with inventory management, 
        staff tracking, and powerful analytics.
      </p>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={() => window.location.href = '/login'}
          style={{
            padding: '16px 32px',
            background: 'transparent',
            border: '2px solid #00719C',
            color: '#00719C',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Sign In
        </button>
        
        <button
          onClick={() => window.location.href = '/register'}
          style={{
            padding: '16px 32px',
            background: '#ef4444',
            border: 'none',
            color: 'white',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600'
          }}
        >
          Start Free Trial
        </button>
      </div>
      
      <div style={{
        marginTop: '48px',
        padding: '24px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        maxWidth: '800px'
      }}>
        <div style={{ fontSize: '14px', color: '#64748b' }}>
          ✓ If you can see this, the page is loading correctly!
        </div>
        <div style={{ fontSize: '12px', color: '#475569', marginTop: '8px' }}>
          Check browser console for any errors
        </div>
      </div>
    </div>
  );
}
