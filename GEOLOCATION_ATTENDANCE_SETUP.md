# Geolocation-Based Attendance Setup Guide

## Overview
The system now enforces location-based attendance tracking to ensure staff can only clock in/out when physically present at their assigned branch location.

## Database Schema Updates Required

Run the following SQL in your Supabase SQL Editor:

```sql
-- Add geolocation columns to branches table
ALTER TABLE public.branches 
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geofence_radius INTEGER DEFAULT 100;

-- Add comment for clarity
COMMENT ON COLUMN public.branches.latitude IS 'Branch latitude coordinate for geofence validation';
COMMENT ON COLUMN public.branches.longitude IS 'Branch longitude coordinate for geofence validation';
COMMENT ON COLUMN public.branches.geofence_radius IS 'Allowed radius in meters for clock in/out (default: 100m)';
```

## How It Works

### 1. **Branch Setup**
   - Business owners can optionally set latitude/longitude coordinates for each branch
   - If coordinates are set, geolocation validation is enforced
   - If coordinates are NOT set, staff can clock in/out from anywhere (backward compatible)
   - Geofence radius is customizable per branch (default: 100 meters)

### 2. **Clock-In Process**
   When a staff member attempts to clock in:
   1. System requests their current location (requires browser permission)
   2. Calculates distance between staff location and branch location
   3. If distance > geofence radius: **BLOCKED** with error message showing actual distance
   4. If distance ≤ geofence radius: **ALLOWED** to clock in
   5. If location permission denied: **BLOCKED** with helpful error message

### 3. **Error Messages**
   Staff will see clear, actionable error messages:
   - `"You must be at [Branch Name] to clock in. You are 250m away (allowed: 100m)"`
   - `"Location permission denied. Please enable location services to clock in."`
   - `"Unable to get your location. Please check your device settings."`

### 4. **Clock-Out Process**
   - Currently no geolocation check on clock-out (staff can clock out from anywhere)
   - This prevents staff from being "locked in" if they need to leave for emergency
   - Can be enhanced to validate clock-out location if required

## Setting Up Branch Geolocation

### Option 1: Use Google Maps to Get Coordinates
1. Open Google Maps
2. Right-click on your branch location
3. Click on the coordinates shown (e.g., "-1.286389, 36.817223")
4. Coordinates are copied to clipboard
5. Update your branch in the Branch Management page

### Option 2: Use Geolocation API
Visit: https://www.latlong.net/
- Enter your branch address
- Copy the latitude and longitude values

### Example Branch Configuration
```typescript
{
  name: "Main Branch",
  location: "123 Main Street, Nairobi",
  latitude: -1.286389,
  longitude: 36.817223,
  geofenceRadius: 150  // 150 meters allowed range
}
```

## Technical Implementation

### Frontend Components Modified
1. **`/src/app/contexts/BranchContext.tsx`**
   - Added `latitude`, `longitude`, `geofenceRadius` to Branch interface
   - Updated `createBranch` and `updateBranch` to handle geolocation fields

2. **`/src/app/contexts/AttendanceContext.tsx`**
   - Added Haversine formula for distance calculation
   - Added geolocation permission handling
   - Modified `clockIn()` to validate staff location

### Geolocation Settings
```typescript
const DEFAULT_GEOFENCE_RADIUS = 100; // meters
const GEOLOCATION_TIMEOUT = 10000; // 10 seconds
```

## Security & Privacy Considerations

### Browser Permission Requirements
- Staff must grant location permission to their browser
- Location is only checked during clock-in, not tracked continuously
- Location data is NOT stored in the database (only validated in real-time)

### Accuracy
- Uses high-accuracy mode for GPS tracking
- Typical accuracy: 5-20 meters (depending on device and environment)
- Indoor locations may have reduced accuracy

### Fallback Behavior
- If branch has no coordinates set: No geolocation check (allows remote work)
- If geolocation fails: Staff cannot clock in (prevents fraud)

## Testing Geolocation

### Development Testing
Use browser DevTools to simulate location:
1. Open DevTools (F12)
2. Click menu (⋮) → More tools → Sensors
3. Select a location or enter custom coordinates
4. Test clock-in from different distances

### Mobile Testing
- Test on actual device at branch location
- Verify accuracy and user experience
- Check error messages are clear and helpful

## Troubleshooting

### "Location permission denied"
**Solution:** Staff needs to:
1. Click the lock/info icon in browser address bar
2. Change Location permission to "Allow"
3. Refresh the page and try again

### "Unable to get your location"
**Possible Causes:**
- GPS/location services disabled on device
- Poor GPS signal (try moving near a window)
- Browser doesn't support geolocation
**Solution:** Enable location services in device settings

### "You are XXXm away (allowed: 100m)"
**Possible Causes:**
- Staff is actually outside the geofence
- Branch coordinates are incorrect
- GPS accuracy issue
**Solution:** 
- Verify branch coordinates are accurate
- Consider increasing geofence radius if needed
- Ask staff to move closer to branch center point

## Future Enhancements

Potential improvements:
1. ✅ Add geolocation validation to clock-out
2. ✅ Store GPS coordinates with each clock-in record for audit trails
3. ✅ Add visual map in branch management to set geofence
4. ✅ Support multiple geofence points for large campuses
5. ✅ Add "emergency override" for business owners

## Support

For issues or questions, check:
- Browser console for detailed error logs
- Supabase logs for backend errors
- Verify database schema matches requirements above
