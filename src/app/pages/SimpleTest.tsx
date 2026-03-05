export function SimpleTest() {
  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(to bottom, #1e293b, #0f172a)',
      color: 'white',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontSize: '24px',
      fontFamily: 'system-ui'
    }}>
      <div style={{ 
        background: 'green', 
        padding: '2rem', 
        borderRadius: '12px',
        marginBottom: '2rem',
        fontSize: '32px',
        fontWeight: 'bold'
      }}>
        ✅ SIMPLE TEST ROUTE WORKS!
      </div>
      <div style={{ marginBottom: '1rem' }}>Current URL: {window.location.href}</div>
      <div style={{ marginBottom: '1rem' }}>Pathname: {window.location.pathname}</div>
      <div style={{ marginBottom: '2rem' }}>This proves routing is working</div>
      <a href="/" style={{ 
        background: '#0891b2', 
        padding: '1rem 2rem', 
        borderRadius: '8px',
        textDecoration: 'none',
        color: 'white',
        fontWeight: 'bold'
      }}>
        Go to Landing Page (/)
      </a>
    </div>
  );
}
