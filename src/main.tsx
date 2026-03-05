import { createRoot } from 'react-dom/client';
import App from './app/App';

// VERSION TIMESTAMP - Forces browser to reload on code changes
console.log('🔥🔥🔥 MAIN.TSX LOADED - TIMESTAMP:', new Date().toISOString());
console.log('🎯 Starting app render...');

// Import CSS after logging to not block
import('./styles/index.css').catch(err => {
  console.warn('⚠️ CSS import failed (non-critical):', err);
});

const rootElement = document.getElementById('root');

console.log('📍 Root element found:', !!rootElement);

if (!rootElement) {
  console.error('❌ Root element not found!');
  document.body.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dc2626;
      color: white;
      font-family: system-ui;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="font-size: 48px; margin-bottom: 1rem;">⚠️</h1>
        <h2>Root Element Not Found</h2>
        <p>The #root div is missing from index.html</p>
      </div>
    </div>
  `;
  throw new Error('Root element not found');
}

console.log('🚀 Creating React root...');

try {
  const root = createRoot(rootElement);
  console.log('✅ React root created');
  
  console.log('🎨 Rendering App component...');
  root.render(<App />);
  console.log('✅ App component render called');
} catch (error) {
  console.error('❌ Critical error during render:', error);
  rootElement.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: #dc2626;
      color: white;
      font-family: system-ui;
      text-align: center;
      padding: 2rem;
    ">
      <div>
        <h1 style="font-size: 48px; margin-bottom: 1rem;">⚠️</h1>
        <h2>Render Error</h2>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <button 
          onclick="window.location.reload()" 
          style="
            margin-top: 1rem;
            padding: 12px 24px;
            background: white;
            color: #dc2626;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
          "
        >
          Reload Page
        </button>
      </div>
    </div>
  `;
}
