import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Store, Building2, User, Mail, Lock, ArrowLeft, Check, ChevronsUpDown, Phone } from "lucide-react";
import logo from "figma:asset/4f0019b6de17d228838092e3bc909e9dc8e3832f.png";
import { useAuth } from "../contexts/AuthContext";
import { COUNTRIES } from "../utils/countries";
import { cn } from "../components/ui/utils";

export function BusinessRegistration() {
  const navigate = useNavigate();
  
  // Get Auth Context
  const { registerBusiness, isAuthenticated } = useAuth();

  const [formData, setFormData] = useState({
    businessName: "",
    country: "Kenya",
    currency: "KES",
    ownerFirstName: "",
    ownerLastName: "",
    ownerPhone: "",
    ownerEmail: "",
    ownerPassword: "",
    confirmPassword: ""
  });

  const [openCountry, setOpenCountry] = useState(false);

  const handleCountryChange = (countryName: string) => {
    const selectedCountry = COUNTRIES.find(c => c.name === countryName);
    if (selectedCountry) {
      setFormData(prev => ({
        ...prev,
        country: countryName,
        currency: selectedCountry.currency
      }));
    } else {
       setFormData(prev => ({ ...prev, country: countryName }));
    }
    setOpenCountry(false);
  };

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!formData.businessName.trim()) {
      setError("Business name is required");
      return;
    }

    if (!formData.ownerFirstName.trim() || !formData.ownerLastName.trim()) {
      setError("Owner name is required");
      return;
    }

    if (!formData.ownerPhone.trim()) {
      setError("Phone number is required");
      return;
    }

    if (!formData.ownerEmail.trim() || !formData.ownerEmail.includes("@")) {
      setError("Valid email is required");
      return;
    }

    if (formData.ownerPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (formData.ownerPassword !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    // Register business
    // Trim inputs to avoid whitespace issues
    const result = await registerBusiness(
      formData.businessName.trim(),
      formData.ownerEmail.trim(),
      formData.ownerPassword,
      formData.ownerFirstName.trim(),
      formData.ownerLastName.trim(),
      formData.ownerPhone.trim(),
      formData.country,
      formData.currency
    );

    setLoading(false);

    if (result.success) {
      // Navigate to login page with success message
      navigate("/login", { 
        state: { 
          message: "Business registered successfully! Please log in to continue." 
        } 
      });
    } else {
      // Improve error message for rate limits and disabled signups
      const errorMsg = result.error?.toLowerCase() || "";
      if (errorMsg.includes("rate limit")) {
        setError("Too many attempts. Please wait a moment or disable 'Confirm Email' in your Supabase Dashboard > Authentication > Providers > Email.");
      } else if (errorMsg.includes("signups are disabled") || errorMsg.includes("signups not allowed")) {
        setError("Email signups are disabled. Please enable 'Allow email signups' in your Supabase Dashboard > Authentication > Providers > Email.");
      } else if (errorMsg.includes("is invalid")) {
         setError(`Invalid email format. Raw error: "${result.error}"`);
      } else {
        setError(result.error || "Registration failed");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[linear-gradient(135deg,#000000_0%,#14213d_60%,#0479A1_100%)] p-4 text-slate-50">
      {/* Back to Home Link */}
      <Button
        variant="ghost"
        className="absolute top-4 left-4"
        onClick={() => navigate("/")}
      >
        <Store className="w-4 h-4 mr-2" />
        Back to Home
      </Button>

      <Card className="w-full max-w-lg shadow-lg">
        <CardHeader className="text-center space-y-2 pb-4 pt-6">
          <div className="flex justify-center">
            <img src={logo} alt="Tillsup" className="h-10 w-auto object-contain" />
          </div>
          <div>
            <CardTitle className="text-2xl text-center text-[#0479a1]">Register Your Business</CardTitle>
            <CardDescription className="mt-1 text-sm">
              Create your business account to get started
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Error Alert */}
            {error && (
              <Alert variant="destructive" className="py-2">
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* Business Information */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Building2 className="w-3 h-3" />
                <span>Business Information</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2 space-y-1">
                  <Label htmlFor="businessName" className="text-xs">Business Name *</Label>
                  <Input
                    id="businessName"
                    placeholder="Enter business name"
                    value={formData.businessName}
                    onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="country" className="text-xs">Country</Label>
                  <Popover open={openCountry} onOpenChange={setOpenCountry}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openCountry}
                        className="w-full justify-between h-9 text-sm"
                        disabled={loading}
                      >
                        <span className="truncate text-[#615e5e] text-[13px]">
                        {formData.country
                          ? COUNTRIES.find((c) => c.name === formData.country)?.name || formData.country
                          : "Select..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0">
                      <Command>
                        <CommandInput placeholder="Search country..." />
                        <CommandList>
                          <CommandEmpty>No country found.</CommandEmpty>
                          <CommandGroup>
                            {COUNTRIES.map((c) => (
                              <CommandItem
                                key={c.code}
                                value={c.name}
                                onSelect={(currentValue) => {
                                  handleCountryChange(currentValue);
                                  setOpenCountry(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    formData.country === c.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {c.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <User className="w-3 h-3" />
                <span>Owner Information</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ownerFirstName" className="text-xs">First Name *</Label>
                  <Input
                    id="ownerFirstName"
                    placeholder="First name"
                    value={formData.ownerFirstName}
                    onChange={(e) => setFormData({ ...formData, ownerFirstName: e.target.value })}
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ownerLastName" className="text-xs">Last Name *</Label>
                  <Input
                    id="ownerLastName"
                    placeholder="Last name"
                    value={formData.ownerLastName}
                    onChange={(e) => setFormData({ ...formData, ownerLastName: e.target.value })}
                    disabled={loading}
                    className="h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ownerPhone" className="text-xs">Phone Number *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="ownerPhone"
                      placeholder="Phone number"
                      className="pl-9 h-9"
                      value={formData.ownerPhone}
                      onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ownerEmail" className="text-xs">Email Address *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="owner@business.com"
                      className="pl-9 h-9"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Password */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Lock className="w-3 h-3" />
                <span>Create Password</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ownerPassword" className="text-xs">Password *</Label>
                  <Input
                    id="ownerPassword"
                    type="password"
                    placeholder="Min 6 chars"
                    value={formData.ownerPassword}
                    onChange={(e) => setFormData({ ...formData, ownerPassword: e.target.value })}
                    disabled={loading}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="confirmPassword" className="text-xs">Confirm *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    disabled={loading}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2 space-y-3">
              <Button
                type="submit"
                className="w-full bg-[#0479A1] hover:bg-[#036080] text-white"
                size="default" 
                disabled={loading}
              >
                {loading ? "Registering..." : "Register Business"}
              </Button>

              {/* Back to Login */}
              <div className="text-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/login")}
                  disabled={loading}
                  className="h-8 text-xs"
                >
                  <ArrowLeft className="w-3 h-3 mr-2" />
                  Back to Login
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}