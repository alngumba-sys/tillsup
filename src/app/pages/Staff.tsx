import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Users, Calendar, Settings, Shield } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { StaffManagementTab } from "../components/staff/StaffManagementTab";
import { WorkScheduleTab } from "../components/staff/WorkScheduleTab";
import { AttendanceTab } from "../components/staff/AttendanceTab";
import { RolesPermissionsTab } from "../components/staff/RolesPermissionsTab";

export function Staff() {
  const { user } = useAuth();

  // Check if user exists
  if (!user) {
    return (
      <div className="p-4 lg:p-6">
        <Alert variant="destructive">
          <AlertDescription>
            Authentication required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Determine which tabs to show based on role
  const isManagerOrOwner = user.role === "Business Owner" || user.role === "Manager";
  const isOwner = user.role === "Business Owner";

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl mb-1">
          {isManagerOrOwner ? "Staff Management" : "My Attendance"}
        </h1>
        <p className="text-muted-foreground">
          {isManagerOrOwner 
            ? "Manage team members, attendance, and work schedules"
            : "View your attendance records and clock-in history"}
        </p>
      </div>

      {/* Tabbed Interface */}
      <Tabs defaultValue={isManagerOrOwner ? "staff" : "attendance"} className="space-y-6">
        <TabsList>
          {isManagerOrOwner && (
            <TabsTrigger value="staff" className="gap-2">
              <Users className="w-4 h-4" />
              Staff
            </TabsTrigger>
          )}
          <TabsTrigger value="attendance" className="gap-2">
            <Calendar className="w-4 h-4" />
            Attendance
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="schedule" className="gap-2">
              <Settings className="w-4 h-4" />
              Work Schedule
            </TabsTrigger>
          )}
          {isOwner && (
            <TabsTrigger value="roles" className="gap-2">
              <Shield className="w-4 h-4" />
              Roles & Permissions
            </TabsTrigger>
          )}
        </TabsList>

        {isManagerOrOwner && (
          <TabsContent value="staff">
            <StaffManagementTab />
          </TabsContent>
        )}

        <TabsContent value="attendance">
          <AttendanceTab />
        </TabsContent>

        {isOwner && (
          <TabsContent value="schedule">
            <WorkScheduleTab />
          </TabsContent>
        )}

        {isOwner && (
          <TabsContent value="roles">
            <RolesPermissionsTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}