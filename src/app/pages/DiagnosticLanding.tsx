import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";

/**
 * DIAGNOSTIC LANDING PAGE
 * Shows real-time auth state and helps debug loading issues
 */
export function DiagnosticLanding() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Track elapsed time
    const startTime = Date.now();
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 100);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const log = `[${elapsed.toFixed(1)}s] Loading: ${auth.loading}, Authenticated: ${auth.isAuthenticated}, User: ${auth.user ? "✅" : "❌"}`;
    setLogs(prev => [...prev, log].slice(-10));
  }, [auth.loading, auth.isAuthenticated, auth.user, elapsed]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
      color: 'white',
      padding: '2rem',
      fontFamily: 'monospace'
    }}>
      {/* BIG VISIBLE HEADER */}
      <div style={{
        background: auth.loading ? 'red' : 'green',
        color: 'white',
        padding: '2rem',
        borderRadius: '12px',
        marginBottom: '2rem',
        textAlign: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        animation: auth.loading ? 'pulse 2s infinite' : 'none'
      }}>
        {auth.loading ? '⏳ LOADING... (this should disappear in 3-5 seconds)' : '✅ READY!'}
      </div>

      {/* Elapsed Time */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem',
        fontSize: '24px'
      }}>
        ⏱️ Elapsed Time: {elapsed.toFixed(1)} seconds
      </div>

      {/* Auth State */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '0.5rem' }}>Auth State:</h2>
        <div>Loading: <span style={{ color: auth.loading ? 'red' : 'lime' }}>{String(auth.loading)}</span></div>
        <div>Authenticated: <span style={{ color: auth.isAuthenticated ? 'lime' : 'red' }}>{String(auth.isAuthenticated)}</span></div>
        <div>User: {auth.user ? '✅ Present' : '❌ Null'}</div>
        <div>Business: {auth.business ? '✅ Present' : '❌ Null'}</div>
      </div>

      {/* Live Logs */}
      <div style={{
        background: 'rgba(255,255,255,0.1)',
        padding: '1rem',
        borderRadius: '8px',
        marginBottom: '1rem'
      }}>
        <h2 style={{ fontSize: '20px', marginBottom: '0.5rem' }}>Live Logs (last 10):</h2>
        {logs.map((log, i) => (
          <div key={i} style={{ fontSize: '12px', marginBottom: '2px' }}>{log}</div>
        ))}
      </div>

      {/* Warnings */}
      {elapsed > 5 && auth.loading && (
        <div style={{
          background: 'orange',
          color: 'black',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          ⚠️ WARNING: Still loading after 5 seconds! This indicates a network or Supabase connectivity issue.
        </div>
      )}

      {elapsed > 10 && auth.loading && (
        <div style={{
          background: 'red',
          color: 'white',
          padding: '1rem',
          borderRadius: '8px',
          marginBottom: '1rem',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          🚨 CRITICAL: Emergency timeout should have fired by now! Check browser console for errors.
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
        <button
          onClick={() => navigate("/login")}
          disabled={auth.loading}
          style={{
            padding: '1rem 2rem',
            background: '#0891b2',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: auth.loading ? 'not-allowed' : 'pointer',
            opacity: auth.loading ? 0.5 : 1,
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Go to Login
        </button>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '1rem 2rem',
            background: '#64748b',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Reload Page
        </button>
        <button
          onClick={() => {
            sessionStorage.clear();
            localStorage.clear();
            window.location.reload();
          }}
          style={{
            padding: '1rem 2rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          Clear Storage & Reload
        </button>
      </div>

      {/* Browser Info */}
      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '8px',
        fontSize: '12px'
      }}>
        <div>URL: {window.location.href}</div>
        <div>User Agent: {navigator.userAgent}</div>
        <div>Online: {navigator.onLine ? '✅' : '❌'}</div>
        <div>Timestamp: {new Date().toISOString()}</div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
