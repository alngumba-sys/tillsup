import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

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
  const [loading, setLoading] = useState(true);

  const refreshBranding = async () => {
    try {
      // Add timeout to prevent hanging (increased to 10 seconds for slow connections)
      const fetchPromise = supabase.storage.from('platform-assets').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Branding fetch timeout")), 10000)
      );

      const { data, error } = await Promise.race([
        fetchPromise,
        timeoutPromise
      ]) as any;

      if (error) {
        // If bucket doesn't exist, just ignore silently
        console.debug("Could not fetch platform assets:", error.message);
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
    } catch (err) {
      // Silent fallback - branding is optional
      console.debug("Branding assets not loaded (using defaults):", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
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