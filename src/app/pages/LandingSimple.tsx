import React from "react";
import { useNavigate } from "react-router";
import { Store, ShoppingCart, Mail, Phone, Gift, Headphones, Coffee, Scissors, Dumbbell, ShoppingBag, CheckCircle2, ArrowRight, Pill } from "lucide-react";
import { isPreviewMode } from "../utils/previewMode";
import { TillsupLogo } from "../components/TillsupLogo";

/**
 * ULTRA SIMPLE LANDING PAGE - NO AUTH LOGIC
 * This version has zero dependencies on AuthContext or any complex logic
 * Auth is automatically bypassed for this route for instant load
 * 
 * In Preview Mode: Auto-redirect to dashboard to show the app
 * 
 * ═══════════════════════════════════════════════════════════════════
 * ADMIN ACCESS EASTER EGG
 * ═══════════════════════════════════════════════════════════════════
 * 
 * How to access Admin Panel:
 * 1. Click the Tillsup logo 5 times within 2 seconds
 * 2. You'll be redirected to /admin-login
 * 3. Enter password: Tillsup@2026
 * 4. Access granted to /admin-hidden (Admin Dashboard)
 * 
 * Admin Dashboard Features:
 * - Upload/Change Platform Logos (Main & Dark Mode)
 * - Upload/Change Favicon
 * - Upload/Change Auth Background
 * - Upload/Change Social Share Image (OG Image)
 * - View all uploaded assets in the platform-assets bucket
 * - Monitor business analytics and metrics
 */
export function LandingSimple() {
  const navigate = useNavigate();
  const [adminClicks, setAdminClicks] = React.useState(0);
  
  // Preview mode: Automatically redirect to dashboard
  React.useEffect(() => {
    if (isPreviewMode()) {
      console.log('🎨 Preview mode detected - redirecting to dashboard');
      navigate('/app/dashboard');
    }
  }, [navigate]);

  // Reset click counter after 2 seconds of inactivity
  React.useEffect(() => {
    if (adminClicks > 0) {
      const timer = setTimeout(() => setAdminClicks(0), 2000);
      return () => clearTimeout(timer);
    }
  }, [adminClicks]);

  // Handle logo clicks for admin access (5 clicks)
  const handleLogoClick = () => {
    const newCount = adminClicks + 1;
    setAdminClicks(newCount);
    
    if (newCount === 5) {
      navigate('/admin-login');
      setAdminClicks(0);
    }
  };
  
  // Background icons that float around
  const backgroundIcons = [
    ShoppingCart, Mail, Phone, Gift, Headphones, Coffee, 
    Store, Scissors, Dumbbell, ShoppingBag
  ];
  
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0e1a',
      color: 'white',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Animated Background Icons */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.05,
        pointerEvents: 'none',
        zIndex: 0
      }}>
        {Array.from({ length: 40 }).map((_, i) => {
          const Icon = backgroundIcons[i % backgroundIcons.length];
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: `${(i * 13) % 100}%`,
                top: `${(i * 17) % 100}%`,
                animation: `float ${12 + (i % 8)}s infinite ease-in-out ${i * 0.5}s`
              }}
            >
              <Icon size={24} />
            </div>
          );
        })}
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          25% { transform: translate(12px, -12px) rotate(5deg); }
          50% { transform: translate(-6px, -24px) rotate(-5deg); }
          75% { transform: translate(-12px, -12px) rotate(3deg); }
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }

        /* Responsive Navigation */
        .landing-nav {
          position: relative;
          z-index: 10;
          padding: clamp(1rem, 3vw, 1.5rem) clamp(1rem, 4vw, 2rem);
          display: flex;
          justify-content: space-between;
          align-items: center;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .landing-nav-actions {
          display: flex;
          align-items: center;
          gap: clamp(0.75rem, 2vw, 1.5rem);
          flex-wrap: wrap;
        }

        .trust-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: clamp(11px, 1.5vw, 13px);
          color: #94a3b8;
        }

        .trust-badge-text {
          font-size: 10px;
          opacity: 0.7;
        }

        .trust-badge-count {
          font-weight: bold;
          color: white;
          font-size: clamp(11px, 1.5vw, 13px);
        }

        /* Hide trust badge on small mobile */
        @media (max-width: 640px) {
          .trust-badge {
            display: none;
          }
        }

        /* Responsive Buttons */
        .btn-nav {
          padding: clamp(8px, 1.5vw, 10px) clamp(16px, 3vw, 24px);
          border-radius: 6px;
          cursor: pointer;
          font-size: clamp(13px, 2vw, 15px);
          font-weight: 500;
          white-space: nowrap;
          transition: all 0.2s;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .btn-nav:hover {
          transform: translateY(-1px);
        }

        .btn-primary {
          background: #ef4444;
          color: white;
          border: none;
          font-weight: 600;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
        }

        .btn-secondary {
          color: #e2e8f0;
          background: transparent;
          border: 1px solid rgba(255,255,255,0.2);
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          z-index: 5;
          padding: clamp(40px, 8vw, 80px) clamp(20px, 4vw, 32px) clamp(60px, 10vw, 120px);
          text-align: center;
          max-width: 1100px;
          width: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-title {
          font-size: clamp(32px, 8vw, 64px);
          font-weight: bold;
          line-height: 1.1;
          margin-bottom: clamp(16px, 3vw, 24px);
          letter-spacing: -0.02em;
          max-width: 100%;
          font-family: 'Biryani', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .hero-subtitle {
          font-size: clamp(16px, 2.5vw, 20px);
          color: #94a3b8;
          max-width: 800px;
          width: 100%;
          margin: 0 auto clamp(32px, 5vw, 48px);
          line-height: 1.6;
          padding: 0 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        /* CTA Buttons Container */
        .cta-buttons {
          display: flex;
          gap: clamp(12px, 2vw, 16px);
          justify-content: center;
          align-items: center;
          margin-bottom: clamp(32px, 5vw, 48px);
          flex-wrap: wrap;
          width: 100%;
          max-width: 100%;
          padding: 0 1rem;
        }

        .btn-cta {
          padding: clamp(12px, 2vw, 16px) clamp(20px, 4vw, 32px);
          border-radius: 8px;
          cursor: pointer;
          font-size: clamp(15px, 2vw, 17px);
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          white-space: nowrap;
          flex: 0 1 auto;
          min-width: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .btn-cta:hover {
          transform: translateY(-2px);
        }

        .btn-cta-primary {
          background: #ef4444;
          color: white;
          border: none;
          box-shadow: 0 8px 24px rgba(239, 68, 68, 0.4);
        }

        .btn-cta-outline {
          background: transparent;
          color: #0891b2;
          border: 2px solid #0891b2;
          font-weight: 600;
        }

        .btn-cta-ghost {
          background: transparent;
          color: #e2e8f0;
          border: 2px solid rgba(255,255,255,0.2);
          font-weight: 600;
        }

        /* Stack buttons on mobile */
        @media (max-width: 640px) {
          .cta-buttons {
            flex-direction: column;
            width: 100%;
          }
          .btn-cta {
            width: 100%;
            max-width: 100%;
            justify-content: center;
          }
        }

        /* Features List */
        .features-list {
          display: flex;
          gap: clamp(16px, 4vw, 32px);
          justify-content: center;
          font-size: clamp(13px, 2vw, 15px);
          color: #94a3b8;
          margin-bottom: clamp(40px, 8vw, 80px);
          flex-wrap: wrap;
          padding: 0 1rem;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        @media (max-width: 480px) {
          .features-list {
            flex-direction: column;
            align-items: center;
          }
        }

        /* Logo Responsive Sizing */
        .landing-logo {
          height: clamp(28px, 5vw, 38px);
          width: auto;
        }

        .logo-fallback {
          display: flex;
          align-items: center;
          gap: clamp(8px, 2vw, 12px);
        }

        .logo-icon {
          background: #0891b2;
          padding: clamp(4px, 1vw, 6px) clamp(6px, 1.5vw, 8px);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text {
          font-size: clamp(18px, 3vw, 22px);
          font-weight: bold;
          color: #0891b2;
          letter-spacing: -0.02em;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        /* Avatar circles */
        .avatar-circle {
          width: clamp(24px, 4vw, 28px);
          height: clamp(24px, 4vw, 28px);
          border-radius: 50%;
          border: 2px solid #0a0e1a;
          margin-left: -10px;
        }

        .avatar-circle:first-child {
          margin-left: 0;
        }

        /* Marquee Container */
        .marquee-container {
          overflow: hidden;
          width: 100%;
          position: relative;
          font-size: clamp(13px, 2vw, 15px);
          opacity: 0.5;
          padding: 0 1rem;
        }

        .marquee-content {
          display: flex;
          gap: clamp(24px, 5vw, 48px);
          animation: scroll 30s linear infinite;
          white-space: nowrap;
        }

        .marquee-item {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: fit-content;
        }

        .admin-click-pulse {
          animation: clickPulse 0.3s ease-out;
        }

        @keyframes clickPulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Navigation */}
      <nav className="landing-nav">
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          <TillsupLogo 
            height={48}
            className="landing-logo"
            onClick={handleLogoClick}
            style={{ 
              transition: 'transform 0.2s',
            }}
          />
        </div>

        {/* Top Right: Trust Badge + Buttons */}
        <div className="landing-nav-actions">
          {/* Trust Badge */}
          <div className="trust-badge">
            <div style={{ display: 'flex', alignItems: 'center', gap: '-8px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="avatar-circle" style={{
                  background: `hsl(0, 0%, ${40 + i * 10}%)`
                }} />
              ))}
              <div className="avatar-circle" style={{
                background: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 'clamp(9px, 1.5vw, 11px)',
                fontWeight: 'bold'
              }}>+2k</div>
            </div>
            <div>
              <div className="trust-badge-text">TRUSTED BY</div>
              <div className="trust-badge-count">2,433 businesses</div>
            </div>
          </div>

          {/* Auth Buttons */}
          <button
            onClick={() => navigate("/login")}
            className="btn-nav btn-secondary"
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="btn-nav btn-primary"
          >
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="hero-section">
        {/* Main Heading */}
        <h1 className="hero-title font-[Biryani]">
          The Modern POS That<br />
          <span style={{ color: '#ef4444' }}>Grows</span> With You
        </h1>

        {/* Subtitle */}
        <p className="hero-subtitle">
          Transform your business operations with our comprehensive platform. Manage sales, inventory, staff, and analytics—all in one powerful system designed for modern enterprises.
        </p>

        {/* CTA Buttons */}
        <div className="cta-buttons">
          <button
            onClick={() => navigate("/register")}
            className="btn-cta btn-cta-primary"
          >
            Start Free Trial
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/who-we-are")}
            className="btn-cta btn-cta-outline"
          >
            View Pricing
          </button>
          <button
            onClick={() => navigate("/login")}
            className="btn-cta btn-cta-ghost"
          >
            Sign In
          </button>
        </div>

        {/* Features List */}
        <div className="features-list">
          <div className="feature-item">
            <CheckCircle2 size={18} color="#10b981" />
            14-day free trial
          </div>
          <div className="feature-item">
            <CheckCircle2 size={18} color="#10b981" />
            No credit card required
          </div>
          <div className="feature-item">
            <CheckCircle2 size={18} color="#10b981" />
            Cancel anytime
          </div>
        </div>

        {/* Industry Categories - Scrolling Marquee */}
        <div className="marquee-container">
          <div className="marquee-content">
            {/* First set of items */}
            <div className="marquee-item">
              <Coffee size={16} />
              Restaurants & Cafes
            </div>
            <div className="marquee-item">
              <Scissors size={16} />
              Salons & Spas
            </div>
            <div className="marquee-item">
              <Dumbbell size={16} />
              Gyms & Fitness
            </div>
            <div className="marquee-item">
              <ShoppingBag size={16} />
              Boutiques
            </div>
            <div className="marquee-item">
              <ShoppingCart size={16} />
              Groceries
            </div>
            <div className="marquee-item">
              <Pill size={16} />
              Pharmacies
            </div>
            {/* Duplicate set for seamless loop */}
            <div className="marquee-item">
              <Coffee size={16} />
              Restaurants & Cafes
            </div>
            <div className="marquee-item">
              <Scissors size={16} />
              Salons & Spas
            </div>
            <div className="marquee-item">
              <Dumbbell size={16} />
              Gyms & Fitness
            </div>
            <div className="marquee-item">
              <ShoppingBag size={16} />
              Boutiques
            </div>
            <div className="marquee-item">
              <ShoppingCart size={16} />
              Groceries
            </div>
            <div className="marquee-item">
              <Pill size={16} />
              Pharmacies
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}