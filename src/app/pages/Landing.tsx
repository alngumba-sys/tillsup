import { useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { Store, BarChart3, Users, ShoppingCart, TrendingUp, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Landing() {
  console.log("🏠🏠🏠 LANDING PAGE COMPONENT IS RENDERING 🏠🏠🏠");
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [forceShow, setForceShow] = useState(false);

  console.log("🏠 Landing - isAuthenticated:", isAuthenticated, "loading:", loading);

  // TEMPORARILY DISABLED AUTO-REDIRECT FOR DEBUGGING
  // Redirect authenticated users to dashboard (unless forceShow is enabled)
  // useEffect(() => {
  //   // Check URL parameter to force show landing page
  //   const urlParams = new URLSearchParams(window.location.search);
  //   if (urlParams.get('show') === 'true') {
  //     console.log("🏠 Force show enabled via URL parameter");
  //     setForceShow(true);
  //     return;
  //   }

  //   if (!loading && isAuthenticated && !forceShow) {
  //     console.log("🏠 Redirecting authenticated user to dashboard");
  //     navigate("/app/dashboard", { replace: true });
  //   } else {
  //     console.log("🏠 Showing landing page - authenticated:", isAuthenticated, "loading:", loading, "forceShow:", forceShow);
  //   }
  // }, [isAuthenticated, loading, navigate, forceShow]);

  const features = [
    {
      icon: ShoppingCart,
      title: "Point of Sale",
      description: "Fast, intuitive checkout experience with offline support"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Real-time insights into sales, inventory, and business performance"
    },
    {
      icon: Users,
      title: "Staff Management",
      description: "Track attendance, shifts, and performance with geolocation"
    },
    {
      icon: TrendingUp,
      title: "Inventory Control",
      description: "Smart stock management with low-stock alerts and forecasting"
    },
    {
      icon: Shield,
      title: "Role-Based Access",
      description: "Secure multi-branch operations with granular permissions"
    },
    {
      icon: Store,
      title: "Multi-Branch",
      description: "Manage multiple locations from a single dashboard"
    }
  ];

  console.log("🏠 Rendering Landing page HTML...");

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-[#0891b2] p-2 rounded-lg">
                <Store className="w-6 h-6" />
              </div>
              <span className="text-xl font-bold">Tillsup</span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate("/app/dashboard")}
                  className="px-6 py-2 bg-[#0891b2] hover:bg-[#0e7490] rounded-lg font-semibold transition-all shadow-md hover:shadow-lg font-[Mulish]"
                >
                  Go to Dashboard
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate("/login")}
                    className="px-4 py-2 text-slate-300 hover:text-white transition-colors font-[Mulish]"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => navigate("/register")}
                    className="px-6 py-2 bg-[#ED363F] hover:bg-red-600 rounded-lg font-semibold transition-colors font-[Mulish]"
                  >
                    Get Started
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 text-blue-400 font-[Mulish]">
            Modern POS for<br />African Businesses
          </h1>
          <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto font-[Mulish]">
            Enterprise-grade point of sale system with real-time analytics, inventory management, and multi-branch support.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 bg-[#ED363F] hover:bg-red-600 rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40 font-[Mulish]"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate("/who-we-are")}
              className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-lg rounded-xl font-semibold text-lg transition-colors border border-white/20 font-[Mulish]"
            >
              Learn More
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 text-center">
              <Store className="w-8 h-8 text-white mb-3 mx-auto" strokeWidth={2} />
              <div className="font-bold text-cyan-400 font-[Mulish] text-[40px]">2,400+</div>
              <div className="text-slate-400 mt-2">Active Businesses</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 text-center">
              <TrendingUp className="w-8 h-8 text-white mb-3 mx-auto" strokeWidth={2} />
              <div className="text-4xl font-[Mulish] text-[#ffffff] font-bold">15K+</div>
              <div className="text-slate-400 mt-2">Daily Transactions</div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 text-center">
              <Shield className="w-8 h-8 text-white mb-3 mx-auto" strokeWidth={2} />
              <div className="text-4xl font-bold text-[#00d3f3] font-[Mulish]">99.9%</div>
              <div className="text-slate-400 mt-2">Uptime</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4 font-[Mulish]">Everything You Need</h2>
          <p className="text-slate-400 text-center mb-12 text-lg font-[Mulish]">
            Powerful features to grow your business
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white/5 backdrop-blur-lg rounded-2xl p-8 border border-white/10 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-500/10"
                >
                  <div className="bg-cyan-600 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-slate-400">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-blue-600/20 rounded-3xl p-12 border border-cyan-500/30 backdrop-blur-lg">
            <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-slate-300 text-lg mb-8">
              Join thousands of businesses modernizing their operations with Tillsup
            </p>
            <button
              onClick={() => navigate("/register")}
              className="px-8 py-4 bg-[#ED363F] hover:bg-red-600 rounded-xl font-bold text-lg transition-all shadow-lg shadow-red-500/20 hover:shadow-red-500/40"
            >
              Create Your Account
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-[#0891b2] p-1.5 rounded">
              <Store className="w-4 h-4" />
            </div>
            <span className="text-slate-400 text-sm font-semibold">Tillsup</span>
          </div>
          <div className="text-slate-400 text-sm">
            © 2026 Tillsup. Enterprise POS for Africa.
          </div>
        </div>
      </footer>
    </div>
  );
}