import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { WifiOff, Wifi } from "lucide-react";
import { toast } from "sonner";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.debug("✅ Network connection restored");
      setIsOnline(true);
      
      if (wasOffline) {
        toast.success("Back Online", {
          description: "Internet connection has been restored.",
          duration: 3000
        });
        // Reload after a brief delay to refresh data
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    };

    const handleOffline = () => {
      console.debug("❌ Network connection lost");
      setIsOnline(false);
      setWasOffline(true);
      
      toast.error("No Internet Connection", {
        description: "You are currently offline. Some features may not work.",
        duration: Infinity // Keep showing until back online
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial status
    if (!navigator.onLine) {
      handleOffline();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 p-4">
      <Alert className="border-destructive bg-destructive/10 backdrop-blur-sm">
        <WifiOff className="h-4 w-4 text-destructive" />
        <AlertTitle className="text-destructive font-semibold">No Internet Connection</AlertTitle>
        <AlertDescription className="text-destructive/90">
          You are currently offline. Please check your internet connection and try again.
        </AlertDescription>
      </Alert>
    </div>
  );
}