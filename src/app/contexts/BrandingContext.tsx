import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";

interface BrandingAssets {
  logoMain: string | null;
  logoDark: string | null;
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
    favicon: null,
    authBg: null,
    ogImage: null,
  });
  const [loading, setLoading] = useState(true);

  const refreshBranding = async () => {
    try {
      const { data, error } = await supabase.storage.from('platform-assets').list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      });

      if (error) {
        // If bucket doesn't exist, just ignore
        console.warn("Could not fetch platform assets:", error.message);
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
        favicon: getUrl('platform-favicon'),
        authBg: getUrl('platform-auth-bg'),
        ogImage: getUrl('platform-og-image'),
      });
    } catch (err) {
      console.error("Error loading branding assets:", err);
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
