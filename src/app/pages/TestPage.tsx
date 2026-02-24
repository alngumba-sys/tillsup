export function TestPage() {
  return (
    <div style={{ 
      backgroundColor: 'red', 
      color: 'white', 
      padding: '50px', 
      fontSize: '30px',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      <h1>TEST PAGE - If you can see this, routing works!</h1>
      <p>Date: {new Date().toISOString()}</p>
      <p>Random: {Math.random()}</p>
    </div>
  );
}
