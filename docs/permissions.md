# Torre Tempo - Permissions & Role-Based Access Control

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Reference Documentation

---

## Table of Contents

1. [Overview](#1-overview)
2. [Role Hierarchy](#2-role-hierarchy)
3. [Platform-Level Roles](#3-platform-level-roles)
4. [Tenant-Level Roles](#4-tenant-level-roles)
5. [Permission Matrices](#5-permission-matrices)
6. [Special Permission Rules](#6-special-permission-rules)
7. [Role Assignment](#7-role-assignment)
8. [Implementation Guide](#8-implementation-guide)
9. [Code Examples](#9-code-examples)
10. [Security Considerations](#10-security-considerations)

---

## 1. Overview

Torre Tempo implements a comprehensive role-based access control (RBAC) system with two distinct permission levels:

- **Platform-Level Permissions:** Control access to system-wide administrative functions
- **Tenant-Level Permissions:** Control access to resources within a specific tenant organization

### 1.1 Key Principles

1. **Least Privilege:** Users are granted only the minimum permissions necessary for their role
2. **Separation of Duties:** Critical operations require appropriate role authorization
3. **Multi-Tenancy Isolation:** Users can have different roles in different tenants
4. **Hierarchical Permissions:** Higher-level roles inherit permissions from lower-level roles
5. **Audit Trail:** All permission-based actions are logged for compliance

### 1.2 Permission Enforcement

Permissions are enforced at multiple layers:

- **API Layer:** Middleware validates user roles before processing requests
- **Business Logic Layer:** Service methods verify permissions before executing operations
- **Database Layer:** Tenant-scoped queries ensure data isolation
- **UI Layer:** Interface elements are conditionally rendered based on user permissions

---

## 2. Role Hierarchy

### 2.1 Platform Roles

```
Platform Owner (Superadmin)
    └── Full system access across all tenants
```

### 2.2 Tenant Roles

```
Tenant Admin
    ├── HR Manager
    ├── Manager
    ├── Accountant (Read-Only)
    └── Employee
```

**Hierarchy Notes:**
- Tenant Admin has all permissions within their tenant
- HR Manager has employee management and reporting permissions
- Manager has team-scoped permissions
- Accountant has read-only access to financial data
- Employee has self-service permissions only

---

## 3. Platform-Level Roles

### 3.1 Platform Owner (Superadmin)

**Scope:** System-wide access across all tenants

**Primary Responsibilities:**
- System administration and maintenance
- Tenant lifecycle management
- Platform-wide analytics and monitoring
- Billing and subscription management
- Technical support and troubleshooting

**Permissions:**

| Category | Permission | Description |
|----------|-----------|-------------|
| **Tenant Management** | Create Tenant | Provision new tenant organizations |
| | View All Tenants | Access list of all tenants in the system |
| | Edit Tenant | Modify tenant settings and configuration |
| | Delete Tenant | Soft delete tenant organizations |
| | View Tenant Data | Access any tenant's data for support purposes |
| **User Management** | Manage Platform Users | Create/edit/delete platform administrators |
| | View All Users | Access user accounts across all tenants |
| | Reset User Passwords | Assist users with account recovery |
| **Billing** | View Subscriptions | Access billing information for all tenants |
| | Modify Subscriptions | Change subscription plans and limits |
| | Process Payments | Handle billing operations |
| **Analytics** | Platform Analytics | View system-wide usage statistics |
| | Performance Metrics | Monitor system performance and health |
| **System** | System Configuration | Modify platform-wide settings |
| | Database Access | Direct database access for maintenance |
| | Audit Logs | View all platform audit logs |

**Database Implementation:**

```sql
CREATE TABLE platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,  -- 'platform_owner'
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Security Notes:**
- Platform owners must use MFA (enforced)
- All platform-level actions are logged in audit trail
- Platform access should be restricted to technical administrators only
- Regular security audits of platform owner accounts required

---

## 4. Tenant-Level Roles

### 4.1 Tenant Admin

**Scope:** Full control within their tenant organization

**Primary Responsibilities:**
- Tenant configuration and settings management
- User and role management within the tenant
- Billing and subscription management for the tenant
- Complete access to all tenant data and features

**Key Permissions:**
- ✅ All employee management operations
- ✅ All time tracking operations
- ✅ All reporting and export functions
- ✅ Tenant settings configuration
- ✅ User role assignment
- ✅ Billing management
- ✅ Department and project management

**Use Cases:**
- Company owner or CEO
- IT administrator
- Operations manager with full system responsibility

---

### 4.2 HR Manager

**Scope:** Employee management and compliance reporting

**Primary Responsibilities:**
- Employee lifecycle management (hire, update, terminate)
- Compliance reporting and data exports
- Leave request approval
- Access to all employee data for HR purposes

**Key Permissions:**
- ✅ Create, edit, delete employee profiles
- ✅ View all employee data
- ✅ View all time entries (read-only)
- ✅ Approve/reject leave requests
- ✅ Generate and export all reports
- ✅ Access audit logs for employee changes
- ❌ Cannot modify tenant settings
- ❌ Cannot manage user roles
- ❌ Cannot access billing

**Use Cases:**
- Human Resources Manager
- HR Administrator
- Compliance Officer

---

### 4.3 Manager

**Scope:** Team management and approval workflows

**Primary Responsibilities:**
- Manage direct reports' time entries
- Approve/reject team time entries and leave requests
- View team reports and analytics
- Limited employee profile updates for team members

**Key Permissions:**
- ✅ View team members' profiles
- ✅ Edit team members' profiles (limited fields)
- ✅ View team time entries
- ✅ Approve/reject team time entries
- ✅ Approve/reject team leave requests
- ✅ Generate team reports
- ✅ Clock in/out (own time)
- ❌ Cannot view other teams' data
- ❌ Cannot create or delete employees
- ❌ Cannot access tenant settings
- ❌ Cannot delete time entries

**Team Scope Definition:**
- A manager can only access data for employees where `manager_id` matches their employee profile
- Hierarchical management: managers can see their direct reports only (not indirect reports)

**Use Cases:**
- Department Manager
- Team Lead
- Project Manager

---

### 4.4 Employee

**Scope:** Self-service time tracking and personal data access

**Primary Responsibilities:**
- Clock in/out for work shifts
- View own time tracking history
- Submit leave requests
- View own reports and data

**Key Permissions:**
- ✅ Clock in/out (own time)
- ✅ View own time entries
- ✅ Edit own time entries (within 24 hours)
- ✅ Request edits for older entries (requires approval)
- ✅ Submit leave requests
- ✅ View own leave requests
- ✅ View own employee profile
- ✅ View own reports
- ✅ Export own data (GDPR right to data portability)
- ❌ Cannot view other employees' data
- ❌ Cannot edit own employee profile (must request via HR)
- ❌ Cannot approve time entries
- ❌ Cannot delete time entries

**Use Cases:**
- Regular employees
- Contractors
- Part-time workers

---

### 4.5 Accountant (Read-Only)

**Scope:** Financial reporting and payroll data access

**Primary Responsibilities:**
- Access time tracking data for payroll processing
- Generate financial reports
- Export payroll data
- Audit time and attendance records

**Key Permissions:**
- ✅ View all employee profiles
- ✅ View all time entries (read-only)
- ✅ View all leave requests (read-only)
- ✅ Generate all reports
- ✅ Export payroll data
- ✅ View departments and cost centers
- ❌ Cannot create, edit, or delete any data
- ❌ Cannot approve time entries or leave requests
- ❌ Cannot clock in/out
- ❌ Cannot access tenant settings

**Use Cases:**
- Accountant
- Payroll Specialist
- Financial Controller
- External auditor (temporary access)

---

## 5. Permission Matrices

### 5.1 Employee Management Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **Create Employee** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Employees** | ✅ | ✅ | Team Only | ❌ | ✅ |
| **View Own Profile** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Edit Employee (All Fields)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Employee (Limited Fields)** | ✅ | ✅ | Team Only* | ❌ | ❌ |
| **Delete Employee** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Employee Audit History** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **Import Employees (CSV)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Export Employee Data** | ✅ | ✅ | Team Only | Own Only | ✅ |

**Limited Fields for Managers:**
- Job title
- Department
- Manager assignment
- Work schedule
- Notes

**Restricted Fields (Admin/HR Only):**
- Employee number
- Hire date
- Contract type
- Salary/compensation
- National ID
- Social security number

---

### 5.2 Time Entry Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **Clock In/Out (Own)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Clock In/Out (Others)** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View All Time Entries** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Create Time Entry (Manual)** | ✅ | ✅ | Team Only | Own Only | ❌ |
| **Edit Own Entry (<24h)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Edit Own Entry (>24h)** | ✅ | ✅ | ✅ | Request** | ❌ |
| **Edit Other's Entry** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **Delete Time Entry** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Approve Time Entry** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **Reject Time Entry** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **View Approval Status** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Export Time Data** | ✅ | ✅ | Team Only | Own Only | ✅ |

**Notes:**
- ** Employees can request edits for entries older than 24 hours, which require manager approval
- All edits are logged in the audit trail
- Deletion is always soft delete (sets `deleted_at` timestamp)
- Managers can only approve entries for their direct reports

---

### 5.3 Leave Request Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **Create Leave Request (Own)** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Create Leave Request (Others)** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Leave Requests** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Edit Own Leave Request** | ✅ | ✅ | ✅ | Pending Only* | ❌ |
| **Edit Other's Leave Request** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **Cancel Own Leave Request** | ✅ | ✅ | ✅ | Pending Only* | ❌ |
| **Approve Leave Request** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **Reject Leave Request** | ✅ | ✅ | Team Only | ❌ | ❌ |
| **View Leave Balance** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Export Leave Data** | ✅ | ✅ | Team Only | Own Only | ✅ |

**Notes:**
- * Employees can only edit/cancel leave requests that are still pending
- Once approved, only Admin/HR can modify leave requests
- Leave types: vacation, sick, personal, maternity, paternity, unpaid

---

### 5.4 Reporting Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **View Own Reports** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Team Reports** | ✅ | ✅ | ✅ | ❌ | ✅ |
| **View All Reports** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Daily Attendance Report** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Weekly/Monthly Timesheet** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Overtime Report** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Leave/Absence Report** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Payroll Export** | ✅ | ✅ | ❌ | ❌ | ✅ |
| **Compliance Report (Spain)** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Export to PDF** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Export to CSV** | ✅ | ✅ | Team Only | Own Only | ✅ |
| **Schedule Automated Reports** | ✅ | ✅ | ❌ | ❌ | ❌ |

**Report Scope:**
- **Own Only:** Employee can only see their own data
- **Team Only:** Manager can only see their direct reports' data
- **All:** Admin/HR/Accountant can see all employees' data

---

### 5.5 Settings & Configuration Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **View Tenant Settings** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Edit Tenant Settings** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Work Hours Rules** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Overtime Rules** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Break Policies** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Departments** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Projects** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Manage Users/Roles** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Billing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Billing** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Branding** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View Audit Logs** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Configure Integrations** | ✅ | ❌ | ❌ | ❌ | ❌ |

**Tenant Settings Include:**
- Work hours configuration
- Overtime calculation rules
- Break policies
- Validation rules
- Compliance settings
- Branding (logo, colors)
- Integrations (SSO, webhooks)

---

### 5.6 Department & Project Permissions

| Permission | Admin | HR | Manager | Employee | Accountant |
|-----------|-------|----|---------|---------|-----------| 
| **Create Department** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Department** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Department** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Departments** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Create Project** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Project** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Project** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Projects** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Assign Employees to Projects** | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## 6. Special Permission Rules

### 6.1 Team Scope for Managers

**Definition:** A manager's "team" consists of employees where `manager_id` equals the manager's employee profile ID.

**Implementation:**

```sql
-- Get team members for a manager
SELECT e.* 
FROM employees e
WHERE e.tenant_id = $1 
  AND e.manager_id = $2
  AND e.deleted_at IS NULL;
```

**Hierarchical Management:**
- Managers can only see **direct reports** (not indirect reports)
- If Manager A manages Manager B, and Manager B manages Employee C:
  - Manager A can see Manager B's data
  - Manager A **cannot** see Employee C's data
  - Manager B can see Employee C's data

**Team Scope Applies To:**
- Viewing employee profiles
- Viewing time entries
- Approving time entries
- Viewing leave requests
- Approving leave requests
- Generating reports

---

### 6.2 Time Entry Edit Rules

**Within 24 Hours:**
- Employees can freely edit their own time entries
- No approval required
- Changes are logged in audit trail

**After 24 Hours:**
- Employees can request edits (creates an approval workflow)
- Manager must approve the edit request
- Original entry is preserved in audit log
- Approved edits are marked with `edited_by` and `edited_at`

**Manager/Admin Edits:**
- Can edit any time entry within their scope
- All edits are logged with user ID and timestamp
- Original values preserved in audit trail

**Deletion Rules:**
- Only Admin and HR can delete time entries
- Deletion is always soft delete (`deleted_at` timestamp)
- Deleted entries remain in database for audit purposes
- Deleted entries are excluded from reports (unless specifically requested)

---

### 6.3 Self-Service Restrictions

**Employees Cannot Edit Their Own Profile:**
- Employees can **view** their profile
- Employees **cannot edit** any profile fields
- Rationale: Maintain data integrity and prevent unauthorized changes
- Process: Employees must request changes through HR

**Exception - User Preferences:**
- Employees can update their own user preferences:
  - Language/locale
  - Timezone
  - Notification settings
  - Password
  - MFA settings

---

### 6.4 Approval Workflow Rules

**Time Entry Approval:**
1. Employee clocks in/out → Entry created with `status = 'pending'`
2. Manager reviews pending entries
3. Manager approves → `status = 'approved'`, `approved_by` and `approved_at` set
4. Manager rejects → `status = 'rejected'`, `rejection_reason` required

**Leave Request Approval:**
1. Employee submits leave request → `status = 'pending'`
2. Manager reviews request
3. Manager approves → `status = 'approved'`, `approved_by` and `approved_at` set
4. Manager rejects → `status = 'rejected'`, `rejection_reason` required
5. Employee can cancel pending requests → `status = 'cancelled'`

**Approval Authority:**
- Managers can approve for their direct reports only
- HR and Admin can approve for any employee
- Employees cannot approve their own entries (even if they are managers)

---

### 6.5 Data Export Permissions

**Employee Data Export:**
- Admin/HR: All employees
- Manager: Team members only
- Employee: Own data only (GDPR right to data portability)
- Accountant: All employees (read-only)

**Time Entry Export:**
- Admin/HR: All time entries
- Manager: Team time entries only
- Employee: Own time entries only
- Accountant: All time entries (read-only)

**Export Formats:**
- PDF: Formatted reports for compliance
- CSV: Raw data for payroll/ERP integration
- JSON: API-based exports for system integration

**Export Logging:**
- All exports are logged in audit trail
- Log includes: user, timestamp, export type, date range, employee scope

---

### 6.6 Multi-Tenant User Permissions

**Cross-Tenant Access:**
- A user can belong to multiple tenants
- Each tenant membership has an independent role
- Example: User A can be:
  - Admin in Tenant 1
  - Manager in Tenant 2
  - Employee in Tenant 3

**Role Isolation:**
- Roles are tenant-specific (stored in `tenant_users` table)
- User's role in Tenant A does not affect their role in Tenant B
- JWT token includes tenant context to enforce proper role

**Tenant Switching:**
- Users with multiple tenant memberships can switch between tenants
- UI provides tenant selector
- Switching tenant refreshes JWT with new tenant context

---

## 7. Role Assignment

### 7.1 Role Assignment Process

**Initial Tenant Creation:**
1. User registers new tenant via self-service
2. System creates tenant record
3. System creates `tenant_users` record with `role = 'admin'`
4. User becomes the first admin of the tenant

**Inviting Users:**
1. Admin navigates to User Management
2. Admin clicks "Invite User"
3. Admin enters email and selects role
4. System sends invitation email
5. User accepts invitation and creates account (or links existing account)
6. System creates `tenant_users` record with specified role

**Changing User Roles:**
1. Admin navigates to User Management
2. Admin selects user and clicks "Change Role"
3. Admin selects new role from dropdown
4. System updates `tenant_users.role`
5. Change is logged in audit trail
6. User's permissions update immediately (on next API request)

---

### 7.2 Role Assignment API

**Invite User to Tenant:**

```http
POST /api/v1/tenants/{tenantId}/users
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "email": "john@example.com",
  "role": "manager",
  "employeeId": "uuid-of-employee-profile"  // optional, links user to employee
}
```

**Response:**

```json
{
  "id": "tenant-user-uuid",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "role": "manager",
  "employeeId": "employee-uuid",
  "active": true,
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Update User Role:**

```http
PATCH /api/v1/tenants/{tenantId}/users/{userId}
Authorization: Bearer {jwt_token}
Content-Type: application/json

{
  "role": "hr"
}
```

**Remove User from Tenant:**

```http
DELETE /api/v1/tenants/{tenantId}/users/{userId}
Authorization: Bearer {jwt_token}
```

---

### 7.3 Role Assignment Rules

**Who Can Assign Roles:**
- Only Tenant Admin can assign roles
- Platform Owner can assign roles in any tenant (for support purposes)

**Role Assignment Restrictions:**
- Cannot assign Platform Owner role via tenant API
- Cannot remove the last Admin from a tenant (must have at least one)
- Cannot change own role (prevents accidental lockout)

**Employee Linking:**
- When inviting a user with `employee` or `manager` role, link to employee profile
- `employeeId` field in `tenant_users` table creates the association
- Linked users inherit employee profile data (name, department, etc.)

---

## 8. Implementation Guide

### 8.1 Database Schema

**Users Table:**

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(50),
  locale VARCHAR(10) DEFAULT 'es-ES',
  timezone VARCHAR(50) DEFAULT 'Europe/Madrid',
  mfa_enabled BOOLEAN DEFAULT FALSE,
  mfa_secret VARCHAR(255),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

**Tenant Users Table (Role Mapping):**

```sql
CREATE TABLE tenant_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,  -- 'admin', 'hr', 'manager', 'employee', 'accountant'
  employee_id UUID REFERENCES employees(id),  -- link to employee profile if applicable
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);
CREATE INDEX idx_tenant_users_role ON tenant_users(tenant_id, role);
```

**Platform Roles Table:**

```sql
CREATE TABLE platform_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  role VARCHAR(50) NOT NULL,  -- 'platform_owner'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_roles_user ON platform_roles(user_id);
```

---

### 8.2 Permission Checking Flow

**Request Flow:**

```
1. User makes API request
   ↓
2. JWT middleware validates token
   ↓
3. Extract user_id and tenant_id from JWT
   ↓
4. Query tenant_users table for role
   ↓
5. Authorization middleware checks role permissions
   ↓
6. If authorized → proceed to business logic
   If not authorized → return 403 Forbidden
```

**Database Query:**

```sql
-- Get user's role in tenant
SELECT role, employee_id 
FROM tenant_users
WHERE tenant_id = $1 
  AND user_id = $2 
  AND active = true;
```

---

### 8.3 Tenant Context Extraction

**From Path:**

```javascript
function extractTenantFromPath(req) {
  const tenantSlug = req.path.split('/')[2]; // Extract from /t/{tenantSlug}/
  
  // Query database for tenant by slug
  const tenant = await db.query(
    'SELECT id FROM tenants WHERE slug = $1 AND deleted_at IS NULL',
    [tenantSlug]
  );
  
  return tenant?.id;
}
```

**From JWT:**

```javascript
function extractTenantFromJWT(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
  return decoded.tenantId;
}
```

---

## 9. Code Examples

### 9.1 Authorization Middleware

**Basic Role Check:**

```javascript
/**
 * Middleware to require specific roles
 * @param {string[]} allowedRoles - Array of allowed roles
 */
function requireRole(allowedRoles) {
  return async (req, res, next) => {
    try {
      const { tenantId } = req.params;
      const { userId } = req.auth; // Set by JWT middleware
      
      // Query user's role in this tenant
      const result = await db.query(
        `SELECT role, employee_id 
         FROM tenant_users 
         WHERE tenant_id = $1 AND user_id = $2 AND active = true`,
        [tenantId, userId]
      );
      
      if (!result.rows.length) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'You do not have access to this tenant' 
        });
      }
      
      const { role, employee_id } = result.rows[0];
      
      if (!allowedRoles.includes(role)) {
        return res.status(403).json({ 
          error: 'Forbidden',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}` 
        });
      }
      
      // Attach role and employee_id to request for use in handlers
      req.tenantUser = { role, employeeId: employee_id };
      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
```

**Usage:**

```javascript
// Only admins and HR can create employees
app.post('/api/v1/tenants/:tenantId/employees', 
  requireRole(['admin', 'hr']),
  createEmployee
);

// Admins, HR, and managers can view employees (with scope filtering in handler)
app.get('/api/v1/tenants/:tenantId/employees', 
  requireRole(['admin', 'hr', 'manager', 'accountant']),
  getEmployees
);

// All authenticated users can view their own profile
app.get('/api/v1/tenants/:tenantId/employees/me', 
  requireRole(['admin', 'hr', 'manager', 'employee', 'accountant']),
  getOwnProfile
);
```

---

### 9.2 Team Scope Filtering

**Get Employees with Role-Based Filtering:**

```javascript
async function getEmployees(req, res) {
  const { tenantId } = req.params;
  const { role, employeeId } = req.tenantUser;
  const { status, department, search } = req.query;
  
  let query = `
    SELECT e.* 
    FROM employees e
    WHERE e.tenant_id = $1 
      AND e.deleted_at IS NULL
  `;
  const params = [tenantId];
  let paramIndex = 2;
  
  // Apply role-based filtering
  if (role === 'manager') {
    // Managers can only see their team
    query += ` AND e.manager_id = $${paramIndex}`;
    params.push(employeeId);
    paramIndex++;
  }
  // Admin, HR, and Accountant can see all employees (no additional filter)
  
  // Apply optional filters
  if (status) {
    query += ` AND e.employment_status = $${paramIndex}`;
    params.push(status);
    paramIndex++;
  }
  
  if (department) {
    query += ` AND e.department_id = $${paramIndex}`;
    params.push(department);
    paramIndex++;
  }
  
  if (search) {
    query += ` AND (e.first_name ILIKE $${paramIndex} OR e.last_name ILIKE $${paramIndex} OR e.email ILIKE $${paramIndex})`;
    params.push(`%${search}%`);
    paramIndex++;
  }
  
  query += ` ORDER BY e.last_name, e.first_name`;
  
  const result = await db.query(query, params);
  res.json(result.rows);
}
```

---

### 9.3 Time Entry Approval

**Approve Time Entry with Permission Check:**

```javascript
async function approveTimeEntry(req, res) {
  const { tenantId, entryId } = req.params;
  const { userId } = req.auth;
  const { role, employeeId } = req.tenantUser;
  
  // Get the time entry
  const entryResult = await db.query(
    `SELECT te.*, e.manager_id 
     FROM time_entries te
     JOIN employees e ON te.employee_id = e.id
     WHERE te.id = $1 AND te.tenant_id = $2 AND te.deleted_at IS NULL`,
    [entryId, tenantId]
  );
  
  if (!entryResult.rows.length) {
    return res.status(404).json({ error: 'Time entry not found' });
  }
  
  const entry = entryResult.rows[0];
  
  // Check if already approved
  if (entry.status === 'approved') {
    return res.status(400).json({ error: 'Time entry is already approved' });
  }
  
  // Permission check: managers can only approve their team's entries
  if (role === 'manager' && entry.manager_id !== employeeId) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You can only approve time entries for your direct reports' 
    });
  }
  
  // Prevent self-approval
  if (entry.employee_id === employeeId) {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'You cannot approve your own time entries' 
    });
  }
  
  // Update time entry
  await db.query(
    `UPDATE time_entries 
     SET status = 'approved', 
         approved_by = $1, 
         approved_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [userId, entryId]
  );
  
  // Log the approval in audit trail
  await db.query(
    `INSERT INTO audit_logs (tenant_id, user_id, action, entity_type, entity_id, changes)
     VALUES ($1, $2, 'approve', 'time_entry', $3, $4)`,
    [
      tenantId, 
      userId, 
      entryId, 
      JSON.stringify({ status: { before: entry.status, after: 'approved' } })
    ]
  );
  
  res.json({ message: 'Time entry approved successfully' });
}
```

---

### 9.4 Employee Self-Service

**Get Own Profile:**

```javascript
async function getOwnProfile(req, res) {
  const { tenantId } = req.params;
  const { employeeId } = req.tenantUser;
  
  if (!employeeId) {
    return res.status(404).json({ 
      error: 'Not found',
      message: 'Your user account is not linked to an employee profile' 
    });
  }
  
  const result = await db.query(
    `SELECT e.*, d.name as department_name
     FROM employees e
     LEFT JOIN departments d ON e.department_id = d.id
     WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`,
    [employeeId, tenantId]
  );
  
  if (!result.rows.length) {
    return res.status(404).json({ error: 'Employee profile not found' });
  }
  
  res.json(result.rows[0]);
}
```

**Clock In:**

```javascript
async function clockIn(req, res) {
  const { tenantId } = req.params;
  const { userId } = req.auth;
  const { employeeId } = req.tenantUser;
  const { projectId, taskDescription, location } = req.body;
  
  if (!employeeId) {
    return res.status(400).json({ 
      error: 'Bad request',
      message: 'Your user account is not linked to an employee profile' 
    });
  }
  
  // Check if already clocked in
  const activeEntry = await db.query(
    `SELECT id FROM time_entries 
     WHERE tenant_id = $1 
       AND employee_id = $2 
       AND clock_out IS NULL 
       AND deleted_at IS NULL`,
    [tenantId, employeeId]
  );
  
  if (activeEntry.rows.length > 0) {
    return res.status(400).json({ 
      error: 'Bad request',
      message: 'You are already clocked in. Please clock out first.' 
    });
  }
  
  // Create time entry
  const result = await db.query(
    `INSERT INTO time_entries 
     (tenant_id, employee_id, clock_in, project_id, task_description, clock_in_location, clock_in_ip, created_by, status)
     VALUES ($1, $2, NOW(), $3, $4, $5, $6, $7, 'pending')
     RETURNING *`,
    [
      tenantId, 
      employeeId, 
      projectId || null, 
      taskDescription || null,
      location || null,
      req.ip,
      userId
    ]
  );
  
  res.status(201).json(result.rows[0]);
}
```

---

### 9.5 Platform Owner Access

**Platform Owner Middleware:**

```javascript
async function requirePlatformOwner(req, res, next) {
  const { userId } = req.auth;
  
  const result = await db.query(
    `SELECT role FROM platform_roles WHERE user_id = $1`,
    [userId]
  );
  
  if (!result.rows.length || result.rows[0].role !== 'platform_owner') {
    return res.status(403).json({ 
      error: 'Forbidden',
      message: 'This action requires platform owner privileges' 
    });
  }
  
  req.isPlatformOwner = true;
  next();
}
```

**Usage:**

```javascript
// Platform-level endpoints
app.get('/api/v1/platform/tenants', 
  requirePlatformOwner,
  getAllTenants
);

app.post('/api/v1/platform/tenants', 
  requirePlatformOwner,
  createTenant
);

app.delete('/api/v1/platform/tenants/:tenantId', 
  requirePlatformOwner,
  deleteTenant
);
```

---

## 10. Security Considerations

### 10.1 Permission Bypass Prevention

**Common Vulnerabilities:**

1. **Insecure Direct Object Reference (IDOR):**
   - Always validate that the user has permission to access the requested resource
   - Never trust client-provided IDs without authorization check
   
   ```javascript
   // ❌ VULNERABLE
   app.get('/api/v1/employees/:id', async (req, res) => {
     const employee = await db.query('SELECT * FROM employees WHERE id = $1', [req.params.id]);
     res.json(employee);
   });
   
   // ✅ SECURE
   app.get('/api/v1/tenants/:tenantId/employees/:id', 
     requireRole(['admin', 'hr', 'manager']),
     async (req, res) => {
       const { tenantId, id } = req.params;
       const { role, employeeId } = req.tenantUser;
       
       let query = 'SELECT * FROM employees WHERE id = $1 AND tenant_id = $2';
       const params = [id, tenantId];
       
       // Apply role-based filtering
       if (role === 'manager') {
         query += ' AND manager_id = $3';
         params.push(employeeId);
       }
       
       const result = await db.query(query, params);
       if (!result.rows.length) {
         return res.status(404).json({ error: 'Employee not found' });
       }
       res.json(result.rows[0]);
     }
   );
   ```

2. **Mass Assignment:**
   - Validate which fields can be updated based on user role
   - Never blindly accept all fields from request body
   
   ```javascript
   // ❌ VULNERABLE
   app.patch('/api/v1/employees/:id', async (req, res) => {
     await db.query('UPDATE employees SET ... WHERE id = $1', [req.params.id]);
   });
   
   // ✅ SECURE
   app.patch('/api/v1/tenants/:tenantId/employees/:id',
     requireRole(['admin', 'hr']),
     async (req, res) => {
       const allowedFields = ['first_name', 'last_name', 'job_title', 'department_id'];
       const updates = {};
       
       for (const field of allowedFields) {
         if (req.body[field] !== undefined) {
           updates[field] = req.body[field];
         }
       }
       
       // Build and execute update query with only allowed fields
       // ...
     }
   );
   ```

3. **Privilege Escalation:**
   - Never allow users to change their own role
   - Validate role changes are performed by authorized users only
   
   ```javascript
   // ✅ SECURE
   app.patch('/api/v1/tenants/:tenantId/users/:userId',
     requireRole(['admin']),
     async (req, res) => {
       const { userId: requestingUserId } = req.auth;
       const { userId: targetUserId } = req.params;
       
       // Prevent self-role-change
       if (requestingUserId === targetUserId) {
         return res.status(403).json({ 
           error: 'Forbidden',
           message: 'You cannot change your own role' 
         });
       }
       
       // Proceed with role change
       // ...
     }
   );
   ```

---

### 10.2 Audit Logging

**What to Log:**

- User login/logout
- Failed authentication attempts
- Role assignments and changes
- Permission-based actions (create, update, delete)
- Data exports
- Settings changes
- Approval/rejection actions

**Audit Log Format:**

```javascript
async function logAudit(tenantId, userId, action, entityType, entityId, changes, req) {
  await db.query(
    `INSERT INTO audit_logs 
     (tenant_id, user_id, action, entity_type, entity_id, changes, ip_address, user_agent)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      tenantId,
      userId,
      action,
      entityType,
      entityId,
      JSON.stringify(changes),
      req.ip,
      req.get('user-agent')
    ]
  );
}
```

**Usage:**

```javascript
// Log employee update
await logAudit(
  tenantId,
  userId,
  'update',
  'employee',
  employeeId,
  {
    before: { jobTitle: 'Developer' },
    after: { jobTitle: 'Senior Developer' }
  },
  req
);
```

---

### 10.3 Rate Limiting

**Role-Based Rate Limits:**

```javascript
const rateLimit = require('express-rate-limit');

// Standard rate limit for regular users
const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later.'
});

// Stricter limit for sensitive operations
const sensitiveOpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many requests for this operation, please try again later.'
});

// Apply to routes
app.use('/api/v1/', standardLimiter);
app.use('/api/v1/tenants/:tenantId/employees', sensitiveOpLimiter);
app.use('/api/v1/tenants/:tenantId/users', sensitiveOpLimiter);
```

---

### 10.4 JWT Security

**Token Structure:**

```javascript
const token = jwt.sign(
  {
    userId: user.id,
    tenantId: tenant.id,
    role: tenantUser.role,
    employeeId: tenantUser.employee_id,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
  },
  process.env.JWT_SECRET,
  { algorithm: 'HS256' }
);
```

**Token Validation:**

```javascript
function validateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const token = authHeader.replace('Bearer ', '');
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check if token is blacklisted (for logout)
    const isBlacklisted = await redis.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    req.auth = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

### 10.5 Multi-Factor Authentication

**MFA Enforcement:**

```javascript
// Enforce MFA for platform owners
async function requireMFA(req, res, next) {
  const { userId } = req.auth;
  
  const user = await db.query(
    'SELECT mfa_enabled FROM users WHERE id = $1',
    [userId]
  );
  
  if (!user.rows[0].mfa_enabled) {
    // Check if user is platform owner
    const isPlatformOwner = await db.query(
      'SELECT 1 FROM platform_roles WHERE user_id = $1',
      [userId]
    );
    
    if (isPlatformOwner.rows.length > 0) {
      return res.status(403).json({ 
        error: 'MFA required',
        message: 'Platform owners must enable multi-factor authentication' 
      });
    }
  }
  
  next();
}
```

---

## Conclusion

This permissions document provides a comprehensive reference for Torre Tempo's role-based access control system. All developers implementing authorization logic should refer to this document to ensure consistent and secure permission enforcement across the application.

**Key Takeaways:**

1. **Always validate permissions** at the API layer before processing requests
2. **Use role-based middleware** to enforce access control
3. **Apply scope filtering** for managers (team-only access)
4. **Log all permission-based actions** in the audit trail
5. **Never trust client input** - always validate on the server
6. **Prevent privilege escalation** by restricting role changes
7. **Enforce MFA** for platform owners and sensitive operations

For questions or clarifications about permissions, refer to the spec.md document or contact the development team.

---

**Document Version:** 1.0  
**Last Updated:** February 1, 2026  
**Maintained By:** Torre Tempo Development Team
