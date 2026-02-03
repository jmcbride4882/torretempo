# Time Tracking API Design

**Version:** 1.0  
**Date:** 2026-02-03  
**Status:** Implementation Ready

---

## Overview

Time Tracking module for Spanish compliance (RDL 8/2019) with event-only geolocation capture.

### Key Features:

- ✅ Clock in/out with event-only GPS (AEPD-compliant)
- ✅ Automatic break deduction
- ✅ Overtime detection
- ✅ Duplicate prevention
- ✅ Missing clock-out warnings
- ✅ Scheduled vs unscheduled shift support
- ✅ Append-only audit trail (immutable)

---

## Database Schema Updates

### Current TimeEntry Model (Already Exists):

```prisma
model TimeEntry {
  id       String @id @default(uuid())
  tenantId String
  employeeId String

  clockIn  DateTime
  clockOut DateTime?

  breakMinutes Int @default(0)

  clockInLat  Float?
  clockInLng  Float?
  clockOutLat Float?
  clockOutLng Float?

  totalHours    Float?
  overtimeHours Float?

  status String @default("active")
  notes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  deletedAt DateTime?
}
```

### Required Addition:

```prisma
// Add to TimeEntry model:
shiftId String? @map("shift_id") @db.Uuid
entryType String @default("scheduled") @map("entry_type") // 'scheduled', 'unscheduled'

// Relation
shift Shift? @relation(fields: [shiftId], references: [id], onDelete: SetNull)
```

**Migration Name:** `add_shift_to_time_entry`

---

## API Endpoints

### Base URL: `/api/time-entries`

---

## 1. Clock In

**Endpoint:** `POST /api/time-entries/clock-in`

**Description:** Start a new time entry with optional geolocation

**Request Body:**

```typescript
{
  shiftId?: string;          // Optional: Link to scheduled shift
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;        // meters
    timestamp: string;       // ISO 8601
  };
  notes?: string;
}
```

**Response: 201 Created**

```typescript
{
  success: true,
  data: {
    id: string;
    employeeId: string;
    clockIn: string;         // ISO 8601
    clockOut: null;
    shiftId: string | null;
    entryType: "scheduled" | "unscheduled";
    clockInLat: number | null;
    clockInLng: number | null;
    status: "active";
    breakMinutes: 0;
    totalHours: null;
    overtimeHours: null;
    createdAt: string;
  }
}
```

**Error Responses:**

**400 Bad Request - Already Clocked In**

```typescript
{
  error: "Already clocked in",
  code: "ALREADY_CLOCKED_IN",
  currentEntry: {
    id: string;
    clockIn: string;
    shiftId: string | null;
  }
}
```

**400 Bad Request - Invalid Shift**

```typescript
{
  error: "Shift not found or not assigned to you",
  code: "INVALID_SHIFT"
}
```

**400 Bad Request - Geolocation Required**

```typescript
{
  error: "Geolocation is required for this tenant",
  code: "GEOLOCATION_REQUIRED"
}
```

---

## 2. Clock Out

**Endpoint:** `POST /api/time-entries/clock-out`

**Description:** End the active time entry

**Request Body:**

```typescript
{
  geolocation?: {
    latitude: number;
    longitude: number;
    accuracy: number;
    timestamp: string;
  };
  breakMinutes?: number;     // Override automatic break deduction
  notes?: string;
}
```

**Response: 200 OK**

```typescript
{
  success: true;
  data: {
    id: string;
    employeeId: string;
    clockIn: string;
    clockOut: string;
    shiftId: string | null;
    entryType: "scheduled" | "unscheduled";
    clockInLat: number | null;
    clockInLng: number | null;
    clockOutLat: number | null;
    clockOutLng: number | null;
    breakMinutes: number;
    totalHours: number;
    overtimeHours: number;
    status: "active";
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }
}
```

**Error Responses:**

**400 Bad Request - Not Clocked In**

```typescript
{
  error: "No active time entry found",
  code: "NOT_CLOCKED_IN"
}
```

---

## 3. Get Current Entry

**Endpoint:** `GET /api/time-entries/current`

**Description:** Get the active time entry (if any)

**Response: 200 OK**

```typescript
{
  success: true;
  data: {
    id: string;
    employeeId: string;
    clockIn: string;
    clockOut: null;
    shiftId: string | null;
    shift: {               // Populated if shiftId exists
      id: string;
      startTime: string;
      endTime: string;
      role: string | null;
      location: string | null;
    } | null;
    entryType: "scheduled" | "unscheduled";
    clockInLat: number | null;
    clockInLng: number | null;
    breakMinutes: 0;
    totalHours: null;
    overtimeHours: null;
    status: "active";
    createdAt: string;
    elapsedMinutes: number;  // Calculated: minutes since clock in
  } | null
}
```

---

## 4. Get History

**Endpoint:** `GET /api/time-entries`

**Description:** Get time entry history with pagination and filters

**Query Parameters:**

```typescript
{
  employeeId?: string;       // Filter by employee (managers/admins only)
  startDate?: string;        // ISO 8601 date
  endDate?: string;          // ISO 8601 date
  entryType?: "scheduled" | "unscheduled";
  status?: "active" | "corrected" | "deleted";
  page?: number;             // Default: 1
  limit?: number;            // Default: 50, max: 200
  sortBy?: "clockIn" | "clockOut" | "createdAt";  // Default: "clockIn"
  sortOrder?: "asc" | "desc"; // Default: "desc"
}
```

**Response: 200 OK**

```typescript
{
  success: true;
  data: {
    entries: Array<{
      id: string;
      employeeId: string;
      employee: {
        id: string;
        user: {
          firstName: string;
          lastName: string;
        };
      };
      clockIn: string;
      clockOut: string | null;
      shiftId: string | null;
      shift: {
        id: string;
        startTime: string;
        endTime: string;
        role: string | null;
        location: string | null;
      } | null;
      entryType: "scheduled" | "unscheduled";
      clockInLat: number | null;
      clockInLng: number | null;
      clockOutLat: number | null;
      clockOutLng: number | null;
      breakMinutes: number;
      totalHours: number | null;
      overtimeHours: number | null;
      status: string;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      totalItems: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    }
  }
}
```

---

## 5. Get Statistics

**Endpoint:** `GET /api/time-entries/stats`

**Description:** Get time tracking statistics for a period

**Query Parameters:**

```typescript
{
  employeeId?: string;       // Filter by employee
  startDate?: string;        // ISO 8601 date (required)
  endDate?: string;          // ISO 8601 date (required)
}
```

**Response: 200 OK**

```typescript
{
  success: true;
  data: {
    totalHours: number;
    regularHours: number;
    overtimeHours: number;
    breakHours: number;
    totalDays: number;
    daysWorked: number;
    scheduledShifts: number;
    unscheduledShifts: number;
    missingClockOuts: number;
    averageHoursPerDay: number;
  }
}
```

---

## Business Rules

### 1. Duplicate Prevention

- Employee cannot clock in if already clocked in
- Must clock out before starting new entry
- Check `clockOut IS NULL` before allowing new clock in

### 2. Automatic Break Deduction

```typescript
// Configurable per tenant in tenant.settings
{
  timeTracking: {
    autoBreakRules: [
      { minHours: 4, breakMinutes: 15 },   // 4+ hours = 15 min break
      { minHours: 6, breakMinutes: 30 },   // 6+ hours = 30 min break
      { minHours: 9, breakMinutes: 45 },   // 9+ hours = 45 min break
    ],
    allowManualBreakOverride: true
  }
}
```

### 3. Overtime Calculation

```typescript
// Standard work day = 8 hours (configurable per tenant)
const standardHours = 8;
const totalMinutes = clockOut - clockIn - breakMinutes;
const totalHours = totalMinutes / 60;
const overtimeHours = Math.max(0, totalHours - standardHours);
```

### 4. Geolocation Handling

**Tenant Settings:**

```typescript
{
  timeTracking: {
    geolocation: {
      enabled: boolean; // Master switch
      required: boolean; // Block clock in/out without GPS
      clockInRequired: boolean; // Require on clock in only
      clockOutRequired: boolean; // Require on clock out only
      maxAccuracy: number; // Reject if accuracy > X meters (e.g., 100)
    }
  }
}
```

**Validation:**

- If `required: true` and no geolocation → **400 Bad Request**
- If `maxAccuracy: 100` and `accuracy: 150` → **400 Bad Request**
- GPS data stored only at clock in/out events (NEVER continuous)

### 5. Entry Type Logic

```typescript
// Determine entry type on clock in:
if (shiftId) {
  // Validate shift exists and belongs to employee
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, employeeId, tenantId },
  });

  if (!shift) {
    throw new Error("INVALID_SHIFT");
  }

  entryType = "scheduled";
} else {
  entryType = "unscheduled";
}
```

---

## Permissions (RBAC)

### Clock In/Out

- **Employee:** Own entries only
- **Manager:** Team entries (via proxy, special cases)
- **Admin/Owner:** All entries (via proxy, special cases)

### View History

- **Employee:** Own entries only
- **Manager:** Team entries + own entries
- **Admin/Owner:** All entries

### Statistics

- **Employee:** Own stats only
- **Manager:** Team stats + own stats
- **Admin/Owner:** All stats

---

## Audit Trail

Every clock in/out operation creates an audit log:

```typescript
{
  action: "clock_in" | "clock_out",
  resourceType: "time_entry",
  resourceId: entryId,
  userId: userId,
  userEmail: userEmail,
  changesBefore: null,  // For clock in
  changesAfter: {
    clockIn: "2026-02-03T10:00:00Z",
    clockInLat: 37.9922,
    clockInLng: -1.1307,
  },
  metadata: {
    entryType: "scheduled",
    shiftId: "shift-uuid",
    geolocationAccuracy: 15.5
  }
}
```

---

## Error Codes

| Code                           | HTTP | Description                            |
| ------------------------------ | ---- | -------------------------------------- |
| `ALREADY_CLOCKED_IN`           | 400  | Employee already has active entry      |
| `NOT_CLOCKED_IN`               | 400  | No active entry to clock out           |
| `INVALID_SHIFT`                | 400  | Shift not found or not assigned        |
| `GEOLOCATION_REQUIRED`         | 400  | GPS required but not provided          |
| `GEOLOCATION_ACCURACY_TOO_LOW` | 400  | GPS accuracy exceeds threshold         |
| `INVALID_BREAK_MINUTES`        | 400  | Break minutes cannot exceed total time |
| `UNAUTHORIZED`                 | 401  | Not authenticated                      |
| `FORBIDDEN`                    | 403  | Insufficient permissions               |
| `TENANT_NOT_FOUND`             | 404  | Tenant not found                       |
| `EMPLOYEE_NOT_FOUND`           | 404  | Employee not found                     |

---

## Implementation Checklist

### Backend:

- [ ] Add `shiftId` and `entryType` to TimeEntry schema
- [ ] Create Prisma migration
- [ ] Implement `/clock-in` endpoint
- [ ] Implement `/clock-out` endpoint
- [ ] Implement `/current` endpoint
- [ ] Implement history endpoint with pagination
- [ ] Implement stats endpoint
- [ ] Add geolocation validation middleware
- [ ] Add duplicate prevention logic
- [ ] Add automatic break calculation
- [ ] Add overtime calculation
- [ ] Add audit logging
- [ ] Add RBAC checks
- [ ] Write unit tests for business logic
- [ ] Write integration tests for endpoints

### Frontend:

- [ ] Create TimeEntriesPage component
- [ ] Create ClockInOutButton component
- [ ] Create TimeEntryHistoryList component
- [ ] Create TimeEntryCard component
- [ ] Implement geolocation capture
- [ ] Handle offline mode (PWA)
- [ ] Add real-time timer display
- [ ] Add notifications (clock in reminder, missing clock out)
- [ ] Add error handling UI
- [ ] Update MyShiftsToday to call API instead of navigate
- [ ] Add loading states
- [ ] Add translations (Spanish/English)

---

**Author:** John McBride  
**Last Updated:** 2026-02-03  
**Status:** Ready for Implementation
