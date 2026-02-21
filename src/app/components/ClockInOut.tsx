import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Clock, LogOut, AlertCircle } from "lucide-react";
import { useAttendance } from "../contexts/AttendanceContext";
import { useAuth } from "../contexts/AuthContext";
import { cn } from "./ui/utils";
import { useState, useEffect } from "react";

export function ClockInOut() {
  // Safe access to contexts - handle case where they might not be ready yet
  let user = null;
  let clockIn: any = () => ({ success: false });
  let clockOut: any = () => ({ success: false });
  let isStaffClockedIn: any = () => false;
  let getCurrentSession: any = () => null;
  
  try {
    const auth = useAuth();
    user = auth.user;
  } catch (error) {
    // AuthContext not available yet
    return null;
  }

  try {
    const attendance = useAttendance();
    clockIn = attendance.clockIn;
    clockOut = attendance.clockOut;
    isStaffClockedIn = attendance.isStaffClockedIn;
    getCurrentSession = attendance.getCurrentSession;
  } catch (error) {
    // AttendanceContext not available yet
    return null;
  }

  const [isProcessing, setIsProcessing] = useState(false);
  const [elapsedTime, setElapsedTime] = useState("");

  // Business owners cannot clock in/out
  if (!user || user.role === "Business Owner") {
    return null;
  }

  const isClockedIn = isStaffClockedIn(user.id);
  const currentSession = getCurrentSession(user.id);
  const isLate = currentSession?.status === "Late";

  // Update elapsed time every minute
  useEffect(() => {
    if (!isClockedIn || !currentSession) {
      setElapsedTime("");
      return;
    }

    const updateElapsedTime = () => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - currentSession.clockInTime.getTime()) / 60000);
      const hours = Math.floor(elapsed / 60);
      const minutes = elapsed % 60;
      setElapsedTime(`${hours}h ${minutes}m`);
    };

    // Update immediately
    updateElapsedTime();

    // Then update every minute
    const interval = setInterval(updateElapsedTime, 60000);

    return () => clearInterval(interval);
  }, [isClockedIn, currentSession]);

  const handleClockIn = async () => {
    setIsProcessing(true);
    const result = clockIn();
    
    if (!result.success) {
      // Could show a toast notification here
      console.error(result.error);
    }
    
    setIsProcessing(false);
  };

  const handleClockOut = async () => {
    setIsProcessing(true);
    const result = clockOut();
    
    if (!result.success) {
      // Could show a toast notification here
      console.error(result.error);
    }
    
    setIsProcessing(false);
  };

  return (
    <div className="flex items-center gap-2">
      {isClockedIn ? (
        <>
          {/* Late Status Badge (if late) */}
          {isLate && (
            <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-3 h-3 text-red-600" />
              <span className="text-xs font-medium text-red-700">Late</span>
            </div>
          )}

          {/* Clocked In Status */}
          <div className={cn(
            "hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md",
            isLate 
              ? "bg-orange-50 border border-orange-200" 
              : "bg-green-50 border border-green-200"
          )}>
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              isLate ? "bg-orange-500" : "bg-green-500"
            )} />
            <span className={cn(
              "text-xs font-medium",
              isLate ? "text-orange-700" : "text-green-700"
            )}>
              {elapsedTime}
            </span>
          </div>
          
          {/* Clock Out Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClockOut}
            disabled={isProcessing}
            className={cn(
              "gap-2",
              "border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            )}
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Clock Out</span>
          </Button>
        </>
      ) : (
        <>
          {/* Clock In Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleClockIn}
            disabled={isProcessing}
            className={cn(
              "gap-2",
              "border-blue-200 text-blue-700 hover:bg-blue-50 hover:text-blue-800"
            )}
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">Clock In</span>
          </Button>
        </>
      )}
    </div>
  );
}