import React from "react";
import { useNavigate } from "react-router";
import { Store, ShoppingCart, Mail, Phone, Gift, Headphones, Coffee, Scissors, Dumbbell, ShoppingBag, CheckCircle2, ArrowRight, Pill } from "lucide-react";
import { isPreviewMode } from "../utils/previewMode";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import tillsupLogo from "figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png";

/**
 * ULTRA SIMPLE LANDING PAGE - NO AUTH LOGIC
 * This version has zero dependencies on AuthContext or any complex logic
 * Auth is automatically bypassed for this route for instant load
 * 
 * In Preview Mode: Auto-redirect to dashboard to show the app
 */
export function LandingSimple() {
  const navigate = useNavigate();
  
  // Preview mode: Automatically redirect to dashboard
  React.useEffect(() => {
    if (isPreviewMode()) {
      console.log('🎨 Preview mode detected - redirecting to dashboard');
      navigate('/app/dashboard');
    }
  }, [navigate]);
  
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
      overflow: 'hidden'
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
                animation: `float ${15 + (i % 10)}s infinite ease-in-out`,
                animationDelay: `${i * 0.5}s`
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
          25% { transform: translate(10px, -10px) rotate(5deg); }
          50% { transform: translate(-5px, -20px) rotate(-5deg); }
          75% { transform: translate(-10px, -10px) rotate(3deg); }
        }
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Navigation */}
      <nav style={{
        position: 'relative',
        zIndex: 10,
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ImageWithFallback 
            src={tillsupLogo} 
            alt="Tillsup" 
            style={{ 
              height: '38px',
              width: 'auto'
            }} 
          />
        </div>

        {/* Top Right: Trust Badge + Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Trust Badge */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            fontSize: '13px',
            color: '#94a3b8'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '-8px' }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: `hsl(0, 0%, ${40 + i * 10}%)`,
                  border: '2px solid #0a0e1a',
                  marginLeft: i > 1 ? '-10px' : '0'
                }} />
              ))}
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#1e293b',
                border: '2px solid #0a0e1a',
                marginLeft: '-10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold'
              }}>+2k</div>
            </div>
            <div>
              <div style={{ fontSize: '10px', opacity: 0.7 }}>TRUSTED BY</div>
              <div style={{ fontWeight: 'bold', color: 'white' }}>2,433 businesses</div>
            </div>
          </div>

          {/* Auth Buttons */}
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: '10px 24px',
              color: '#e2e8f0',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '500'
            }}
          >
            Sign In
          </button>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: '10px 24px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '15px',
              fontWeight: '600',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)'
            }}
          >
            Start Free Trial
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        padding: '80px 32px 120px',
        textAlign: 'center',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        {/* Main Heading */}
        <h1 className="text-[13px] font-[Amiko]" style={{
          fontSize: '64px',
          fontWeight: 'bold',
          lineHeight: '1.1',
          marginBottom: '24px',
          letterSpacing: '-0.02em'
        }}>
          The Modern POS That<br />
          <span style={{ color: '#ef4444' }}>Grows</span> With You
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: '20px',
          color: '#94a3b8',
          maxWidth: '800px',
          margin: '0 auto 48px',
          lineHeight: '1.6'
        }}>
          Transform your business operations with our comprehensive platform. Manage sales, inventory, staff, and analytics—all in one powerful system designed for modern enterprises.
        </p>

        {/* CTA Buttons */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '48px'
        }}>
          <button
            onClick={() => navigate("/register")}
            style={{
              padding: '16px 32px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '17px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
            }}
          >
            Start Free Trial
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/who-we-are")}
            style={{
              padding: '16px 32px',
              background: 'transparent',
              color: '#0891b2',
              border: '2px solid #0891b2',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '17px',
              fontWeight: '600'
            }}
          >
            View Pricing
          </button>
          <button
            onClick={() => navigate("/login")}
            style={{
              padding: '16px 32px',
              background: 'transparent',
              color: '#e2e8f0',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '17px',
              fontWeight: '600'
            }}
          >
            Sign In
          </button>
        </div>

        {/* Features List */}
        <div style={{
          display: 'flex',
          gap: '32px',
          justifyContent: 'center',
          fontSize: '15px',
          color: '#94a3b8',
          marginBottom: '80px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            14-day free trial
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            No credit card required
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle2 size={18} color="#10b981" />
            Cancel anytime
          </div>
        </div>

        {/* Industry Categories - Scrolling Marquee */}
        <div style={{
          overflow: 'hidden',
          width: '100%',
          position: 'relative',
          fontSize: '15px',
          opacity: 0.5
        }}>
          <div style={{
            display: 'flex',
            gap: '48px',
            animation: 'scroll 30s linear infinite',
            whiteSpace: 'nowrap'
          }}>
            {/* First set of items */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Coffee size={16} />
              Restaurants & Cafes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Scissors size={16} />
              Salons & Spas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Dumbbell size={16} />
              Gyms & Fitness
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <ShoppingBag size={16} />
              Boutiques
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <ShoppingCart size={16} />
              Groceries
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Pill size={16} />
              Pharmacies
            </div>
            {/* Duplicate set for seamless loop */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Coffee size={16} />
              Restaurants & Cafes
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Scissors size={16} />
              Salons & Spas
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Dumbbell size={16} />
              Gyms & Fitness
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <ShoppingBag size={16} />
              Boutiques
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <ShoppingCart size={16} />
              Groceries
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 'fit-content' }}>
              <Pill size={16} />
              Pharmacies
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}