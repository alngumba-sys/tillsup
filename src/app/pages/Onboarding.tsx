import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../contexts/AuthContext";
import { useBranch } from "../contexts/BranchContext";
import { useInventory } from "../contexts/InventoryContext";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "../components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { Progress } from "../components/ui/progress";
import { 
  Store, 
  Building2, 
  Clock, 
  Receipt, 
  Package, 
  Users, 
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  X
} from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "../utils/countries";
import { cn } from "../components/ui/utils";

export function Onboarding() {
  const navigate = useNavigate();
  const { user, business, updateBusiness } = useAuth();
  const { createBranch } = useBranch();
  const { addProduct } = useInventory();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  const [openCountry, setOpenCountry] = useState(false);
  const [openCurrency, setOpenCurrency] = useState(false);

  // Step 1: Business Profile
  const [businessProfile, setBusinessProfile] = useState({
    currency: business?.currency || "KES",
    country: business?.country || "Kenya",
    timezone: business?.timezone || "Africa/Nairobi",
    businessType: business?.businessType || "Retail"
  });

  // Effect to update currency when country changes
  const handleCountryChange = (countryName: string) => {
    const selectedCountry = COUNTRIES.find(c => c.name === countryName);
    if (selectedCountry) {
      setBusinessProfile(prev => ({
        ...prev,
        country: countryName,
        currency: selectedCountry.currency
      }));
    } else {
       setBusinessProfile(prev => ({ ...prev, country: countryName }));
    }
    setOpenCountry(false);
  };


  // Step 2: Branch Setup
  const [branchData, setbranchData] = useState({
    name: "",
    location: "",
    contact: ""
  });

  // Step 3: Working Hours
  const [workingHours, setWorkingHours] = useState({
    start: business?.workingHours.start || "09:00",
    end: business?.workingHours.end || "21:00"
  });

  // Step 4: Tax Configuration
  const [taxConfig, setTaxConfig] = useState({
    enabled: business?.taxConfig.enabled || false,
    name: business?.taxConfig.name || "VAT",
    percentage: business?.taxConfig.percentage || 16,
    inclusive: business?.taxConfig.inclusive || false
  });

  const progress = (currentStep / totalSteps) * 100;

  const handleSkip = () => {
    navigate("/app/dashboard");
  };

  const handleNext = () => {
    if (currentStep === 1) {
      if (updateBusiness) {
        updateBusiness({
          country: businessProfile.country,
          currency: businessProfile.currency,
          timezone: businessProfile.timezone,
          businessType: businessProfile.businessType
        });
      }
      setCurrentStep(prev => prev + 1);
    } else if (currentStep === 2) {
      // Create branch
      if (branchData.name && branchData.location) {
        const result = createBranch(branchData.name, branchData.location, branchData.contact);
        if (result.success) {
          toast.success("Branch created successfully!");
          setCurrentStep(prev => prev + 1);
        } else {
          toast.error(result.error || "Failed to create branch");
        }
      } else {
        toast.error("Please fill in all required fields");
      }
    } else if (currentStep === totalSteps) {
      // Complete onboarding
      toast.success("Setup complete! Welcome to your POS platform!");
      navigate("/app/dashboard");
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center">
              <Store className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">Welcome to {business?.name}!</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let's set up your business in just a few steps
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps */}
        <Card>
          <CardContent className="p-8">
            {/* Step 1: Business Profile */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-50 rounded-full mb-4">
                    <Building2 className="w-8 h-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Business Profile</h2>
                  <p className="text-muted-foreground">
                    Configure your business settings and preferences
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Popover open={openCountry} onOpenChange={setOpenCountry}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openCountry}
                          className="w-full justify-between"
                        >
                          {businessProfile.country
                            ? COUNTRIES.find((c) => c.name === businessProfile.country)?.name || businessProfile.country
                            : "Select country..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
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
                                      businessProfile.country === c.name ? "opacity-100" : "opacity-0"
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

                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select 
                      value={businessProfile.currency}
                      onValueChange={(value) => setBusinessProfile(prev => ({ ...prev, currency: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from(new Set(COUNTRIES.map(c => c.currency)))
                          .map(code => COUNTRIES.find(c => c.currency === code)!)
                          .sort((a, b) => a.currency.localeCompare(b.currency))
                          .map(c => (
                          <SelectItem key={c.currency} value={c.currency}>{c.currency} ({c.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select 
                      value={businessProfile.timezone}
                      onValueChange={(value) => setBusinessProfile(prev => ({ ...prev, timezone: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="UTC">UTC</SelectItem>
                        <SelectItem value="America/New_York">Eastern Time</SelectItem>
                        <SelectItem value="America/Chicago">Central Time</SelectItem>
                        <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                        <SelectItem value="Africa/Nairobi">East Africa Time</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="businessType">Business Type</Label>
                    <Select 
                      value={businessProfile.businessType}
                      onValueChange={(value) => setBusinessProfile(prev => ({ ...prev, businessType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Restaurant">Restaurant</SelectItem>
                        <SelectItem value="Grocery">Grocery</SelectItem>
                        <SelectItem value="Pharmacy">Pharmacy</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Create Branch */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-green-50 rounded-full mb-4">
                    <Store className="w-8 h-8 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Create Your First Branch</h2>
                  <p className="text-muted-foreground">
                    Add a branch location to manage inventory and sales
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="branchName">Branch Name *</Label>
                    <Input
                      id="branchName"
                      placeholder="e.g., Main Store, Downtown Location"
                      value={branchData.name}
                      onChange={(e) => setbranchData(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="branchLocation">Location *</Label>
                    <Input
                      id="branchLocation"
                      placeholder="e.g., 123 Main Street, City"
                      value={branchData.location}
                      onChange={(e) => setbranchData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="branchContact">Contact</Label>
                    <Input
                      id="branchContact"
                      placeholder="e.g., +1 234 567 8900"
                      value={branchData.contact}
                      onChange={(e) => setbranchData(prev => ({ ...prev, contact: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Working Hours */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-50 rounded-full mb-4">
                    <Clock className="w-8 h-8 text-purple-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Set Working Hours</h2>
                  <p className="text-muted-foreground">
                    Define your business operating hours
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="startTime">Opening Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={workingHours.start}
                        onChange={(e) => setWorkingHours(prev => ({ ...prev, start: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="endTime">Closing Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={workingHours.end}
                        onChange={(e) => setWorkingHours(prev => ({ ...prev, end: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <p className="font-medium mb-1">Note:</p>
                    <p>These hours help with staff scheduling and reporting. You can always change them later in Settings.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Tax Configuration */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-50 rounded-full mb-4">
                    <Receipt className="w-8 h-8 text-orange-600" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Tax Configuration</h2>
                  <p className="text-muted-foreground">
                    Set up tax rules for your business (optional)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Enable Tax</p>
                      <p className="text-sm text-muted-foreground">Apply tax to sales transactions</p>
                    </div>
                    <Button
                      variant={taxConfig.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTaxConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
                    >
                      {taxConfig.enabled ? "Enabled" : "Disabled"}
                    </Button>
                  </div>

                  {taxConfig.enabled && (
                    <>
                      <div>
                        <Label htmlFor="taxName">Tax Name</Label>
                        <Input
                          id="taxName"
                          placeholder="e.g., VAT, GST, Sales Tax"
                          value={taxConfig.name}
                          onChange={(e) => setTaxConfig(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="taxPercentage">Tax Percentage (%)</Label>
                        <Input
                          id="taxPercentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={taxConfig.percentage}
                          onChange={(e) => setTaxConfig(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium">Tax Inclusive Pricing</p>
                          <p className="text-sm text-muted-foreground">
                            {taxConfig.inclusive ? "Tax is included in product prices" : "Tax is added on top of product prices"}
                          </p>
                        </div>
                        <Button
                          variant={taxConfig.inclusive ? "default" : "outline"}
                          size="sm"
                          onClick={() => setTaxConfig(prev => ({ ...prev, inclusive: !prev.inclusive }))}
                        >
                          {taxConfig.inclusive ? "Inclusive" : "Exclusive"}
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {currentStep === 5 && (
              <div className="space-y-6 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-50 rounded-full mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold">You're All Set!</h2>
                <p className="text-muted-foreground text-lg max-w-md mx-auto">
                  Your business is ready to go. You can now start managing inventory, processing sales, and growing your business.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                  <Card className="border-2">
                    <CardHeader className="text-center">
                      <Package className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <CardTitle className="text-lg">Add Inventory</CardTitle>
                      <CardDescription>
                        Start adding products to your catalog
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  <Card className="border-2">
                    <CardHeader className="text-center">
                      <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                      <CardTitle className="text-lg">Add Staff</CardTitle>
                      <CardDescription>
                        Invite team members to your business
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <Button variant="outline" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleSkip}>
              <X className="w-4 h-4 mr-2" />
              Skip Setup
            </Button>
            <Button onClick={handleNext}>
              {currentStep === totalSteps ? "Get Started" : "Continue"}
              {currentStep < totalSteps && <ArrowRight className="w-4 h-4 ml-2" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}