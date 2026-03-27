import { AlertTriangle, Copy, Check } from "lucide-react";
import { useState } from "react";

interface DatabaseSetupAlertProps {
  error: string;
  onClose?: () => void;
}

export function DatabaseSetupAlert({ error, onClose }: DatabaseSetupAlertProps) {
  const [copied, setCopied] = useState(false);

  // Only show this alert for database setup errors
  const isDatabaseSetupError = error?.includes('DATABASE SETUP REQUIRED') || 
                                 error?.includes('gen_salt') ||
                                 error?.includes('function') && error?.includes('does not exist');

  if (!isDatabaseSetupError) {
    return null;
  }

  const sqlCode = `-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA extensions;

-- Drop old functions if they exist
DROP FUNCTION IF EXISTS public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.admin_reset_staff_password(UUID, TEXT, UUID);

-- Create the password reset function
CREATE OR REPLACE FUNCTION public.simple_reset_staff_password(
  p_user_id UUID,
  p_new_password TEXT,
  p_admin_id UUID,
  p_business_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_target_profile RECORD;
  v_admin_profile RECORD;
BEGIN
  -- Get admin profile
  SELECT * INTO v_admin_profile FROM profiles WHERE id = p_admin_id;
  
  IF v_admin_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Admin not found');
  END IF;
  
  IF v_admin_profile.role NOT IN ('Business Owner', 'Manager') THEN
    RETURN json_build_object('success', false, 'error', 'Insufficient permissions');
  END IF;
  
  -- Get target user profile
  SELECT * INTO v_target_profile FROM profiles WHERE id = p_user_id;
  
  IF v_target_profile IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Staff member not found');
  END IF;
  
  IF v_target_profile.business_id != p_business_id THEN
    RETURN json_build_object('success', false, 'error', 'Cannot reset password for staff in different business');
  END IF;
  
  IF v_target_profile.role = 'Business Owner' AND v_admin_profile.role != 'Business Owner' THEN
    RETURN json_build_object('success', false, 'error', 'Only Business Owner can reset another Business Owner password');
  END IF;
  
  -- Update the password in auth.users (using crypt directly)
  UPDATE auth.users
  SET 
    encrypted_password = crypt(p_new_password, gen_salt('bf')),
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Failed to update password');
  END IF;
  
  -- Mark profile as must_change_password
  UPDATE profiles
  SET must_change_password = true
  WHERE id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Password reset successfully'
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'Function error: ' || SQLERRM
  );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.simple_reset_staff_password(UUID, TEXT, UUID, TEXT) TO service_role;

-- Grant schema usage
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA extensions TO authenticated;
GRANT USAGE ON SCHEMA anon TO authenticated;`;

  const handleCopy = async () => {
    // Method 1: Try Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(sqlCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      } catch (err) {
        console.log('Clipboard API blocked, trying fallback...');
      }
    }
    
    // Method 2: Fallback to execCommand
    try {
      const textArea = document.createElement("textarea");
      textArea.value = sqlCode;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (successful) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        return;
      }
    } catch (err) {
      console.log('execCommand failed:', err);
    }
    
    // Method 3: Show manual selection hint
    alert('Please manually select the SQL code below and press Ctrl+C (or Cmd+C) to copy');
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '800px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: '#dc2626',
          color: 'white',
          padding: '1.5rem',
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <AlertTriangle size={32} />
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              Database Setup Required
            </h2>
            <p style={{ margin: '0.5rem 0 0 0', opacity: 0.9 }}>
              One-time setup (takes 60 seconds)
            </p>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1.5rem' }}>
          <div style={{
            background: '#fef2f2',
            border: '2px solid #fecaca',
            borderRadius: '8px',
            padding: '1rem',
            marginBottom: '1.5rem'
          }}>
            <p style={{ margin: 0, color: '#991b1b', fontWeight: '500' }}>
              ⚠️ Password reset requires a database function that isn't installed yet.
            </p>
          </div>

          <h3 style={{ fontSize: '18px', marginBottom: '1rem', color: '#0891b2' }}>
            ⚡ Quick Fix (3 Steps):
          </h3>

          <ol style={{
            lineHeight: '2',
            fontSize: '15px',
            color: '#374151',
            paddingLeft: '1.5rem'
          }}>
            <li>
              <strong>Go to Supabase:</strong>{' '}
              <a 
                href="https://supabase.com/dashboard" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#0891b2', textDecoration: 'underline' }}
              >
                https://supabase.com/dashboard
              </a>
            </li>
            <li>
              <strong>Open SQL Editor:</strong> Click your project → "SQL Editor" → "+ New query"
            </li>
            <li>
              <strong>Copy, paste & run:</strong> Click the button below to copy the SQL, then paste and click "Run"
            </li>
          </ol>

          {/* SQL Code Block */}
          <div style={{
            background: '#1e293b',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem',
            position: 'relative'
          }}>
            <button
              onClick={handleCopy}
              style={{
                position: 'absolute',
                top: '0.5rem',
                right: '0.5rem',
                background: copied ? '#10b981' : '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy SQL
                </>
              )}
            </button>
            <pre style={{
              margin: 0,
              fontSize: '12px',
              color: '#e2e8f0',
              overflow: 'auto',
              maxHeight: '300px',
              paddingTop: '2rem',
              fontFamily: 'monospace'
            }}>
              {sqlCode}
            </pre>
          </div>

          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1.5rem'
          }}>
            <p style={{ margin: 0, fontSize: '14px', color: '#0c4a6e' }}>
              <strong>✅ After running the SQL:</strong> Close this dialog and try resetting the password again. It will work instantly!
            </p>
          </div>

          {/* Actions */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            marginTop: '1.5rem',
            justifyContent: 'flex-end'
          }}>
            {onClose && (
              <button
                onClick={onClose}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#e5e7eb',
                  color: '#374151',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '15px'
                }}
              >
                Close
              </button>
            )}
            <a
              href="https://supabase.com/dashboard"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                background: '#0891b2',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '15px',
                textDecoration: 'none',
                display: 'inline-block'
              }}
            >
              Open Supabase Dashboard →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}