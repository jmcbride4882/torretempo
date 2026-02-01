# Torre Tempo - Requirements Interview Checklist

**Project:** Torre Tempo - Multi-Tenant SaaS Time Tracking System  
**Focus:** Spain Compliance & Production-Grade Architecture  
**Date:** [To be filled]  
**Interviewer:** [To be filled]  
**Client/Stakeholder:** [To be filled]

---

## Purpose of This Document

This interview checklist ensures we gather all critical requirements before implementation. Please answer each question as thoroughly as possible. Questions marked with **[BLOCKING]** must be answered before development can proceed safely.

---

## 1. BUSINESS & TENANT MODEL

### 1.1 Business Context
- [ ] **What is the primary business use case for Torre Tempo?**
  - Internal time tracking for a single organization?
  - SaaS product for multiple client companies?
  - Both?

- [ ] **Who are the target customers (tenants)?**
  - Small businesses (< 50 employees)?
  - Medium businesses (50-250 employees)?
  - Large enterprises (250+ employees)?
  - All of the above?

- [ ] **What industries will this serve?**
  - Any specific industry focus (construction, consulting, healthcare, etc.)?
  - General-purpose across all industries?

### 1.2 Multi-Tenancy Architecture **[BLOCKING]**
- [ ] **How should tenants be identified?**
  - Subdomain-based (e.g., `acme.torretempo.com`, `globex.torretempo.com`)?
  - Path-based (e.g., `torretempo.com/acme`, `torretempo.com/globex`)?
  - Tenant selection after login?
  - Custom domain support (e.g., `time.acme.com` → tenant: acme)?

- [ ] **Should tenants have complete data isolation?**
  - Yes, strict isolation (separate database schemas)?
  - Yes, logical isolation (shared schema with tenant_id filtering)?
  - Hybrid approach?

- [ ] **Can users belong to multiple tenants?**
  - Yes, users can work for multiple companies
  - No, one user = one tenant only
  - Admin users can access multiple tenants, regular users cannot

- [ ] **What tenant-level customization is required?**
  - [ ] Custom branding (logo, colors, company name)
  - [ ] Custom domain/subdomain
  - [ ] Tenant-specific settings (work hours, overtime rules, etc.)
  - [ ] Tenant-specific certificates/signatures for exports
  - [ ] Tenant-specific legal entity information
  - [ ] Other: _______________

### 1.3 Tenant Onboarding
- [ ] **How will new tenants be created?**
  - Self-service registration (tenant admin signs up)?
  - Platform admin creates tenants manually?
  - API-based provisioning?
  - Combination?

- [ ] **What information is required during tenant registration?**
  - [ ] Company legal name
  - [ ] Tax ID (CIF/NIF in Spain)
  - [ ] Primary contact person
  - [ ] Billing information
  - [ ] Industry/sector
  - [ ] Number of employees (for capacity planning)
  - [ ] Other: _______________

- [ ] **Should there be a trial period or demo mode?**
  - Yes, free trial for X days
  - Yes, limited feature demo mode
  - No, paid from day one

---

## 2. LEGAL & COMPLIANCE (SPAIN-SPECIFIC)

### 2.1 Spanish Labor Law Requirements **[BLOCKING]**
- [ ] **Must the system comply with Spanish Royal Decree 8/2019 (mandatory time tracking)?**
  - Yes, full compliance required
  - Partial compliance (specify which aspects)
  - No, this is for a different jurisdiction

- [ ] **What specific compliance requirements must be met?**
  - [ ] Daily start and end times for each employee
  - [ ] Total hours worked per day
  - [ ] Records must be kept for 4 years
  - [ ] Records must be available for labor inspectors
  - [ ] Digital signature or certification of records
  - [ ] Export to official formats (PDF, CSV, etc.)
  - [ ] Other: _______________

- [ ] **Are there specific export formats required by Spanish authorities?**
  - PDF with specific fields?
  - CSV with specific column structure?
  - XML format?
  - Other: _______________

### 2.2 Data Protection (GDPR) **[BLOCKING]**
- [ ] **What personal data will be stored?**
  - (See Employee Fields section for details)

- [ ] **What is the legal basis for processing employee data?**
  - Employment contract (contractual necessity)
  - Legal obligation (compliance with labor law)
  - Legitimate interest
  - Consent (specify for what)

- [ ] **Where will data be stored?**
  - EU-based servers only (GDPR compliance)
  - Spain-based servers only
  - Other regions acceptable (specify): _______________

- [ ] **What data retention policies are required?**
  - Time tracking records: 4 years (Spanish law minimum)
  - Employee profiles: Duration of employment + X years?
  - Audit logs: X years?
  - Other: _______________

- [ ] **What employee rights must be supported?**
  - [ ] Right to access (employees can view their own data)
  - [ ] Right to rectification (employees can request corrections)
  - [ ] Right to erasure (right to be forgotten - with legal exceptions)
  - [ ] Right to data portability (export employee's own data)
  - [ ] Right to object to processing
  - [ ] Other: _______________

### 2.3 Audit & Inspection
- [ ] **Must the system support labor inspections?**
  - Yes, inspectors need read-only access
  - Yes, export reports for inspectors
  - No special requirements

- [ ] **What audit trail is required?**
  - [ ] Who created/modified time entries
  - [ ] When entries were created/modified
  - [ ] IP address of modifications
  - [ ] Approval/rejection history
  - [ ] Export history (who exported what, when)
  - [ ] Other: _______________

---

## 3. EMPLOYEE FIELDS & PROFILES

### 3.1 Required Employee Information **[BLOCKING]**

For each field below, indicate:
- **Required:** Must be filled for all employees
- **Optional:** Can be left blank
- **Not Needed:** Don't include this field

| Field | Required? | Optional? | Not Needed? | Notes |
|-------|-----------|-----------|-------------|-------|
| **Legal/Identity** |
| Full Legal Name (First + Last) | ☐ | ☐ | ☐ | |
| National ID (DNI/NIE in Spain) | ☐ | ☐ | ☐ | |
| Passport Number | ☐ | ☐ | ☐ | |
| Date of Birth | ☐ | ☐ | ☐ | |
| Nationality | ☐ | ☐ | ☐ | |
| **Contact** |
| Email Address | ☐ | ☐ | ☐ | |
| Phone Number | ☐ | ☐ | ☐ | |
| Home Address | ☐ | ☐ | ☐ | |
| Emergency Contact | ☐ | ☐ | ☐ | |
| **Employment** |
| Employee ID/Number | ☐ | ☐ | ☐ | |
| Job Title/Position | ☐ | ☐ | ☐ | |
| Department | ☐ | ☐ | ☐ | |
| Hire Date | ☐ | ☐ | ☐ | |
| Contract Type (permanent, temporary, etc.) | ☐ | ☐ | ☐ | |
| Work Schedule (full-time, part-time, hours/week) | ☐ | ☐ | ☐ | |
| Salary/Compensation | ☐ | ☐ | ☐ | |
| Social Security Number (Spain: Número de Afiliación) | ☐ | ☐ | ☐ | |
| **Tax & Payroll** |
| Tax ID (NIF for payroll) | ☐ | ☐ | ☐ | |
| Bank Account (for payroll) | ☐ | ☐ | ☐ | |
| **System Access** |
| Username/Login | ☐ | ☐ | ☐ | |
| Role(s) within tenant | ☐ | ☐ | ☐ | |
| Active/Inactive Status | ☐ | ☐ | ☐ | |
| **Other** |
| Profile Photo | ☐ | ☐ | ☐ | |
| Manager/Supervisor | ☐ | ☐ | ☐ | |
| Cost Center | ☐ | ☐ | ☐ | |
| Custom Fields (specify): | ☐ | ☐ | ☐ | |

### 3.2 Employee Profile Management
- [ ] **Who can create employee profiles?**
  - Tenant admins only
  - HR role
  - Managers (for their team)
  - Other: _______________

- [ ] **Who can edit employee profiles?**
  - Tenant admins only
  - HR role
  - Employees (self-service for certain fields)
  - Managers (for their team)
  - Other: _______________

- [ ] **Can employees view/edit their own profiles?**
  - Yes, view only
  - Yes, view and edit certain fields (specify which): _______________
  - No, admin-managed only

- [ ] **Should there be approval workflows for profile changes?**
  - Yes, changes require admin approval
  - Yes, certain fields require approval (specify): _______________
  - No, changes are immediate

---

## 4. TIME TRACKING FUNCTIONALITY

### 4.1 Time Entry Methods **[BLOCKING]**
- [ ] **How should employees record time?**
  - [ ] Clock in/out (start/end timestamps)
  - [ ] Manual entry (enter hours worked)
  - [ ] Timesheet (weekly/monthly grid)
  - [ ] Mobile app (GPS-enabled check-in)
  - [ ] Biometric devices (fingerprint, facial recognition)
  - [ ] Integration with physical time clocks
  - [ ] Other: _______________

- [ ] **Should the system support multiple time entry methods simultaneously?**
  - Yes, different methods for different employee types
  - No, one method for all

### 4.2 Time Entry Rules
- [ ] **Can employees edit their own time entries?**
  - Yes, always
  - Yes, within X hours/days of entry
  - Yes, but requires approval
  - No, admin/manager only

- [ ] **Can employees delete time entries?**
  - Yes, always
  - Yes, within X hours/days
  - Yes, but requires approval
  - No, only soft delete (mark as void)

- [ ] **Should there be validation rules for time entries?**
  - [ ] Cannot clock in twice without clocking out
  - [ ] Cannot have overlapping time entries
  - [ ] Maximum hours per day (e.g., 12 hours)
  - [ ] Minimum break time required (e.g., 30 min after 6 hours)
  - [ ] Must fall within employee's work schedule
  - [ ] Other: _______________

### 4.3 Breaks & Overtime
- [ ] **How should breaks be handled?**
  - Automatic deduction (e.g., 30 min lunch break)
  - Manual clock out/in for breaks
  - Tracked separately from work time
  - Not tracked

- [ ] **How should overtime be calculated?**
  - Automatic (hours beyond X per day/week)
  - Manual approval required
  - Different rates for different overtime types (1.5x, 2x, etc.)
  - Not applicable

- [ ] **Are there different overtime rules for different employee types?**
  - Yes (specify): _______________
  - No, uniform rules

### 4.4 Projects & Tasks (Optional)
- [ ] **Should time be tracked against projects/tasks?**
  - Yes, required for all time entries
  - Yes, optional
  - No, just track hours worked

- [ ] **If yes, what project/task structure is needed?**
  - Simple project list
  - Projects with sub-tasks
  - Projects with phases/milestones
  - Client → Project → Task hierarchy
  - Other: _______________

### 4.5 Geolocation & Remote Work
- [ ] **Should the system track employee location?**
  - Yes, GPS coordinates for mobile clock-in
  - Yes, IP address for web clock-in
  - Yes, geofencing (only allow clock-in within certain areas)
  - No location tracking

- [ ] **How should remote work be handled?**
  - Same as office work
  - Separate tracking/reporting
  - Requires manager approval
  - Other: _______________

---

## 5. APPROVALS & WORKFLOWS

### 5.1 Time Entry Approvals
- [ ] **Do time entries require approval?**
  - Yes, all entries require manager approval
  - Yes, only certain entries (specify): _______________
  - Yes, only entries above X hours
  - No, entries are auto-approved

- [ ] **Who can approve time entries?**
  - Direct manager/supervisor
  - Department head
  - HR role
  - Tenant admin
  - Other: _______________

- [ ] **What happens to unapproved entries?**
  - Cannot be exported/used for payroll
  - Flagged in reports
  - Automatically approved after X days
  - Other: _______________

### 5.2 Leave & Absence Management
- [ ] **Should the system track leave/absences?**
  - Yes, integrated with time tracking
  - Yes, separate module
  - No, out of scope

- [ ] **If yes, what types of leave?**
  - [ ] Vacation/Annual leave
  - [ ] Sick leave
  - [ ] Personal leave
  - [ ] Maternity/Paternity leave
  - [ ] Unpaid leave
  - [ ] Public holidays
  - [ ] Other: _______________

- [ ] **Should leave requests require approval?**
  - Yes, manager approval required
  - Yes, HR approval required
  - No, informational only

---

## 6. ROLES & PERMISSIONS

### 6.1 Platform-Level Roles **[BLOCKING]**
- [ ] **Who manages the platform (across all tenants)?**
  - Platform Owner/Superadmin
  - DevOps team
  - Other: _______________

- [ ] **What can platform admins do?**
  - [ ] Create/delete tenants
  - [ ] View all tenant data (for support)
  - [ ] Modify tenant settings
  - [ ] Access billing/subscription management
  - [ ] View platform-wide analytics
  - [ ] Other: _______________

### 6.2 Tenant-Level Roles **[BLOCKING]**
- [ ] **What roles are needed within each tenant?**
  - [ ] Tenant Admin (full control within tenant)
  - [ ] HR Manager (employee management, reports)
  - [ ] Manager/Supervisor (approve time, view team reports)
  - [ ] Employee (basic time tracking)
  - [ ] Accountant/Payroll (view reports, export data)
  - [ ] Read-Only/Auditor (view only, no modifications)
  - [ ] Other: _______________

- [ ] **Should roles be customizable per tenant?**
  - Yes, tenants can define custom roles
  - No, fixed set of roles for all tenants

- [ ] **What permissions are needed?** (for each role identified above)
  - [ ] Create/edit/delete employees
  - [ ] Create/edit/delete time entries (own)
  - [ ] Create/edit/delete time entries (others)
  - [ ] Approve/reject time entries
  - [ ] View reports (own)
  - [ ] View reports (team/department)
  - [ ] View reports (all employees)
  - [ ] Export data
  - [ ] Manage tenant settings
  - [ ] Manage projects/tasks
  - [ ] Other: _______________

---

## 7. REPORTING & EXPORTS

### 7.1 Required Reports **[BLOCKING]**
- [ ] **What reports are needed?**
  - [ ] Daily attendance report (who worked when)
  - [ ] Weekly/Monthly timesheet summary
  - [ ] Overtime report
  - [ ] Absence/Leave report
  - [ ] Project/Task time allocation
  - [ ] Payroll export (hours worked per employee)
  - [ ] Compliance report (for labor inspectors)
  - [ ] Custom reports (specify): _______________

### 7.2 Export Formats
- [ ] **What export formats are required?**
  - [ ] PDF (formatted, printable)
  - [ ] Excel/CSV (raw data)
  - [ ] JSON (API integration)
  - [ ] XML (specific schema)
  - [ ] Other: _______________

### 7.3 Report Access
- [ ] **Who can generate reports?**
  - Tenant admins only
  - HR role
  - Managers (for their team)
  - Employees (for themselves)
  - Other: _______________

- [ ] **Should reports include employee personal data?**
  - Yes, full details (name, ID, etc.)
  - Yes, but anonymized/aggregated for certain roles
  - No, only work hours

### 7.4 Digital Signatures & Certification
- [ ] **Do exported reports require digital signatures?**
  - Yes, tenant admin signature
  - Yes, employee signature (acknowledgment)
  - Yes, both
  - No

- [ ] **What certification is needed for compliance?**
  - Timestamp certification
  - Cryptographic hash/integrity check
  - Third-party certification service
  - Not required

---

## 8. INTEGRATIONS

### 8.1 Payroll Integration
- [ ] **Should the system integrate with payroll software?**
  - Yes, specific system (name): _______________
  - Yes, generic export format
  - No, manual export only

- [ ] **What data needs to be exported for payroll?**
  - [ ] Employee ID
  - [ ] Hours worked (regular)
  - [ ] Hours worked (overtime)
  - [ ] Leave/absence hours
  - [ ] Project/cost center allocation
  - [ ] Other: _______________

### 8.2 HR/ERP Integration
- [ ] **Should the system integrate with HR/ERP systems?**
  - Yes, specific system (name): _______________
  - Yes, via API
  - No

- [ ] **What data should be synced?**
  - [ ] Employee master data (from HR to Torre Tempo)
  - [ ] Time tracking data (from Torre Tempo to ERP)
  - [ ] Leave balances
  - [ ] Other: _______________

### 8.3 Authentication Integration
- [ ] **How should users authenticate?**
  - Username/password (built-in)
  - Single Sign-On (SSO) - SAML
  - Single Sign-On (SSO) - OAuth2/OIDC
  - Active Directory / LDAP
  - Social login (Google, Microsoft, etc.)
  - Multi-factor authentication (MFA) required
  - Other: _______________

- [ ] **Should authentication be tenant-specific?**
  - Yes, each tenant has its own SSO configuration
  - No, platform-wide authentication

### 8.4 Other Integrations
- [ ] **Are there other systems to integrate with?**
  - Calendar systems (Google Calendar, Outlook)
  - Project management tools (Jira, Asana, etc.)
  - Communication tools (Slack, Teams)
  - Biometric devices
  - Other: _______________

---

## 9. PUBLIC LANDING PAGE & TENANT ACCESS

### 9.1 Landing Page **[BLOCKING]**
- [ ] **What should the public landing page include?**
  - [ ] Product overview/value proposition
  - [ ] Features list
  - [ ] Pricing information
  - [ ] Customer testimonials
  - [ ] Demo/trial signup
  - [ ] Tenant login link
  - [ ] Contact/support information
  - [ ] Legal pages (privacy policy, terms of service)
  - [ ] Other: _______________

- [ ] **Should the landing page be multi-language?**
  - Yes, Spanish and English
  - Yes, other languages (specify): _______________
  - No, Spanish only

### 9.2 Tenant Login Flow **[BLOCKING]**
- [ ] **How do users access their tenant?**
  - Enter tenant ID/subdomain on login page
  - Direct link to tenant subdomain (e.g., `acme.torretempo.com`)
  - Email-based tenant detection (system looks up tenant from email)
  - Other: _______________

- [ ] **What happens if a user belongs to multiple tenants?**
  - User selects tenant after login
  - User has separate login for each tenant
  - Not applicable (users can't belong to multiple tenants)

### 9.3 Branding
- [ ] **Should tenants have custom branding?**
  - Yes, custom logo
  - Yes, custom colors/theme
  - Yes, custom domain (e.g., `time.acme.com`)
  - Yes, white-label (no Torre Tempo branding visible)
  - No, standard Torre Tempo branding for all

---

## 10. TECHNICAL & INFRASTRUCTURE

### 10.1 Performance & Scalability
- [ ] **What is the expected scale?**
  - Number of tenants: _______________
  - Employees per tenant (average): _______________
  - Employees per tenant (maximum): _______________
  - Time entries per day (platform-wide): _______________

- [ ] **What are the performance requirements?**
  - Page load time: < X seconds
  - API response time: < X milliseconds
  - Concurrent users: X simultaneous users
  - Other: _______________

### 10.2 Availability & Backup
- [ ] **What uptime is required?**
  - 99.9% (standard SaaS)
  - 99.99% (high availability)
  - Other: _______________

- [ ] **What backup/disaster recovery is needed?**
  - Daily backups, retained for X days
  - Real-time replication
  - Point-in-time recovery
  - Geographic redundancy
  - Other: _______________

### 10.3 Security
- [ ] **What security measures are required?**
  - [ ] HTTPS/TLS encryption
  - [ ] Data encryption at rest
  - [ ] Regular security audits/penetration testing
  - [ ] SOC 2 compliance
  - [ ] ISO 27001 compliance
  - [ ] Other: _______________

- [ ] **What password policies are required?**
  - Minimum length: X characters
  - Complexity requirements (uppercase, numbers, symbols)
  - Password expiration: every X days
  - Password history: cannot reuse last X passwords
  - Other: _______________

### 10.4 Monitoring & Logging
- [ ] **What monitoring is required?**
  - [ ] Application performance monitoring (APM)
  - [ ] Error tracking
  - [ ] User activity logging
  - [ ] Security event logging
  - [ ] Audit trail for compliance
  - [ ] Other: _______________

---

## 11. USER EXPERIENCE & ACCESSIBILITY

### 11.1 Supported Devices
- [ ] **What devices must be supported?**
  - [ ] Desktop web (Chrome, Firefox, Safari, Edge)
  - [ ] Mobile web (responsive design)
  - [ ] Native mobile app (iOS)
  - [ ] Native mobile app (Android)
  - [ ] Tablet
  - [ ] Other: _______________

### 11.2 Accessibility
- [ ] **What accessibility standards must be met?**
  - WCAG 2.1 Level A
  - WCAG 2.1 Level AA
  - WCAG 2.1 Level AAA
  - Not required

- [ ] **Are there specific accessibility features needed?**
  - [ ] Screen reader support
  - [ ] Keyboard navigation
  - [ ] High contrast mode
  - [ ] Font size adjustment
  - [ ] Other: _______________

### 11.3 Localization
- [ ] **What languages must be supported?**
  - Spanish (Spain)
  - Spanish (Latin America)
  - English
  - Catalan
  - Basque
  - Galician
  - Other: _______________

- [ ] **Should date/time formats be locale-specific?**
  - Yes, based on tenant location
  - Yes, based on user preference
  - No, standard format for all

- [ ] **Should currency be configurable?**
  - Yes, per tenant
  - No, EUR only
  - Other: _______________

---

## 12. BILLING & SUBSCRIPTION (if SaaS)

### 12.1 Pricing Model
- [ ] **How will tenants be billed?**
  - Per employee per month
  - Flat rate per tenant
  - Tiered pricing (based on features or employee count)
  - Usage-based (e.g., per time entry)
  - Other: _______________

- [ ] **What payment methods are accepted?**
  - [ ] Credit/debit card
  - [ ] Bank transfer
  - [ ] PayPal
  - [ ] Invoice (for enterprise)
  - [ ] Other: _______________

### 12.2 Subscription Management
- [ ] **Should tenants be able to self-manage subscriptions?**
  - Yes, upgrade/downgrade plans
  - Yes, add/remove users
  - Yes, cancel subscription
  - No, contact sales/support required

- [ ] **What happens when a subscription expires?**
  - Immediate access revocation
  - Grace period (X days)
  - Read-only access
  - Data retention for X days before deletion
  - Other: _______________

---

## 13. SUPPORT & DOCUMENTATION

### 13.1 User Support
- [ ] **What support channels are needed?**
  - [ ] Email support
  - [ ] Live chat
  - [ ] Phone support
  - [ ] Knowledge base/FAQ
  - [ ] Video tutorials
  - [ ] In-app help/tooltips
  - [ ] Other: _______________

- [ ] **What support levels are offered?**
  - Standard support (business hours)
  - Premium support (24/7)
  - Dedicated account manager
  - Other: _______________

### 13.2 Documentation
- [ ] **What documentation is required?**
  - [ ] User manual (for employees)
  - [ ] Admin guide (for tenant admins)
  - [ ] API documentation (for integrations)
  - [ ] Compliance guide (for legal/HR)
  - [ ] Video tutorials
  - [ ] Other: _______________

---

## 14. FUTURE FEATURES & ROADMAP

- [ ] **Are there features planned for future phases?**
  - (List any features that are out of scope for MVP but desired later)

- [ ] **What is the priority for the initial release?**
  - Core time tracking only
  - Time tracking + employee management
  - Time tracking + employee management + reporting
  - Full feature set
  - Other: _______________

---

## DEFAULT ASSUMPTIONS (IF QUESTIONS REMAIN UNANSWERED)

If any of the above questions are not answered, we will proceed with the following **best-practice defaults** for a Spain-compliant, multi-tenant SaaS time tracking system:

### Business & Tenancy
- **Tenant identification:** Subdomain-based (e.g., `acme.torretempo.com`)
- **Data isolation:** Logical isolation with `tenant_id` in shared schema
- **Users and tenants:** Users can belong to multiple tenants (separate roles per tenant)
- **Tenant customization:** Logo, colors, company name, settings
- **Tenant onboarding:** Self-service registration with email verification

### Legal & Compliance
- **Spain compliance:** Full compliance with Royal Decree 8/2019
- **GDPR:** EU-based servers, 4-year retention for time records, employee rights supported
- **Audit trail:** Full audit log (who, what, when, IP address)
- **Export formats:** PDF (formatted) and CSV (raw data)

### Employee Fields
- **Required fields:** Full name, email, employee ID, hire date, job title, department, contract type, active status
- **Optional fields:** Phone, address, national ID, social security number, manager, cost center
- **Not included by default:** Salary, bank account, passport (unless explicitly requested)
- **Profile management:** Tenant admins and HR can create/edit; employees can view only

### Time Tracking
- **Entry method:** Clock in/out (start/end timestamps) via web and mobile
- **Editing:** Employees can edit within 24 hours; requires manager approval after
- **Validation:** No overlapping entries, max 12 hours/day, automatic break deduction (30 min after 6 hours)
- **Overtime:** Automatic calculation (hours beyond 8/day or 40/week)
- **Projects/tasks:** Optional, simple project list

### Approvals & Workflows
- **Time approval:** Manager approval required for all entries
- **Leave management:** Integrated, supports vacation, sick leave, personal leave; requires manager approval

### Roles & Permissions
- **Platform roles:** Platform Owner (superadmin)
- **Tenant roles:** Tenant Admin, HR Manager, Manager, Employee, Accountant (read-only)
- **Permissions:** Role-based access control (RBAC) with predefined permissions

### Reporting & Exports
- **Reports:** Daily attendance, weekly/monthly timesheet, overtime, payroll export, compliance report
- **Formats:** PDF and CSV
- **Signatures:** Optional digital signature for compliance exports

### Integrations
- **Authentication:** Username/password with optional MFA; SSO support (SAML, OAuth2) per tenant
- **Payroll:** Generic CSV export (employee ID, hours worked, overtime)
- **HR/ERP:** API available for custom integrations

### Landing Page & Access
- **Landing page:** Product overview, features, pricing, tenant login, demo signup, legal pages
- **Languages:** Spanish and English
- **Branding:** Tenants can upload logo and customize colors

### Technical
- **Scale:** Support 1000+ tenants, 500 employees/tenant, 10,000+ time entries/day
- **Performance:** < 2 second page load, < 500ms API response
- **Uptime:** 99.9% availability
- **Security:** HTTPS, data encryption at rest, SOC 2 compliance roadmap
- **Backup:** Daily backups, 30-day retention, point-in-time recovery

### User Experience
- **Devices:** Desktop web (all modern browsers), mobile web (responsive), native mobile apps (future phase)
- **Accessibility:** WCAG 2.1 Level AA
- **Languages:** Spanish (Spain) and English

### Billing (if SaaS)
- **Pricing:** Per employee per month, tiered pricing
- **Payment:** Credit card, bank transfer
- **Subscription:** Self-service upgrade/downgrade; 7-day grace period on expiration

---

## BLOCKING ITEMS (MUST BE ANSWERED TO PROCEED)

The following questions **MUST** be answered before development can begin safely. Proceeding without these answers risks building the wrong system or non-compliant features.

### Critical Blockers
1. **Multi-tenancy model:** How are tenants identified? (subdomain, path, custom domain, etc.)
2. **Spain compliance:** Must the system comply with Royal Decree 8/2019? What specific requirements?
3. **Employee fields:** Which employee fields are required vs. optional? (See section 3.1)
4. **Time entry method:** How do employees record time? (clock in/out, manual, timesheet, mobile, etc.)
5. **Roles & permissions:** What roles exist within tenants? What can each role do?
6. **Tenant login flow:** How do users access their tenant? (subdomain, tenant selection, email-based, etc.)
7. **Required reports:** What reports must the system generate? (See section 7.1)
8. **Data residency:** Where must data be stored? (EU, Spain, other?)

### High-Priority (Strongly Recommended to Answer)
9. **Approval workflows:** Do time entries require approval? By whom?
10. **Leave management:** Should the system track leave/absences? What types?
11. **Geolocation:** Should the system track employee location (GPS, IP)?
12. **Integrations:** Are there specific systems to integrate with (payroll, HR, SSO)?
13. **Export formats:** What formats are required for compliance exports?
14. **Tenant customization:** What level of branding/customization do tenants need?

---

## NEXT STEPS

1. **Client/Stakeholder:** Please review and answer all questions in this document.
2. **Mark blocking items** (section above) as highest priority.
3. **For unanswered questions:** Review the "Default Assumptions" section and confirm if defaults are acceptable.
4. **Schedule follow-up:** If clarification is needed, schedule a meeting to discuss ambiguous items.
5. **Sign-off:** Once all blocking items are answered and defaults are confirmed, sign off on this document to proceed with design and development.

---

**Document Status:** [ ] Draft | [ ] In Review | [ ] Approved  
**Approved By:** _______________  
**Date:** _______________  

---

*This document is a living artifact and may be updated as requirements evolve. All changes should be tracked and approved by stakeholders.*
