import { useState } from "react";
import { useNavigate } from "react-router";
import { supabase } from "../../lib/supabase";
import { toast } from "sonner";
import { Building2, RefreshCw } from "lucide-react";

/**
 * EMERGENCY RECOVERY PAGE
 * 
 * For users who have an auth account but missing business/profile records
 * (This happens when network blocks prevent database writes during registration)
 */
export default function RecoveryRegistration() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    country: "Kenya",
    currency: "KES",
    firstName: "",
    lastName: "",
    phone: ""
  });

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        toast.error("Please login first");
        navigate("/login");
        return;
      }

      const userId = user.id;
      const userEmail = user.email || "";

      // 2. Check if business already exists
      const { data: existingBusiness } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', userId)
        .maybeSingle();

      let businessId = "";

      if (existingBusiness) {
        businessId = existingBusiness.id;
        toast.info("Business record found");
      } else {
        // Create business
        businessId = crypto.randomUUID();
        const newBusiness = {
          id: businessId,
          name: formData.businessName,
          owner_id: userId,
          subscription_plan: "Free Trial",
          subscription_status: "trial",
          trial_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          currency: formData.currency,
          country: formData.country,
          created_at: new Date().toISOString(),
        };

        const { error: bizError } = await supabase.from('businesses').insert(newBusiness);
        
        if (bizError) {
          console.error("Business creation failed:", bizError);
          toast.error("Failed to create business: " + bizError.message);
          setLoading(false);
          return;
        }

        toast.success("Business created!");
      }

      // 3. Check if profile already exists
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile) {
        toast.info("Profile record found");
      } else {
        // Create profile
        const newProfile = {
          id: userId,
          email: userEmail,
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phone,
          role: "Business Owner",
          business_id: businessId,
          can_create_expense: true,
          created_at: new Date().toISOString()
        };

        const { error: profileError } = await supabase.from('profiles').insert(newProfile);
        
        if (profileError) {
          console.error("Profile creation failed:", profileError);
          toast.error("Failed to create profile: " + profileError.message);
          setLoading(false);
          return;
        }

        toast.success("Profile created!");
      }

      // 4. Create default branch
      const { data: existingBranch } = await supabase
        .from('branches')
        .select('id')
        .eq('business_id', businessId)
        .maybeSingle();

      if (!existingBranch) {
        const branchId = crypto.randomUUID();
        const newBranch = {
          id: branchId,
          name: "Main Branch",
          business_id: businessId,
          status: "active",
          created_at: new Date().toISOString()
        };

        await supabase.from('branches').insert(newBranch);
        toast.success("Main branch created!");
      }

      // 5. Success!
      toast.success("Registration completed successfully! Redirecting...");
      
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1500);

    } catch (error: any) {
      console.error("Recovery error:", error);
      toast.error("Error: " + error.message);
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
            <RefreshCw className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Registration</h1>
          <p className="text-gray-600">
            We detected that your account setup was interrupted. 
            Let's finish setting up your business account.
          </p>
        </div>

        <form onSubmit={handleComplete} className="space-y-6">
          {/* Business Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Business Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., ABCDR Limited"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Country *
                  </label>
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Kenya">Kenya</option>
                    <option value="Uganda">Uganda</option>
                    <option value="Tanzania">Tanzania</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency *
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="KES">KES (Kenyan Shilling)</option>
                    <option value="UGX">UGX (Ugandan Shilling)</option>
                    <option value="TZS">TZS (Tanzanian Shilling)</option>
                    <option value="USD">USD (US Dollar)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Owner Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Your Information
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="First name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Last name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0712345678"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
            >
              Logout & Start Over
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Completing Setup...
                </>
              ) : (
                "Complete Registration"
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>Why am I seeing this?</strong><br />
            Your account was created but the setup was interrupted (possibly due to network issues).
            Complete this form to finish your registration.
          </p>
        </div>
      </div>
    </div>
  );
}