import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ORIGINAL ATTENDANCE TRACKING CONTEXT (TIME-BASED ONLY)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * PURPOSE:
 * - Track employee clock-in/clock-out times
 * - Detect lateness based on work schedule
 * - View attendance history
 * - Simple, time-based attendance tracking only
 * 
 * FEATURES:
 * - Real-time clock-in/clock-out
 * - Automatic lateness detection
 * - Work schedule configuration (start time, grace period)
 * - Attendance history viewing
 * - Hours worked calculation
 * 
 * NOT INCLUDED (removed from payroll):
 * - Manual attendance recording
 * - Payroll integration
 * - Salary calculations
 * - Leave balance tracking
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
  clockIn: () => { success: boolean; error?: string };
  clockOut: () => { success: boolean; error?: string };
  isStaffClockedIn: (staffId: string) => boolean;
  getCurrentSession: (staffId: string) => ClockInSession | null;
  getActiveSessionsForToday: () => ClockInSession[];
  
  // Work Schedule
  getWorkSchedule: (businessId: string) => WorkSchedule | null;
  saveWorkSchedule: (schedule: WorkSchedule) => { success: boolean; error?: string };
  
  // Attendance History (Read-only viewing)
  attendanceRecords: AttendanceRecord[];
  getAttendanceByStaff: (staffId: string, startDate: string, endDate: string) => AttendanceRecord[];
  getAttendanceByDate: (date: string, branchId?: string) => AttendanceRecord[];
  
  // Calculations
  calculateHoursWorked: (checkIn: string, checkOut: string) => { regular: number; overtime: number };
  getMonthlyHours: (staffId: string, year: number, month: number) => { totalHours: number; overtimeHours: number };
}

const AttendanceContext = createContext<AttendanceContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ATTENDANCE: "pos_attendance_records",
  SESSIONS: "pos_clock_in_sessions",
  WORK_SCHEDULES: "pos_work_schedules"
};

// Standard work hours configuration
const STANDARD_WORK_DAY_HOURS = 8;
const OVERTIME_THRESHOLD = STANDARD_WORK_DAY_HOURS;

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
  const getStaffMembers = authContext?.getStaffMembers || (async () => []);

  // ════════════════════════════════════��══════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [clockInSessions, setClockInSessions] = useState<ClockInSession[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      const sessions = stored ? JSON.parse(stored) : [];
      // Convert stored date strings back to Date objects
      return sessions.map((s: any) => ({
        ...s,
        clockInTime: new Date(s.clockInTime)
      }));
    } catch {
      return [];
    }
  });

  const [workSchedules, setWorkSchedules] = useState<WorkSchedule[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.WORK_SCHEDULES);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // ═══════════════════════════════════════════════════════════════════
  // PERSIST TO LOCALSTORAGE
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(attendanceRecords));
  }, [attendanceRecords]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(clockInSessions));
  }, [clockInSessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.WORK_SCHEDULES, JSON.stringify(workSchedules));
  }, [workSchedules]);

  // ═══════════════════════════════════════════════════════════════════
  // WORK SCHEDULE
  // ═══════════════════════════════════════════════════════════════════
  const getWorkSchedule = (businessId: string): WorkSchedule | null => {
    return workSchedules.find(ws => ws.businessId === businessId) || null;
  };

  const saveWorkSchedule = (schedule: WorkSchedule) => {
    setWorkSchedules(prev => {
      const existing = prev.findIndex(ws => ws.businessId === schedule.businessId);
      if (existing !== -1) {
        const updated = [...prev];
        updated[existing] = schedule;
        return updated;
      } else {
        return [...prev, schedule];
      }
    });
    toast.success("Work schedule saved");
    return { success: true };
  };

  // ═══════════════════════════════════════════════════════════════════
  // HOURS CALCULATION
  // ═══════════════════════════════════════════════════════════════════
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
  const clockIn = (): { success: boolean; error?: string } => {
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

    // Create session
    const session: ClockInSession = {
      staffId: user.id,
      businessId: business.id,
      branchId: user.branchId || "",
      clockInTime: now,
      status,
      date: currentDate
    };

    setClockInSessions(prev => [...prev, session]);
    toast.success(status === "Late" ? "Clocked In (Late)" : "Clocked In", {
      description: `Time: ${currentTime}`
    });

    return { success: true };
  };

  const clockOut = (): { success: boolean; error?: string } => {
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

    // Create attendance record
    const record: AttendanceRecord = {
      id: `ATT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save record
    setAttendanceRecords(prev => [...prev, record]);

    // Remove session
    setClockInSessions(prev => prev.filter((_, i) => i !== sessionIndex));

    toast.success("Clocked Out", {
      description: `Hours worked: ${regular.toFixed(1)}h${overtime > 0 ? ` + ${overtime.toFixed(1)}h OT` : ''}`
    });

    return { success: true };
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