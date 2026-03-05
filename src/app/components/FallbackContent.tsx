/**
 * Guaranteed fallback content that always renders
 * Used as a safety net for Figma Make preview
 */
export function FallbackContent() {
  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
      color: 'white',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '2rem'
    }}>
      <div style={{
        maxWidth: '600px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          background: '#0891b2',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 2rem',
          fontSize: '40px'
        }}>
          🏪
        </div>
        
        <h1 style={{
          fontSize: '48px',
          fontWeight: 'bold',
          marginBottom: '1rem',
          color: '#60a5fa'
        }}>
          Tillsup POS
        </h1>
        
        <p style={{
          fontSize: '20px',
          color: '#cbd5e1',
          marginBottom: '2rem',
          lineHeight: '1.6'
        }}>
          Enterprise Point of Sale System for African Businesses
        </p>
        
        <div style={{
          display: 'flex',
          gap: '1rem',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <a
            href="/login"
            style={{
              padding: '12px 24px',
              background: '#0891b2',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Login
          </a>
          
          <a
            href="/register"
            style={{
              padding: '12px 24px',
              background: '#ED363F',
              color: 'white',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Get Started
          </a>
        </div>
        
        <div style={{
          marginTop: '3rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '0.5rem' }}>
            🎨 Figma Make Preview Mode Active
          </div>
          <div style={{ fontSize: '12px', color: '#64748b' }}>
            This is a fallback view. The app should load automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
