/**
 * AuthDiagnostic Component
 * 
 * A diagnostic component to verify AuthContext is working correctly.
 * Add this to any page to see the auth context status.
 */

import { useAuth } from "../contexts/AuthContext";

export function AuthDiagnostic() {
  const authContext = useAuth();
  
  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: '#1e293b',
      color: '#f1f5f9',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '11px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      zIndex: 9999,
      boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
      border: '1px solid #334155'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#00719C' }}>
        🔍 Auth Context Status
      </div>
      <div style={{ display: 'grid', gap: '4px' }}>
        <div>
          <span style={{ color: '#94a3b8' }}>User:</span>{' '}
          <span style={{ color: authContext.user ? '#22c55e' : '#ef4444' }}>
            {authContext.user ? '✓ Loaded' : '✗ None'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Business:</span>{' '}
          <span style={{ color: authContext.business ? '#22c55e' : '#ef4444' }}>
            {authContext.business ? '✓ Loaded' : '✗ None'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Authenticated:</span>{' '}
          <span style={{ color: authContext.isAuthenticated ? '#22c55e' : '#ef4444' }}>
            {authContext.isAuthenticated ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Loading:</span>{' '}
          <span style={{ color: authContext.loading ? '#f59e0b' : '#22c55e' }}>
            {authContext.loading ? 'Yes' : 'No'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Login Function:</span>{' '}
          <span style={{ color: typeof authContext.login === 'function' ? '#22c55e' : '#ef4444' }}>
            {typeof authContext.login === 'function' ? '✓ Present' : '✗ Missing'}
          </span>
        </div>
        <div>
          <span style={{ color: '#94a3b8' }}>Function Name:</span>{' '}
          <span style={{ color: '#60a5fa' }}>
            {authContext.login?.name || 'anonymous'}
          </span>
        </div>
        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #334155' }}>
          <span style={{ color: '#94a3b8', fontSize: '10px' }}>
            If login shows 'anonymous' or missing, refresh the page
          </span>
        </div>
      </div>
    </div>
  );
}
