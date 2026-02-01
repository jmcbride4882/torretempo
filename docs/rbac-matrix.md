# Torre Tempo - RBAC Feature Matrix

**Last Updated:** 2026-02-01  
**Status:** Implemented

---

## Role Hierarchy

```
OWNER (Super Admin)
  ├── ADMIN (Tenant Administrator)
  │     ├── MANAGER (Department/Team Manager)
  │     │     └── EMPLOYEE (Regular Staff)
```

---

## Complete Feature Access Matrix

| Feature | OWNER | ADMIN | MANAGER | EMPLOYEE |
|---------|-------|-------|---------|----------|
| **Dashboard** |
| View dashboard | ✅ All data | ✅ All data | ✅ Team data | ✅ Own data |
| View analytics | ✅ Full | ✅ Full | ✅ Team only | ✅ Own only |
| **Tenant Settings** |
| View tenant info | ✅ Full | ✅ Read-only | ❌ | ❌ |
| Edit tenant info (legal name, address) | ✅ | ❌ | ❌ | ❌ |
| Configure SMTP | ✅ | ✅ | ❌ | ❌ |
| Manage modules (paid add-ons) | ✅ | ❌ | ❌ | ❌ |
| View billing/subscription | ✅ | ❌ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ | ❌ |
| Delete tenant | ✅ | ❌ | ❌ | ❌ |
| **User Management** |
| View all users | ✅ | ✅ | ✅ Team only | ❌ |
| Create OWNER | ❌ Only 1 | ❌ | ❌ | ❌ |
| Create ADMIN | ✅ | ❌ | ❌ | ❌ |
| Create MANAGER | ✅ | ✅ | ❌ | ❌ |
| Create EMPLOYEE | ✅ | ✅ | ✅ Own dept | ❌ |
| Edit OWNER | ✅ Self only | ❌ | ❌ | ❌ |
| Edit ADMIN | ✅ | ❌ | ❌ | ❌ |
| Edit MANAGER | ✅ | ✅ | ❌ | ❌ |
| Edit EMPLOYEE | ✅ | ✅ | ✅ Own dept | ✅ Self (limited) |
| Delete OWNER | ❌ | ❌ | ❌ | ❌ |
| Delete ADMIN | ✅ | ❌ | ❌ | ❌ |
| Delete MANAGER | ✅ | ✅ | ❌ | ❌ |
| Delete EMPLOYEE | ✅ | ✅ | ✅ Own dept | ❌ |
| Change user role | ✅ | ✅ (excl. admin/owner) | ❌ | ❌ |
| Reset user password | ✅ | ✅ | ✅ Own dept | ❌ |
| **Employee Management** |
| View employee list | ✅ All | ✅ All | ✅ Team only | ❌ |
| View employee details | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| View employee profile | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Edit employee profile | ✅ All | ✅ All | ✅ Team only | ✅ Self (limited) |
| View employment history | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Export employee data | ✅ All | ✅ All | ✅ Team only | ❌ |
| **Time Tracking** |
| Clock in/out | ✅ | ✅ | ✅ | ✅ |
| View own time entries | ✅ | ✅ | ✅ | ✅ |
| View all time entries | ✅ All | ✅ All | ✅ Team only | ❌ |
| Edit own time entries | ❌ Corrections only | ❌ Corrections only | ❌ Corrections only | ❌ Corrections only |
| Edit others' time entries | ✅ All | ✅ All | ✅ Team only | ❌ |
| Approve time corrections | ✅ All | ✅ All | ✅ Team only | ❌ |
| View geolocation data | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Export time entries | ✅ All | ✅ All | ✅ Team only | ❌ |
| **Scheduling** |
| View schedules | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Create schedules | ✅ | ✅ | ✅ Team only | ❌ |
| Edit schedules | ✅ | ✅ | ✅ Team only | ❌ |
| Delete schedules | ✅ | ✅ | ✅ Team only | ❌ |
| Publish schedules | ✅ | ✅ | ✅ Team only | ❌ |
| Lock schedules | ✅ | ✅ | ✅ Team only | ❌ |
| View shift conflicts | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Override conflicts | ✅ | ✅ | ❌ | ❌ |
| Export schedules | ✅ All | ✅ All | ✅ Team only | ❌ |
| **Leave Requests** |
| Submit leave request | ✅ | ✅ | ✅ | ✅ |
| View own leave requests | ✅ | ✅ | ✅ | ✅ |
| View all leave requests | ✅ All | ✅ All | ✅ Team only | ❌ |
| Approve leave requests | ✅ All | ✅ All | ✅ Team only | ❌ |
| Reject leave requests | ✅ All | ✅ All | ✅ Team only | ❌ |
| Cancel approved leaves | ✅ All | ✅ All | ✅ Team only | ❌ |
| View leave balance | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Adjust leave balance | ✅ All | ✅ All | ❌ | ❌ |
| Export leave data | ✅ All | ✅ All | ✅ Team only | ❌ |
| **Reports** |
| View dashboard reports | ✅ All | ✅ All | ✅ Team only | ✅ Self only |
| Generate attendance reports | ✅ All | ✅ All | ✅ Team only | ❌ |
| Generate payroll reports | ✅ All | ✅ All | ✅ Team only | ❌ |
| Generate leave reports | ✅ All | ✅ All | ✅ Team only | ❌ |
| Generate overtime reports | ✅ All | ✅ All | ✅ Team only | ❌ |
| Export reports (PDF) | ✅ | ✅ | ✅ Team only | ❌ |
| Export reports (Excel) | ✅ | ✅ | ✅ Team only | ❌ |
| Export signed reports (compliance) | ✅ | ✅ | ❌ | ❌ |
| **Departments** |
| View departments | ✅ All | ✅ All | ✅ Own only | ✅ Own only |
| Create departments | ✅ | ✅ | ❌ | ❌ |
| Edit departments | ✅ All | ✅ All | ❌ | ❌ |
| Delete departments | ✅ | ✅ | ❌ | ❌ |
| Assign employees to dept | ✅ | ✅ | ❌ | ❌ |
| **Notifications** |
| View own notifications | ✅ | ✅ | ✅ | ✅ |
| Configure notification prefs | ✅ | ✅ | ✅ | ✅ |
| Send system notifications | ✅ | ✅ | ✅ Team only | ❌ |
| **Audit Logs** |
| View audit logs | ✅ All | ✅ All | ❌ | ❌ |
| Export audit logs | ✅ | ✅ | ❌ | ❌ |

---

## Navigation Menu by Role

### OWNER
```
📊 Dashboard
👥 Employees
   ├── All Employees
   ├── Departments
   └── Employment History
⏰ Time Tracking
   ├── Live Clock-ins
   ├── Time Entries
   ├── Corrections
   └── Geolocation
📅 Scheduling
   ├── Create Schedule
   ├── View Schedules
   ├── Shift Templates
   └── Conflict Management
🌴 Leave Management
   ├── Leave Requests
   ├── Leave Balances
   └── Leave Types
📈 Reports
   ├── Attendance
   ├── Payroll
   ├── Overtime
   └── Compliance
⚙️ Settings
   ├── Tenant Info
   ├── SMTP Configuration
   ├── Modules
   ├── Billing
   └── Audit Logs
👤 My Profile
```

### ADMIN
```
📊 Dashboard
👥 Employees
   ├── All Employees
   ├── Departments
   └── Employment History
⏰ Time Tracking
   ├── Live Clock-ins
   ├── Time Entries
   └── Corrections
📅 Scheduling
   ├── Create Schedule
   ├── View Schedules
   ├── Shift Templates
   └── Conflict Management
🌴 Leave Management
   ├── Leave Requests
   ├── Leave Balances
   └── Leave Types
📈 Reports
   ├── Attendance
   ├── Payroll
   ├── Overtime
   └── Compliance
⚙️ Settings
   ├── Tenant Info (read-only)
   ├── SMTP Configuration
   └── Audit Logs
👤 My Profile
```

### MANAGER
```
📊 Dashboard (Team view)
👥 My Team
   └── Team Members
⏰ Time Tracking
   ├── Team Clock-ins
   └── Team Time Entries
📅 Scheduling
   ├── Create Schedule
   └── Team Schedules
🌴 Leave Management
   ├── Team Leave Requests
   └── Team Leave Balances
📈 Reports (Team only)
   ├── Attendance
   └── Overtime
👤 My Profile
```

### EMPLOYEE
```
📊 Dashboard (Personal view)
⏰ My Time
   ├── Clock In/Out
   └── My Time Entries
📅 My Schedule
🌴 My Leave
   ├── Submit Request
   ├── My Requests
   └── Leave Balance
👤 My Profile
```

---

## Permission Logic

### Role Checks
```typescript
// Role hierarchy (top to bottom)
OWNER > ADMIN > MANAGER > EMPLOYEE

// Permission check
if (requiredRole === 'MANAGER') {
  allowed = user.role in ['OWNER', 'ADMIN', 'MANAGER']
}
```

### Scope Restrictions
```typescript
// Managers can only access their department
if (user.role === 'MANAGER') {
  employees = employees.filter(e => e.departmentId === user.departmentId)
}

// Employees can only access their own data
if (user.role === 'EMPLOYEE') {
  employees = employees.filter(e => e.userId === user.id)
}
```

### Critical Operations
```typescript
// Only OWNER can:
- Delete tenant
- Manage billing
- Create/delete admins
- Enable/disable modules

// Only OWNER/ADMIN can:
- Configure SMTP
- View audit logs
- Export signed compliance reports
- Adjust leave balances globally

// Only OWNER/ADMIN/MANAGER can:
- Approve leave requests
- Edit time entries (within scope)
- Manage scheduling (within scope)
```

---

## Demo Accounts

| Email | Password | Role | Purpose |
|-------|----------|------|---------|
| `owner@torretempo.com` | `owner123` | OWNER | Global super admin |
| `admin@torretempo.com` | `admin123` | ADMIN | Tenant administrator |
| `manager@torretempo.com` | `manager123` | MANAGER | Department manager |
| `employee@torretempo.com` | `employee123` | EMPLOYEE | Regular staff |

**Tenant Slug:** `demo`

---

## Implementation Notes

### Backend
- ✅ Role enum includes OWNER
- ✅ Authorization middleware checks role hierarchy
- ✅ Service layer filters by scope (all/team/self)
- ✅ Database RLS policies (future enhancement)

### Frontend
- ✅ Navigation filtered by role
- ✅ Routes protected with role requirements
- ✅ Buttons/actions hidden by permission
- ✅ Data tables show scope-appropriate data

### Security
- ⚠️ OWNER role cannot be changed via UI
- ⚠️ Only one OWNER per tenant
- ⚠️ OWNER account cannot be deleted
- ⚠️ Critical operations require additional confirmation

---

## Future Enhancements

1. **Department-based filtering for Managers**
   - Currently: Managers can see all employees
   - Future: Managers only see their department

2. **Custom roles & permissions**
   - Allow OWNER to create custom roles
   - Fine-grained permission assignment

3. **Multi-level approval workflows**
   - Leave requests require multiple approvals
   - Manager approves → Admin approves → OWNER approves

4. **Role delegation**
   - OWNER can temporarily delegate permissions
   - Admin can delegate to Manager

5. **IP whitelisting for OWNER actions**
   - Critical operations restricted to specific IPs
   - Added security layer for sensitive actions
