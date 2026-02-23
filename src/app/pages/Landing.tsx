import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Switch } from "../components/ui/switch";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { SUBSCRIPTION_PLANS } from "../utils/subscription";
import {
  Store,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  TrendingUp,
  Shield,
  Clock,
  Zap,
  Building2,
  Receipt,
  Truck,
  Target,
  Menu,
  X,
  Sun,
  Moon,
  Globe,
  MessageSquare,
  Sparkles,
  Play,
  ShoppingBag,
  CreditCard,
  Tag,
  Percent,
  Smartphone,
  Monitor,
  Printer,
  ScanBarcode,
  DollarSign,
  Calculator,
  Calendar,
  MapPin,
  Phone,
  Mail,
  Award,
  Gift,
  Lock,
  Key,
  Settings,
  Sliders,
  Camera,
  Headphones,
  Speaker,
  Wifi,
  Battery,
  Bluetooth,
  Database,
  Server,
  HardDrive,
  Cloud,
  ShoppingBasket,
  BadgePercent,
  Banknote,
  Wallet,
  Coins,
  QrCode,
  Scale,
  Utensils,
  Coffee,
  Pizza,
  Wine,
  Beer,
  Apple,
  Carrot,
  Fish,
  Milk,
  IceCream,
  Croissant,
  Shirt,
  Watch,
  Gem,
  Megaphone,
  Scissors,
  Dumbbell,
  Pill,
  BookOpen,
  Car,
  Wrench
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";

export function Landing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { assets } = useBranding();
  
  console.log('🏠 Landing page loaded, isAuthenticated:', isAuthenticated);
  
  // Redirect authenticated users to the app
  useEffect(() => {
    if (isAuthenticated) {
      console.log('🔀 Redirecting to dashboard...');
      navigate("/app/dashboard");
    }
  }, [isAuthenticated, navigate]);
  
  // Real-time Statistics
  const [businessCount, setBusinessCount] = useState(2431);
  const [currentSignup, setCurrentSignup] = useState(0);

  const recentSignups = [
    { name: "Lagos Market Hub", location: "Lagos, Nigeria", flag: "🇳🇬" },
    { name: "Kofi Electronics", location: "Accra, Ghana", flag: "🇬🇭" },
    { name: "Safari Bistro", location: "Nairobi, Kenya", flag: "🇰🇪" },
    { name: "Cape Traders", location: "Cape Town, South Africa", flag: "🇿🇦" },
    { name: "Kigali Crafts", location: "Kigali, Rwanda", flag: "🇷🇼" },
    { name: "Atlas Fabrics", location: "Casablanca, Morocco", flag: "🇲🇦" },
    { name: "Dar es Salaam Spices", location: "Tanzania", flag: "🇹🇿" },
    { name: "Kampala Coffee", location: "Uganda", flag: "🇺🇬" },
  ];

  useEffect(() => {
    // Increment total business count slowly
    const countInterval = setInterval(() => {
      setBusinessCount(prev => prev + 1);
    }, 8000);

    // Rotate recent signups
    const signupInterval = setInterval(() => {
      setCurrentSignup(prev => (prev + 1) % recentSignups.length);
    }, 4000);

    return () => {
      clearInterval(countInterval);
      clearInterval(signupInterval);
    };
  }, []);
  
  // Theme State
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const isDark = theme === "dark";

  // Dialog States
  const [contactOpen, setContactOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  // Admin Secret
  const [logoClicks, setLogoClicks] = useState(0);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        setAdminLoginOpen(true);
        return 0; // Reset
      }
      return newCount;
    });
  };

  const handleAdminLogin = () => {
    if (adminUsername === "Admin" && adminPassword === "Tillsup@2026") {
      toast.success("Welcome, Super Admin");
      setAdminLoginOpen(false);
      navigate("/admin-hidden");
    } else {
      toast.error("Invalid credentials");
    }
  };

  const features = [
    {
      icon: ShoppingCart,
      title: "POS & Checkout",
      description: "Lightning-fast point of sale terminal with intuitive cart management and seamless checkout experience.",
      color: "text-blue-500"
    },
    {
      icon: Package,
      title: "Inventory Management",
      description: "Real-time stock tracking, low stock alerts, and comprehensive inventory control to keep your business running smoothly.",
      color: "text-[#0479a1]"
    },
    {
      icon: Users,
      title: "Staff & Role Management",
      description: "Enterprise-grade role-based access control. Manage your team with custom permissions and secure authentication.",
      color: "text-violet-500"
    },
    {
      icon: BarChart3,
      title: "Reports & Analytics",
      description: "Powerful insights with interactive charts, sales trends, and comprehensive business analytics at your fingertips.",
      color: "text-amber-500"
    },
    {
      icon: Truck,
      title: "Supplier Management",
      description: "Manage suppliers, track purchase orders, and automate procurement workflows for efficient inventory replenishment.",
      color: "text-indigo-500"
    },
    {
      icon: Target,
      title: "Reorder Forecasting",
      description: "AI-powered inventory forecasting predicts when and how much to reorder based on sales patterns and trends.",
      color: "text-rose-500"
    },
    {
      icon: Receipt,
      title: "Expense Tracking",
      description: "Track business expenses, categorize costs, and monitor profitability with comprehensive expense management.",
      color: "text-cyan-500"
    },
    {
      icon: Building2,
      title: "Multi-Branch Support",
      description: "Manage multiple locations with branch-specific inventory, staff assignments, and performance tracking.",
      color: "text-orange-500"
    }
  ];

  const pricingPlans = [
    {
      ...SUBSCRIPTION_PLANS["Free Trial"],
      features: SUBSCRIPTION_PLANS["Free Trial"].highlightedFeatures,
      highlighted: false,
      cta: "Start Now"
    },
    {
      ...SUBSCRIPTION_PLANS["Basic"],
      features: SUBSCRIPTION_PLANS["Basic"].highlightedFeatures,
      highlighted: false,
      cta: "Start 14-Day Free Trial"
    },
    {
      ...SUBSCRIPTION_PLANS["Pro"],
      features: SUBSCRIPTION_PLANS["Pro"].highlightedFeatures,
      highlighted: true,
      cta: "Start 14-Day Free Trial"
    },
    {
      ...SUBSCRIPTION_PLANS["Enterprise"],
      features: SUBSCRIPTION_PLANS["Enterprise"].highlightedFeatures,
      highlighted: false,
      cta: "Contact Sales"
    }
  ];

  const heroIcons = [
    Store, ShoppingCart, Package, Users, BarChart3, Receipt, Truck, 
    Target, Building2, Globe, MessageSquare, Zap, Shield, Clock,
    ShoppingBag, CreditCard, Tag, Percent, Smartphone, Monitor,
    Printer, ScanBarcode, DollarSign, Calculator, Calendar, MapPin,
    Phone, Mail, Award, Gift, Lock, Key, Settings, Sliders,
    Camera, Headphones, Speaker, Wifi, Battery, Database,
    Server, HardDrive, Cloud, ShoppingBasket, BadgePercent, Banknote,
    Wallet, Coins, QrCode, Scale, Utensils, Coffee, Pizza, Wine,
    Beer, Apple, Carrot, Fish, Milk, IceCream, Croissant, Shirt,
    Watch, Gem, Megaphone
  ];

  // Common styles
  const bgClass = isDark ? "bg-[linear-gradient(135deg,#000000_0%,#14213d_60%,#0479A1_100%)]" : "bg-white";
  const textClass = isDark ? "text-slate-50" : "text-slate-900";
  const subTextClass = isDark ? "text-slate-400" : "text-slate-500";
  const cardBgClass = isDark ? "bg-white/5 border-white/10" : "bg-white border-slate-200";
  const glassClass = isDark ? "backdrop-blur-xl bg-slate-950/80 border-b border-white/10" : "backdrop-blur-xl bg-white/80 border-b border-slate-200";

  return (
    <div className={`min-h-screen transition-colors duration-300 ${bgClass} ${textClass} overflow-x-hidden relative`}>
      
      {/* Background Blobs (Removed for cleaner gradient look) */}

      {/* Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 ${glassClass} transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div 
              className="flex items-center gap-3 cursor-pointer select-none" 
              onClick={handleLogoClick}
            >
              {(isDark ? assets.logoDark : assets.logoMain) ? (
                 <img src={isDark ? (assets.logoDark || assets.logoMain) : assets.logoMain} alt="Tillsup" className="h-10 w-auto object-contain" />
              ) : (
                <>
                  <div className="bg-[#ED363F] p-1.5 rounded-lg text-white shadow-lg shadow-red-500/20">
                    <Store className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                  <span className={`text-xl font-bold font-['Outfit'] tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                    Tillsup
                  </span>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">

              <Button 
                variant="ghost" 
                onClick={() => navigate("/login")}
                className={`${isDark ? "hover:bg-white/10" : "hover:bg-slate-100"} hover:text-[#ED363F]`}
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
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden min-h-[90vh] flex items-center">
        {/* Hero Icons Background - Left */}
        <div className="absolute top-0 left-0 w-[55%] h-full overflow-hidden pointer-events-none select-none z-0 hidden lg:block" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
          <div className="absolute top-[-10%] -left-[15%] w-[130%] h-[130%] opacity-20 -rotate-12">
            <div className="grid grid-cols-8 gap-12 p-8">
              {heroIcons.map((Icon, i) => (
                <div key={`left-${i}`} className="flex items-center justify-center transform hover:scale-110 transition-transform duration-500">
                  <Icon className={`w-6 h-6 ${isDark ? "text-white" : "text-slate-900"}`} strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero Icons Background - Right */}
        <div className="absolute top-0 right-0 w-[55%] h-full overflow-hidden pointer-events-none select-none z-0 hidden lg:block" style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}>
          <div className="absolute top-[-10%] -right-[15%] w-[130%] h-[130%] opacity-20 rotate-12">
            <div className="grid grid-cols-8 gap-12 p-8">
              {heroIcons.map((Icon, i) => (
                <div key={`right-${i}`} className="flex items-center justify-center transform hover:scale-110 transition-transform duration-500">
                  <Icon className={`w-6 h-6 ${isDark ? "text-white" : "text-slate-900"}`} strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>
        </div>



        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">
            <div 
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-full text-sm font-medium mb-8 border border-indigo-500/20 backdrop-blur-sm text-[#0479a1]"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              v2.0 Now Available
            </div>

            <h1 className="mb-6 leading-tight tracking-tight text-center text-[64px] font-['Outfit'] font-black font-normal">
              The Modern POS That <br/>
              <span className="text-[#ED363F]">
                <span className="font-bold">Grows</span> With You
              </span>
            </h1>

            <p className={`${subTextClass} mb-10 leading-relaxed max-w-2xl mx-auto font-[Antic] text-[22px]`}>
              Transform your business operations with our comprehensive platform. 
              Manage sales, inventory, staff, and analytics—all in one powerful system designed for modern enterprises.
            </p>

            <div className="flex items-center justify-center mb-12">
              <div className="inline-flex rounded-xl shadow-2xl">
                <Button
                  size="lg"
                  className="text-lg bg-[#ED363F] hover:bg-[#d92b34] border-0 rounded-l-xl rounded-r-none text-white h-auto px-[32px] py-[11px]"
                  onClick={() => navigate("/register")}
                >
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <Button
                  size="lg"
                  className="text-lg bg-white hover:bg-slate-50 text-[#0479a1] border-0 rounded-none h-auto px-[32px] py-[11px]"
                  onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}
                >
                  View Pricing
                </Button>
                <div className="w-px bg-slate-100 h-auto self-stretch" />
                <Button
                  size="lg"
                  className="text-lg bg-white hover:bg-slate-50 text-[#0479a1] border-0 rounded-r-xl rounded-l-none h-auto px-[32px] py-[11px]"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </Button>
              </div>
            </div>

            {/* Trust Signals */}
            <div className={`flex flex-wrap gap-6 text-sm font-medium ${subTextClass} mb-12 justify-center`}>
              <div className="flex items-center gap-2 text-[15px]">
                <CheckCircle className="w-4 h-4 text-[#0479A1]" />
                14-day free trial
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                <CheckCircle className="w-4 h-4 text-[#0479A1]" />
                No credit card required
              </div>
              <div className="flex items-center gap-2 text-[15px]">
                <CheckCircle className="w-4 h-4 text-[#0479A1]" />
                Cancel anytime
              </div>
            </div>

            {/* Industries Scroller */}
            <div className="w-full max-w-4xl overflow-hidden mb-12 relative [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
              <motion.div
                className="flex whitespace-nowrap gap-8"
                animate={{ x: "-50%" }}
                transition={{
                  repeat: Infinity,
                  ease: "linear",
                  duration: 40,
                }}
              >
                {[
                  { name: "Retail Stores", icon: Store },
                  { name: "Restaurants & Cafes", icon: Utensils },
                  { name: "Salons & Spas", icon: Scissors },
                  { name: "Gyms & Fitness", icon: Dumbbell },
                  { name: "Boutiques", icon: ShoppingBag },
                  { name: "Grocery Stores", icon: ShoppingBasket },
                  { name: "Pharmacies", icon: Pill },
                  { name: "Electronics", icon: Smartphone },
                  { name: "Bookstores", icon: BookOpen },
                  { name: "Bakeries", icon: Croissant },
                  { name: "Food Trucks", icon: Truck },
                  { name: "Car Washes", icon: Car },
                  { name: "Service Centers", icon: Wrench },
                  { name: "Retail Stores", icon: Store },
                  { name: "Restaurants & Cafes", icon: Utensils },
                  { name: "Salons & Spas", icon: Scissors },
                  { name: "Gyms & Fitness", icon: Dumbbell },
                  { name: "Boutiques", icon: ShoppingBag },
                  { name: "Grocery Stores", icon: ShoppingBasket },
                  { name: "Pharmacies", icon: Pill },
                  { name: "Electronics", icon: Smartphone },
                  { name: "Bookstores", icon: BookOpen },
                  { name: "Bakeries", icon: Croissant },
                  { name: "Food Trucks", icon: Truck },
                  { name: "Car Washes", icon: Car },
                  { name: "Service Centers", icon: Wrench }
                ].map((item, i) => (
                  <div key={i} className={`flex items-center gap-2 font-medium ${isDark ? "text-slate-400" : "text-slate-600"} font-[Be_Vietnam] text-[#ed363f] text-[20px]`}>
                    <item.icon className="w-5 h-5 opacity-50" />
                    {item.name}
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Live Statistics */}
            <div 
              className={`hidden lg:flex absolute right-0 -top-12 z-20 items-center gap-3 p-2 pr-5 rounded-full border backdrop-blur-md ${isDark ? "bg-slate-900/90 border-slate-800" : "bg-white/90 border-slate-200 shadow-xl"}`}
            >
              <div className="flex -space-x-2">
                   {[...Array(3)].map((_, i) => (
                     <div key={i} className={`w-8 h-8 rounded-full border-2 ${isDark ? "border-slate-900 bg-slate-700" : "border-white bg-slate-100"} flex items-center justify-center overflow-hidden`}>
                        <div className={`w-full h-full ${isDark ? "bg-slate-600" : "bg-slate-200"} bg-[#102c46]`} />
                     </div>
                   ))}
                   <div className={`w-8 h-8 rounded-full border-2 ${isDark ? "border-slate-900 bg-slate-800 text-slate-400" : "border-white bg-slate-50 text-slate-600"} flex items-center justify-center text-[10px] font-bold`}>
                     +2k
                   </div>
              </div>

              <div className="flex flex-col">
                <span className={`text-[10px] uppercase tracking-wider font-semibold ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                  Trusted by
                </span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold font-[Biryani] ${isDark ? "text-white" : "text-slate-900"}`}>
                    {businessCount.toLocaleString()} businesses
                  </span>
                  <span className="flex h-2 w-2 relative">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0479a1] opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0479a1]"></span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={`py-20 px-4 sm:px-6 lg:px-8 relative z-10 ${isDark ? "bg-transparent" : "bg-slate-50/50"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-[Be_Vietnam]">
              Everything You Need to Run Your Business
            </h2>
            <p className={`text-lg ${subTextClass} max-w-2xl mx-auto`}>
              A complete suite of tools designed to streamline operations and drive growth
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                >
                  <Card className={`h-full ${cardBgClass} hover:border-indigo-500/50 transition-all duration-300 hover:shadow-lg group relative overflow-hidden`}>
                    {/* Hover Glow */}
                    <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br from-indigo-500 to-violet-500`} />
                    
                    <CardContent className="p-6 relative z-10">
                      <div className={`mb-6 w-12 h-12 rounded-xl flex items-center justify-center ${isDark ? "bg-white/10" : "bg-slate-100"} group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <h3 className={`text-lg font-bold mb-2 font-[ABeeZee] ${isDark ? "text-[#e1d5d5]" : "text-[#c9b1b1]"}`}>{feature.title}</h3>
                      <p className={`${subTextClass} leading-relaxed text-[13px]`}>
                        {feature.description}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4 font-[Be_Vietnam]">
              Transparent Pricing
            </h2>
            <p className={`text-lg ${subTextClass} max-w-2xl mx-auto`}>
              Choose the plan that fits your business stage
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricingPlans.map((plan, idx) => {
              const isPopular = plan.highlighted;
              return (
                <div
                  key={plan.name}
                >
                  <Card className={`relative h-full flex flex-col ${isPopular ? "border-violet-500 shadow-xl shadow-violet-500/10" : cardBgClass} ${isDark ? "bg-black/20 backdrop-blur-md border-white/10" : "bg-white"}`}>
                    {isPopular && (
                      <div className="absolute top-0 inset-x-0 h-1 bg-[#ed363f]" />
                    )}
                    {isPopular && (
                      <Badge className="absolute top-4 right-4 bg-[#ED363F] hover:bg-[#d92b34]">
                        Popular
                      </Badge>
                    )}

                    <CardHeader>
                      <CardTitle className="text-xl font-bold text-[#ffffff] font-[Albert_Sans]">{plan.name}</CardTitle>
                      <CardDescription className="min-h-[40px] mt-2">
                        {plan.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col">
                      <div className="mb-6">
                        <span className="text-4xl font-bold text-white">${plan.price}</span>
                        <span className="text-sm text-white/90">/{plan.period === "14 days" ? "trial" : "mo"}</span>
                      </div>

                      <ul className="space-y-3 mb-8 flex-1">
                        {plan.highlightedFeatures.slice(0, 8).map((feature) => (
                          <li key={feature} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-[#0479a1] shrink-0 mt-0.5" />
                            <span className={subTextClass}>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button 
                        className={`w-full ${isPopular ? "bg-[#ED363F] hover:bg-[#d92b34] text-white" : ""}`}
                        variant={isPopular ? "default" : "outline"}
                        onClick={() => navigate("/register")}
                      >
                        {plan.cta}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="max-w-5xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-12 text-center">
            {/* Background Gradient */}
            <div className={`absolute inset-0 transition-colors duration-300 ${isDark ? "bg-[#14213d]" : "bg-slate-200"}`} />
            
            <div className="relative z-10">
              <h2 className={`font-bold mb-6 font-[Be_Vietnam] text-[40px] transition-colors duration-300 ${isDark ? "text-white" : "text-slate-900"}`}>
                Ready to Transform Your Business?
              </h2>
              <p className={`text-xl mb-10 max-w-2xl mx-auto transition-colors duration-300 ${isDark ? "text-violet-100" : "text-slate-600"}`}>
                Join thousands of businesses already using Tillsup to streamline operations and drive growth.
              </p>
              <Button
                size="lg"
                className={`text-lg shadow-xl border-0 px-[32px] py-[17px] transition-colors duration-300 ${isDark ? "bg-white hover:bg-violet-50 text-[#2d2c2d]" : "bg-[#0479A1] hover:bg-[#036080] text-white"}`}
                onClick={() => navigate("/register")}
              >
                Get Started Now
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={`relative py-12 px-4 sm:px-6 lg:px-8 border-t ${isDark ? "border-white/10 bg-transparent" : "border-slate-200 bg-slate-50"} overflow-hidden`}>
        {/* Footer Background Icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 opacity-5">
          <div className="absolute top-[-50%] -left-[10%] w-[120%] h-[200%] rotate-12">
            <div className="grid grid-cols-12 gap-8 p-8">
              {[...heroIcons, ...heroIcons].map((Icon, i) => (
                <div key={i} className="flex items-center justify-center">
                   <Icon className={`w-8 h-8 ${isDark ? "text-white" : "text-slate-900"}`} strokeWidth={1.5} />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start gap-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                {(isDark ? assets.logoDark : assets.logoMain) ? (
                   <img src={isDark ? (assets.logoDark || assets.logoMain) : assets.logoMain} alt="Tillsup" className="h-10 w-auto object-contain" />
                ) : (
                  <>
                    <div className="bg-[#ED363F] p-1.5 rounded-lg text-white shadow-lg shadow-red-500/20">
                      <Store className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                    <span className={`text-xl font-bold font-['Outfit'] tracking-tight ${isDark ? "text-white" : "text-slate-900"}`}>
                      Tillsup
                    </span>
                  </>
                )}
              </div>
              <p className={`text-sm ${subTextClass} max-w-xs ${isDark ? "text-white" : "text-slate-600"}`}>
                Enterprise-grade point of sale and business management solution for modern retailers.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12">
              <div>
                <h3 className="font-semibold mb-4">Product</h3>
                <ul className={`space-y-2 text-sm ${subTextClass}`}>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Features</li>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Pricing</li>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Security</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className={`space-y-2 text-sm ${subTextClass}`}>
                  <li onClick={() => navigate("/who-we-are")} className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Who We Are</li>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>About</li>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Blog</li>
                  <li className={`hover:text-primary cursor-pointer transition-colors ${isDark ? "text-white" : "text-slate-700"}`}>Careers</li>
                </ul>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-4">
              <Button onClick={() => setContactOpen(true)} variant="outline">
                <MessageSquare className="w-4 h-4 mr-2" />
                Get in Touch
              </Button>

              <div className="flex items-center gap-2">
                <span className={`text-sm ${subTextClass} ${isDark ? "text-white" : "text-slate-900"}`}>Theme</span>
                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full p-1 border border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={() => setTheme("light")}
                    className={`p-1.5 rounded-full transition-all ${theme === "light" ? "bg-white text-yellow-500 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <Sun className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setTheme("dark")}
                    className={`p-1.5 rounded-full transition-all ${theme === "dark" ? "bg-slate-700 text-indigo-400 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <Moon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`mt-12 pt-8 border-t ${isDark ? "border-white/10" : "border-slate-200"} text-center text-sm ${subTextClass} ${isDark ? "text-white" : "text-slate-600"}`}>
            © 2026 Tillsup. All rights reserved.
          </div>
        </div>
        <div className={`absolute inset-0 bg-gradient-to-t ${isDark ? "from-transparent via-transparent to-transparent" : "from-transparent via-transparent to-transparent"} pointer-events-none`} />
      </footer>

      {/* Contact Dialog */}
      <Dialog open={contactOpen} onOpenChange={setContactOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contact Sales</DialogTitle>
            <DialogDescription>
              Fill out the form below and our team will get back to you shortly.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" placeholder="John Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" placeholder="john@company.com" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" placeholder="I'm interested in..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContactOpen(false)}>Cancel</Button>
            <Button onClick={() => setContactOpen(false)}>Send Message</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin Login Dialog */}
      <Dialog open={adminLoginOpen} onOpenChange={setAdminLoginOpen}>
        <DialogContent className="sm:max-w-[425px] bg-[#1b1b2b]">
          <DialogHeader>
            <DialogTitle className="text-[#edcfcf] text-[#edd0d0] text-[#edd0d0] text-[#eed5d5] text-[#f2dfdf] text-[#f6e9e9] text-[#f8eeee] text-[#faf3f3] text-[#fdf9f9] text-[#fefbfb] text-[#fffefe] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff]">Admin Portal Access</DialogTitle>
            <DialogDescription>
              Restricted area. Please verify your identity.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label className="text-[#d09292] text-[#cf9292] text-[#cf9292] text-[#cf9494] text-[#d6a2a2] text-[#deb2b2] text-[#e6c5c5] text-[#efd8d8] text-[#fcf7f7] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff]" htmlFor="admin-username">Username</Label>
              <Input className="bg-[#353548]" 
                id="admin-username" 
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-[#2a2222] text-[#2a2222] text-[#302828] text-[#3d3333] text-[#9b9090] text-[#dedede] text-[#f3f3f3] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff] text-[#ffffff]" htmlFor="admin-password">Password</Label>
              <Input className="bg-[#38383e] bg-[#38383d] bg-[#37373c] bg-[#37373b] bg-[#36363b] bg-[#36363b] bg-[#36363b] bg-[#36363b] bg-[#37373b] bg-[#37373b] bg-[#37373b] bg-[#37373c] bg-[#37373c] bg-[#37373c] bg-[#36363c] bg-[#36363c] bg-[#36363c] bg-[#36363c] bg-[#36363c] bg-[#37373c] bg-[#37373c] bg-[#38383d] bg-[#3a3a3f] bg-[#3b3b40] bg-[#3c3c41] bg-[#3d3d42] bg-[#3e3e43] bg-[#3e3e43] bg-[#3e3e43] bg-[#3d3d42] bg-[#3d3d42] bg-[#3c3c41] bg-[#3c3c41] bg-[#3b3b40] bg-[#3a3a3f] bg-[#39393f] bg-[#38383e] bg-[#37373d] bg-[#36363d] bg-[#36363d] bg-[#36363d] bg-[#35353d] bg-[#35353d] bg-[#34343d] bg-[#34343d] bg-[#34343d] bg-[#33333d] bg-[#32323d] bg-[#32323c] bg-[#31313c] bg-[#30303b] bg-[#30303b] bg-[#2f2f3b] bg-[#2f2f3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2e2e3a] bg-[#2d2d3a] bg-[#2d2d3a] bg-[#2d2d3a] bg-[#2d2d3a] bg-[#2d2d3a] bg-[#2d2d3a] bg-[#2c2c3a] bg-[#2c2c3a] bg-[#2c2c3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3a] bg-[#2b2b3b] bg-[#2d2d3d] bg-[#2d2d3e] bg-[#2e2e3f] bg-[#2f2f3f] bg-[#2f2f40] bg-[#2f2f40] bg-[#2f2f40] bg-[#303041] bg-[#303041] bg-[#303042] bg-[#313143] bg-[#313143] bg-[#323243] bg-[#333345] bg-[#333346] bg-[#343447] bg-[#353548] bg-[#353548]" 
                id="admin-password" 
                type="password" 
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminLoginOpen(false)}>Cancel</Button>
            <Button onClick={handleAdminLogin}>Access Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
