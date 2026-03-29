import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Alert, AlertDescription } from "../components/ui/alert";
import { 
  Building2, 
  Receipt, 
  Palette, 
  Info,
  Save,
  AlertCircle,
  Crown,
  Smartphone,
  Key,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { COUNTRIES } from "../utils/countries";
import { supabase } from "../../lib/supabase";

export function BusinessSettings() {
  const { user, business } = useAuth();

  // Only Business Owners can access this page
  if (!user || user.role !== "Business Owner" || !business) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Access denied. Only Business Owners can access settings.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const [businessProfile, setBusinessProfile] = useState({
    name: business.name,
    businessType: business.businessType || "Retail",
    currency: business.currency,
    country: business.country || "Kenya",
    timezone: business.timezone,
    workingHoursStart: business.workingHours.start,
    workingHoursEnd: business.workingHours.end
  });

  const [taxSettings, setTaxSettings] = useState({
    enabled: business.taxConfig.enabled,
    name: business.taxConfig.name,
    percentage: business.taxConfig.percentage,
    inclusive: business.taxConfig.inclusive
  });

  const [mpesaSettings, setMpesaSettings] = useState({
    consumerKey: (business as any).mpesa_consumer_key || '',
    consumerSecret: (business as any).mpesa_consumer_secret || '',
    shortcode: (business as any).mpesa_shortcode || '',
    passkey: (business as any).mpesa_passkey || '',
    environment: (business as any).mpesa_environment || 'sandbox'
  });

  const [isSavingMpesa, setIsSavingMpesa] = useState(false);

  const handleSaveProfile = () => {
    // In real app: Call API to update business profile
    toast.success("Business profile updated successfully!");
  };

  const handleSaveTax = () => {
    // In real app: Call API to update tax configuration
    toast.success("Tax configuration updated successfully!");
  };

  const handleSaveMpesa = async () => {
    setIsSavingMpesa(true);
    try {
      const { error } = await supabase
        .from('businesses')
        .update({
          mpesa_consumer_key: mpesaSettings.consumerKey,
          mpesa_consumer_secret: mpesaSettings.consumerSecret,
          mpesa_shortcode: mpesaSettings.shortcode,
          mpesa_passkey: mpesaSettings.passkey,
          mpesa_environment: mpesaSettings.environment,
        })
        .eq('id', business.id);

      if (error) throw error;
      toast.success("M-PESA settings saved successfully!");
    } catch (err: any) {
      toast.error("Failed to save M-PESA settings", { description: err.message });
    } finally {
      setIsSavingMpesa(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl mb-1">Business Settings</h1>
        <p className="text-muted-foreground">
          Manage your business configuration and preferences
        </p>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          SUBSCRIPTION BANNER REMOVED - Use dedicated Subscription & Billing page
          ═══════════════════════════════════════════════════════════════════ */}

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <Building2 className="w-4 h-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="tax">
            <Receipt className="w-4 h-4 mr-2" />
            Tax
          </TabsTrigger>
          <TabsTrigger value="mpesa">
            <Smartphone className="w-4 h-4 mr-2" />
            M-PESA
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Update your business information and operating hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  value={businessProfile.name}
                  onChange={(e) => setBusinessProfile(prev => ({ ...prev, name: e.target.value }))}
                />
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="country">Country</Label>
                  <Select 
                    value={businessProfile.country}
                    onValueChange={(value) => {
                      const selectedCountry = COUNTRIES.find(c => c.name === value);
                      setBusinessProfile(prev => ({
                        ...prev,
                        country: value,
                        currency: selectedCountry ? selectedCountry.currency : prev.currency
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map(c => (
                        <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="workingStart">Opening Time</Label>
                  <Input
                    id="workingStart"
                    type="time"
                    value={businessProfile.workingHoursStart}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, workingHoursStart: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="workingEnd">Closing Time</Label>
                  <Input
                    id="workingEnd"
                    type="time"
                    value={businessProfile.workingHoursEnd}
                    onChange={(e) => setBusinessProfile(prev => ({ ...prev, workingHoursEnd: e.target.value }))}
                  />
                </div>
              </div>

              <Button onClick={handleSaveProfile} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Tab */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>
                Configure tax rules for your business
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Tax</p>
                  <p className="text-sm text-muted-foreground">Apply tax to all sales transactions</p>
                </div>
                <Button
                  variant={taxSettings.enabled ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTaxSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                >
                  {taxSettings.enabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              {taxSettings.enabled && (
                <>
                  <div>
                    <Label htmlFor="taxName">Tax Name</Label>
                    <Input
                      id="taxName"
                      placeholder="e.g., VAT, GST, Sales Tax"
                      value={taxSettings.name}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, name: e.target.value }))}
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
                      value={taxSettings.percentage}
                      onChange={(e) => setTaxSettings(prev => ({ ...prev, percentage: parseFloat(e.target.value) || 0 }))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Current rate: {taxSettings.percentage}%
                    </p>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">Tax Inclusive Pricing</p>
                      <p className="text-sm text-muted-foreground">
                        {taxSettings.inclusive 
                          ? "Tax is included in product prices" 
                          : "Tax is added on top of product prices"}
                      </p>
                    </div>
                    <Button
                      variant={taxSettings.inclusive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTaxSettings(prev => ({ ...prev, inclusive: !prev.inclusive }))}
                    >
                      {taxSettings.inclusive ? "Inclusive" : "Exclusive"}
                    </Button>
                  </div>

                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Tax changes will apply to all new transactions. Existing receipts will show the tax rate at the time of purchase.
                    </AlertDescription>
                  </Alert>
                </>
              )}

              <Button onClick={handleSaveTax} className="w-full sm:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Tax Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* M-PESA Tab */}
        <TabsContent value="mpesa">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5" />
                M-PESA Configuration
              </CardTitle>
              <CardDescription>
                Configure your Safaricom M-PESA credentials to accept mobile payments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-900 text-sm">
                  <p className="font-semibold mb-1">Where to get your credentials:</p>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Go to the <a href="https://developer.safaricom.co.ke" target="_blank" rel="noopener noreferrer" className="underline">Safaricom Developer Portal</a></li>
                    <li>Create an app to get your Consumer Key and Secret</li>
                    <li>Your Shortcode is your Till Number or Paybill Number</li>
                    <li>The Passkey is from your Lipa Na M-PESA Online (STK Push) setup</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div>
                <Label htmlFor="mpesaEnvironment">Environment</Label>
                <Select 
                  value={mpesaSettings.environment}
                  onValueChange={(value) => setMpesaSettings(prev => ({ ...prev, environment: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-1">
                  Use Sandbox for testing. Switch to Production when ready to go live.
                </p>
              </div>

              <div>
                <Label htmlFor="consumerKey">Consumer Key</Label>
                <Input
                  id="consumerKey"
                  type="password"
                  placeholder="Your Safaricom Consumer Key"
                  value={mpesaSettings.consumerKey}
                  onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerKey: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="consumerSecret">Consumer Secret</Label>
                <Input
                  id="consumerSecret"
                  type="password"
                  placeholder="Your Safaricom Consumer Secret"
                  value={mpesaSettings.consumerSecret}
                  onChange={(e) => setMpesaSettings(prev => ({ ...prev, consumerSecret: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="shortcode">Shortcode / Till Number</Label>
                <Input
                  id="shortcode"
                  placeholder="e.g., 174379"
                  value={mpesaSettings.shortcode}
                  onChange={(e) => setMpesaSettings(prev => ({ ...prev, shortcode: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="passkey">Passkey (Lipa Na M-PESA)</Label>
                <Input
                  id="passkey"
                  type="password"
                  placeholder="Your STK Push Passkey"
                  value={mpesaSettings.passkey}
                  onChange={(e) => setMpesaSettings(prev => ({ ...prev, passkey: e.target.value }))}
                />
              </div>

              <Alert className={mpesaSettings.consumerKey && mpesaSettings.consumerSecret && mpesaSettings.shortcode && mpesaSettings.passkey ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}>
                <Key className={`h-4 w-4 ${mpesaSettings.consumerKey && mpesaSettings.consumerSecret && mpesaSettings.shortcode && mpesaSettings.passkey ? "text-green-600" : "text-amber-600"}`} />
                <AlertDescription className={mpesaSettings.consumerKey && mpesaSettings.consumerSecret && mpesaSettings.shortcode && mpesaSettings.passkey ? "text-green-900" : "text-amber-900"}>
                  {mpesaSettings.consumerKey && mpesaSettings.consumerSecret && mpesaSettings.shortcode && mpesaSettings.passkey
                    ? "All M-PESA credentials configured. You're ready to accept payments!"
                    : "Please fill in all fields to enable M-PESA payments."}
                </AlertDescription>
              </Alert>

              <Button onClick={handleSaveMpesa} className="w-full sm:w-auto" disabled={isSavingMpesa}>
                <Save className="w-4 h-4 mr-2" />
                {isSavingMpesa ? "Saving..." : "Save M-PESA Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}