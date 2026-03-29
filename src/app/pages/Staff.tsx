import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Button } from "../components/ui/button";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Users, Calendar, Settings, Shield, Upload, UserPlus } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { StaffManagementTab } from "../components/staff/StaffManagementTab";
import { WorkScheduleTab } from "../components/staff/WorkScheduleTab";
import { AttendanceTab } from "../components/staff/AttendanceTab";
import { RolesPermissionsTab } from "../components/staff/RolesPermissionsTab";

export function Staff() {
  const { user } = useAuth();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);

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
      {/* Page Header - Title and Buttons on same row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isManagerOrOwner ? "Staff Management" : "My Attendance"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isManagerOrOwner 
              ? "Manage team members, attendance, and work schedules"
              : "View your attendance records and clock-in history"}
          </p>
        </div>
        
        {/* Action buttons on the right */}
        {isManagerOrOwner && (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowImportDialog(true)}
            >
              <Upload className="w-4 h-4" />
              Import Staff
            </Button>
            <Button 
              className="gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="w-4 h-4" />
              Add Staff Member
            </Button>
          </div>
        )}
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
            <StaffManagementTab 
              showImportDialog={showImportDialog}
              setShowImportDialog={setShowImportDialog}
              showAddDialog={showAddDialog}
              setShowAddDialog={setShowAddDialog}
            />
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
