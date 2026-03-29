/**
 * ULTRA SIMPLE DIAGNOSTIC PAGE
 * No dependencies, no contexts, no nothing
 */

export function DiagnosticSimple() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#00719C',
      color: 'white',
      fontFamily: 'system-ui',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>✅ React is Working</h1>
      <p style={{ fontSize: '24px', margin: 0 }}>DiagnosticSimple component rendered successfully</p>
      <p style={{ fontSize: '16px', margin: 0, opacity: 0.8 }}>Path: {window.location.pathname}</p>
      <button 
        onClick={() => {
          console.log('✅ Button clicked');
          window.location.href = '/';
        }}
        style={{
          padding: '12px 24px',
          fontSize: '18px',
          background: 'white',
          color: '#00719C',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Go to Landing Page (/)
      </button>
      <button 
        onClick={() => {
          console.log('✅ Login button clicked');
          window.location.href = '/login';
        }}
        style={{
          padding: '12px 24px',
          fontSize: '18px',
          background: 'white',
          color: '#00719C',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Go to Login
      </button>
    </div>
  );
}
