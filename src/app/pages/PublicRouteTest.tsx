import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router";

/**
 * Test page to verify public route bypass is working
 */
export function PublicRouteTest() {
  const auth = useAuth();
  const navigate = useNavigate();
  const startTime = performance.now();

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0f172a',
      color: 'white',
      padding: '3rem',
      fontFamily: 'system-ui'
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          background: auth.loading ? '#dc2626' : '#10b981',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ fontSize: '32px', marginBottom: '0.5rem' }}>
            {auth.loading ? '❌ Auth Still Loading' : '✅ Public Route Bypass Working!'}
          </h1>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>
            {auth.loading 
              ? 'This should not be loading on a public route'
              : 'Auth was bypassed, page loaded instantly'}
          </p>
        </div>

        {/* Auth State */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '1rem', color: '#60a5fa' }}>Auth State</h2>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '0.5rem' }}>Loading:</td>
                <td style={{ padding: '0.5rem', color: auth.loading ? '#f87171' : '#34d399' }}>
                  {String(auth.loading)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '0.5rem' }}>Authenticated:</td>
                <td style={{ padding: '0.5rem', color: auth.isAuthenticated ? '#34d399' : '#f87171' }}>
                  {String(auth.isAuthenticated)}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <td style={{ padding: '0.5rem' }}>User:</td>
                <td style={{ padding: '0.5rem' }}>
                  {auth.user ? `✅ ${auth.user.email}` : '❌ null'}
                </td>
              </tr>
              <tr>
                <td style={{ padding: '0.5rem' }}>Business:</td>
                <td style={{ padding: '0.5rem' }}>
                  {auth.business ? `✅ ${auth.business.name}` : '❌ null'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Performance */}
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          padding: '1.5rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '1rem', color: '#60a5fa' }}>Performance</h2>
          <p style={{ fontSize: '14px' }}>
            Page render time: <strong>{Math.round(performance.now() - startTime)}ms</strong>
          </p>
          <p style={{ fontSize: '12px', opacity: 0.7, marginTop: '0.5rem' }}>
            Expected: &lt; 100ms for public routes
          </p>
        </div>

        {/* Navigation */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '1rem'
        }}>
          <button
            onClick={() => navigate('/')}
            style={{
              padding: '1rem',
              background: '#00719C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Landing
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{
              padding: '1rem',
              background: '#00719C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Login
          </button>
          <button
            onClick={() => navigate('/diagnostic')}
            style={{
              padding: '1rem',
              background: '#00719C',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Diagnostic
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '1rem',
              background: '#64748b',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            Reload
          </button>
        </div>

        {/* Info */}
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: 'rgba(59, 130, 246, 0.1)',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderRadius: '8px',
          fontSize: '12px'
        }}>
          <strong>ℹ️ How it works:</strong>
          <ul style={{ marginTop: '0.5rem', marginLeft: '1.5rem' }}>
            <li>AuthProvider detects public routes (/, /login, /register, etc.)</li>
            <li>For public routes, auth initialization is skipped entirely</li>
            <li>loading is immediately set to false</li>
            <li>Page renders without waiting for Supabase</li>
            <li>Protected routes (/app/*) still require authentication</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
