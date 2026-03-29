import { useNavigate } from "react-router";
import { AlertCircle, Mail, Phone, MessageCircle, ArrowLeft } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Alert, AlertDescription } from "../components/ui/alert";
import { useAuth } from "../contexts/AuthContext";

export function SubscriptionExpired() {
  const navigate = useNavigate();
  const { business, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo/Brand */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Subscription Expired</h1>
          <p className="text-slate-400 mt-2">Your account access has been suspended</p>
        </div>

        {/* Main Card */}
        <Card className="bg-slate-900/50 backdrop-blur border-white/10 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg">Account Inactive</CardTitle>
            <CardDescription className="text-slate-400">
              {business?.name || "Your business"}'s subscription has expired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <AlertDescription className="text-red-200">
                Your trial period has ended. To continue using Tillsup, please contact our sales team to renew your subscription.
              </AlertDescription>
            </Alert>

            {/* Contact Support */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Contact Support</h3>
              
              <div className="space-y-3">
                <a 
                  href="mailto:support@tillsup.com" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all group"
                >
                  <div className="p-2 rounded-md bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                    <Mail className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Email Support</p>
                    <p className="text-xs text-slate-400">support@tillsup.com</p>
                  </div>
                </a>

                <a 
                  href="tel:+254712345678" 
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-green-500/30 hover:bg-green-500/5 transition-all group"
                >
                  <div className="p-2 rounded-md bg-green-500/10 group-hover:bg-green-500/20 transition-colors">
                    <Phone className="w-4 h-4 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">Call Us</p>
                    <p className="text-xs text-slate-400">+254 712 345 678</p>
                  </div>
                </a>

                <a 
                  href="https://wa.me/254712345678" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all group"
                >
                  <div className="p-2 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                    <MessageCircle className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">WhatsApp</p>
                    <p className="text-xs text-slate-400">+254 712 345 678</p>
                  </div>
                </a>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-white/10">
              <Button 
                variant="ghost" 
                onClick={handleLogout}
                className="w-full text-slate-400 hover:text-white hover:bg-white/5"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          Your data is safe and will be restored when you renew your subscription.
        </p>
      </div>
    </div>
  );
}