/**
 * Tillsup POS Application - Main Entry Point
 * Enterprise POS SaaS with Supabase integration
 */

import { RouterProvider } from "react-router";
import { router } from "./AppRoutes";
import { AuthProvider } from "./contexts/AuthContext";
import { BrandingProvider } from "./contexts/BrandingContext";
import { Toaster } from "./components/ui/sonner";
import { isPreviewMode } from "./utils/previewMode";
import { useEffect } from "react";

console.log("📦 App.tsx loaded - Initializing Tillsup POS");

export default function App() {
  console.log("✅ App() component rendering");

  // Log preview mode status
  useEffect(() => {
    if (isPreviewMode()) {
      console.log("🎨 PREVIEW MODE ACTIVE - Using mock data, Supabase calls disabled");
    } else {
      console.log("🚀 PRODUCTION MODE - Using real Supabase connection");
    }
  }, []);

  return (
    <>
      <AuthProvider>
        <BrandingProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" />
        </BrandingProvider>
      </AuthProvider>
    </>
  );
}
