# Torre Tempo - API Contract

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Final API Specification  
**Base URL:** `https://time.lsltgroup.es/t/{tenantSlug}/api/v1` or `https://time.lsltapps.com/t/{tenantSlug}/api/v1`

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Common Patterns](#3-common-patterns)
4. [Error Handling](#4-error-handling)
5. [Authentication Endpoints](#5-authentication-endpoints)
6. [Tenant Endpoints](#6-tenant-endpoints)
7. [Employee Endpoints](#7-employee-endpoints)
8. [Time Entry Endpoints](#8-time-entry-endpoints)
9. [Leave Request Endpoints](#9-leave-request-endpoints)
10. [Department Endpoints](#10-department-endpoints)
11. [Project Endpoints](#11-project-endpoints)
12. [Report Endpoints](#12-report-endpoints)
13. [User Management Endpoints](#13-user-management-endpoints)
14. [Audit Log Endpoints](#14-audit-log-endpoints)
15. [Data Models](#15-data-models)

---

## 1. Overview

### 1.1 API Design Principles

- **RESTful Architecture:** Resource-based URLs with standard HTTP methods
- **Versioned:** All endpoints prefixed with `/api/v1` for future compatibility
- **Tenant-Scoped:** Multi-tenant isolation via path segment (`/t/{tenantSlug}/`) or JWT context
- **JSON Payloads:** All requests and responses use `application/json`
- **Pagination:** List endpoints support pagination with `page` and `limit` parameters
- **Filtering:** Query parameters for filtering results
- **Sorting:** Support for `sort` and `order` parameters

### 1.2 Base URL Structure

```
https://time.lsltgroup.es/t/{tenantSlug}/api/v1/{resource}
```

**Example:**
```
https://time.lsltgroup.es/t/acme/api/v1/employees
```

**Alternative Domain:**
```
https://time.lsltapps.com/t/acme/api/v1/employees
```

### 1.3 HTTP Methods

| Method | Usage |
|--------|-------|
| `GET` | Retrieve resource(s) |
| `POST` | Create new resource |
| `PATCH` | Partial update of resource |
| `DELETE` | Delete resource (soft delete) |

### 1.4 Content Types

**Request:**
```
Content-Type: application/json
```

**Response:**
```
Content-Type: application/json
```

---

## 2. Authentication

### 2.1 JWT Authentication

All API requests (except authentication endpoints) require a valid JWT token in the `Authorization` header.

**Header Format:**
```
Authorization: Bearer {jwt_token}
```

**Token Structure:**
```json
{
  "userId": "uuid",
  "tenantId": "uuid",
  "role": "admin|hr|manager|employee|accountant",
  "employeeId": "uuid",
  "iat": 1738425600,
  "exp": 1738429200
}
```

**Token Expiration:**
- Access Token: 1 hour
- Refresh Token: 7 days

### 2.2 Authorization

Authorization is role-based. Each endpoint specifies required roles in its documentation.

**Roles:**
- `platform_owner` - Platform administrator (cross-tenant access)
- `admin` - Tenant administrator (full tenant access)
- `hr` - HR manager (employee management, reporting)
- `manager` - Team manager (team-scoped access)
- `employee` - Regular employee (self-service only)
- `accountant` - Read-only financial access

### 2.3 Tenant Context

Tenant context is extracted from:
1. **Path Segment:** `/t/{tenantSlug}/` in the URL path
2. **JWT Token:** `tenantId` claim

**Path-Based Routing:**
- Format: `https://time.lsltgroup.es/t/{tenantSlug}/api/v1/{resource}`
- Example: `https://time.lsltgroup.es/t/acme/api/v1/employees`
- The `tenantSlug` is extracted from the URL path and used to identify the tenant

All API operations are automatically scoped to the authenticated user's tenant.

---

## 3. Common Patterns

### 3.1 Pagination

**Query Parameters:**
```
?page=1&limit=50
```

**Default Values:**
- `page`: 1
- `limit`: 50
- `max limit`: 100

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 250,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3.2 Filtering

**Query Parameters:**
```
?status=active&department=uuid&search=john
```

Common filters:
- `status` - Filter by status field
- `department` - Filter by department ID
- `search` - Full-text search across relevant fields
- `startDate` / `endDate` - Date range filtering

### 3.3 Sorting

**Query Parameters:**
```
?sort=createdAt&order=desc
```

**Values:**
- `sort`: Field name to sort by
- `order`: `asc` or `desc` (default: `asc`)

### 3.4 Field Selection

**Query Parameters:**
```
?fields=id,firstName,lastName,email
```

Returns only specified fields (reduces payload size).

### 3.5 Timestamps

All timestamps are in ISO 8601 format with UTC timezone:
```
2026-02-01T09:00:00Z
```

### 3.6 UUIDs

All resource IDs are UUIDs (v4):
```
550e8400-e29b-41d4-a716-446655440000
```

---

## 4. Error Handling

### 4.1 HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| `200` | OK | Successful GET, PATCH |
| `201` | Created | Successful POST |
| `204` | No Content | Successful DELETE |
| `400` | Bad Request | Invalid request data |
| `401` | Unauthorized | Missing or invalid authentication |
| `403` | Forbidden | Insufficient permissions |
| `404` | Not Found | Resource not found |
| `409` | Conflict | Resource conflict (e.g., duplicate) |
| `422` | Unprocessable Entity | Validation error |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Server error |

### 4.2 Error Response Format

```json
{
  "error": "Error type",
  "message": "Human-readable error message",
  "details": {
    "field": "Specific field error"
  },
  "code": "ERROR_CODE",
  "timestamp": "2026-02-01T09:00:00Z"
}
```

### 4.3 Validation Errors

**Status Code:** `422 Unprocessable Entity`

```json
{
  "error": "Validation Error",
  "message": "Request validation failed",
  "details": {
    "email": "Invalid email format",
    "hireDate": "Hire date cannot be in the future"
  },
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-02-01T09:00:00Z"
}
```

### 4.4 Common Error Codes

| Code | Description |
|------|-------------|
| `UNAUTHORIZED` | Authentication required |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `VALIDATION_ERROR` | Request validation failed |
| `DUPLICATE_RESOURCE` | Resource already exists |
| `CONFLICT` | Operation conflicts with current state |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

---

## 5. Authentication Endpoints

### 5.1 Register Tenant

Create a new tenant account (self-service registration).

**Endpoint:** `POST /api/v1/auth/register`

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "companyName": "Acme Corporation",
  "email": "admin@acme.com",
  "password": "SecurePassword123!",
  "taxId": "B12345678",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+34 600 123 456"
}
```

**Validation Rules:**
- `companyName`: Required, 3-255 characters
- `email`: Required, valid email format, unique
- `password`: Required, min 12 characters, must include uppercase, lowercase, number, special character
- `taxId`: Optional, valid Spanish CIF/NIF format
- `firstName`: Required, 1-100 characters
- `lastName`: Required, 1-100 characters
- `phone`: Optional, valid phone format

**Response:** `201 Created`
```json
{
  "tenant": {
    "id": "tenant-uuid",
    "slug": "acme-corporation",
    "legalName": "Acme Corporation",
    "email": "admin@acme.com",
    "subscriptionStatus": "trial",
    "createdAt": "2026-02-01T09:00:00Z"
  },
  "user": {
    "id": "user-uuid",
    "email": "admin@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin"
  },
  "message": "Tenant created successfully. Please verify your email address."
}
```

**Errors:**
- `409 Conflict` - Email already registered
- `422 Validation Error` - Invalid request data

---

### 5.2 Login

Authenticate user and receive JWT tokens.

**Endpoint:** `POST /api/v1/auth/login`

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "email": "admin@acme.com",
  "password": "SecurePassword123!",
  "tenantSlug": "acme-corporation"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `password`: Required
- `tenantSlug`: Optional (required if user belongs to multiple tenants)

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user-uuid",
    "email": "admin@acme.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "admin",
    "tenantId": "tenant-uuid",
    "tenantSlug": "acme-corporation"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account locked or inactive
- `400 Bad Request` - Multiple tenants found, tenantSlug required

---

### 5.3 Logout

Invalidate current JWT token.

**Endpoint:** `POST /api/v1/auth/logout`

**Authentication:** Required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### 5.4 Refresh Token

Obtain a new access token using refresh token.

**Endpoint:** `POST /api/v1/auth/refresh`

**Authentication:** None (uses refresh token)

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600
}
```

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

### 5.5 Forgot Password

Request password reset email.

**Endpoint:** `POST /api/v1/auth/forgot-password`

**Authentication:** None (public endpoint)

**Request Body:**
```json
{
  "email": "admin@acme.com"
}
```

**Response:** `200 OK`
```json
{
  "message": "If an account exists with this email, a password reset link has been sent."
}
```

**Note:** Always returns success to prevent email enumeration.

---

### 5.6 Reset Password

Reset password using token from email.

**Endpoint:** `POST /api/v1/auth/reset-password`

**Authentication:** None (uses reset token)

**Request Body:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Validation Rules:**
- `token`: Required, valid reset token
- `newPassword`: Required, min 12 characters, must include uppercase, lowercase, number, special character

**Response:** `200 OK`
```json
{
  "message": "Password reset successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid or expired token
- `422 Validation Error` - Password does not meet requirements

---

### 5.7 Verify Email

Verify email address using token from email.

**Endpoint:** `POST /api/v1/auth/verify-email`

**Authentication:** None (uses verification token)

**Request Body:**
```json
{
  "token": "verification-token-from-email"
}
```

**Response:** `200 OK`
```json
{
  "message": "Email verified successfully"
}
```

**Errors:**
- `400 Bad Request` - Invalid or expired token

---

### 5.8 Enable MFA

Enable multi-factor authentication for user account.

**Endpoint:** `POST /api/v1/auth/mfa/enable`

**Authentication:** Required

**Request Body:** None

**Response:** `200 OK`
```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "backupCodes": [
    "12345678",
    "87654321",
    "11223344"
  ]
}
```

**Note:** User must verify MFA code before it's fully enabled.

---

### 5.9 Verify MFA

Verify MFA code to complete MFA setup or during login.

**Endpoint:** `POST /api/v1/auth/mfa/verify`

**Authentication:** Required (or partial auth during login)

**Request Body:**
```json
{
  "code": "123456"
}
```

**Response:** `200 OK`
```json
{
  "message": "MFA verified successfully",
  "mfaEnabled": true
}
```

**Errors:**
- `400 Bad Request` - Invalid MFA code

---

## 6. Tenant Endpoints

### 6.1 List Tenants

List all tenants (platform admin only).

**Endpoint:** `GET /api/v1/tenants`

**Authentication:** Required (platform_owner only)

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 100)
- `status` (string: active, trial, suspended, cancelled)
- `search` (string: search by name or email)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "tenant-uuid",
      "slug": "acme-corporation",
      "legalName": "Acme Corporation",
      "email": "admin@acme.com",
      "subscriptionStatus": "active",
      "subscriptionPlan": "professional",
      "maxEmployees": 100,
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Required Role:** `platform_owner`

---

### 6.2 Create Tenant

Create a new tenant (platform admin only).

**Endpoint:** `POST /api/v1/tenants`

**Authentication:** Required (platform_owner only)

**Request Body:**
```json
{
  "slug": "acme-corporation",
  "legalName": "Acme Corporation",
  "email": "admin@acme.com",
  "taxId": "B12345678",
  "subscriptionPlan": "professional",
  "maxEmployees": 100
}
```

**Response:** `201 Created`
```json
{
  "id": "tenant-uuid",
  "slug": "acme-corporation",
  "legalName": "Acme Corporation",
  "email": "admin@acme.com",
  "subscriptionStatus": "active",
  "subscriptionPlan": "professional",
  "maxEmployees": 100,
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Required Role:** `platform_owner`

---

### 6.3 Get Tenant

Get tenant details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "tenant-uuid",
  "slug": "acme-corporation",
  "legalName": "Acme Corporation",
  "taxId": "B12345678",
  "email": "admin@acme.com",
  "phone": "+34 600 123 456",
  "address": "Calle Mayor 1, Madrid",
  "logoUrl": "https://cdn.torretempo.com/tenants/acme/logo.png",
  "primaryColor": "#0066CC",
  "secondaryColor": "#FF6600",
  "timezone": "Europe/Madrid",
  "locale": "es-ES",
  "currency": "EUR",
  "subscriptionStatus": "active",
  "subscriptionPlan": "professional",
  "maxEmployees": 100,
  "createdAt": "2026-01-01T00:00:00Z",
  "updatedAt": "2026-02-01T09:00:00Z"
}
```

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 6.4 Update Tenant

Update tenant details.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}`

**Authentication:** Required

**Request Body:**
```json
{
  "legalName": "Acme Corporation S.L.",
  "phone": "+34 600 999 888",
  "address": "Calle Nueva 5, Madrid",
  "logoUrl": "https://cdn.torretempo.com/tenants/acme/new-logo.png",
  "primaryColor": "#0066FF"
}
```

**Response:** `200 OK`
```json
{
  "id": "tenant-uuid",
  "slug": "acme-corporation",
  "legalName": "Acme Corporation S.L.",
  "phone": "+34 600 999 888",
  "address": "Calle Nueva 5, Madrid",
  "logoUrl": "https://cdn.torretempo.com/tenants/acme/new-logo.png",
  "primaryColor": "#0066FF",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Required Role:** `admin`

---

### 6.5 Delete Tenant

Soft delete a tenant (platform admin only).

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}`

**Authentication:** Required (platform_owner only)

**Response:** `204 No Content`

**Required Role:** `platform_owner`

---

### 6.6 Get Tenant Settings

Get tenant configuration settings.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/settings`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "workHours": {
    "standardHoursPerDay": 8,
    "standardHoursPerWeek": 40,
    "overtimeThreshold": "daily",
    "overtimeRate": 1.5
  },
  "breaks": {
    "autoDeduct": true,
    "breakMinutes": 30,
    "breakAfterHours": 6
  },
  "validation": {
    "maxHoursPerDay": 12,
    "allowOverlapping": false,
    "requireApproval": true
  },
  "compliance": {
    "jurisdiction": "ES",
    "retentionYears": 4,
    "digitalSignature": false
  },
  "branding": {
    "companyName": "Acme Corp",
    "showTorreTempoLogo": true
  }
}
```

**Required Role:** `admin`

---

### 6.7 Update Tenant Settings

Update tenant configuration settings.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/settings`

**Authentication:** Required

**Request Body:**
```json
{
  "workHours": {
    "standardHoursPerDay": 7.5,
    "overtimeRate": 1.75
  },
  "breaks": {
    "breakMinutes": 45
  }
}
```

**Response:** `200 OK`
```json
{
  "workHours": {
    "standardHoursPerDay": 7.5,
    "standardHoursPerWeek": 40,
    "overtimeThreshold": "daily",
    "overtimeRate": 1.75
  },
  "breaks": {
    "autoDeduct": true,
    "breakMinutes": 45,
    "breakAfterHours": 6
  },
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Required Role:** `admin`

---

## 7. Employee Endpoints

### 7.1 List Employees

List employees with role-based filtering.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/employees`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50, max: 100)
- `status` (string: active, inactive, terminated)
- `department` (uuid: filter by department ID)
- `search` (string: search by name or email)
- `sort` (string: field to sort by)
- `order` (string: asc or desc)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "employee-uuid",
      "employeeNumber": "EMP001",
      "firstName": "Juan",
      "lastName": "García",
      "email": "juan.garcia@acme.com",
      "phone": "+34 600 111 222",
      "hireDate": "2025-01-15",
      "jobTitle": "Software Developer",
      "departmentId": "dept-uuid",
      "departmentName": "Engineering",
      "contractType": "permanent",
      "employmentStatus": "active",
      "workSchedule": "full-time",
      "hoursPerWeek": 40.00,
      "managerId": "manager-uuid",
      "managerName": "María López",
      "profilePhotoUrl": "https://cdn.torretempo.com/employees/juan.jpg",
      "createdAt": "2025-01-10T09:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 85,
    "totalPages": 2,
    "hasNext": true,
    "hasPrev": false
  }
}
```

**Role-Based Filtering:**
- `admin`, `hr`, `accountant`: See all employees
- `manager`: See only direct reports (where `managerId` matches their employee profile)
- `employee`: Cannot list employees (403 Forbidden)

**Required Role:** `admin`, `hr`, `manager`, `accountant`

---

### 7.2 Create Employee

Create a new employee profile.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/employees`

**Authentication:** Required

**Request Body:**
```json
{
  "employeeNumber": "EMP002",
  "firstName": "María",
  "lastName": "López",
  "email": "maria.lopez@acme.com",
  "phone": "+34 600 222 333",
  "mobile": "+34 600 222 444",
  "hireDate": "2026-02-01",
  "jobTitle": "Engineering Manager",
  "departmentId": "dept-uuid",
  "contractType": "permanent",
  "employmentStatus": "active",
  "workSchedule": "full-time",
  "hoursPerWeek": 40.00,
  "managerId": "manager-uuid",
  "nationalId": "12345678A",
  "socialSecurityNumber": "123456789012",
  "dateOfBirth": "1985-05-15",
  "address": "Calle Principal 10",
  "city": "Madrid",
  "postalCode": "28001",
  "country": "ES"
}
```

**Validation Rules:**
- `employeeNumber`: Required, unique per tenant, 1-50 characters
- `firstName`: Required, 1-100 characters
- `lastName`: Required, 1-100 characters
- `email`: Required, valid email, unique per tenant
- `hireDate`: Required, cannot be in future
- `jobTitle`: Required, 1-100 characters
- `departmentId`: Required, must exist
- `contractType`: Required, one of: permanent, temporary, contractor
- `employmentStatus`: Optional, default: active
- `workSchedule`: Optional, default: full-time
- `hoursPerWeek`: Optional, default: 40.00

**Response:** `201 Created`
```json
{
  "id": "employee-uuid",
  "employeeNumber": "EMP002",
  "firstName": "María",
  "lastName": "López",
  "email": "maria.lopez@acme.com",
  "hireDate": "2026-02-01",
  "jobTitle": "Engineering Manager",
  "departmentId": "dept-uuid",
  "contractType": "permanent",
  "employmentStatus": "active",
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Errors:**
- `409 Conflict` - Employee number or email already exists
- `422 Validation Error` - Invalid request data
- `404 Not Found` - Department not found

**Required Role:** `admin`, `hr`

---

### 7.3 Get Employee

Get employee details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/employees/{employeeId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "employee-uuid",
  "employeeNumber": "EMP001",
  "firstName": "Juan",
  "lastName": "García",
  "email": "juan.garcia@acme.com",
  "phone": "+34 600 111 222",
  "mobile": "+34 600 111 333",
  "hireDate": "2025-01-15",
  "jobTitle": "Software Developer",
  "departmentId": "dept-uuid",
  "departmentName": "Engineering",
  "contractType": "permanent",
  "employmentStatus": "active",
  "workSchedule": "full-time",
  "hoursPerWeek": 40.00,
  "managerId": "manager-uuid",
  "managerName": "María López",
  "nationalId": "12345678A",
  "socialSecurityNumber": "123456789012",
  "taxId": "12345678A",
  "dateOfBirth": "1990-03-20",
  "nationality": "ES",
  "address": "Calle Principal 10",
  "city": "Madrid",
  "postalCode": "28001",
  "country": "ES",
  "costCenter": "ENG-001",
  "profilePhotoUrl": "https://cdn.torretempo.com/employees/juan.jpg",
  "notes": "Excellent developer",
  "metadata": {
    "customFields": {
      "emergencyContact": {
        "name": "Ana García",
        "phone": "+34 600 999 888"
      }
    }
  },
  "createdAt": "2025-01-10T09:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Role-Based Access:**
- `admin`, `hr`, `accountant`: See all fields for all employees
- `manager`: See all fields for team members only
- `employee`: See own profile only (limited fields)

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 7.4 Update Employee

Update employee profile.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/employees/{employeeId}`

**Authentication:** Required

**Request Body:**
```json
{
  "jobTitle": "Senior Software Developer",
  "departmentId": "new-dept-uuid",
  "phone": "+34 600 111 999",
  "notes": "Promoted to senior developer"
}
```

**Response:** `200 OK`
```json
{
  "id": "employee-uuid",
  "employeeNumber": "EMP001",
  "firstName": "Juan",
  "lastName": "García",
  "jobTitle": "Senior Software Developer",
  "departmentId": "new-dept-uuid",
  "phone": "+34 600 111 999",
  "notes": "Promoted to senior developer",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Field-Level Permissions:**
- `admin`, `hr`: Can edit all fields
- `manager`: Can edit limited fields (jobTitle, departmentId, notes) for team members only
- `employee`: Cannot edit own profile (must request via HR)

**Required Role:** `admin`, `hr`, `manager` (team only)

---

### 7.5 Delete Employee

Soft delete an employee.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/employees/{employeeId}`

**Authentication:** Required

**Response:** `204 No Content`

**Note:** This is a soft delete. The employee record is marked as deleted but retained in the database for audit purposes.

**Required Role:** `admin`, `hr`

---

### 7.6 Import Employees

Bulk import employees from CSV.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/employees/import`

**Authentication:** Required

**Request:** `multipart/form-data`
```
Content-Type: multipart/form-data

file: employees.csv
```

**CSV Format:**
```csv
employeeNumber,firstName,lastName,email,hireDate,jobTitle,departmentCode,contractType
EMP001,Juan,García,juan@acme.com,2025-01-15,Developer,ENG,permanent
EMP002,María,López,maria@acme.com,2025-02-01,Manager,ENG,permanent
```

**Response:** `200 OK`
```json
{
  "imported": 2,
  "failed": 0,
  "errors": [],
  "employees": [
    {
      "id": "employee-uuid-1",
      "employeeNumber": "EMP001",
      "firstName": "Juan",
      "lastName": "García"
    },
    {
      "id": "employee-uuid-2",
      "employeeNumber": "EMP002",
      "firstName": "María",
      "lastName": "López"
    }
  ]
}
```

**Errors:**
```json
{
  "imported": 1,
  "failed": 1,
  "errors": [
    {
      "row": 2,
      "employeeNumber": "EMP002",
      "error": "Email already exists"
    }
  ]
}
```

**Required Role:** `admin`, `hr`

---

### 7.7 Get Employee Audit History

Get audit trail for employee profile changes.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/employees/{employeeId}/history`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "audit-uuid",
      "action": "update",
      "userId": "user-uuid",
      "userName": "Admin User",
      "changes": {
        "jobTitle": {
          "before": "Developer",
          "after": "Senior Developer"
        }
      },
      "ipAddress": "192.168.1.1",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

**Required Role:** `admin`, `hr`, `manager` (team only)

---

## 8. Time Entry Endpoints

### 8.1 List Time Entries

List time entries with role-based filtering.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/time-entries`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `employeeId` (uuid: filter by employee)
- `startDate` (date: YYYY-MM-DD)
- `endDate` (date: YYYY-MM-DD)
- `status` (string: pending, approved, rejected)
- `projectId` (uuid: filter by project)
- `sort` (string: field to sort by)
- `order` (string: asc or desc)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "entry-uuid",
      "employeeId": "employee-uuid",
      "employeeName": "Juan García",
      "clockIn": "2026-02-01T09:00:00Z",
      "clockOut": "2026-02-01T17:30:00Z",
      "breakMinutes": 30,
      "totalHours": 8.0,
      "overtimeHours": 0,
      "projectId": "project-uuid",
      "projectName": "Client Portal",
      "taskDescription": "Implemented user authentication",
      "status": "approved",
      "approvedBy": "manager-uuid",
      "approvedByName": "María López",
      "approvedAt": "2026-02-02T09:00:00Z",
      "clockInLocation": {
        "lat": 40.4168,
        "lon": -3.7038
      },
      "clockInIp": "192.168.1.100",
      "createdAt": "2026-02-01T09:00:00Z",
      "updatedAt": "2026-02-02T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 120,
    "totalPages": 3
  }
}
```

**Role-Based Filtering:**
- `admin`, `hr`, `accountant`: See all time entries
- `manager`: See only team members' entries
- `employee`: See only own entries

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 8.2 Create Time Entry (Clock In)

Create a new time entry (clock in).

**Endpoint:** `POST /api/v1/tenants/{tenantId}/time-entries`

**Authentication:** Required

**Request Body:**
```json
{
  "employeeId": "employee-uuid",
  "clockIn": "2026-02-01T09:00:00Z",
  "projectId": "project-uuid",
  "taskDescription": "Working on client portal",
  "location": {
    "lat": 40.4168,
    "lon": -3.7038
  }
}
```

**Validation Rules:**
- `employeeId`: Required (auto-filled for employees, required for admin/hr creating on behalf)
- `clockIn`: Optional (defaults to current timestamp)
- `projectId`: Optional
- `taskDescription`: Optional, max 1000 characters
- `location`: Optional (GPS coordinates)

**Business Rules:**
- Cannot clock in if already clocked in (active entry exists)
- Cannot clock in in the future
- Geolocation is optional but recommended for mobile apps

**Response:** `201 Created`
```json
{
  "id": "entry-uuid",
  "employeeId": "employee-uuid",
  "clockIn": "2026-02-01T09:00:00Z",
  "clockOut": null,
  "breakMinutes": 0,
  "totalHours": null,
  "overtimeHours": 0,
  "projectId": "project-uuid",
  "taskDescription": "Working on client portal",
  "status": "pending",
  "clockInLocation": {
    "lat": 40.4168,
    "lon": -3.7038
  },
  "clockInIp": "192.168.1.100",
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Errors:**
- `400 Bad Request` - Already clocked in
- `422 Validation Error` - Invalid data

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only)

---

### 8.3 Get Time Entry

Get time entry details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/time-entries/{entryId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "entry-uuid",
  "employeeId": "employee-uuid",
  "employeeName": "Juan García",
  "clockIn": "2026-02-01T09:00:00Z",
  "clockOut": "2026-02-01T17:30:00Z",
  "breakMinutes": 30,
  "totalHours": 8.0,
  "overtimeHours": 0,
  "projectId": "project-uuid",
  "projectName": "Client Portal",
  "taskDescription": "Implemented user authentication",
  "status": "approved",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-02T09:00:00Z",
  "rejectionReason": null,
  "clockInLocation": {
    "lat": 40.4168,
    "lon": -3.7038
  },
  "clockOutLocation": {
    "lat": 40.4168,
    "lon": -3.7038
  },
  "clockInIp": "192.168.1.100",
  "clockOutIp": "192.168.1.100",
  "createdBy": "user-uuid",
  "createdAt": "2026-02-01T09:00:00Z",
  "updatedAt": "2026-02-02T09:00:00Z"
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 8.4 Update Time Entry (Clock Out / Edit)

Update a time entry (clock out or edit).

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/time-entries/{entryId}`

**Authentication:** Required

**Request Body (Clock Out):**
```json
{
  "clockOut": "2026-02-01T17:30:00Z",
  "location": {
    "lat": 40.4168,
    "lon": -3.7038
  }
}
```

**Request Body (Edit):**
```json
{
  "clockIn": "2026-02-01T09:15:00Z",
  "clockOut": "2026-02-01T17:45:00Z",
  "breakMinutes": 45,
  "taskDescription": "Updated task description"
}
```

**Validation Rules:**
- `clockOut`: Must be after `clockIn`
- `breakMinutes`: Must be >= 0
- Cannot edit entries older than 24 hours (employee role)
- Admin/HR/Manager can edit any entry within scope

**Business Rules:**
- Automatic break deduction if configured in tenant settings
- Overtime calculation based on tenant settings
- Total hours calculated automatically

**Response:** `200 OK`
```json
{
  "id": "entry-uuid",
  "employeeId": "employee-uuid",
  "clockIn": "2026-02-01T09:15:00Z",
  "clockOut": "2026-02-01T17:45:00Z",
  "breakMinutes": 45,
  "totalHours": 7.75,
  "overtimeHours": 0,
  "status": "pending",
  "updatedAt": "2026-02-01T17:45:00Z"
}
```

**Errors:**
- `400 Bad Request` - Invalid time range
- `403 Forbidden` - Cannot edit entry (>24h for employee)
- `422 Validation Error` - Validation failed

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only, <24h)

---

### 8.5 Delete Time Entry

Soft delete a time entry.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/time-entries/{entryId}`

**Authentication:** Required

**Response:** `204 No Content`

**Note:** Soft delete only. Entry is retained for audit purposes.

**Required Role:** `admin`, `hr`

---

### 8.6 Approve Time Entry

Approve a pending time entry.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/time-entries/{entryId}/approve`

**Authentication:** Required

**Request Body:** None

**Response:** `200 OK`
```json
{
  "id": "entry-uuid",
  "status": "approved",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-02T09:00:00Z"
}
```

**Business Rules:**
- Cannot approve own entries
- Managers can only approve team members' entries
- Admin/HR can approve any entry

**Errors:**
- `400 Bad Request` - Entry already approved
- `403 Forbidden` - Cannot approve own entry or not team member

**Required Role:** `admin`, `hr`, `manager` (team only)

---

### 8.7 Reject Time Entry

Reject a pending time entry.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/time-entries/{entryId}/reject`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Incorrect hours logged. Please verify and resubmit."
}
```

**Validation Rules:**
- `reason`: Required, 1-500 characters

**Response:** `200 OK`
```json
{
  "id": "entry-uuid",
  "status": "rejected",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-02T09:00:00Z",
  "rejectionReason": "Incorrect hours logged. Please verify and resubmit."
}
```

**Required Role:** `admin`, `hr`, `manager` (team only)

---

### 8.8 Get Active Time Entry

Get currently active time entry (clocked in, not clocked out).

**Endpoint:** `GET /api/v1/tenants/{tenantId}/time-entries/active`

**Authentication:** Required

**Query Parameters:**
- `employeeId` (uuid: optional, defaults to authenticated user's employee profile)

**Response:** `200 OK`
```json
{
  "id": "entry-uuid",
  "employeeId": "employee-uuid",
  "clockIn": "2026-02-01T09:00:00Z",
  "clockOut": null,
  "projectId": "project-uuid",
  "taskDescription": "Working on client portal",
  "status": "pending",
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Response (No Active Entry):** `404 Not Found`
```json
{
  "error": "Not Found",
  "message": "No active time entry found"
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only)

---

## 9. Leave Request Endpoints

### 9.1 List Leave Requests

List leave requests with role-based filtering.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/leave-requests`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `employeeId` (uuid: filter by employee)
- `startDate` (date: YYYY-MM-DD)
- `endDate` (date: YYYY-MM-DD)
- `status` (string: pending, approved, rejected, cancelled)
- `leaveType` (string: vacation, sick, personal, maternity, paternity, unpaid)
- `sort` (string: field to sort by)
- `order` (string: asc or desc)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "leave-uuid",
      "employeeId": "employee-uuid",
      "employeeName": "Juan García",
      "leaveType": "vacation",
      "startDate": "2026-03-01",
      "endDate": "2026-03-05",
      "totalDays": 5,
      "reason": "Family vacation",
      "status": "approved",
      "approvedBy": "manager-uuid",
      "approvedByName": "María López",
      "approvedAt": "2026-02-15T10:00:00Z",
      "rejectionReason": null,
      "createdAt": "2026-02-10T09:00:00Z",
      "updatedAt": "2026-02-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 25,
    "totalPages": 1
  }
}
```

**Role-Based Filtering:**
- `admin`, `hr`, `accountant`: See all leave requests
- `manager`: See only team members' requests
- `employee`: See only own requests

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 9.2 Create Leave Request

Create a new leave request.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/leave-requests`

**Authentication:** Required

**Request Body:**
```json
{
  "employeeId": "employee-uuid",
  "leaveType": "vacation",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05",
  "reason": "Family vacation"
}
```

**Validation Rules:**
- `employeeId`: Required (auto-filled for employees)
- `leaveType`: Required, one of: vacation, sick, personal, maternity, paternity, unpaid
- `startDate`: Required, cannot be in the past
- `endDate`: Required, must be >= startDate
- `reason`: Optional, max 500 characters

**Business Rules:**
- Total days calculated automatically (excluding weekends)
- Cannot overlap with existing approved leave
- Status defaults to 'pending'

**Response:** `201 Created`
```json
{
  "id": "leave-uuid",
  "employeeId": "employee-uuid",
  "leaveType": "vacation",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05",
  "totalDays": 5,
  "reason": "Family vacation",
  "status": "pending",
  "createdAt": "2026-02-10T09:00:00Z"
}
```

**Errors:**
- `409 Conflict` - Overlapping leave request exists
- `422 Validation Error` - Invalid data

**Required Role:** `admin`, `hr`, `manager`, `employee`

---

### 9.3 Get Leave Request

Get leave request details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/leave-requests/{requestId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "leave-uuid",
  "employeeId": "employee-uuid",
  "employeeName": "Juan García",
  "leaveType": "vacation",
  "startDate": "2026-03-01",
  "endDate": "2026-03-05",
  "totalDays": 5,
  "reason": "Family vacation",
  "status": "approved",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-15T10:00:00Z",
  "rejectionReason": null,
  "createdAt": "2026-02-10T09:00:00Z",
  "updatedAt": "2026-02-15T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 9.4 Update Leave Request

Update a pending leave request.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/leave-requests/{requestId}`

**Authentication:** Required

**Request Body:**
```json
{
  "startDate": "2026-03-02",
  "endDate": "2026-03-06",
  "reason": "Updated vacation dates"
}
```

**Business Rules:**
- Employees can only edit pending requests
- Admin/HR can edit any request
- Approved requests can only be modified by admin/HR

**Response:** `200 OK`
```json
{
  "id": "leave-uuid",
  "startDate": "2026-03-02",
  "endDate": "2026-03-06",
  "totalDays": 5,
  "reason": "Updated vacation dates",
  "updatedAt": "2026-02-11T10:00:00Z"
}
```

**Errors:**
- `403 Forbidden` - Cannot edit approved request (employee role)
- `422 Validation Error` - Invalid data

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own pending only)

---

### 9.5 Cancel Leave Request

Cancel a leave request.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/leave-requests/{requestId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "leave-uuid",
  "status": "cancelled",
  "updatedAt": "2026-02-11T10:00:00Z"
}
```

**Business Rules:**
- Employees can only cancel pending requests
- Admin/HR can cancel any request
- Cancelled requests are soft deleted (status = 'cancelled')

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own pending only)

---

### 9.6 Approve Leave Request

Approve a pending leave request.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/leave-requests/{requestId}/approve`

**Authentication:** Required

**Request Body:** None

**Response:** `200 OK`
```json
{
  "id": "leave-uuid",
  "status": "approved",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-15T10:00:00Z"
}
```

**Business Rules:**
- Cannot approve own requests
- Managers can only approve team members' requests
- Admin/HR can approve any request

**Errors:**
- `400 Bad Request` - Request already approved
- `403 Forbidden` - Cannot approve own request

**Required Role:** `admin`, `hr`, `manager` (team only)

---

### 9.7 Reject Leave Request

Reject a pending leave request.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/leave-requests/{requestId}/reject`

**Authentication:** Required

**Request Body:**
```json
{
  "reason": "Insufficient leave balance"
}
```

**Validation Rules:**
- `reason`: Required, 1-500 characters

**Response:** `200 OK`
```json
{
  "id": "leave-uuid",
  "status": "rejected",
  "approvedBy": "manager-uuid",
  "approvedByName": "María López",
  "approvedAt": "2026-02-15T10:00:00Z",
  "rejectionReason": "Insufficient leave balance"
}
```

**Required Role:** `admin`, `hr`, `manager` (team only)

---

## 10. Department Endpoints

### 10.1 List Departments

List all departments.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/departments`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `search` (string: search by name or code)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "dept-uuid",
      "name": "Engineering",
      "code": "ENG",
      "managerId": "manager-uuid",
      "managerName": "María López",
      "parentDepartmentId": null,
      "employeeCount": 25,
      "createdAt": "2025-01-01T00:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 8,
    "totalPages": 1
  }
}
```

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 10.2 Create Department

Create a new department.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/departments`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Marketing",
  "code": "MKT",
  "managerId": "manager-uuid",
  "parentDepartmentId": null
}
```

**Validation Rules:**
- `name`: Required, 1-100 characters
- `code`: Optional, unique per tenant, 1-50 characters
- `managerId`: Optional, must be valid employee ID
- `parentDepartmentId`: Optional, must be valid department ID

**Response:** `201 Created`
```json
{
  "id": "dept-uuid",
  "name": "Marketing",
  "code": "MKT",
  "managerId": "manager-uuid",
  "parentDepartmentId": null,
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Errors:**
- `409 Conflict` - Department code already exists
- `404 Not Found` - Manager or parent department not found

**Required Role:** `admin`, `hr`

---

### 10.3 Get Department

Get department details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/departments/{departmentId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "dept-uuid",
  "name": "Engineering",
  "code": "ENG",
  "managerId": "manager-uuid",
  "managerName": "María López",
  "parentDepartmentId": null,
  "employeeCount": 25,
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 10.4 Update Department

Update department details.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/departments/{departmentId}`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Engineering & Technology",
  "managerId": "new-manager-uuid"
}
```

**Response:** `200 OK`
```json
{
  "id": "dept-uuid",
  "name": "Engineering & Technology",
  "managerId": "new-manager-uuid",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`

---

### 10.5 Delete Department

Soft delete a department.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/departments/{departmentId}`

**Authentication:** Required

**Response:** `204 No Content`

**Business Rules:**
- Cannot delete department with active employees
- Must reassign employees to another department first

**Errors:**
- `409 Conflict` - Department has active employees

**Required Role:** `admin`, `hr`

---

## 11. Project Endpoints

### 11.1 List Projects

List all projects.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/projects`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `status` (string: active, completed, archived)
- `search` (string: search by name or code)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "project-uuid",
      "name": "Client Portal",
      "code": "CP-2026",
      "description": "Customer-facing web portal",
      "clientName": "Acme Client Inc.",
      "status": "active",
      "startDate": "2026-01-01",
      "endDate": "2026-06-30",
      "createdAt": "2025-12-15T00:00:00Z",
      "updatedAt": "2026-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 12,
    "totalPages": 1
  }
}
```

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 11.2 Create Project

Create a new project.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/projects`

**Authentication:** Required

**Request Body:**
```json
{
  "name": "Mobile App",
  "code": "MA-2026",
  "description": "iOS and Android mobile application",
  "clientName": "Internal",
  "status": "active",
  "startDate": "2026-03-01",
  "endDate": "2026-12-31"
}
```

**Validation Rules:**
- `name`: Required, 1-255 characters
- `code`: Optional, unique per tenant, 1-50 characters
- `description`: Optional, max 1000 characters
- `clientName`: Optional, 1-255 characters
- `status`: Optional, default: active
- `startDate`: Optional
- `endDate`: Optional, must be >= startDate

**Response:** `201 Created`
```json
{
  "id": "project-uuid",
  "name": "Mobile App",
  "code": "MA-2026",
  "description": "iOS and Android mobile application",
  "status": "active",
  "startDate": "2026-03-01",
  "endDate": "2026-12-31",
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Required Role:** `admin`, `hr`

---

### 11.3 Get Project

Get project details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/projects/{projectId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "project-uuid",
  "name": "Client Portal",
  "code": "CP-2026",
  "description": "Customer-facing web portal",
  "clientName": "Acme Client Inc.",
  "status": "active",
  "startDate": "2026-01-01",
  "endDate": "2026-06-30",
  "totalHoursLogged": 450.5,
  "createdAt": "2025-12-15T00:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`, `manager`, `employee`, `accountant`

---

### 11.4 Update Project

Update project details.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/projects/{projectId}`

**Authentication:** Required

**Request Body:**
```json
{
  "status": "completed",
  "endDate": "2026-05-31"
}
```

**Response:** `200 OK`
```json
{
  "id": "project-uuid",
  "status": "completed",
  "endDate": "2026-05-31",
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`

---

### 11.5 Delete Project

Soft delete a project.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/projects/{projectId}`

**Authentication:** Required

**Response:** `204 No Content`

**Business Rules:**
- Cannot delete project with time entries
- Must archive project instead

**Errors:**
- `409 Conflict` - Project has time entries

**Required Role:** `admin`, `hr`

---

## 12. Report Endpoints

### 12.1 Daily Attendance Report

Generate daily attendance report.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/attendance`

**Authentication:** Required

**Query Parameters:**
- `date` (date: YYYY-MM-DD, required)
- `departmentId` (uuid: optional)
- `employeeId` (uuid: optional)
- `format` (string: json, pdf, csv, default: json)

**Response (JSON):** `200 OK`
```json
{
  "reportType": "daily_attendance",
  "date": "2026-02-01",
  "generatedAt": "2026-02-02T09:00:00Z",
  "generatedBy": "user-uuid",
  "data": [
    {
      "employeeId": "employee-uuid",
      "employeeNumber": "EMP001",
      "employeeName": "Juan García",
      "department": "Engineering",
      "clockIn": "2026-02-01T09:00:00Z",
      "clockOut": "2026-02-01T17:30:00Z",
      "totalHours": 8.0,
      "breakMinutes": 30,
      "status": "approved"
    }
  ],
  "summary": {
    "totalEmployees": 25,
    "present": 23,
    "absent": 2,
    "totalHours": 184.0
  }
}
```

**Response (PDF):** Binary PDF file

**Response (CSV):** CSV file
```csv
Employee Number,Employee Name,Department,Clock In,Clock Out,Total Hours,Break Minutes,Status
EMP001,Juan García,Engineering,2026-02-01 09:00,2026-02-01 17:30,8.0,30,approved
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 12.2 Weekly/Monthly Timesheet

Generate timesheet report for a date range.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/timesheet`

**Authentication:** Required

**Query Parameters:**
- `startDate` (date: YYYY-MM-DD, required)
- `endDate` (date: YYYY-MM-DD, required)
- `employeeId` (uuid: optional)
- `departmentId` (uuid: optional)
- `format` (string: json, pdf, csv, default: json)

**Response (JSON):** `200 OK`
```json
{
  "reportType": "timesheet",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "generatedAt": "2026-03-01T09:00:00Z",
  "data": [
    {
      "employeeId": "employee-uuid",
      "employeeNumber": "EMP001",
      "employeeName": "Juan García",
      "department": "Engineering",
      "regularHours": 160.0,
      "overtimeHours": 8.0,
      "leaveHours": 0,
      "totalHours": 168.0,
      "daysWorked": 20
    }
  ],
  "summary": {
    "totalEmployees": 25,
    "totalRegularHours": 4000.0,
    "totalOvertimeHours": 120.0,
    "totalHours": 4120.0
  }
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 12.3 Overtime Report

Generate overtime report.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/overtime`

**Authentication:** Required

**Query Parameters:**
- `startDate` (date: YYYY-MM-DD, required)
- `endDate` (date: YYYY-MM-DD, required)
- `employeeId` (uuid: optional)
- `departmentId` (uuid: optional)
- `format` (string: json, pdf, csv, default: json)

**Response (JSON):** `200 OK`
```json
{
  "reportType": "overtime",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "generatedAt": "2026-03-01T09:00:00Z",
  "data": [
    {
      "employeeId": "employee-uuid",
      "employeeNumber": "EMP001",
      "employeeName": "Juan García",
      "department": "Engineering",
      "regularHours": 160.0,
      "overtimeHours": 8.0,
      "overtimeRate": 1.5,
      "overtimeCompensation": 12.0
    }
  ],
  "summary": {
    "totalOvertimeHours": 120.0,
    "totalOvertimeCompensation": 180.0
  }
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 12.4 Leave/Absence Report

Generate leave and absence report.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/leave`

**Authentication:** Required

**Query Parameters:**
- `startDate` (date: YYYY-MM-DD, required)
- `endDate` (date: YYYY-MM-DD, required)
- `employeeId` (uuid: optional)
- `departmentId` (uuid: optional)
- `leaveType` (string: optional)
- `format` (string: json, pdf, csv, default: json)

**Response (JSON):** `200 OK`
```json
{
  "reportType": "leave",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "generatedAt": "2026-03-01T09:00:00Z",
  "data": [
    {
      "employeeId": "employee-uuid",
      "employeeNumber": "EMP001",
      "employeeName": "Juan García",
      "department": "Engineering",
      "leaveType": "vacation",
      "startDate": "2026-02-10",
      "endDate": "2026-02-14",
      "totalDays": 5,
      "status": "approved"
    }
  ],
  "summary": {
    "totalLeaveRequests": 15,
    "totalDays": 75,
    "byType": {
      "vacation": 50,
      "sick": 15,
      "personal": 10
    }
  }
}
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 12.5 Payroll Export

Generate payroll export for integration with payroll systems.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/payroll`

**Authentication:** Required

**Query Parameters:**
- `startDate` (date: YYYY-MM-DD, required)
- `endDate` (date: YYYY-MM-DD, required)
- `departmentId` (uuid: optional)
- `format` (string: csv, json, default: csv)

**Response (CSV):** CSV file
```csv
Employee ID,Employee Number,Employee Name,Regular Hours,Overtime Hours,Leave Hours,Total Hours,Pay Period Start,Pay Period End
employee-uuid,EMP001,Juan García,160.0,8.0,0,168.0,2026-02-01,2026-02-28
```

**Response (JSON):** `200 OK`
```json
{
  "reportType": "payroll",
  "payPeriodStart": "2026-02-01",
  "payPeriodEnd": "2026-02-28",
  "generatedAt": "2026-03-01T09:00:00Z",
  "data": [
    {
      "employeeId": "employee-uuid",
      "employeeNumber": "EMP001",
      "employeeName": "Juan García",
      "regularHours": 160.0,
      "overtimeHours": 8.0,
      "leaveHours": 0,
      "totalHours": 168.0
    }
  ]
}
```

**Required Role:** `admin`, `hr`, `accountant`

---

### 12.6 Compliance Report (Spain)

Generate compliance report for Spanish labor law (Royal Decree 8/2019).

**Endpoint:** `GET /api/v1/tenants/{tenantId}/reports/compliance`

**Authentication:** Required

**Query Parameters:**
- `startDate` (date: YYYY-MM-DD, required)
- `endDate` (date: YYYY-MM-DD, required)
- `employeeId` (uuid: optional)
- `format` (string: pdf, default: pdf)

**Response (PDF):** Binary PDF file formatted for official submission

**PDF Format:**
```
REGISTRO DE JORNADA LABORAL
Empresa: Acme Corporation
CIF: B12345678
Período: 01/02/2026 - 28/02/2026

Empleado: Juan García
DNI/NIE: 12345678A

Fecha       | Entrada  | Salida   | Total Horas
------------|----------|----------|------------
01/02/2026  | 09:00    | 17:30    | 8.0
02/02/2026  | 08:45    | 17:15    | 8.0
...

Firma del Responsable: _______________
Fecha: _______________
```

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

### 12.7 Export Report

Export a report in specified format.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/reports/export`

**Authentication:** Required

**Request Body:**
```json
{
  "reportType": "timesheet",
  "startDate": "2026-02-01",
  "endDate": "2026-02-28",
  "format": "pdf",
  "filters": {
    "departmentId": "dept-uuid",
    "employeeId": "employee-uuid"
  }
}
```

**Validation Rules:**
- `reportType`: Required, one of: attendance, timesheet, overtime, leave, payroll, compliance
- `startDate`: Required for most reports
- `endDate`: Required for most reports
- `format`: Required, one of: json, pdf, csv
- `filters`: Optional, report-specific filters

**Response:** `200 OK`
```json
{
  "exportId": "export-uuid",
  "reportType": "timesheet",
  "format": "pdf",
  "status": "processing",
  "downloadUrl": null,
  "expiresAt": null,
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Note:** Large reports are processed asynchronously. Poll the export status or wait for webhook notification.

**Required Role:** `admin`, `hr`, `manager` (team only), `employee` (own only), `accountant`

---

## 13. User Management Endpoints

### 13.1 List Tenant Users

List users with access to the tenant.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/users`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `role` (string: filter by role)
- `active` (boolean: filter by active status)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "tenant-user-uuid",
      "userId": "user-uuid",
      "email": "admin@acme.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "admin",
      "employeeId": null,
      "active": true,
      "lastLoginAt": "2026-02-01T08:00:00Z",
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 15,
    "totalPages": 1
  }
}
```

**Required Role:** `admin`

---

### 13.2 Invite User

Invite a user to the tenant.

**Endpoint:** `POST /api/v1/tenants/{tenantId}/users`

**Authentication:** Required

**Request Body:**
```json
{
  "email": "newuser@acme.com",
  "role": "manager",
  "employeeId": "employee-uuid"
}
```

**Validation Rules:**
- `email`: Required, valid email format
- `role`: Required, one of: admin, hr, manager, employee, accountant
- `employeeId`: Optional, links user to employee profile

**Response:** `201 Created`
```json
{
  "id": "tenant-user-uuid",
  "userId": "user-uuid",
  "email": "newuser@acme.com",
  "role": "manager",
  "employeeId": "employee-uuid",
  "active": true,
  "invitationSent": true,
  "createdAt": "2026-02-01T09:00:00Z"
}
```

**Business Rules:**
- If user exists in platform, link to tenant
- If user doesn't exist, send invitation email
- User must accept invitation to activate account

**Required Role:** `admin`

---

### 13.3 Get User

Get user details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/users/{userId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "tenant-user-uuid",
  "userId": "user-uuid",
  "email": "admin@acme.com",
  "firstName": "John",
  "lastName": "Doe",
  "phone": "+34 600 123 456",
  "role": "admin",
  "employeeId": null,
  "active": true,
  "mfaEnabled": true,
  "lastLoginAt": "2026-02-01T08:00:00Z",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2026-01-15T10:00:00Z"
}
```

**Required Role:** `admin`

---

### 13.4 Update User Role

Update user's role in the tenant.

**Endpoint:** `PATCH /api/v1/tenants/{tenantId}/users/{userId}`

**Authentication:** Required

**Request Body:**
```json
{
  "role": "hr",
  "active": true
}
```

**Validation Rules:**
- `role`: Optional, one of: admin, hr, manager, employee, accountant
- `active`: Optional, boolean

**Response:** `200 OK`
```json
{
  "id": "tenant-user-uuid",
  "role": "hr",
  "active": true,
  "updatedAt": "2026-02-01T10:00:00Z"
}
```

**Business Rules:**
- Cannot change own role
- Cannot remove last admin from tenant
- Role change logged in audit trail

**Errors:**
- `403 Forbidden` - Cannot change own role
- `409 Conflict` - Cannot remove last admin

**Required Role:** `admin`

---

### 13.5 Remove User from Tenant

Remove user's access to the tenant.

**Endpoint:** `DELETE /api/v1/tenants/{tenantId}/users/{userId}`

**Authentication:** Required

**Response:** `204 No Content`

**Business Rules:**
- Cannot remove own access
- Cannot remove last admin
- User can still access other tenants they belong to

**Errors:**
- `403 Forbidden` - Cannot remove own access
- `409 Conflict` - Cannot remove last admin

**Required Role:** `admin`

---

## 14. Audit Log Endpoints

### 14.1 List Audit Logs

List audit log entries.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/audit-logs`

**Authentication:** Required

**Query Parameters:**
- `page` (integer, default: 1)
- `limit` (integer, default: 50)
- `entityType` (string: filter by entity type)
- `entityId` (uuid: filter by entity ID)
- `userId` (uuid: filter by user)
- `action` (string: filter by action)
- `startDate` (date: YYYY-MM-DD)
- `endDate` (date: YYYY-MM-DD)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "audit-uuid",
      "userId": "user-uuid",
      "userName": "John Doe",
      "action": "update",
      "entityType": "employee",
      "entityId": "employee-uuid",
      "changes": {
        "jobTitle": {
          "before": "Developer",
          "after": "Senior Developer"
        }
      },
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-01T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 500,
    "totalPages": 10
  }
}
```

**Required Role:** `admin`, `hr`

---

### 14.2 Get Audit Log Entry

Get audit log entry details.

**Endpoint:** `GET /api/v1/tenants/{tenantId}/audit-logs/{auditId}`

**Authentication:** Required

**Response:** `200 OK`
```json
{
  "id": "audit-uuid",
  "userId": "user-uuid",
  "userName": "John Doe",
  "userEmail": "john@acme.com",
  "action": "update",
  "entityType": "employee",
  "entityId": "employee-uuid",
  "changes": {
    "jobTitle": {
      "before": "Developer",
      "after": "Senior Developer"
    },
    "departmentId": {
      "before": "dept-uuid-1",
      "after": "dept-uuid-2"
    }
  },
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "createdAt": "2026-02-01T10:00:00Z"
}
```

**Required Role:** `admin`, `hr`

---

## 15. Data Models

### 15.1 Tenant

```json
{
  "id": "uuid",
  "slug": "string",
  "legalName": "string",
  "taxId": "string",
  "email": "string",
  "phone": "string",
  "address": "string",
  "logoUrl": "string",
  "primaryColor": "string",
  "secondaryColor": "string",
  "timezone": "string",
  "locale": "string",
  "currency": "string",
  "settings": {
    "workHours": {
      "standardHoursPerDay": "number",
      "standardHoursPerWeek": "number",
      "overtimeThreshold": "string",
      "overtimeRate": "number"
    },
    "breaks": {
      "autoDeduct": "boolean",
      "breakMinutes": "number",
      "breakAfterHours": "number"
    },
    "validation": {
      "maxHoursPerDay": "number",
      "allowOverlapping": "boolean",
      "requireApproval": "boolean"
    }
  },
  "subscriptionStatus": "string",
  "subscriptionPlan": "string",
  "maxEmployees": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.2 Employee

```json
{
  "id": "uuid",
  "employeeNumber": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "phone": "string",
  "mobile": "string",
  "hireDate": "date",
  "jobTitle": "string",
  "departmentId": "uuid",
  "departmentName": "string",
  "contractType": "string",
  "employmentStatus": "string",
  "workSchedule": "string",
  "hoursPerWeek": "number",
  "managerId": "uuid",
  "managerName": "string",
  "nationalId": "string",
  "socialSecurityNumber": "string",
  "taxId": "string",
  "dateOfBirth": "date",
  "nationality": "string",
  "address": "string",
  "city": "string",
  "postalCode": "string",
  "country": "string",
  "costCenter": "string",
  "profilePhotoUrl": "string",
  "notes": "string",
  "metadata": "object",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.3 Time Entry

```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "employeeName": "string",
  "clockIn": "timestamp",
  "clockOut": "timestamp",
  "breakMinutes": "number",
  "totalHours": "number",
  "overtimeHours": "number",
  "projectId": "uuid",
  "projectName": "string",
  "taskDescription": "string",
  "status": "string",
  "approvedBy": "uuid",
  "approvedByName": "string",
  "approvedAt": "timestamp",
  "rejectionReason": "string",
  "clockInLocation": {
    "lat": "number",
    "lon": "number"
  },
  "clockOutLocation": {
    "lat": "number",
    "lon": "number"
  },
  "clockInIp": "string",
  "clockOutIp": "string",
  "createdBy": "uuid",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.4 Leave Request

```json
{
  "id": "uuid",
  "employeeId": "uuid",
  "employeeName": "string",
  "leaveType": "string",
  "startDate": "date",
  "endDate": "date",
  "totalDays": "number",
  "reason": "string",
  "status": "string",
  "approvedBy": "uuid",
  "approvedByName": "string",
  "approvedAt": "timestamp",
  "rejectionReason": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.5 Department

```json
{
  "id": "uuid",
  "name": "string",
  "code": "string",
  "managerId": "uuid",
  "managerName": "string",
  "parentDepartmentId": "uuid",
  "employeeCount": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.6 Project

```json
{
  "id": "uuid",
  "name": "string",
  "code": "string",
  "description": "string",
  "clientName": "string",
  "status": "string",
  "startDate": "date",
  "endDate": "date",
  "totalHoursLogged": "number",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.7 User

```json
{
  "id": "uuid",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "phone": "string",
  "locale": "string",
  "timezone": "string",
  "mfaEnabled": "boolean",
  "lastLoginAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.8 Tenant User

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "role": "string",
  "employeeId": "uuid",
  "active": "boolean",
  "lastLoginAt": "timestamp",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

---

### 15.9 Audit Log

```json
{
  "id": "uuid",
  "userId": "uuid",
  "userName": "string",
  "action": "string",
  "entityType": "string",
  "entityId": "uuid",
  "changes": "object",
  "ipAddress": "string",
  "userAgent": "string",
  "createdAt": "timestamp"
}
```

---

## Appendix A: Rate Limiting

**Standard Rate Limits:**
- 100 requests per 15 minutes per user
- 20 requests per 15 minutes for sensitive operations (user management, settings)

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1738429200
```

**Rate Limit Exceeded Response:**
```json
{
  "error": "Too Many Requests",
  "message": "Rate limit exceeded. Please try again later.",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300
}
```

---

## Appendix B: Webhooks (Future)

Torre Tempo will support webhooks for real-time event notifications:

**Supported Events:**
- `employee.created`
- `employee.updated`
- `employee.deleted`
- `time_entry.created`
- `time_entry.approved`
- `time_entry.rejected`
- `leave_request.created`
- `leave_request.approved`
- `leave_request.rejected`

**Webhook Payload:**
```json
{
  "event": "time_entry.approved",
  "tenantId": "tenant-uuid",
  "timestamp": "2026-02-01T10:00:00Z",
  "data": {
    "id": "entry-uuid",
    "employeeId": "employee-uuid",
    "approvedBy": "manager-uuid"
  }
}
```

---

## Appendix C: API Versioning

**Current Version:** v1

**Version Strategy:**
- Major version in URL path (`/api/v1/`)
- Breaking changes require new major version
- Backward-compatible changes added to current version
- Deprecated endpoints marked with `Deprecated` header
- Minimum 6 months notice before version sunset

**Deprecation Header:**
```
Deprecated: true
Sunset: Sat, 01 Aug 2026 00:00:00 GMT
Link: </api/v2/employees>; rel="successor-version"
```

---

**Document Version:** 1.0  
**Last Updated:** February 1, 2026  
**Maintained By:** Torre Tempo Development Team
