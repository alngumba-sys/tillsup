import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import { ScrollArea } from "../ui/scroll-area";
import { 
  Clock, 
  LogOut, 
  Users, 
  Calendar, 
  Timer,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { useAttendance, type AttendanceStatus } from "../../contexts/AttendanceContext";
import { useAuth } from "../../contexts/AuthContext";
import { useBranch } from "../../contexts/BranchContext";

export function AttendanceTab() {
  const { business, user, getStaffMembers } = useAuth();
  const { branches } = useBranch();
  const { 
    attendanceRecords,
    getAttendanceByDate, 
    getAttendanceByStaff,
    getActiveSessionsForToday
  } = useAttendance();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  if (!business || !user) return null;

  // Role-based filtering
  const isStaff = user.role === "Staff" || user.role === "Cashier" || user.role === "Accountant";
  const canViewAll = user.role === "Business Owner" || user.role === "Manager";

  // Get records based on role
  const todayDate = new Date().toISOString().split('T')[0];
  const todayRecords = getAttendanceByDate(todayDate);
  const allRecords = getAttendanceByDate(selectedDate);
  const staffRecords = getAttendanceByStaff(user.id, selectedDate, selectedDate);
  
  // Show only staff's own records if they are not manager/owner
  const records = isStaff ? staffRecords : allRecords;
  const staffMembers = getStaffMembers();
  
  // Get active sessions (currently clocked in staff)
  const activeSessions = getActiveSessionsForToday();
  
  // Calculate today's stats
  const todayStats = {
    clockedIn: activeSessions.length, // Count active sessions, not completed records
    totalStaff: staffMembers.length,
    records: todayRecords
  };

  const formatTime = (time: string | null) => {
    if (!time) return "N/A";
    return time;
  };

  const formatDuration = (hours: number) => {
    const h = Math.floor(hours);
    const mins = Math.round((hours - h) * 60);
    return `${h}h ${mins}m`;
  };

  const getStaffName = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff ? `${staff.firstName} ${staff.lastName}` : "Unknown";
  };

  const getStaffRole = (staffId: string) => {
    const staff = staffMembers.find(s => s.id === staffId);
    return staff?.role || "Staff";
  };

  const getStatusBadge = (status: AttendanceStatus) => {
    switch (status) {
      case "Present":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Present
          </Badge>
        );
      case "Late":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" />
            Late
          </Badge>
        );
      case "Absent":
        return (
          <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">
            Absent
          </Badge>
        );
      case "On Leave":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
            On Leave
          </Badge>
        );
      case "Half Day":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
            Half Day
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Info Banner for Staff */}
      {isStaff && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900 mb-1">Personal Attendance</p>
                <p className="text-sm text-blue-700">
                  You can only view your own attendance records. To view all staff attendance, 
                  contact your manager or business owner.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clocked In Now
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {todayStats.clockedIn}
              <span className="text-lg font-normal text-muted-foreground">
                {" "}/ {todayStats.totalStaff}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayStats.totalStaff > 0 
                ? `${Math.round((todayStats.clockedIn / todayStats.totalStaff) * 100)}% present`
                : "No staff"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Today's Records
              </CardTitle>
              <Calendar className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.records.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Clock in/out events
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Staff
              </CardTitle>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayStats.totalStaff}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active employees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Attendance Records</CardTitle>
              <CardDescription>
                {isStaff 
                  ? "View your personal attendance history and clock-in records" 
                  : "View and filter attendance history for all staff members"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-auto"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {records.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="w-12 h-12 text-muted-foreground opacity-50 mb-4" />
                <p className="text-muted-foreground">No attendance records for this date</p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => (
                  <Card key={record.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex flex-col gap-4">
                        {/* Header Row: Staff Info and Status */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <Users className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{record.staffName}</p>
                              <Badge variant="outline" className="text-xs mt-1">
                                {getStaffRole(record.staffId)}
                              </Badge>
                            </div>
                          </div>
                          <div>
                            {getStatusBadge(record.status)}
                          </div>
                        </div>

                        {/* Time Info Row */}
                        <div className="grid grid-cols-3 gap-4 text-sm pt-3 border-t border-border">
                          {/* Clock In */}
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Clock className="w-3 h-3" />
                              <span className="text-xs">Clock In</span>
                            </div>
                            <p className="font-semibold">{formatTime(record.checkIn)}</p>
                          </div>

                          {/* Clock Out */}
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <LogOut className="w-3 h-3" />
                              <span className="text-xs">Clock Out</span>
                            </div>
                            <p className="font-semibold">
                              {record.checkOut 
                                ? formatTime(record.checkOut)
                                : <Badge variant="secondary" className="text-xs">N/A</Badge>
                              }
                            </p>
                          </div>

                          {/* Duration */}
                          <div>
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Timer className="w-3 h-3" />
                              <span className="text-xs">Hours Worked</span>
                            </div>
                            <p className="font-semibold">{formatDuration(record.hoursWorked)}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Currently Clocked In Staff */}
      {todayStats.clockedIn > 0 && !isStaff && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Currently Working
            </CardTitle>
            <CardDescription>Staff members currently clocked in today</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {activeSessions.map((session) => {
                const clockInTime = `${session.clockInTime.getHours().toString().padStart(2, '0')}:${session.clockInTime.getMinutes().toString().padStart(2, '0')}`;
                return (
                  <Card key={session.staffId} className="bg-green-50 border-green-200">
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm">{getStaffName(session.staffId)}</p>
                          <p className="text-xs text-muted-foreground">
                            Clocked in at {clockInTime}
                          </p>
                        </div>
                        {getStatusBadge(session.status)}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}