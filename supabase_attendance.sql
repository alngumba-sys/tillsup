-- Create attendance_records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  branch_id UUID,
  staff_id UUID NOT NULL,
  staff_name TEXT,
  date DATE NOT NULL,
  check_in TEXT,
  check_out TEXT,
  hours_worked NUMERIC DEFAULT 0,
  overtime_hours NUMERIC DEFAULT 0,
  status TEXT,
  recorded_by UUID,
  recorded_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create attendance_sessions table (for active clock-ins)
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL,
  staff_id UUID NOT NULL,
  branch_id UUID,
  clock_in_time TIMESTAMPTZ NOT NULL,
  status TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create work_schedules table
CREATE TABLE IF NOT EXISTS work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE,
  official_start_time TEXT NOT NULL,
  official_end_time TEXT NOT NULL,
  late_tolerance_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_schedules ENABLE ROW LEVEL SECURITY;

-- Allow read/write for authenticated users (simplified for this context)
CREATE POLICY "Attendance Records Policy" ON attendance_records
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Attendance Sessions Policy" ON attendance_sessions
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Work Schedules Policy" ON work_schedules
  FOR ALL USING (auth.role() = 'authenticated');
