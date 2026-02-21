import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
// import { motion } from "motion/react";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { 
  CheckCircle, 
  ArrowRight, 
  Users, 
  Target, 
  Heart, 
  Globe, 
  Shield, 
  Zap,
  Sun,
  Moon,
  Menu,
  X
} from "lucide-react";
import logo from "figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png";

export function WhoWeAre() {
  const navigate = useNavigate();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isDark = theme === "dark";
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Background and Text Classes
  const bgClass = isDark ? "bg-slate-950" : "bg-slate-50";
  const textClass = isDark ? "text-slate-50" : "text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-500";
  const glassClass = isDark ? "backdrop-blur-xl bg-slate-950/80 border-b border-white/10" : "backdrop-blur-xl bg-white/80 border-b border-slate-200";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgClass} ${textClass} overflow-x-hidden`}>
      
      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${glassClass} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer select-none" 
              onClick={() => navigate("/")}
            >
              <img src={logo} alt="Tillsup" className="h-8 w-auto object-contain" />
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
            </div>

            {/* Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button 
                onClick={() => navigate("/who-we-are")}
                className={`text-sm font-medium ${isDark ? "text-slate-300 hover:text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                Who We Are
              </button>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className={isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-[#ED363F] hover:bg-[#d92b34] border-0 shadow-lg shadow-red-500/20 text-[#ffffff]"
              >
                Start Free Trial
              </Button>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={isDark ? "hover:bg-white/10" : "hover:bg-slate-100"}
              >
                {mobileMenuOpen ? <X /> : <Menu />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className={`md:hidden p-4 border-t ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => navigate("/who-we-are")}
                className={`text-left text-sm font-medium ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                Who We Are
              </button>
              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className="justify-start"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-[#ED363F] hover:bg-[#d92b34] text-white justify-start"
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[60vh] flex items-center">
        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div 
            className="text-center max-w-3xl mx-auto"
          >
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 tracking-tight font-[Biryani] ${isDark ? "text-white" : "text-slate-900"}`}>
              Building the Future of <span className="text-[#0479A1]">African Commerce</span>
            </h1>
            <p className={`text-lg md:text-xl mb-8 ${subTextClass}`}>
              Tillsup is more than just a POS. We are a technology company dedicated to empowering businesses across the continent with the tools they need to thrive in a digital economy.
            </p>
          </div>
        </div>
        
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
            <div className="absolute top-[20%] left-[10%] w-96 h-96 bg-[#0479A1] rounded-full blur-[128px]" />
            <div className="absolute bottom-[20%] right-[10%] w-96 h-96 bg-[#ED363F] rounded-full blur-[128px]" />
        </div>
      </section>

      {/* Our Mission Section */}
      <section className={`${isDark ? "bg-slate-900/50" : "bg-slate-50"} px-[32px] py-[8px]`}>
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div
                >
                    <img 
                        src="https://images.unsplash.com/photo-1760463921697-6ab2c0caca20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxBZnJpY2FuJTIwZ3JvY2VyeSUyMHN0b3JlJTIwaW50ZXJpb3IlMjBzdXBlcm1hcmtldCUyMHNoZWx2ZXMlMjBGTUNHJTIwc2hvcHxlbnwxfHx8fDE3NzE1ODc3NjV8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral"
                        alt="African FMCG Shop Interior" 
                        className="rounded-2xl shadow-2xl"
                    />
                </div>
                <div
                >
                    <div className="flex items-center gap-2 text-[#ED363F] font-semibold mb-2">
                        <Target className="w-5 h-5" />
                        <span>Our Mission</span>
                    </div>
                    <h2 className={`text-3xl md:text-4xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
                        Empower Every Merchant
                    </h2>
                    <p className={`mb-4 ${subTextClass}`}>
                        We believe that every business owner, from the bustling markets of Lagos to the tech hubs of Nairobi, deserves world-class tools to manage their operations.
                    </p>
                    <p className={`mb-6 ${subTextClass}`}>
                        Our mission is to democratize access to enterprise-grade POS technology, making it accessible, affordable, and easy to use for businesses of all sizes.
                    </p>
                    <ul className="space-y-3">
                        {[
                            "Simplifying complex business operations",
                            "Providing real-time data insights",
                            "Enabling seamless digital payments",
                            "Connecting merchants to global markets"
                        ].map((item, i) => (
                            <li key={i} className="flex items-center gap-3">
                                <CheckCircle className="w-5 h-5 text-[#0479A1]" />
                                <span className={isDark ? "text-slate-300" : "text-slate-700"}>{item}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center mb-16">
            <h2 className={`text-3xl md:text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-slate-900"}`}>
                Core Values
            </h2>
            <p className={`max-w-2xl mx-auto ${subTextClass}`}>
                These are the principles that guide every decision we make at Tillsup.
            </p>
        </div>

        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
            {[
                {
                    icon: Shield,
                    title: "Trust & Reliability",
                    desc: "We build systems you can count on. Your business data is secure, and our uptime is industry-leading.",
                    color: "text-[#0479A1]"
                },
                {
                    icon: Zap,
                    title: "Innovation",
                    desc: "We are constantly pushing the boundaries of what's possible in retail technology to give you an edge.",
                    color: "text-[#ED363F]"
                },
                {
                    icon: Heart,
                    title: "Customer Obsession",
                    desc: "Your success is our success. We listen, learn, and adapt to meet the unique needs of your business.",
                    color: "text-purple-500"
                }
            ].map((value, i) => (
                <div
                    key={i}
                    className={`p-8 rounded-2xl border ${isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200 shadow-sm"}`}
                >
                    <div className={`w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-6 ${value.color}`}>
                        <value.icon className="w-6 h-6" />
                    </div>
                    <h3 className={`text-xl font-bold mb-3 ${isDark ? "text-white" : "text-slate-900"}`}>{value.title}</h3>
                    <p className={subTextClass}>{value.desc}</p>
                </div>
            ))}
        </div>
      </section>



      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto relative">
             <div className="absolute inset-0 bg-[#ED363F]/10 blur-[100px] rounded-full" />
             <div className="relative z-10">
                <h2 className={`text-3xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}>
                    Ready to grow your business?
                </h2>
                <p className={`text-xl mb-8 ${subTextClass}`}>
                    Join thousands of merchants using Tillsup to power their operations.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Button 
                        size="lg" 
                        className="bg-[#ED363F] hover:bg-[#d92b34] text-white px-8 h-12 text-lg"
                        onClick={() => navigate("/register")}
                    >
                        Start Your Free Trial
                    </Button>
                    <Button 
                        size="lg" 
                        variant="outline"
                        className={`px-8 h-12 text-lg ${isDark ? "border-white/10 hover:bg-white/10" : ""}`}
                        onClick={() => navigate("/")}
                    >
                        View Features
                    </Button>
                </div>
             </div>
        </div>
      </section>

      {/* Footer (Simplified) */}
      <footer className={`py-12 border-t ${isDark ? "border-white/10 bg-slate-950" : "border-slate-200 bg-white"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center items-center gap-2 mb-4 opacity-50">
                 <img src={logo} alt="Tillsup" className="h-6 w-auto object-contain" />
            </div>
            <p className={`text-sm ${subTextClass}`}>
                &copy; {new Date().getFullYear()} Tillsup Inc. All rights reserved.
            </p>
        </div>
      </footer>

    </div>
  );
}