import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Store } from "lucide-react";

export function SimpleLanding() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8 max-w-4xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="bg-[#ED363F] p-4 rounded-xl shadow-lg">
            <Store className="w-12 h-12" strokeWidth={2.5} />
          </div>
          <h1 className="text-5xl font-bold">Tillsup</h1>
        </div>

        {/* Headline */}
        <div className="space-y-4">
          <h2 className="text-4xl md:text-6xl font-bold">
            Modern POS System for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ED363F] to-rose-400">
              African Businesses
            </span>
          </h2>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Streamline your retail operations with powerful inventory management, 
            real-time reporting, and secure payment processing.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8">
          <Button
            size="lg"
            className="bg-[#ED363F] hover:bg-red-700 text-white px-8 py-6 text-lg font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            onClick={() => navigate("/register")}
          >
            Start Free Trial
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white px-8 py-6 text-lg font-semibold rounded-xl backdrop-blur-sm"
            onClick={() => navigate("/login")}
          >
            Sign In
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-xl mb-2">⚡ Lightning Fast</h3>
            <p className="text-slate-300">
              Process transactions in seconds with our optimized POS terminal
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-xl mb-2">📦 Inventory Control</h3>
            <p className="text-slate-300">
              Real-time stock tracking with low inventory alerts
            </p>
          </div>
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
            <h3 className="font-semibold text-xl mb-2">📊 Smart Analytics</h3>
            <p className="text-slate-300">
              Make data-driven decisions with comprehensive reports
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
