import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { isPreviewMode } from "../utils/previewMode";

interface BrandingAssets {
  logoMain: string | null;
  logoDark: string | null;
  logoFooter: string | null;
  favicon: string | null;
  authBg: string | null;
  ogImage: string | null;
}

interface BrandingContextType {
  assets: BrandingAssets;
  refreshBranding: () => Promise<void>;
  loading: boolean;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [assets, setAssets] = useState<BrandingAssets>({
    logoMain: null,
    logoDark: null,
    logoFooter: null,
    favicon: null,
    authBg: null,
    ogImage: null,
  });
  const [loading, setLoading] = useState(false); // Changed to false - don't block rendering

  const refreshBranding = async () => {
    // Don't load branding in preview mode
    if (isPreviewMode()) {
      console.debug('🎨 Preview mode: Skipping branding asset fetch');
      setLoading(false);
      return;
    }

    try {
      console.debug('🎨 Fetching branding assets...');
      
      // Add AbortController with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

      const { data, error } = await supabase.storage
        .from('platform-assets')
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        })
        .finally(() => clearTimeout(timeoutId));

      if (error) {
        // If bucket doesn't exist, just ignore silently
        console.debug("ℹ️ Platform assets not available:", error.message);
        return;
      }

      const files = data || [];
      const getUrl = (prefix: string) => {
        const file = files.find(f => f.name.startsWith(prefix));
        if (!file) return null;
        return supabase.storage.from('platform-assets').getPublicUrl(file.name).data.publicUrl;
      };

      setAssets({
        logoMain: getUrl('platform-logo-main'),
        logoDark: getUrl('platform-logo-dark'),
        logoFooter: getUrl('platform-logo-footer'),
        favicon: getUrl('platform-favicon'),
        authBg: getUrl('platform-auth-bg'),
        ogImage: getUrl('platform-og-image'),
      });
      
      console.debug('✅ Branding assets loaded');
    } catch (err: any) {
      // Silent fallback - branding is optional
      // Don't log abort errors
      if (err.name !== 'AbortError') {
        console.debug("ℹ️ Branding assets not loaded (using defaults):", err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load branding assets in background - don't block rendering
    refreshBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ assets, refreshBranding, loading }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}