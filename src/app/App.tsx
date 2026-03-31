/**
 * Tillsup POS Application - Main Entry Point
 * Enterprise POS SaaS with Supabase integration
 */

import { RouterProvider } from "react-router";
import { router } from "./AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider, useBranding } from "./contexts/BrandingContext";
import { Toaster } from "./components/ui/sonner";
import { isPreviewMode } from "./utils/previewMode";
import { useEffect } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FigmaErrorFilter } from "./components/FigmaErrorFilter";

console.log("📦 App.tsx loaded - Initializing Tillsup POS");

// Component to handle dynamic favicon updates
function FaviconUpdater() {
  const { assets } = useBranding();

  useEffect(() => {
    if (assets.favicon) {
      // Update the favicon dynamically
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");

      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }

      link.href = assets.favicon;
      console.log("✅ Favicon updated:", assets.favicon);
    }
  }, [assets.favicon]);

  return null;
}

export default function App() {
  console.log("✅ App() component rendering");
  console.log("📌 Tillsup Version: 2.0.1 - Auth Init Warning Fix Applied");

  // Log preview mode status
  useEffect(() => {
    if (isPreviewMode()) {
      console.log("🎨 PREVIEW MODE ACTIVE - Using mock data, Supabase calls disabled");
    } else {
      console.log("🚀 PRODUCTION MODE - Using real Supabase connection");
    }

    // IMMEDIATE loader removal - don't wait
    const loader = document.getElementById('initial-loader');
    if (loader) {
      loader.style.display = 'none';
      console.log('✅ Loader hidden IMMEDIATELY from App.tsx');
    }
  }, []);

  // Add a safety render check
  console.log("📋 App returning JSX...");

  return (
    <ErrorBoundary>
      <FigmaErrorFilter />

      <AuthProvider>
        <BrandingProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </BrandingProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}