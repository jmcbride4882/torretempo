# Torre Tempo - Deputy-Style Scheduling Design

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Design Specification  
**Module:** Advanced Scheduling (Paid Add-On)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Product Requirements](#2-product-requirements)
3. [Data Model](#3-data-model)
4. [UI/UX Design](#4-uiux-design)
5. [API Design](#5-api-design)
6. [Conflict Detection](#6-conflict-detection)
7. [Business Rules](#7-business-rules)
8. [Implementation Phases](#8-implementation-phases)
9. [Testing Strategy](#9-testing-strategy)

---

## 1. Overview

### 1.1 Purpose

The Advanced Scheduling module transforms Torre Tempo from basic time tracking into a comprehensive workforce management system with **Deputy-inspired scheduling capabilities**. This is a **flagship paid add-on** targeting hospitality, retail, and service industries requiring dynamic shift management.

### 1.2 Target Users

- **Managers/Schedulers:** Create, publish, and manage weekly/monthly schedules
- **Employees:** View assigned shifts, request swaps, accept/decline assignments
- **Admins:** Configure scheduling rules, templates, and conflict policies

### 1.3 Core Value Proposition

**Without Module (Core Product):**
- ❌ No visual schedule builder
- ❌ Manual shift assignment only
- ❌ No drag-and-drop
- ❌ No conflict detection
- ❌ No templates or automation

**With Advanced Scheduling:**
- ✅ Visual drag-and-drop week grid
- ✅ Copy/paste entire weeks
- ✅ Real-time conflict detection
- ✅ Shift templates & recurring patterns
- ✅ Employee availability constraints
- ✅ Publish/lock workflow
- ✅ Shift swap & offer shift
- ✅ Mobile-optimized touch controls

### 1.4 Key Differentiators vs Deputy

| Feature | Torre Tempo | Deputy |
|---------|-------------|--------|
| Spanish compliance | ✅ Built-in 11-hour rest rule | ❌ Generic |
| Event-only geo | ✅ Clock in/out only | ❌ Often continuous |
| Multi-tenant SaaS | ✅ Path-based isolation | ⚠️ Subdomain-based |
| Pricing model | ✅ Modular add-on | ❌ All-or-nothing |
| Offline mobile | ✅ Full offline support | ⚠️ Limited |

---

## 2. Product Requirements

### 2.1 Functional Requirements

#### FR-1: Schedule Management

**FR-1.1 Create Schedule**
- Create draft schedule for date range (week, month, custom)
- Specify start/end dates
- Attach to department/location (optional)
- Draft mode by default (not visible to employees)

**FR-1.2 Publish Schedule**
- Publish draft → employees see shifts + notifications sent
- Validation: All conflicts MUST be resolved before publish
- Only ONE published schedule per tenant for overlapping dates
- Optional: Require employee confirmation within X hours

**FR-1.3 Lock Schedule**
- Lock published schedule → prevent further edits
- Unlock requires manager permission + reason (audit trail)
- Locked schedules are read-only

**FR-1.4 Copy Schedule**
- Copy entire week/month to future dates
- Options:
  - Preserve employee assignments
  - Clear assignments (template mode)
  - Filter by department/location
- Conflicts detected after paste

**FR-1.5 Delete Schedule**
- Soft delete only
- Cannot delete published/locked schedules (unlock first)

---

#### FR-2: Shift Management

**FR-2.1 Create Shift**
- Drag on calendar to create shift block
- Specify:
  - Start/end time
  - Break duration (unpaid by default)
  - Role (e.g., "Bartender", "Chef")
  - Location (e.g., "Bar Area", "Kitchen")
  - Work center (multi-location support)
  - Color (UI display)
  - Notes
- Shift initially unassigned

**FR-2.2 Edit Shift**
- Drag to move shift to different time
- Drag to move shift to different employee
- Resize to change duration
- Edit details via modal
- Cannot edit shifts in locked schedules

**FR-2.3 Assign Shift**
- Assign unassigned shift to employee
- Drag shift onto employee row
- Click shift → select employee
- Assignment status: `pending` → employee must accept
- Optional: Auto-accept for managers

**FR-2.4 Duplicate Shift**
- Duplicate shift to same/different day
- Preserve all details except timing
- Clone shift pattern across multiple days

**FR-2.5 Delete Shift**
- Soft delete only
- Cannot delete shifts in locked schedules
- Audit trail preserved

---

#### FR-3: Conflict Detection (Real-Time)

**FR-3.1 Overlap Detection**
- Detect overlapping shifts for same employee
- Visual indicator: Red border + warning icon
- Conflict details in tooltip

**FR-3.2 Availability Violation**
- Detect shifts assigned outside employee availability
- Example: Employee unavailable Sundays, shift assigned Sunday
- Visual indicator: Yellow border + info icon

**FR-3.3 Rest Period Validation**
- Spanish law: 11-hour minimum rest between shifts
- Detect violations: Shift ends 23:00, next shift starts 08:00 = violation
- Visual indicator: Red border + warning

**FR-3.4 Maximum Hours Validation**
- Detect if employee exceeds max hours per day/week (configurable)
- Example: Max 12 hours/day, shift assignment would exceed
- Visual indicator: Orange border + warning

**FR-3.5 Skill/Role Mismatch**
- Detect if employee lacks required skill for shift role
- Example: Shift requires "Bartender" certification, employee is "Cook"
- Visual indicator: Gray border + info icon

**FR-3.6 Conflict Blocking**
- Draft schedules: Conflicts allowed, show warnings only
- Published schedules: MUST resolve all conflicts before publish
- Locked schedules: No edits allowed

---

#### FR-4: Shift Templates

**FR-4.1 Save as Template**
- Save shift as reusable template
- Template fields:
  - Name (e.g., "Morning Shift", "Closing")
  - Start/end time (relative or absolute)
  - Break duration
  - Role, location, work center
  - Color, notes
- Templates tenant-scoped

**FR-4.2 Apply Template**
- Apply template to selected date(s)
- Options:
  - Single day
  - Multiple selected days
  - Recurring pattern (every Mon/Wed/Fri)
- Employee assignment optional (can apply unassigned)

**FR-4.3 Recurring Patterns**
- Create recurring shift series
- Patterns:
  - Weekly (every Monday)
  - Bi-weekly (every other Tuesday)
  - Custom (every 2nd and 4th Friday)
- End condition:
  - Until date
  - After N occurrences
  - Indefinite (manual stop)

---

#### FR-5: Employee Availability

**FR-5.1 Set Availability**
- Employees specify weekly availability
- Per day of week: Available / Unavailable / Preferred
- Time windows: 08:00-16:00, 16:00-00:00
- Example: "Available Mon-Fri 09:00-17:00, Unavailable Sat-Sun"

**FR-5.2 Time-Off Blocking**
- Approved time-off requests auto-block scheduling
- Attempting to assign shift during time-off = conflict
- Visual indicator: Shaded unavailable block

**FR-5.3 Availability Override**
- Managers can override availability (with warning)
- Requires manager note (audit trail)
- Employee notified of override

---

#### FR-6: Shift Swap & Offer

**FR-6.1 Request Shift Swap**
- Employee requests to swap shift with another employee
- Select target employee or "any eligible employee"
- Provide reason (optional)
- Status: `pending_manager_approval`

**FR-6.2 Approve Shift Swap**
- Manager reviews swap request
- Check conflicts for both employees
- Approve → update assignments + notify both
- Decline → notify requester with reason

**FR-6.3 Offer Open Shift**
- Manager creates unassigned shift
- "Offer to eligible employees" button
- System notifies all eligible employees (based on role, availability)
- First to accept gets shift (or manager selects from responses)

**FR-6.4 Pick Up Open Shift**
- Employees see available open shifts
- Click "Pick Up" → assignment pending manager approval
- Manager approves/declines

---

#### FR-7: Notifications

**FR-7.1 Schedule Published**
- Notify all assigned employees
- "Your schedule for Feb 5-11 is now available"
- Link to view schedule

**FR-7.2 Shift Assigned**
- Notify employee of new shift assignment
- "You have been assigned to [Role] on [Date] [Time]"
- Accept/Decline buttons (if confirmation required)

**FR-7.3 Shift Changed**
- Notify employee of shift time/location change
- "Your shift on [Date] has been updated"
- Show before/after details

**FR-7.4 Shift Swap Status**
- Notify requester of swap approval/decline
- Notify target employee of swap request
- Notify both on approval

**FR-7.5 Open Shift Offered**
- Notify eligible employees of open shift
- "New shift available: [Role] on [Date] [Time]"
- Link to pick up

---

### 2.2 Non-Functional Requirements

**NFR-1: Performance**
- Schedule grid renders <500ms for 50 employees × 7 days
- Drag-and-drop response time <100ms
- Conflict detection runs <200ms per shift edit

**NFR-2: Scalability**
- Support up to 500 employees per tenant
- Handle schedules up to 8 weeks in advance
- Max 10,000 shifts per schedule

**NFR-3: Mobile Responsiveness**
- Touch-optimized drag-and-drop (long-press to drag)
- Responsive grid layout (collapse to day view on mobile)
- Native mobile app support (React Native)

**NFR-4: Accessibility**
- WCAG 2.1 AA compliance
- Keyboard navigation for all drag-drop operations
- Screen reader support for conflict alerts

**NFR-5: Browser Support**
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile: iOS Safari 14+, Chrome Android 90+

---

## 3. Data Model

### 3.1 Core Tables

#### 3.1.1 schedules

Stores weekly/monthly schedule containers (draft, published, locked states).

```sql
CREATE TABLE schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Schedule period
  title VARCHAR(255) NOT NULL, -- e.g., "Week of Feb 5-11"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status workflow
  status VARCHAR(20) NOT NULL DEFAULT 'draft', -- 'draft', 'published', 'locked'
  published_at TIMESTAMP,
  published_by UUID REFERENCES users(id),
  locked_at TIMESTAMP,
  locked_by UUID REFERENCES users(id),
  unlock_reason TEXT, -- Required when unlocking locked schedule
  
  -- Scope (optional filtering)
  department_id UUID REFERENCES departments(id),
  location VARCHAR(255),
  
  -- Metadata
  notes TEXT,
  metadata JSONB, -- Custom fields, copied_from_schedule_id, etc.
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_schedules_tenant ON schedules(tenant_id);
CREATE INDEX idx_schedules_status ON schedules(tenant_id, status);
CREATE INDEX idx_schedules_dates ON schedules(tenant_id, start_date, end_date);
CREATE INDEX idx_schedules_department ON schedules(tenant_id, department_id);

-- Constraint: Only ONE published schedule per tenant for overlapping dates
CREATE UNIQUE INDEX idx_schedules_published_unique 
  ON schedules(tenant_id, start_date, end_date) 
  WHERE status = 'published' AND deleted_at IS NULL;
```

**Status Values:**
- `draft` - Draft schedule (editable, conflicts allowed, not visible to employees)
- `published` - Published schedule (visible to employees, conflicts must be resolved)
- `locked` - Locked schedule (read-only, requires unlock with reason)

**Business Rules:**
- Only ONE schedule can be published for overlapping date ranges per tenant
- Draft schedules can have conflicts (warnings only)
- Published schedules MUST have all conflicts resolved before publish
- Locked schedules cannot be edited (unlock requires manager permission + reason)

---

#### 3.1.2 shifts

Individual shift instances within a schedule.

```sql
CREATE TABLE shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  
  -- Timing
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Work details
  role VARCHAR(100), -- e.g., "Bartender", "Chef", "Server"
  location VARCHAR(255), -- e.g., "Bar Area", "Kitchen", "Dining Room"
  work_center VARCHAR(255), -- Optional: Multi-location support
  
  -- Assignment
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  assignment_status VARCHAR(20) DEFAULT 'unassigned', -- 'unassigned', 'assigned', 'accepted', 'declined', 'swapped'
  
  -- Conflict detection
  has_conflicts BOOLEAN DEFAULT false,
  conflict_details JSONB, -- Array of conflict objects: [{type, severity, message}]
  
  -- UI/UX
  color VARCHAR(7), -- Hex color for UI (e.g., "#3B82F6")
  notes TEXT,
  
  -- Metadata
  metadata JSONB, -- Custom fields, template_id, etc.
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_schedule ON shifts(tenant_id, schedule_id);
CREATE INDEX idx_shifts_employee ON shifts(tenant_id, employee_id);
CREATE INDEX idx_shifts_timing ON shifts(tenant_id, start_time, end_time);
CREATE INDEX idx_shifts_role ON shifts(tenant_id, role);
CREATE INDEX idx_shifts_conflicts ON shifts(tenant_id, has_conflicts) WHERE has_conflicts = true;
```

**Assignment Status Values:**
- `unassigned` - No employee assigned (open shift)
- `assigned` - Employee assigned, pending acceptance (if confirmation required)
- `accepted` - Employee accepted the shift
- `declined` - Employee declined the shift
- `swapped` - Shift was swapped to another employee

**Conflict Details JSONB Structure:**
```json
[
  {
    "type": "overlap",
    "severity": "error",
    "message": "Overlaps with shift on same day 14:00-18:00",
    "conflicting_shift_id": "uuid"
  },
  {
    "type": "rest_period",
    "severity": "error",
    "message": "Less than 11 hours rest after previous shift ending 23:00"
  },
  {
    "type": "availability",
    "severity": "warning",
    "message": "Employee marked unavailable on Sundays"
  },
  {
    "type": "max_hours",
    "severity": "warning",
    "message": "Exceeds max 12 hours per day (total: 13.5 hours)"
  }
]
```

**Business Rules:**
- Shifts cannot exceed 24 hours duration
- Break time is unpaid by default (configurable per tenant)
- Overlapping shifts for same employee = conflict
- Shifts inherit parent schedule's status (cannot edit shifts in locked schedule)
- Soft delete only (preserve audit trail)

---

#### 3.1.3 shift_assignments

Track assignment history and swaps (append-only audit log).

```sql
CREATE TABLE shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  
  -- Assignment
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id),
  assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined', 'swapped'
  accepted_at TIMESTAMP,
  declined_at TIMESTAMP,
  decline_reason TEXT,
  
  -- Swap tracking
  swapped_to_employee_id UUID REFERENCES employees(id),
  swap_requested_at TIMESTAMP,
  swap_requested_by UUID REFERENCES users(id),
  swap_approved_by UUID REFERENCES users(id),
  swap_approved_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shift_assignments_tenant ON shift_assignments(tenant_id);
CREATE INDEX idx_shift_assignments_shift ON shift_assignments(shift_id);
CREATE INDEX idx_shift_assignments_employee ON shift_assignments(employee_id);
CREATE INDEX idx_shift_assignments_status ON shift_assignments(tenant_id, status);
```

**Status Values:**
- `pending` - Assignment pending employee acceptance
- `accepted` - Employee accepted the assignment
- `declined` - Employee declined the assignment
- `swapped` - Assignment was swapped to another employee

**Business Rules:**
- Immutable log (no updates, only inserts)
- Latest assignment per shift_id = current assignment
- Swap requires manager approval
- Declined assignments remain in log for audit

---

#### 3.1.4 shift_templates

Reusable shift templates for common patterns.

```sql
CREATE TABLE shift_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Template details
  name VARCHAR(255) NOT NULL, -- e.g., "Morning Shift", "Closing Shift"
  description TEXT,
  
  -- Timing (relative)
  start_time TIME NOT NULL, -- e.g., 09:00
  end_time TIME NOT NULL, -- e.g., 17:00
  break_minutes INTEGER NOT NULL DEFAULT 0,
  
  -- Work details
  role VARCHAR(100),
  location VARCHAR(255),
  work_center VARCHAR(255),
  
  -- UI/UX
  color VARCHAR(7),
  
  -- Metadata
  metadata JSONB, -- Custom fields, usage_count, etc.
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by UUID NOT NULL REFERENCES users(id),
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_shift_templates_tenant ON shift_templates(tenant_id);
CREATE INDEX idx_shift_templates_name ON shift_templates(tenant_id, name);
```

---

#### 3.1.5 employee_availability

Employee weekly availability constraints.

```sql
CREATE TABLE employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  
  -- Day of week (0 = Sunday, 6 = Saturday)
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  
  -- Availability status
  status VARCHAR(20) NOT NULL DEFAULT 'available', -- 'available', 'unavailable', 'preferred'
  
  -- Time window (NULL = all day)
  start_time TIME,
  end_time TIME,
  
  -- Metadata
  notes TEXT,
  metadata JSONB,
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: No overlapping time windows for same employee + day
  UNIQUE(tenant_id, employee_id, day_of_week, start_time, end_time)
);

CREATE INDEX idx_employee_availability_tenant ON employee_availability(tenant_id);
CREATE INDEX idx_employee_availability_employee ON employee_availability(tenant_id, employee_id);
CREATE INDEX idx_employee_availability_day ON employee_availability(tenant_id, day_of_week);
```

**Status Values:**
- `available` - Employee available for scheduling
- `unavailable` - Employee not available (hard constraint)
- `preferred` - Employee prefers this time (soft preference)

**Examples:**
```sql
-- Unavailable on Sundays
INSERT INTO employee_availability (tenant_id, employee_id, day_of_week, status)
VALUES ('...', '...', 0, 'unavailable');

-- Available Mon-Fri 09:00-17:00
INSERT INTO employee_availability (tenant_id, employee_id, day_of_week, status, start_time, end_time)
VALUES 
  ('...', '...', 1, 'available', '09:00', '17:00'), -- Monday
  ('...', '...', 2, 'available', '09:00', '17:00'), -- Tuesday
  ...

-- Preferred evening shifts on Fridays
INSERT INTO employee_availability (tenant_id, employee_id, day_of_week, status, start_time, end_time)
VALUES ('...', '...', 5, 'preferred', '17:00', '23:00');
```

---

### 3.2 Related Tables (Already Defined)

- `employees` - Employee profiles, roles, departments
- `departments` - Department hierarchy
- `users` - Authentication and user management
- `tenant_modules` - Track enabled add-on modules (including `advanced_scheduling`)

---

## 4. UI/UX Design

### 4.1 Schedule Grid Layout

**Desktop View:**

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Week of Feb 5-11, 2026]  [Status: Draft]      [Copy Week] [Publish]│
├─────────────────────────────────────────────────────────────────────┤
│         Mon 02/05  Tue 02/06  Wed 02/07  Thu 02/08  Fri 02/09  ...  │
├─────────┬───────────────────────────────────────────────────────────┤
│ Jane    │ ┌────────┐                    ┌──────────┐                 │
│ Doe     │ │09-17:00│                    │14-22:00  │                 │
│         │ │Bartender│                   │Server    │                 │
│         │ └────────┘                    └──────────┘                 │
├─────────┼───────────────────────────────────────────────────────────┤
│ John    │            ┌────────┐  ┌────────┐         ⚠️              │
│ Smith   │            │09-17:00│  │09-17:00│       [CONFLICT]        │
│         │            │ Chef   │  │ Chef   │                         │
│         │            └────────┘  └────────┘                         │
├─────────┴───────────────────────────────────────────────────────────┤
│ [+ Add Employee Row]                                                 │
└─────────────────────────────────────────────────────────────────────┘
```

**Mobile View (Day):**

```
┌─────────────────────────────────┐
│ ◄ Mon 02/05 ►      [+ Add Shift]│
├─────────────────────────────────┤
│ Jane Doe                         │
│ ┌─────────────────────────────┐ │
│ │ 09:00 - 17:00               │ │
│ │ Bartender - Bar Area        │ │
│ └─────────────────────────────┘ │
│                                  │
│ John Smith                       │
│ ┌─────────────────────────────┐ │
│ │ 09:00 - 17:00               │ │
│ │ Chef - Kitchen              │ │
│ └─────────────────────────────┘ │
│                                  │
│ [+ Add Employee]                 │
└─────────────────────────────────┘
```

---

### 4.2 Drag-and-Drop Interactions

**Supported Actions:**

1. **Create Shift:**
   - Click and drag on empty cell → creates shift block
   - Release → opens shift details modal

2. **Move Shift (Time):**
   - Drag shift up/down within same employee row → changes time
   - Snap to hour/30-minute intervals (configurable)

3. **Move Shift (Employee):**
   - Drag shift left/right to different employee row → reassigns shift
   - Real-time conflict detection during drag
   - Red highlight if would create conflict

4. **Resize Shift:**
   - Drag top/bottom edge → changes start/end time
   - Minimum duration: 1 hour (configurable)
   - Maximum duration: 24 hours

5. **Copy Shift:**
   - Hold Ctrl/Cmd + drag → duplicates shift
   - Release on target cell

---

### 4.3 Conflict Indicators

**Visual Coding:**

| Conflict Type | Border Color | Icon | Severity |
|---------------|--------------|------|----------|
| Overlap | Red | ❌ | Error |
| Rest period < 11h | Red | ⏰ | Error |
| Unavailable | Yellow | ⚠️ | Warning |
| Max hours exceeded | Orange | 📊 | Warning |
| Skill mismatch | Gray | ℹ️ | Info |

**Conflict Tooltip:**

```
┌─────────────────────────────────────┐
│ ❌ CONFLICTS (2)                    │
├─────────────────────────────────────┤
│ • Overlaps with shift 14:00-18:00   │
│ • Less than 11h rest after previous │
│   shift ending 23:00                │
├─────────────────────────────────────┤
│ [Resolve Conflicts]                 │
└─────────────────────────────────────┘
```

---

### 4.4 Key Components

#### 4.4.1 Schedule Header

```tsx
<ScheduleHeader
  schedule={schedule}
  onCopyWeek={() => handleCopyWeek()}
  onPublish={() => handlePublish()}
  onLock={() => handleLock()}
  canPublish={allConflictsResolved}
/>
```

#### 4.4.2 Calendar Grid

```tsx
<CalendarGrid
  schedule={schedule}
  shifts={shifts}
  employees={employees}
  onShiftDrag={handleShiftDrag}
  onShiftResize={handleShiftResize}
  onShiftClick={handleShiftClick}
  onCellClick={handleCellClick}
  conflictDetection={true}
/>
```

#### 4.4.3 Shift Modal

```tsx
<ShiftModal
  shift={selectedShift}
  onSave={handleSaveShift}
  onDelete={handleDeleteShift}
  onAssignEmployee={handleAssignEmployee}
  availableEmployees={eligibleEmployees}
  conflicts={shiftConflicts}
/>
```

#### 4.4.4 Conflict Resolver

```tsx
<ConflictResolver
  conflicts={scheduleConflicts}
  onResolve={handleResolveConflict}
  onIgnore={handleIgnoreConflict}
/>
```

---

### 4.5 UI Library Stack

**Calendar Grid:**
- React Big Calendar (base calendar component)
- Custom grid renderer (hour slots, employee rows)

**Drag-and-Drop:**
- @dnd-kit/core (modern DnD library)
- Touch-optimized for mobile

**Date/Time:**
- date-fns (date manipulation, timezone handling)

**UI Components:**
- Material-UI (MUI) or Ant Design (modals, buttons, tooltips)
- TailwindCSS (custom styling)

---

## 5. API Design

### 5.1 Schedule Endpoints

#### GET /api/schedule/schedules

Get all schedules for tenant.

**Query Parameters:**
- `status` (optional): Filter by status (`draft`, `published`, `locked`)
- `start_date` (optional): Filter by start date (ISO 8601)
- `end_date` (optional): Filter by end date (ISO 8601)
- `department_id` (optional): Filter by department
- `page` (default: 1)
- `limit` (default: 20)

**Response:**
```json
{
  "schedules": [
    {
      "id": "uuid",
      "title": "Week of Feb 5-11",
      "start_date": "2026-02-05",
      "end_date": "2026-02-11",
      "status": "draft",
      "shift_count": 45,
      "conflict_count": 2,
      "published_at": null,
      "locked_at": null,
      "created_at": "2026-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15
  }
}
```

---

#### POST /api/schedule/schedules

Create new schedule.

**Request:**
```json
{
  "title": "Week of Feb 5-11",
  "start_date": "2026-02-05",
  "end_date": "2026-02-11",
  "department_id": "uuid", // optional
  "location": "Downtown Branch", // optional
  "notes": "Valentine's week - expect high traffic"
}
```

**Response:**
```json
{
  "schedule": {
    "id": "uuid",
    "title": "Week of Feb 5-11",
    "start_date": "2026-02-05",
    "end_date": "2026-02-11",
    "status": "draft",
    "created_at": "2026-02-01T10:00:00Z"
  }
}
```

---

#### POST /api/schedule/schedules/:id/publish

Publish draft schedule.

**Validation:**
- Schedule must be in `draft` status
- All conflicts must be resolved (conflict_count = 0)
- No other published schedule for overlapping dates

**Response:**
```json
{
  "schedule": {
    "id": "uuid",
    "status": "published",
    "published_at": "2026-02-01T10:30:00Z",
    "published_by": "user_uuid"
  },
  "notifications_sent": 45
}
```

---

#### POST /api/schedule/schedules/:id/lock

Lock published schedule.

**Request:**
```json
{
  "reason": "Payroll processing for this period"
}
```

**Response:**
```json
{
  "schedule": {
    "id": "uuid",
    "status": "locked",
    "locked_at": "2026-02-15T09:00:00Z",
    "locked_by": "user_uuid"
  }
}
```

---

#### POST /api/schedule/schedules/:id/unlock

Unlock locked schedule.

**Request:**
```json
{
  "reason": "Correction needed for payroll error"
}
```

**Response:**
```json
{
  "schedule": {
    "id": "uuid",
    "status": "published",
    "locked_at": null,
    "unlock_reason": "Correction needed for payroll error"
  }
}
```

---

#### POST /api/schedule/schedules/:id/copy

Copy schedule to new date range.

**Request:**
```json
{
  "target_start_date": "2026-02-12",
  "target_end_date": "2026-02-18",
  "copy_assignments": true, // false = clear employee assignments
  "copy_department_id": "uuid" // optional: filter by department
}
```

**Response:**
```json
{
  "new_schedule": {
    "id": "new_uuid",
    "title": "Week of Feb 12-18 (copied)",
    "start_date": "2026-02-12",
    "end_date": "2026-02-18",
    "status": "draft",
    "shift_count": 45,
    "conflict_count": 3, // Conflicts re-detected after copy
    "metadata": {
      "copied_from_schedule_id": "original_uuid"
    }
  }
}
```

---

### 5.2 Shift Endpoints

#### GET /api/schedule/schedules/:schedule_id/shifts

Get all shifts for schedule.

**Query Parameters:**
- `employee_id` (optional): Filter by employee
- `role` (optional): Filter by role
- `has_conflicts` (optional): Filter by conflict status (true/false)

**Response:**
```json
{
  "shifts": [
    {
      "id": "uuid",
      "schedule_id": "schedule_uuid",
      "start_time": "2026-02-05T09:00:00Z",
      "end_time": "2026-02-05T17:00:00Z",
      "break_minutes": 30,
      "role": "Bartender",
      "location": "Bar Area",
      "employee_id": "employee_uuid",
      "employee_name": "Jane Doe",
      "assignment_status": "accepted",
      "has_conflicts": false,
      "color": "#3B82F6",
      "notes": "Training new bartender"
    }
  ]
}
```

---

#### POST /api/schedule/schedules/:schedule_id/shifts

Create new shift.

**Request:**
```json
{
  "start_time": "2026-02-05T09:00:00Z",
  "end_time": "2026-02-05T17:00:00Z",
  "break_minutes": 30,
  "role": "Bartender",
  "location": "Bar Area",
  "work_center": "Downtown Branch",
  "employee_id": "uuid", // optional (null = unassigned)
  "color": "#3B82F6",
  "notes": "Morning shift"
}
```

**Response:**
```json
{
  "shift": {
    "id": "uuid",
    "start_time": "2026-02-05T09:00:00Z",
    "end_time": "2026-02-05T17:00:00Z",
    "assignment_status": "assigned",
    "has_conflicts": true,
    "conflict_details": [
      {
        "type": "overlap",
        "severity": "error",
        "message": "Overlaps with existing shift 14:00-18:00"
      }
    ]
  }
}
```

---

#### PUT /api/schedule/shifts/:id

Update shift.

**Request:**
```json
{
  "start_time": "2026-02-05T10:00:00Z", // moved 1 hour later
  "end_time": "2026-02-05T18:00:00Z",
  "employee_id": "new_employee_uuid" // reassigned
}
```

**Response:**
```json
{
  "shift": {
    "id": "uuid",
    "start_time": "2026-02-05T10:00:00Z",
    "end_time": "2026-02-05T18:00:00Z",
    "employee_id": "new_employee_uuid",
    "has_conflicts": false,
    "conflict_details": []
  }
}
```

---

#### DELETE /api/schedule/shifts/:id

Delete shift (soft delete).

**Response:**
```json
{
  "success": true,
  "deleted_shift_id": "uuid"
}
```

---

#### POST /api/schedule/shifts/:id/duplicate

Duplicate shift.

**Request:**
```json
{
  "target_date": "2026-02-06", // duplicate to next day
  "preserve_assignment": true // keep same employee
}
```

**Response:**
```json
{
  "new_shift": {
    "id": "new_uuid",
    "start_time": "2026-02-06T09:00:00Z",
    "end_time": "2026-02-06T17:00:00Z",
    "employee_id": "same_employee_uuid"
  }
}
```

---

### 5.3 Conflict Detection Endpoint

#### GET /api/schedule/schedules/:schedule_id/conflicts

Get all conflicts for schedule.

**Response:**
```json
{
  "conflicts": [
    {
      "shift_id": "uuid",
      "employee_id": "uuid",
      "employee_name": "Jane Doe",
      "conflicts": [
        {
          "type": "overlap",
          "severity": "error",
          "message": "Overlaps with shift on 02/05 14:00-18:00",
          "conflicting_shift_id": "other_uuid"
        }
      ]
    }
  ],
  "total_conflicts": 5,
  "can_publish": false
}
```

---

### 5.4 Shift Template Endpoints

#### GET /api/schedule/templates

Get all shift templates.

**Response:**
```json
{
  "templates": [
    {
      "id": "uuid",
      "name": "Morning Shift",
      "start_time": "09:00:00",
      "end_time": "17:00:00",
      "break_minutes": 30,
      "role": "Bartender",
      "color": "#3B82F6"
    }
  ]
}
```

---

#### POST /api/schedule/templates

Create shift template.

**Request:**
```json
{
  "name": "Closing Shift",
  "start_time": "17:00:00",
  "end_time": "01:00:00",
  "break_minutes": 30,
  "role": "Server",
  "color": "#10B981"
}
```

---

#### POST /api/schedule/templates/:id/apply

Apply template to schedule.

**Request:**
```json
{
  "schedule_id": "uuid",
  "dates": ["2026-02-05", "2026-02-06", "2026-02-07"], // apply to multiple dates
  "employee_id": "uuid" // optional (null = unassigned)
}
```

**Response:**
```json
{
  "created_shifts": [
    { "id": "uuid", "start_time": "2026-02-05T09:00:00Z" },
    { "id": "uuid", "start_time": "2026-02-06T09:00:00Z" },
    { "id": "uuid", "start_time": "2026-02-07T09:00:00Z" }
  ]
}
```

---

### 5.5 Availability Endpoints

#### GET /api/schedule/employees/:employee_id/availability

Get employee availability.

**Response:**
```json
{
  "availability": [
    { "day_of_week": 1, "status": "available", "start_time": "09:00", "end_time": "17:00" },
    { "day_of_week": 2, "status": "available", "start_time": "09:00", "end_time": "17:00" },
    { "day_of_week": 0, "status": "unavailable" } // Sundays unavailable
  ]
}
```

---

#### PUT /api/schedule/employees/:employee_id/availability

Update employee availability.

**Request:**
```json
{
  "availability": [
    { "day_of_week": 1, "status": "available", "start_time": "09:00", "end_time": "17:00" },
    { "day_of_week": 0, "status": "unavailable" }
  ]
}
```

---

### 5.6 Shift Swap Endpoints

#### POST /api/schedule/shifts/:id/request-swap

Request shift swap.

**Request:**
```json
{
  "target_employee_id": "uuid", // or null for "any eligible"
  "reason": "Personal appointment"
}
```

**Response:**
```json
{
  "swap_request": {
    "id": "uuid",
    "shift_id": "shift_uuid",
    "requested_by": "employee_uuid",
    "target_employee_id": "employee_uuid",
    "status": "pending_manager_approval"
  }
}
```

---

#### POST /api/schedule/swap-requests/:id/approve

Approve shift swap (manager only).

**Response:**
```json
{
  "swap_request": {
    "id": "uuid",
    "status": "approved",
    "approved_by": "manager_uuid",
    "approved_at": "2026-02-01T11:00:00Z"
  },
  "updated_shift": {
    "id": "shift_uuid",
    "employee_id": "new_employee_uuid",
    "assignment_status": "swapped"
  }
}
```

---

## 6. Conflict Detection

### 6.1 Conflict Types

#### 6.1.1 Overlap Conflict (Error)

**Detection Logic:**
```typescript
function detectOverlap(shift: Shift, allShifts: Shift[]): Conflict | null {
  const employeeShifts = allShifts.filter(s => 
    s.employee_id === shift.employee_id && 
    s.id !== shift.id &&
    s.deleted_at === null
  );
  
  for (const otherShift of employeeShifts) {
    // Check if time ranges overlap
    if (shift.start_time < otherShift.end_time && 
        shift.end_time > otherShift.start_time) {
      return {
        type: 'overlap',
        severity: 'error',
        message: `Overlaps with shift ${otherShift.start_time} - ${otherShift.end_time}`,
        conflicting_shift_id: otherShift.id
      };
    }
  }
  
  return null;
}
```

---

#### 6.1.2 Rest Period Conflict (Error)

**Spanish Law:** 11-hour minimum rest between shifts.

```typescript
function detectRestPeriodViolation(shift: Shift, allShifts: Shift[]): Conflict | null {
  const MIN_REST_HOURS = 11;
  
  const employeeShifts = allShifts
    .filter(s => s.employee_id === shift.employee_id && s.id !== shift.id)
    .sort((a, b) => a.start_time - b.start_time);
  
  // Check previous shift
  const previousShift = employeeShifts
    .filter(s => s.end_time <= shift.start_time)
    .pop();
  
  if (previousShift) {
    const restHours = (shift.start_time - previousShift.end_time) / (1000 * 60 * 60);
    if (restHours < MIN_REST_HOURS) {
      return {
        type: 'rest_period',
        severity: 'error',
        message: `Only ${restHours.toFixed(1)} hours rest after previous shift (min: 11h)`,
        conflicting_shift_id: previousShift.id
      };
    }
  }
  
  // Check next shift
  const nextShift = employeeShifts.find(s => s.start_time >= shift.end_time);
  
  if (nextShift) {
    const restHours = (nextShift.start_time - shift.end_time) / (1000 * 60 * 60);
    if (restHours < MIN_REST_HOURS) {
      return {
        type: 'rest_period',
        severity: 'error',
        message: `Only ${restHours.toFixed(1)} hours rest before next shift (min: 11h)`,
        conflicting_shift_id: nextShift.id
      };
    }
  }
  
  return null;
}
```

---

#### 6.1.3 Availability Conflict (Warning)

```typescript
function detectAvailabilityViolation(shift: Shift, employee: Employee): Conflict | null {
  const dayOfWeek = new Date(shift.start_time).getDay();
  const shiftTime = format(shift.start_time, 'HH:mm');
  
  const availability = employee.availability.find(a => a.day_of_week === dayOfWeek);
  
  if (availability && availability.status === 'unavailable') {
    return {
      type: 'availability',
      severity: 'warning',
      message: 'Employee marked unavailable on this day'
    };
  }
  
  if (availability && availability.start_time && availability.end_time) {
    if (shiftTime < availability.start_time || shiftTime > availability.end_time) {
      return {
        type: 'availability',
        severity: 'warning',
        message: `Shift outside employee availability (${availability.start_time}-${availability.end_time})`
      };
    }
  }
  
  return null;
}
```

---

#### 6.1.4 Maximum Hours Conflict (Warning)

```typescript
function detectMaxHoursViolation(shift: Shift, allShifts: Shift[], tenantSettings: TenantSettings): Conflict | null {
  const maxHoursPerDay = tenantSettings.workHours.maxHoursPerDay || 12;
  const maxHoursPerWeek = tenantSettings.workHours.maxHoursPerWeek || 48;
  
  // Check daily hours
  const shiftDate = format(shift.start_time, 'yyyy-MM-dd');
  const dailyShifts = allShifts.filter(s => 
    s.employee_id === shift.employee_id &&
    format(s.start_time, 'yyyy-MM-dd') === shiftDate
  );
  
  const dailyHours = dailyShifts.reduce((sum, s) => {
    const hours = (s.end_time - s.start_time) / (1000 * 60 * 60);
    const netHours = hours - (s.break_minutes / 60);
    return sum + netHours;
  }, 0);
  
  if (dailyHours > maxHoursPerDay) {
    return {
      type: 'max_hours_daily',
      severity: 'warning',
      message: `Exceeds max ${maxHoursPerDay} hours per day (total: ${dailyHours.toFixed(1)}h)`
    };
  }
  
  // Check weekly hours (similar logic)
  // ...
  
  return null;
}
```

---

### 6.2 Conflict Resolution Strategies

**Strategy 1: Auto-Suggest Fixes**
- Overlap: Suggest moving shift to next available time slot
- Rest period: Suggest adjusting start/end time to meet 11-hour rule
- Availability: Suggest alternative employee who is available

**Strategy 2: Manual Override**
- Manager can mark conflict as "acknowledged" with reason
- Conflict remains in log but doesn't block publish
- Use case: Emergency coverage, employee agreed to override

**Strategy 3: Batch Resolution**
- Conflict dashboard shows all conflicts
- One-click resolution for common patterns
- Example: "Move all Friday shifts 1 hour earlier to resolve rest period violations"

---

## 7. Business Rules

### 7.1 Schedule Status Workflow

```
┌───────┐     Publish     ┌───────────┐     Lock     ┌────────┐
│ Draft │ ───────────────►│ Published │ ────────────►│ Locked │
└───────┘                 └───────────┘              └────────┘
    ▲                          │                          │
    │                          │ Unlock (with reason)     │
    └──────────────────────────┴──────────────────────────┘
```

**State Transitions:**
- `draft → published`: Requires all conflicts resolved
- `published → locked`: Requires manager permission
- `locked → published`: Requires unlock reason (audit trail)
- `published → draft`: Not allowed (must create new schedule)

---

### 7.2 Conflict Blocking Rules

**Draft Schedules:**
- ✅ Conflicts allowed
- ⚠️ Warnings shown
- ✅ Can save with conflicts

**Published Schedules:**
- ❌ Cannot publish if conflicts exist
- ✅ Must resolve all "error" severity conflicts
- ⚠️ "Warning" severity conflicts allowed with acknowledgment

**Locked Schedules:**
- ❌ No edits allowed
- ✅ Read-only access
- 🔓 Unlock requires manager permission + reason

---

### 7.3 Module Access Control

**Module Key:** `advanced_scheduling`

**Middleware Check:**
```typescript
app.post('/api/schedule/shifts', 
  requireModule('advanced_scheduling'),
  handleCreateShift
);
```

**Without Module:**
- ❌ No drag-and-drop UI
- ❌ No conflict detection
- ❌ No templates
- ✅ Basic calendar view only (read-only)

**With Module:**
- ✅ Full scheduling features
- ✅ Drag-and-drop
- ✅ Conflict detection
- ✅ Templates & automation

---

### 7.4 Notification Rules

**Trigger: Schedule Published**
- Recipients: All employees with assigned shifts
- Content: "Your schedule for [date range] is now available"
- Action: Link to view schedule

**Trigger: Shift Assigned**
- Recipients: Assigned employee
- Content: "You have been assigned to [role] on [date] [time]"
- Action: Accept / Decline (if confirmation required)

**Trigger: Shift Changed**
- Recipients: Assigned employee
- Content: "Your shift on [date] has been updated"
- Action: View changes

**Trigger: Shift Swap Approved**
- Recipients: Both employees (requester + target)
- Content: "Shift swap approved for [date]"
- Action: View updated schedule

---

## 8. Implementation Phases

### Phase 1: Foundation (MVP) - 4 weeks

**Goals:**
- Basic schedule CRUD
- Shift CRUD with drag-and-drop
- Simple conflict detection (overlap only)
- Publish/lock workflow

**Deliverables:**
- `schedules` table + API
- `shifts` table + API
- `shift_assignments` table + API
- React Big Calendar integration
- @dnd-kit/core drag-and-drop
- Basic conflict detection (overlap)
- Publish/lock endpoints

**Success Criteria:**
- Create draft schedule
- Add/edit/delete shifts via drag-and-drop
- Assign shifts to employees
- Detect overlap conflicts
- Publish schedule (if no conflicts)

---

### Phase 2: Conflict Detection & Validation - 2 weeks

**Goals:**
- Full conflict detection (all types)
- Availability constraints
- Rest period validation (11-hour rule)
- Max hours validation

**Deliverables:**
- `employee_availability` table + API
- Rest period conflict detection
- Max hours conflict detection
- Availability violation detection
- Conflict resolver UI
- Conflict dashboard

**Success Criteria:**
- All conflict types detected
- Visual conflict indicators
- Cannot publish with error-level conflicts
- Conflict resolution suggestions

---

### Phase 3: Templates & Automation - 2 weeks

**Goals:**
- Shift templates
- Copy/paste weeks
- Recurring shifts
- Batch operations

**Deliverables:**
- `shift_templates` table + API
- Template UI (save, apply, manage)
- Copy week functionality
- Recurring shift patterns
- Batch shift creation

**Success Criteria:**
- Save shift as template
- Apply template to multiple dates
- Copy week to future dates
- Create recurring shift series

---

### Phase 4: Shift Swaps & Offers - 2 weeks

**Goals:**
- Employee-initiated shift swaps
- Open shift offers
- Manager approval workflow
- Notifications

**Deliverables:**
- Shift swap request flow
- Open shift offering
- Approval queue for managers
- Email/push notifications
- Shift marketplace UI

**Success Criteria:**
- Employee requests shift swap
- Manager approves/declines
- Open shifts offered to eligible employees
- Notifications sent on status changes

---

### Phase 5: Mobile Optimization - 2 weeks

**Goals:**
- Touch-optimized drag-and-drop
- Responsive grid layout
- React Native mobile app integration

**Deliverables:**
- Mobile-optimized calendar grid
- Long-press to drag (touch)
- Responsive day/week views
- React Native scheduling screens
- Offline support for schedule viewing

**Success Criteria:**
- Full drag-and-drop on mobile
- Responsive layout (desktop, tablet, mobile)
- React Native app can view/edit schedules

---

### Phase 6: Polish & Advanced Features - 2 weeks

**Goals:**
- Keyboard navigation
- Accessibility (WCAG 2.1 AA)
- Performance optimization
- Advanced analytics

**Deliverables:**
- Keyboard shortcuts (arrow keys, Ctrl+C/V)
- Screen reader support
- Color-blind friendly conflict indicators
- Schedule analytics dashboard
- Export schedule to PDF/Excel

**Success Criteria:**
- WCAG 2.1 AA compliance
- Grid renders <500ms for 50 employees
- Keyboard-only navigation works
- Schedule analytics available

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Conflict Detection:**
```typescript
describe('Conflict Detection', () => {
  it('detects overlap conflicts', () => {
    const shift1 = { start_time: '2026-02-05T09:00:00Z', end_time: '2026-02-05T17:00:00Z' };
    const shift2 = { start_time: '2026-02-05T14:00:00Z', end_time: '2026-02-05T18:00:00Z' };
    expect(detectOverlap(shift1, [shift2])).not.toBeNull();
  });
  
  it('detects rest period violations', () => {
    const shift1 = { end_time: '2026-02-05T23:00:00Z' };
    const shift2 = { start_time: '2026-02-06T08:00:00Z' }; // Only 9 hours rest
    expect(detectRestPeriodViolation(shift2, [shift1])).not.toBeNull();
  });
});
```

---

### 9.2 Integration Tests

**Schedule Publish Workflow:**
```typescript
describe('POST /api/schedule/schedules/:id/publish', () => {
  it('rejects publish if conflicts exist', async () => {
    const schedule = await createScheduleWithConflicts();
    const response = await request(app)
      .post(`/api/schedule/schedules/${schedule.id}/publish`)
      .expect(400);
    
    expect(response.body.error).toContain('conflicts must be resolved');
  });
  
  it('publishes schedule if no conflicts', async () => {
    const schedule = await createScheduleWithoutConflicts();
    const response = await request(app)
      .post(`/api/schedule/schedules/${schedule.id}/publish`)
      .expect(200);
    
    expect(response.body.schedule.status).toBe('published');
  });
});
```

---

### 9.3 E2E Tests (Playwright)

**Drag-and-Drop Shift:**
```typescript
test('drag shift to new time', async ({ page }) => {
  await page.goto('/t/acme/schedule/123');
  
  const shift = page.locator('[data-shift-id="shift-1"]');
  const targetCell = page.locator('[data-date="2026-02-05"][data-time="14:00"]');
  
  await shift.dragTo(targetCell);
  
  // Verify shift moved
  await expect(page.locator('[data-shift-id="shift-1"]')).toHaveAttribute('data-time', '14:00');
});
```

---

### 9.4 Performance Tests

**Grid Rendering:**
```typescript
test('schedule grid renders within 500ms', async () => {
  const employees = generateEmployees(50);
  const shifts = generateShifts(350); // 50 employees × 7 days
  
  const startTime = Date.now();
  render(<CalendarGrid employees={employees} shifts={shifts} />);
  const renderTime = Date.now() - startTime;
  
  expect(renderTime).toBeLessThan(500);
});
```

---

### 9.5 Accessibility Tests

**Keyboard Navigation:**
```typescript
test('keyboard navigation works', async ({ page }) => {
  await page.goto('/t/acme/schedule/123');
  
  // Focus first shift
  await page.keyboard.press('Tab');
  await expect(page.locator('[data-shift-id="shift-1"]')).toBeFocused();
  
  // Move shift with arrow keys
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-shift-id="shift-1"]')).toHaveAttribute('data-time', '10:00');
});
```

---

## 10. Success Metrics

### 10.1 Product Metrics

- **Adoption Rate:** % of tenants who enable advanced scheduling module
- **Usage Frequency:** Average schedules created per tenant per month
- **Time Savings:** Average time to create schedule (target: <30 minutes for 50 employees)
- **Conflict Resolution:** % of schedules published without manual conflict fixes (target: >80%)

### 10.2 Technical Metrics

- **Grid Render Time:** <500ms for 50 employees × 7 days (target)
- **API Response Time:** <200ms for conflict detection (target)
- **Uptime:** 99.9% for scheduling endpoints
- **Error Rate:** <0.5% for drag-and-drop operations

### 10.3 Business Metrics

- **Module Conversion:** % of trial users who purchase advanced scheduling (target: >40%)
- **Retention:** % of tenants who continue subscription after 6 months (target: >85%)
- **NPS:** Net Promoter Score for scheduling feature (target: >50)

---

## Appendix A: Glossary

- **Draft Schedule:** Editable schedule not visible to employees
- **Published Schedule:** Read-only schedule visible to employees
- **Locked Schedule:** Immutable schedule for payroll/audit purposes
- **Shift:** Single work period with start/end time and assignment
- **Shift Template:** Reusable shift pattern (e.g., "Morning Shift")
- **Conflict:** Scheduling violation (overlap, rest period, availability)
- **Shift Swap:** Employee-initiated exchange of shift assignments
- **Open Shift:** Unassigned shift offered to eligible employees

---

## Appendix B: References

- **Deputy Scheduling:** https://www.deputy.com/features/scheduling
- **React Big Calendar:** https://github.com/jquense/react-big-calendar
- **@dnd-kit/core:** https://docs.dndkit.com/
- **Spanish Labor Law (RDL 8/2019):** https://www.boe.es/eli/es/rdl/2019/03/08/8/con
- **GDPR/LOPDGDD Compliance:** https://www.aepd.es/

---

**Document End**
