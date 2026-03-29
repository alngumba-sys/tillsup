import React from "react";

interface TillsupLogoProps {
  className?: string;
  width?: number;
  height?: number;
  style?: React.CSSProperties;
  onClick?: () => void;
}

/**
 * Tillsup Logo Component - SVG-based logo that works in all environments
 * Uses Tillsup brand color #00719C
 */
export function TillsupLogo({ className, width, height, style, onClick }: TillsupLogoProps) {
  return (
    <svg
      width={width || "auto"}
      height={height || 48}
      viewBox="0 0 200 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ ...style, cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
    >
      {/* Icon - Stylized cash register/POS terminal */}
      <g>
        {/* Base */}
        <rect x="4" y="32" width="32" height="8" rx="2" fill="#00719C" />
        
        {/* Screen/Display */}
        <rect x="8" y="12" width="24" height="18" rx="2" fill="#00719C" />
        <rect x="11" y="15" width="18" height="12" rx="1" fill="white" fillOpacity="0.9" />
        
        {/* Display lines (receipt lines) */}
        <line x1="13" y1="18" x2="27" y2="18" stroke="#00719C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="21" x2="24" y2="21" stroke="#00719C" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="13" y1="24" x2="26" y2="24" stroke="#00719C" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Shine effect */}
        <circle cx="28" cy="15" r="2" fill="white" fillOpacity="0.4" />
      </g>
      
      {/* Text - "Tillsup" */}
      <g transform="translate(48, 0)">
        {/* T */}
        <path d="M 4 10 L 16 10 M 10 10 L 10 34" stroke="#00719C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* i */}
        <circle cx="23" cy="12" r="2" fill="#00719C" />
        <line x1="23" y1="18" x2="23" y2="34" stroke="#00719C" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* l */}
        <line x1="32" y1="10" x2="32" y2="34" stroke="#00719C" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* l */}
        <line x1="41" y1="10" x2="41" y2="34" stroke="#00719C" strokeWidth="3.5" strokeLinecap="round" />
        
        {/* s */}
        <path 
          d="M 54 20 Q 48 18 48 23 Q 48 26 52 27 Q 56 28 56 31 Q 56 34 50 34" 
          stroke="#00719C" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          fill="none"
        />
        
        {/* u */}
        <path 
          d="M 64 18 L 64 28 Q 64 34 70 34 Q 76 34 76 28 L 76 18" 
          stroke="#00719C" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          fill="none"
        />
        
        {/* p */}
        <path 
          d="M 84 18 L 84 40 M 84 23 Q 84 18 89 18 Q 94 18 94 23 Q 94 28 89 28 Q 84 28 84 23" 
          stroke="#00719C" 
          strokeWidth="3.5" 
          strokeLinecap="round" 
          fill="none"
        />
      </g>
      
      {/* Tagline/Subtitle (optional - can be hidden on smaller sizes) */}
      <text 
        x="48" 
        y="44" 
        fill="#64748b" 
        fontSize="8" 
        fontFamily="system-ui, -apple-system, sans-serif"
        letterSpacing="0.5"
      >
        POINT OF SALE SYSTEM
      </text>
    </svg>
  );
}

/**
 * Alternative: Simple text-based logo for when you just need the name
 */
export function TillsupLogoText({ className, style }: Omit<TillsupLogoProps, 'width' | 'height'>) {
  return (
    <div className={className} style={style}>
      <span style={{ 
        fontSize: '2rem', 
        fontWeight: 'bold', 
        color: '#00719C',
        letterSpacing: '-0.02em'
      }}>
        Tillsup
      </span>
    </div>
  );
}