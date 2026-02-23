import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { useBranch } from "./BranchContext";
import { toast } from "sonner";
import { supabase } from "../../lib/supabase";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ATTENDANCE TRACKING CONTEXT (SUPABASE-BACKED)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Track employee clock-in/clock-out times via Supabase
 * - Detect lateness based on work schedule
 * - View attendance history
 * 
 * FEATURES:
 * - Real-time clock-in/clock-out
 * - Automatic lateness detection
 * - Work schedule configuration (persisted to DB)
 * - Attendance history viewing
 * - Hours worked calculation
 * 
 * ═══════════════════════════════════════════════════════════════════════════
 */

export type AttendanceStatus = "Present" | "Late" | "Absent" | "On Leave" | "Half Day";

export interface AttendanceRecord {
  id: string;
  businessId: string;
  branchId: string;
  staffId: string;
  staffName: string;
  
  // Date & Time
  date: string; // ISO date (YYYY-MM-DD)
  checkIn: string | null; // Time (HH:mm)
  checkOut: string | null; // Time (HH:mm)
  
  // Calculated
  hoursWorked: number;
  overtimeHours: number;
  status: AttendanceStatus;
  
  // Notes
  notes?: string;
  
  // Audit
  recordedBy: string; // Staff ID who recorded
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClockInSession {
  id: string;
  staffId: string;
  businessId: string;
  branchId: string;
  clockInTime: Date;
  status: AttendanceStatus;
  date: string;
}

export interface WorkSchedule {
  businessId: string;
  officialStartTime: string; // e.g., "09:00"
  officialEndTime: string; // e.g., "17:00"
  lateToleranceMinutes: number; // Grace period before marking as late
}

interface AttendanceContextType {
  // Clock-in/Clock-out (Real-time)
  clockIn: () => Promise<{ success: boolean; error?: string }>;
  clockOut: () => Promise<{ success: boolean; error?: string }>;
  isStaffClockedIn: (staffId: string) => boolean;
  getCurrentSession: (staffId: string) => ClockInSession | null;
  getActiveSessionsForToday: () => ClockInSession[];
  
  // Work Schedule
  getWorkSchedule: (businessId: string) => WorkSchedule | null;
  saveWorkSchedule: (schedule: WorkSchedule) => Promise<{ success: boolean; error?: string }>;
  
  // Attendance History (Read-only viewing)
  attendanceRecords: AttendanceRecord[];
  getAttendanceByStaff: (staffId: string, startDate: string, endDate: string) => AttendanceRecord[];
  getAttendanceByDate: (date: string, branchId?: string) => AttendanceRecord[];
  
  // Calculations
  calculateHoursWorked: (checkIn: string, checkOut: string) => { regular: number; overtime: number };
  getMonthlyHours: (staffId: string, year: number, month: number) => { totalHours: number; overtimeHours: number };
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

// Standard work hours configuration
const STANDARD_WORK_DAY_HOURS = 8;
const OVERTIME_THRESHOLD = STANDARD_WORK_DAY_HOURS;

// Geolocation settings
const DEFAULT_GEOFENCE_RADIUS = 100; // meters
const GEOLOCATION_TIMEOUT = 10000; // 10 seconds

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Get user's current geolocation
 */
async function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by your browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: GEOLOCATION_TIMEOUT,
      maximumAge: 0
    });
  });
}

export function AttendanceProvider({ children }: { children: ReactNode }) {
  // Safe context access
  let authContext;
  try {
    authContext = useAuth();
  } catch (e) {
    console.warn("AttendanceProvider: AuthContext not available", e);
  }
  
  const business = authContext?.business;
  const user = authContext?.user;

  // Safe context access
  let branchContext;
  try {
    branchContext = useBranch();
  } catch (e) {
    console.warn("AttendanceProvider: BranchContext not available", e);
  }
  
  const getBranchById = branchContext?.getBranchById;

  // ══════════��════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [clockInSessions, setClockInSessions] = useState<ClockInSession[]>([]);
  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>([]);

  // ═══════════════════════════════════════════════════════════════════
  // FETCH DATA FROM SUPABASE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!business) {
      setAttendanceRecords([]);
      setClockInSessions([]);
      setWorkSchedules([]);
      return;
    }

    const fetchAllData = async () => {
      try {
        // 1. Fetch Attendance Records
        const { data: records, error: recordsError } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('business_id', business.id);

        if (records) {
          setAttendanceRecords(records.map((r: any) => ({
            id: r.id,
            businessId: r.business_id,
            branchId: r.branch_id,
            staffId: r.staff_id,
            staffName: r.staff_name || "Unknown",
            date: r.date,
            checkIn: r.check_in,
            checkOut: r.check_out,
            hoursWorked: Number(r.hours_worked || 0),
            overtimeHours: Number(r.overtime_hours || 0),
            status: r.status as AttendanceStatus,
            recordedBy: r.recorded_by,
            recordedByName: r.recorded_by_name || "Unknown",
            createdAt: r.created_at,
            updatedAt: r.updated_at
          })));
        }

        // 2. Fetch Active Sessions
        const { data: sessions, error: sessionsError } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('business_id', business.id);

        if (sessions) {
          setClockInSessions(sessions.map((s: any) => ({
            id: s.id,
            staffId: s.staff_id,
            businessId: s.business_id,
            branchId: s.branch_id,
            clockInTime: new Date(s.clock_in_time),
            status: s.status as AttendanceStatus,
            date: s.date
          })));
        }

        // 3. Fetch Work Schedules
        const { data: schedules, error: schedulesError } = await supabase
          .from('work_schedules')
          .select('*')
          .eq('business_id', business.id);

        if (schedules) {
          setWorkSchedules(schedules.map((s: any) => ({
            businessId: s.business_id,
            officialStartTime: s.official_start_time,
            officialEndTime: s.official_end_time,
            lateToleranceMinutes: s.late_tolerance_minutes
          })));
        }

      } catch (err) {
        console.error("Error fetching attendance data:", err);
      }
    };

    fetchAllData();
  }, [business]);

  // ═══════════════════════════════════════════════════════════════════
  // WORK SCHEDULE
  // ═══════════════════════════════════════════════════════════════════
  const getWorkSchedule = (businessId: string): WorkSchedule | null => {
    return workSchedules.find(ws => ws.businessId === businessId) || null;
  };

  const saveWorkSchedule = async (schedule: WorkSchedule) => {
    if (!business) return { success: false, error: "Not authenticated" };

    try {
      // Check if schedule exists
      const existing = workSchedules.find(ws => ws.businessId === schedule.businessId);
      
      const dbSchedule = {
        business_id: schedule.businessId,
        official_start_time: schedule.officialStartTime,
        official_end_time: schedule.officialEndTime,
        late_tolerance_minutes: schedule.lateToleranceMinutes
      };

      const { error } = await supabase
        .from('work_schedules')
        .upsert(dbSchedule, { onConflict: 'business_id' });

      if (error) throw error;

      // Update local state
      setWorkSchedules(prev => {
        if (existing) {
          return prev.map(ws => ws.businessId === schedule.businessId ? schedule : ws);
        } else {
          return [...prev, schedule];
        }
      });

      toast.success("Work schedule saved");
      return { success: true };
    } catch (err: any) {
      console.error("Error saving work schedule:", err);
      toast.error("Failed to save schedule");
      return { success: false, error: err.message };
    }
  };

  // ═══════════════════════════════════════════════════════════════════
  // HOURS CALCULATION
  // ═══════════════════════════���═══════════════════════════════════════
  const calculateHoursWorked = (checkIn: string, checkOut: string): { regular: number; overtime: number } => {
    if (!checkIn || !checkOut) return { regular: 0, overtime: 0 };

    // Parse times (format: HH:mm)
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);

    // Calculate total minutes
    const inTotalMinutes = inHours * 60 + inMinutes;
    const outTotalMinutes = outHours * 60 + outMinutes;

    let totalMinutes = outTotalMinutes - inTotalMinutes;
    
    // Handle overnight shift (rare but possible)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const totalHours = totalMinutes / 60;
    
    // Split into regular and overtime
    const regularHours = Math.min(totalHours, OVERTIME_THRESHOLD);
    const overtimeHours = Math.max(0, totalHours - OVERTIME_THRESHOLD);

    return {
      regular: parseFloat(regularHours.toFixed(2)),
      overtime: parseFloat(overtimeHours.toFixed(2))
    };
  };

  // ═══════════════════════════════════════════════════════════════════
  // CLOCK-IN / CLOCK-OUT
  // ═══════════════════════════════════════════════════════════════════
  const clockIn = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !business) {
      return { success: false, error: "Not authenticated" };
    }

    // Check if already clocked in
    const existingSession = clockInSessions.find(
      s => s.staffId === user.id && s.businessId === business.id
    );

    if (existingSession) {
      return { success: false, error: "Already clocked in" };
    }

    // Get staff's assigned branch
    const staffBranchId = user.branchId;
    if (!staffBranchId) {
      return { success: false, error: "No branch assigned to your account" };
    }

    // Get branch details for geolocation validation
    const staffBranch = getBranchById ? getBranchById(staffBranchId) : null;
    
    // If branch has geolocation coordinates, validate staff location
    if (staffBranch?.latitude && staffBranch?.longitude) {
      try {
        const position = await getCurrentPosition();
        const staffLat = position.coords.latitude;
        const staffLon = position.coords.longitude;
        
        const distance = calculateDistance(
          staffLat,
          staffLon,
          staffBranch.latitude,
          staffBranch.longitude
        );

        const allowedRadius = staffBranch.geofenceRadius || DEFAULT_GEOFENCE_RADIUS;
        
        if (distance > allowedRadius) {
          const distanceInMeters = Math.round(distance);
          return {
            success: false,
            error: `You must be at ${staffBranch.name} to clock in. You are ${distanceInMeters}m away (allowed: ${allowedRadius}m)`
          };
        }
      } catch (geoError: any) {
        console.error("Geolocation error:", geoError);
        
        // Handle specific geolocation errors
        if (geoError.code === 1) {
          return {
            success: false,
            error: "Location permission denied. Please enable location services to clock in."
          };
        } else if (geoError.code === 2) {
          return {
            success: false,
            error: "Unable to get your location. Please check your device settings."
          };
        } else if (geoError.code === 3) {
          return {
            success: false,
            error: "Location request timed out. Please try again."
          };
        } else {
          return {
            success: false,
            error: "Cannot verify your location. Please enable location services."
          };
        }
      }
    }

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDate = now.toISOString().split('T')[0];

    // Get work schedule to check if late
    const schedule = getWorkSchedule(business.id);
    let status: AttendanceStatus = "Present";

    if (schedule) {
      const officialStart = schedule.officialStartTime;
      const [scheduleHours, scheduleMinutes] = officialStart.split(':').map(Number);
      const scheduleTotalMinutes = scheduleHours * 60 + scheduleMinutes;
      
      const [currentHours, currentMinutes] = currentTime.split(':').map(Number);
      const currentTotalMinutes = currentHours * 60 + currentMinutes;
      
      const minutesLate = currentTotalMinutes - scheduleTotalMinutes;
      
      if (minutesLate > schedule.lateToleranceMinutes) {
        status = "Late";
      }
    }

    try {
      // Create session in DB
      const sessionData = {
        staff_id: user.id,
        business_id: business.id,
        branch_id: staffBranchId,
        clock_in_time: now.toISOString(),
        status,
        date: currentDate
      };

      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert(sessionData)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      const newSession: ClockInSession = {
        id: data.id,
        staffId: user.id,
        businessId: business.id,
        branchId: staffBranchId,
        clockInTime: now,
        status,
        date: currentDate
      };

      setClockInSessions(prev => [...prev, newSession]);
      toast.success(status === "Late" ? "Clocked In (Late)" : "Clocked In", {
        description: `Time: ${currentTime}`
      });

      return { success: true };
    } catch (err: any) {
      console.error("Error clocking in:", err);
      return { success: false, error: err.message };
    }
  };

  const clockOut = async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !business) {
      return { success: false, error: "Not authenticated" };
    }

    const sessionIndex = clockInSessions.findIndex(
      s => s.staffId === user.id && s.businessId === business.id
    );

    if (sessionIndex === -1) {
      return { success: false, error: "No active clock-in session" };
    }

    const session = clockInSessions[sessionIndex];
    const now = new Date();
    const checkOutTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const checkInTime = `${session.clockInTime.getHours().toString().padStart(2, '0')}:${session.clockInTime.getMinutes().toString().padStart(2, '0')}`;

    // Calculate hours
    const { regular, overtime } = calculateHoursWorked(checkInTime, checkOutTime);

    try {
      // Create attendance record in DB
      const recordData = {
        business_id: business.id,
        branch_id: session.branchId,
        staff_id: user.id,
        staff_name: `${user.firstName} ${user.lastName}`,
        date: session.date,
        check_in: checkInTime,
        check_out: checkOutTime,
        hours_worked: regular,
        overtime_hours: overtime,
        status: session.status,
        recorded_by: user.id,
        recorded_by_name: `${user.firstName} ${user.lastName}`
      };

      const { data: record, error: recordError } = await supabase
        .from('attendance_records')
        .insert(recordData)
        .select()
        .single();

      if (recordError) throw recordError;

      // Delete session from DB
      const { error: deleteError } = await supabase
        .from('attendance_sessions')
        .delete()
        .eq('id', session.id); // Use ID for precise deletion

      if (deleteError) {
        console.warn("Clock out recorded but session deletion failed:", deleteError);
      }

      // Update local state
      const newRecord: AttendanceRecord = {
        id: record.id,
        businessId: business.id,
        branchId: session.branchId,
        staffId: user.id,
        staffName: `${user.firstName} ${user.lastName}`,
        date: session.date,
        checkIn: checkInTime,
        checkOut: checkOutTime,
        hoursWorked: regular,
        overtimeHours: overtime,
        status: session.status,
        recordedBy: user.id,
        recordedByName: `${user.firstName} ${user.lastName}`,
        createdAt: record.created_at,
        updatedAt: record.created_at // Assuming updated_at same as created_at initially
      };

      setAttendanceRecords(prev => [...prev, newRecord]);
      setClockInSessions(prev => prev.filter((_, i) => i !== sessionIndex));

      toast.success("Clocked Out", {
        description: `Hours worked: ${regular.toFixed(1)}h${overtime > 0 ? ` + ${overtime.toFixed(1)}h OT` : ''}`
      });

      return { success: true };
    } catch (err: any) {
      console.error("Error clocking out:", err);
      return { success: false, error: err.message };
    }
  };

  const isStaffClockedIn = (staffId: string): boolean => {
    if (!business) return false;
    return clockInSessions.some(
      s => s.staffId === staffId && s.businessId === business.id
    );
  };

  const getCurrentSession = (staffId: string): ClockInSession | null => {
    if (!business) return null;
    return clockInSessions.find(
      s => s.staffId === staffId && s.businessId === business.id
    ) || null;
  };

  const getActiveSessionsForToday = (): ClockInSession[] => {
    if (!business) return [];
    const today = new Date().toISOString().split('T')[0];
    return clockInSessions.filter(
      s => s.businessId === business.id && s.date === today
    );
  };

  // ═══════════════════════════════════════════════════════════════════
  // ATTENDANCE HISTORY (READ-ONLY)
  // ═══════════════════════════════════════════════════════════════════
  const getAttendanceByStaff = (staffId: string, startDate: string, endDate: string): AttendanceRecord[] => {
    if (!business) return [];

    return attendanceRecords.filter(record => {
      if (record.businessId !== business.id) return false;
      if (record.staffId !== staffId) return false;
      
      // Use string comparison for ISO dates (YYYY-MM-DD) to avoid timezone issues
      return record.date >= startDate && record.date <= endDate;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };

  const getAttendanceByDate = (date: string, branchId?: string): AttendanceRecord[] => {
    if (!business) return [];

    return attendanceRecords.filter(record => {
      if (record.businessId !== business.id) return false;
      if (record.date !== date) return false;
      if (branchId && record.branchId !== branchId) return false;
      return true;
    });
  };

  const getMonthlyHours = (staffId: string, year: number, month: number) => {
    if (!business) return { totalHours: 0, overtimeHours: 0 };

    const records = attendanceRecords.filter(record => {
      if (record.businessId !== business.id) return false;
      if (record.staffId !== staffId) return false;
      
      const date = new Date(record.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });

    const totalHours = records.reduce((sum, r) => sum + r.hoursWorked, 0);
    const overtimeHours = records.reduce((sum, r) => sum + r.overtimeHours, 0);

    return { totalHours, overtimeHours };
  };

  return (
    <AttendanceContext.Provider
      value={{
        clockIn,
        clockOut,
        isStaffClockedIn,
        getCurrentSession,
        getActiveSessionsForToday,
        getWorkSchedule,
        saveWorkSchedule,
        attendanceRecords,
        getAttendanceByStaff,
        getAttendanceByDate,
        calculateHoursWorked,
        getMonthlyHours
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (context === undefined) {
    throw new Error("useAttendance must be used within an AttendanceProvider");
  }
  return context;
}