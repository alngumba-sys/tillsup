import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { 
  Clock, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Settings
} from "lucide-react";
import { useAttendance } from "../../contexts/AttendanceContext";
import { useAuth } from "../../contexts/AuthContext";

export function WorkScheduleTab() {
  const { business, user, hasPermission } = useAuth();
  const { getWorkSchedule, saveWorkSchedule } = useAttendance();

  const [officialStartTime, setOfficialStartTime] = useState("09:00");
  const [officialEndTime, setOfficialEndTime] = useState("17:00");
  const [lateToleranceMinutes, setLateToleranceMinutes] = useState(15);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load existing settings
  useEffect(() => {
    if (business) {
      const schedule = getWorkSchedule(business.id);
      if (schedule) {
        setOfficialStartTime(schedule.officialStartTime);
        setOfficialEndTime(schedule.officialEndTime);
        setLateToleranceMinutes(schedule.lateToleranceMinutes);
      }
    }
  }, [business, getWorkSchedule]);

  // Check permissions
  if (!business || !user) return null;

  if (!hasPermission(["Business Owner"])) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="font-semibold text-red-900">Access Denied</p>
              <p className="text-sm text-red-700">
                Only Business Owners can configure work schedule settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleSave = () => {
    if (!business) return;

    const result = saveWorkSchedule({
      businessId: business.id,
      officialStartTime,
      officialEndTime,
      lateToleranceMinutes
    });

    if (result.success) {
      setMessage({
        type: "success",
        text: "Work schedule settings saved successfully!"
      });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to save settings"
      });
      setTimeout(() => setMessage(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">About Work Schedule</p>
              <p className="text-sm text-blue-700">
                These settings determine when staff are expected to clock in and define the grace period 
                before they are marked as late. All times are automatically applied to staff attendance tracking.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Schedule Configuration
          </CardTitle>
          <CardDescription>
            Set your business's official working hours
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Official Start Time */}
          <div className="space-y-2">
            <Label htmlFor="startTime" className="text-base">
              Official Start Time
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              The time when staff are expected to begin work
            </p>
            <Input
              id="startTime"
              type="time"
              value={officialStartTime}
              onChange={(e) => setOfficialStartTime(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Official End Time */}
          <div className="space-y-2">
            <Label htmlFor="endTime" className="text-base">
              Official End Time
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              The time when staff are expected to finish work
            </p>
            <Input
              id="endTime"
              type="time"
              value={officialEndTime}
              onChange={(e) => setOfficialEndTime(e.target.value)}
              className="max-w-xs"
            />
          </div>

          {/* Late Tolerance */}
          <div className="space-y-2">
            <Label htmlFor="tolerance" className="text-base">
              Late Tolerance (minutes)
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Grace period after start time before marking as late (0-120 minutes)
            </p>
            <Input
              id="tolerance"
              type="number"
              min="0"
              max="120"
              value={lateToleranceMinutes}
              onChange={(e) => setLateToleranceMinutes(parseInt(e.target.value) || 0)}
              className="max-w-xs"
            />
          </div>

          {/* Preview */}
          <div className="pt-4 border-t border-border">
            <h4 className="font-semibold mb-3">Preview</h4>
            <div className="grid gap-3 md:grid-cols-2">
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="font-semibold text-sm">On Time</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clock in before {officialStartTime} or within {lateToleranceMinutes} minutes after
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-sm">Late</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Clock in more than {lateToleranceMinutes} minutes after {officialStartTime}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Success/Error Message */}
          {message && (
            <div
              className={`p-4 rounded-lg border ${
                message.type === "success"
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div className="flex items-center gap-2">
                {message.type === "success" ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                <p
                  className={`text-sm font-medium ${
                    message.type === "success" ? "text-green-900" : "text-red-900"
                  }`}
                >
                  {message.text}
                </p>
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <Button onClick={handleSave} className="gap-2">
              <Save className="w-4 h-4" />
              Save Schedule Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">How This Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">1</span>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Automatic Status Detection</p>
              <p>
                When staff clock in, the system automatically compares their clock-in time to the 
                official start time and determines if they are on time or late.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">2</span>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Grace Period</p>
              <p>
                Staff who clock in within the late tolerance period are still marked as "On Time" 
                to account for minor delays.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">3</span>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">Immutable Records</p>
              <p>
                Once a status is assigned during clock-in, it cannot be manually edited. This ensures 
                accurate and tamper-proof attendance records.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
