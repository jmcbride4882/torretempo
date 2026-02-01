# Torre Tempo - Compliance Documentation

**Version:** 1.0  
**Date:** February 1, 2026  
**Status:** Final Compliance Specification  
**Project:** Multi-Tenant SaaS Time Tracking System

---

## Table of Contents

1. [Legal Framework Overview](#1-legal-framework-overview)
2. [Geolocation Compliance](#2-geolocation-compliance)
3. [Data Protection Impact Assessment (DPIA)](#3-data-protection-impact-assessment-dpia)
4. [Works Council Consultation](#4-works-council-consultation)
5. [Data Retention and Deletion](#5-data-retention-and-deletion)
6. [Append-Only Audit Trail](#6-append-only-audit-trail)
7. [Employee Rights (GDPR Articles 15-22)](#7-employee-rights-gdpr-articles-15-22)
8. [Inspector-Readiness Mode](#8-inspector-readiness-mode)
9. [Security and Encryption](#9-security-and-encryption)
10. [Pre-Launch Compliance Checklist](#10-pre-launch-compliance-checklist)

---

## 1. Legal Framework Overview

### 1.1 Applicable Regulations

#### GDPR (Regulation EU 2016/679)
The General Data Protection Regulation is the primary EU-wide framework for data protection, effective since May 25, 2018. It establishes principles for data processing, rights for data subjects, and obligations for data controllers and processors.

**Key GDPR Principles for Torre Tempo:**
- Lawfulness, fairness, and transparency
- Purpose limitation
- Data minimization
- Accuracy
- Storage limitation
- Integrity and confidentiality
- Accountability

**Torre Tempo Implementation:**
- Legitimate interest + legal obligation as legal basis
- Purpose-specific data collection
- Minimized geolocation data (event-only)
- Employee self-service for accuracy
- 4-year retention policy
- Comprehensive security measures
- Documented compliance (this guide)

#### LOPDGDD (Organic Law 3/2018)
The Spanish Organic Law on Data Protection and Digital Rights Guarantee (LOPDGDD) is Spain's implementation of GDPR with additional country-specific requirements.

**Key LOPDGDD Provisions for Torre Tempo:**
- Article 87: Digital disconnection right
- Article 88: Right to privacy in digital device usage
- Article 89: Right to privacy against video surveillance
- Article 90: Right to privacy against geolocation systems
- Article 91: Digital rights in employment relationships

**Torre Tempo Implementation:**
- Configurable working hours
- Clear geolocation policy
- Event-only tracking (not continuous)
- Transparent employee notifications
- Works Council consultation

#### Royal Decree-Law 8/2019
This Spanish law mandates the recording of daily working hours for all employees, effective since May 12, 2019.

**Key RDL 8/2019 Requirements:**
- Article 10: Daily recording of working hours
- Recording of exact start and end times
- 4-year retention of time records
- Records accessible to employees, representatives, and labor inspectors
- Reliable and tamper-proof recording system

**Torre Tempo Implementation:**
- Clock in/out functionality
- Precise timestamp recording
- 4-year minimum retention
- Employee self-service access
- Immutable audit trail

#### AEPD Guidelines
The Spanish Data Protection Agency (AEPD) provides specific guidance on implementing GDPR/LOPDGDD in Spain.

**Key AEPD Guidance for Torre Tempo:**
- Guide on the use of cookies
- Guide on data processing in employment relationships
- Guide on DPIAs
- Guidance on geolocation in employment context

**Torre Tempo Implementation:**
- Cookie consent management
- Employment-specific data processing
- DPIA template provided
- Geolocation compliance by design

### 1.2 Penalties for Non-Compliance

#### GDPR Penalties
- **Tier 1 Violations:** Up to €10 million or 2% of global annual turnover, whichever is higher
  - Examples: Failure to implement technical measures, lack of records
- **Tier 2 Violations:** Up to €20 million or 4% of global annual turnover, whichever is higher
  - Examples: Violation of data subject rights, unlawful processing

#### LOPDGDD Penalties
The LOPDGDD adopts the GDPR penalty framework with Spanish-specific categorizations:
- **Very Serious Infractions:** Up to €20 million or 4% of turnover
  - Examples: Processing without legal basis, ignoring data subject rights
- **Serious Infractions:** Up to €10 million or 2% of turnover
  - Examples: Lack of technical measures, failure to conduct DPIA
- **Minor Infractions:** Up to €900,000
  - Examples: Minor documentation failures

#### RDL 8/2019 Penalties
Failure to implement time tracking is considered a serious labor infraction under the LISOS (Law on Infractions and Sanctions in the Social Order):
- Fines from €626 to €6,250 per company (not per employee)
- Potential additional liability for unpaid overtime

#### Recent Enforcement Examples
- **2023:** €3.2 million fine to Spanish telecom for geolocation without proper legal basis
- **2022:** €2.5 million fine to retailer for continuous employee monitoring
- **2021:** €1.5 million fine for inadequate DPIA before implementing biometric time tracking

### 1.3 Legal Disclaimer

> **IMPORTANT:** This document provides guidance based on current understanding of applicable regulations. It does not constitute legal advice. Tenants should consult with qualified legal counsel to ensure compliance with all applicable laws in their specific circumstances.

---

## 2. Geolocation Compliance (CRITICAL SECTION)

### 2.1 Legal Basis for Geolocation

#### Valid Legal Basis
Torre Tempo uses a **dual legal basis** for geolocation processing:

1. **Legitimate Interest (GDPR Article 6(1)(f)):**
   - Employer's legitimate interest in verifying work location
   - Interest in preventing time fraud
   - Interest in accurate record-keeping

2. **Legal Obligation (GDPR Article 6(1)(c)):**
   - Compliance with Royal Decree-Law 8/2019
   - Obligation to maintain accurate time records
   - Obligation to verify working time

#### Why Consent is INVALID
**CRITICAL:** Do NOT use consent as the legal basis for employee geolocation.

Consent in employment relationships is generally considered **invalid** because:
- Power imbalance between employer and employee
- GDPR requires consent to be "freely given" (Recital 43)
- AEPD has specifically ruled that employment context creates presumption of coercion
- Employees can withdraw consent at any time, making compliance impossible

**Implementation Requirement:**
- Privacy notices must cite legitimate interest + legal obligation
- Do NOT use consent checkboxes for geolocation
- Do NOT imply that geolocation is optional if required for job

### 2.2 Lawful vs. Unlawful Geolocation

#### LEGAL: Event-Only Geolocation
Torre Tempo implements **event-only geolocation** which is lawful because:
- Captures location ONLY at clock-in/out events
- Proportionate to purpose (verification of work location)
- Minimizes data collection (GDPR Article 5(1)(c))
- Transparent to employee (clear notification at capture)
- Configurable per tenant (enable/disable/require)

**Implementation Requirements:**
- Clear visual indicator when location is captured
- Preview of captured location before submission
- Option to retry if location is inaccurate
- Fallback for location services failure

#### ILLEGAL: Continuous Tracking
The following approaches are **unlawful** in Spain and MUST NOT be implemented:
- Background location tracking during work hours
- Periodic location "pings" throughout the day
- Location tracking outside working hours
- Tracking without clear notification
- Excessive precision beyond what's necessary

**Technical Safeguards:**
- No background location services
- No location capture between clock-in and clock-out
- No location history or "breadcrumb" trails
- Precision limited to what's necessary (typically city-level)

### 2.3 DPIA Requirement

A Data Protection Impact Assessment (DPIA) is **mandatory** before implementing geolocation because:
- GDPR Article 35 requires DPIA for "systematic monitoring" of employees
- AEPD explicitly lists geolocation in employment as high-risk
- Geolocation processes sensitive data (revealing patterns of behavior)

**Implementation Requirements:**
- Complete DPIA before enabling geolocation
- Document DPIA in compliance_documents table
- Review DPIA annually or when processing changes
- Make DPIA available to data protection authorities upon request

### 2.4 Works Council Consultation

Spanish law requires consultation with Works Councils (Comité de Empresa) or employee representatives before implementing monitoring systems.

**Implementation Requirements:**
- Consult before enabling geolocation
- Document consultation process and outcomes
- Address concerns raised during consultation
- Provide Works Council with access to anonymized reports

### 2.5 Employee Transparency

Transparency is legally required and builds trust in the system.

**Implementation Requirements:**
- Written geolocation policy (template provided in section 2.7)
- Clear notification at each location capture
- Information on what data is collected and why
- Information on who can access location data
- Information on retention period

### 2.6 Technical Implementation Requirements

#### Data Minimization
- Capture only what's necessary:
  - Latitude/longitude
  - Accuracy radius
  - Timestamp
  - Device identifier
- Do NOT capture:
  - Altitude
  - Speed
  - Heading
  - Detailed device info

#### Access Controls
- Role-based access to location data:
  - Managers: View only their team's data
  - Admins: View all location data
  - Employees: View only their own data
- All access logged in audit trail

#### Encryption
- Geolocation data encrypted at rest
- Geolocation data encrypted in transit
- Encryption keys properly managed

### 2.7 Geolocation Policy Template

```markdown
# [COMPANY NAME] Geolocation Policy

## Purpose
This policy explains how [COMPANY NAME] uses geolocation data in the Torre Tempo time tracking system.

## What Data We Collect
When you clock in or clock out, we collect:
- Your location (latitude/longitude)
- The time of clock in/out
- The accuracy of the location data
- The device used

## When We Collect It
Location data is ONLY collected at the moment you:
- Clock in to start work
- Clock out to end work

We do NOT track your location:
- Between clock in and clock out
- Outside working hours
- Continuously in the background

## Why We Collect It
We collect this data to:
- Verify work location compliance
- Prevent time fraud
- Comply with Spanish labor law (RDL 8/2019)
- Ensure accurate time records

## Legal Basis
We process this data based on:
- Our legitimate interest in accurate time recording
- Our legal obligation under Spanish labor law

## Who Can Access It
- You can access your own location data at any time
- Your direct manager can access your location data
- HR administrators can access location data for compliance purposes

## How Long We Keep It
- Location data is retained for 4 years as required by Spanish law
- After 4 years, location data is permanently deleted

## Your Rights
You have the right to:
- Access your location data
- Request correction of inaccurate data
- Object to processing in certain circumstances
- File a complaint with the AEPD

## Questions or Concerns
If you have questions about this policy, please contact [DPO CONTACT INFO].
```

### 2.8 Tenant Configuration Options

Torre Tempo allows tenants to configure geolocation according to their needs:

| Setting | Options | Description |
|---------|---------|-------------|
| Geolocation Mode | Disabled, Optional, Required | Whether location is captured |
| Accuracy Level | High, Medium, Low | Required precision level |
| Verification Radius | 50m-1000m | Acceptable distance from work location |
| Work Locations | Multiple locations | Defined work locations for verification |
| Notification Text | Customizable | Message shown during capture |
| Policy Text | Customizable | Company-specific policy |

**Implementation Requirements:**
- Default: Geolocation disabled
- Require DPIA before enabling
- Require policy text before enabling
- Require work locations before enabling

---

## 3. Data Protection Impact Assessment (DPIA)

### 3.1 When DPIA is Required

A DPIA is **mandatory** before implementing:
- Geolocation tracking (any form)
- Biometric authentication (if added in future)
- Automated decision-making affecting employees
- Systematic monitoring of work activities
- Processing of large scale sensitive data

**Implementation Requirement:**
- DPIA must be completed before enabling high-risk features
- DPIA must be documented and stored in compliance_documents table
- DPIA must be reviewed by tenant's DPO or legal counsel

### 3.2 DPIA Template

#### 3.2.1 Processing Description

```markdown
# Data Protection Impact Assessment: Geolocation in Torre Tempo

## 1. Processing Description

### 1.1 Nature of Processing
- Collection of geolocation data at clock-in/out events
- Storage of location coordinates in encrypted database
- Access by authorized personnel only
- Retention for 4 years per Spanish law
- Eventual deletion after retention period

### 1.2 Scope of Processing
- Affected data subjects: [NUMBER] employees
- Geographic scope: [LOCATIONS]
- Data categories: Geolocation, timestamp, device identifier
- Processing volume: Approximately 2 data points per employee per day

### 1.3 Context of Processing
- Employment relationship
- Spanish legal requirement for time tracking
- Need to verify work location
- Mobile application used by employees
```

#### 3.2.2 Necessity and Proportionality Assessment

```markdown
## 2. Necessity and Proportionality Assessment

### 2.1 Legal Basis
- Primary: Legitimate interest (GDPR Art. 6(1)(f))
- Secondary: Legal obligation (GDPR Art. 6(1)(c))
- NOT using: Consent (invalid in employment context)

### 2.2 Purpose Limitation
- Purpose: Verify work location at clock-in/out
- Secondary uses: None
- Data not used for: Performance evaluation, disciplinary actions (unless fraud)

### 2.3 Data Minimization
- Only collecting: Lat/long, timestamp, accuracy, device ID
- Not collecting: Continuous location, altitude, speed, heading
- Precision limited to: [SPECIFY PRECISION]

### 2.4 Storage Limitation
- Retention period: 4 years (Spanish legal requirement)
- Justification: Royal Decree-Law 8/2019
- Deletion method: Secure erasure after retention period

### 2.5 Information Provided to Employees
- Written geolocation policy
- In-app notifications
- Training materials
- Works Council consultation
```

#### 3.2.3 Risk Assessment

```markdown
## 3. Risk Assessment

### 3.1 Identified Risks

| Risk | Likelihood | Severity | Risk Level |
|------|------------|----------|------------|
| Unauthorized access to location data | Low | High | Medium |
| Excessive data collection | Low | High | Medium |
| Function creep (using data for other purposes) | Medium | High | High |
| Employee privacy invasion | Medium | Medium | Medium |
| Data breach exposing location history | Low | High | Medium |
| Inaccurate location data leading to disputes | Medium | Medium | Medium |

### 3.2 Risk Sources
- External attackers
- Insider threats
- Technical failures
- Process failures
- Misuse by management
```

#### 3.2.4 Mitigation Measures

```markdown
## 4. Mitigation Measures

### 4.1 Technical Measures
- Encryption of location data at rest
- Encryption of location data in transit
- Role-based access controls
- Audit logging of all access
- Automatic deletion after retention period
- Precision limitation to necessary level
- Event-only capture (not continuous)

### 4.2 Organizational Measures
- Written geolocation policy
- Employee training
- Works Council consultation
- Regular compliance audits
- Access review procedures
- Incident response plan
- DPO appointment (if applicable)

### 4.3 Residual Risks

| Risk | Original Level | Residual Level | Acceptable? |
|------|----------------|----------------|-------------|
| Unauthorized access | Medium | Low | Yes |
| Excessive collection | Medium | Low | Yes |
| Function creep | High | Medium | Yes with monitoring |
| Privacy invasion | Medium | Low | Yes |
| Data breach | Medium | Low | Yes |
| Inaccurate data | Medium | Low | Yes |
```

#### 3.2.5 Conclusion and Sign-Off

```markdown
## 5. Conclusion and Sign-Off

### 5.1 DPO/Legal Counsel Opinion
[TO BE COMPLETED BY TENANT]

### 5.2 Works Council Consultation
[TO BE COMPLETED BY TENANT]

### 5.3 Decision
Based on this assessment, the implementation of geolocation tracking in Torre Tempo:
- [ ] Can proceed as described
- [ ] Can proceed with additional safeguards
- [ ] Cannot proceed in current form

### 5.4 Sign-Off
- Assessor: [NAME, POSITION]
- DPO/Legal: [NAME, POSITION]
- Management: [NAME, POSITION]
- Date: [DATE]
```

### 3.3 Who Must Conduct DPIA

The DPIA must be conducted by:
- The tenant's Data Protection Officer (if appointed)
- Legal counsel with data protection expertise
- HR and IT stakeholders with system knowledge

Torre Tempo provides:
- DPIA template
- Technical system documentation
- Implementation guidance

**Implementation Requirement:**
- Tenant must complete DPIA
- Platform stores completed DPIA
- Platform enforces DPIA completion before enabling high-risk features

### 3.4 When to Update DPIA

DPIA must be updated when:
- Material changes to processing operations
- New risks identified
- New technology implemented
- New uses of data considered
- At least annually as best practice

**Implementation Requirement:**
- Annual DPIA review reminder
- DPIA update required for significant system changes
- Version control for all DPIAs

---

## 4. Works Council Consultation

### 4.1 Legal Requirement

Spanish labor law requires consultation with Works Councils (Comité de Empresa) or employee representatives before implementing systems that can monitor employee activities.

**Legal Basis:**
- Workers' Statute (Estatuto de los Trabajadores)
- LOPDGDD Article 91 (Digital rights in employment)
- Case law from Spanish Supreme Court

**Implementation Requirement:**
- Consultation must occur BEFORE implementing geolocation
- Documentation of consultation must be stored
- Concerns must be addressed before proceeding

### 4.2 What Must Be Disclosed

The consultation must include:

1. **Purpose of Geolocation:**
   - Verification of work location
   - Compliance with time tracking laws
   - Prevention of time fraud

2. **Technical Implementation:**
   - Event-only capture (not continuous)
   - Data stored and for how long
   - Who can access the data
   - Security measures in place

3. **Employee Impact:**
   - How employees will be notified
   - What employees will see in the app
   - How disputes will be handled
   - Employee rights regarding data

4. **Limitations and Safeguards:**
   - No tracking outside work hours
   - No tracking between clock-in/out
   - No excessive precision
   - No automated decisions based solely on location

### 4.3 Consultation Process Template

```markdown
# Works Council Consultation: Torre Tempo Geolocation

## 1. Consultation Meeting

### 1.1 Meeting Details
- Date: [DATE]
- Location: [LOCATION]
- Company Representatives: [NAMES]
- Works Council Representatives: [NAMES]

### 1.2 System Introduction
- Torre Tempo overview
- Geolocation functionality explanation
- Demo of employee experience
- Technical implementation details

## 2. Works Council Questions and Concerns

### 2.1 Questions Raised
[DOCUMENT QUESTIONS]

### 2.2 Concerns Expressed
[DOCUMENT CONCERNS]

### 2.3 Company Responses
[DOCUMENT RESPONSES]

## 3. Agreed Modifications

### 3.1 Technical Modifications
[DOCUMENT ANY CHANGES TO IMPLEMENTATION]

### 3.2 Policy Modifications
[DOCUMENT ANY CHANGES TO POLICIES]

### 3.3 Additional Safeguards
[DOCUMENT ADDITIONAL SAFEGUARDS]

## 4. Final Agreement

### 4.1 Implementation Plan
- Start Date: [DATE]
- Pilot Group: [DETAILS]
- Full Rollout: [DATE]
- Review Period: [TIMEFRAME]

### 4.2 Monitoring and Reporting
- Regular reports to Works Council: [FREQUENCY]
- Metrics to be shared: [METRICS]
- Review meetings: [SCHEDULE]

### 4.3 Signatures
- Company Representative: [NAME, SIGNATURE, DATE]
- Works Council Representative: [NAME, SIGNATURE, DATE]
```

### 4.4 Documentation Requirements

The consultation must be documented with:
- Meeting minutes
- Questions and answers
- Concerns raised and addressed
- Any modifications agreed upon
- Final agreement (signed if possible)

**Implementation Requirement:**
- Store documentation in compliance_documents table
- Make documentation available to labor inspectors if requested
- Reference documentation in DPIA

### 4.5 What If No Works Council Exists

For smaller companies without a Works Council:
- Consult with employee representatives if they exist
- If no representatives, conduct direct employee information session
- Document the information provided and questions answered
- Collect acknowledgment from employees

**Implementation Requirement:**
- Alternative consultation template for small companies
- Employee acknowledgment tracking
- Documentation storage in compliance_documents table

### 4.6 Timeline

The consultation should follow this timeline:
1. Prepare documentation (2-4 weeks before implementation)
2. Initial consultation meeting (3-4 weeks before implementation)
3. Address concerns (1-2 weeks)
4. Follow-up meeting if needed (1-2 weeks before implementation)
5. Final agreement (before implementation)
6. Implementation
7. Review meeting (1-3 months after implementation)

**Implementation Requirement:**
- Timeline template provided to tenants
- Reminder system for key milestones
- Documentation of each step

---

## 5. Data Retention and Deletion

### 5.1 Legal Retention Requirements

#### Spanish Labor Law (RDL 8/2019)
- **Minimum retention:** 4 years for all time records
- **Scope:** All clock-in/out records, breaks, total hours
- **Accessibility:** Must remain accessible to labor inspectors
- **Format:** Must remain in readable, verifiable format

#### GDPR Storage Limitation Principle
- Data kept no longer than necessary for purposes
- Balanced against legal retention requirements
- Anonymization as alternative to deletion where appropriate

**Implementation Requirement:**
- System enforces 4-year minimum retention
- No manual deletion of records within retention period
- Automatic flagging of records eligible for deletion

### 5.2 Configurable Retention Period

Torre Tempo allows configurable retention periods:
- **Minimum:** 4 years (non-configurable, system-enforced)
- **Maximum:** 10 years (configurable by tenant)
- **Default:** 4 years

**Implementation Requirement:**
- Tenant settings for retention period
- Clear explanation of legal minimum
- Automatic enforcement of minimum

### 5.3 Automatic Retention Enforcement

The system automatically enforces retention:
- Records flagged for deletion after retention period
- Soft-deleted records hidden from normal view
- Hard deletion executed after grace period
- Deletion process logged in audit trail

**Implementation Requirement:**
- Automated retention job (daily)
- Notification before deletion
- Option to export before deletion
- Comprehensive deletion logging

### 5.4 GDPR Right to Erasure Exceptions

The GDPR right to erasure (Article 17) is limited by:
- Legal obligation to retain for 4 years (Article 17(3)(b))
- Establishment of legal claims (Article 17(3)(e))

**Implementation for Employee Deletion Requests:**
1. Acknowledge request within 30 days
2. Explain legal retention requirement
3. Offer restricted processing instead
4. Document decision and communication
5. Review when retention period expires

**Implementation Requirement:**
- Template response for deletion requests
- Process for restricted processing
- Documentation in compliance_documents table

### 5.5 Soft Delete vs. Hard Delete

#### Soft Delete
- Record marked as deleted but remains in database
- Not visible in normal operations
- Accessible only to authorized administrators
- Used during retention period

#### Hard Delete
- Permanent removal from database
- Executed after retention period expires
- Includes all personal data
- Anonymized statistical data may be retained

**Implementation Requirement:**
- Clear distinction in database schema
- Proper indexing to exclude soft-deleted records
- Secure hard deletion process

### 5.6 Archive Strategy

For long-term storage of old data:
- After 2 years: Move to archive tables
- After 4 years: Hard delete or anonymize
- Archive tables: Optimized for infrequent access
- Archive exports: Available for legal proceedings

**Implementation Requirement:**
- Automated archiving process
- Performance optimization for archive tables
- Secure archive access controls

### 5.7 Backup Retention Policies

Backup retention must align with data retention:
- Operational backups: 30 days
- Monthly backups: 1 year
- Annual backups: 4 years
- Backup deletion: Verified and logged

**Implementation Requirement:**
- Backup schedule and retention policy
- Secure backup storage
- Verified deletion process
- Backup restoration testing

---

## 6. Append-Only Audit Trail

### 6.1 Immutable Audit Log Requirement

An immutable audit trail is required for:
- Legal defensibility in labor inspections
- GDPR accountability principle
- Evidence in employee disputes
- Security incident investigation

**Implementation Requirement:**
- Append-only design (no updates, no deletes)
- Comprehensive event capture
- Tamper-evident storage
- Secure access controls

### 6.2 What Must Be Logged

#### Time Entry Events
- Clock-in/out creation
- Time entry modification (with before/after values)
- Approval/rejection actions
- Correction requests and responses
- Geolocation captures

#### Employee Data Events
- Profile creation/modification
- Permission changes
- Account status changes
- Data export requests
- Deletion requests

#### System Events
- Login/logout (with IP address)
- Failed login attempts
- Permission changes
- Configuration changes
- Data exports

#### Administrative Events
- Tenant settings changes
- Module enablement/disablement
- User role changes
- Bulk operations
- Report generation

### 6.3 Audit Log Data Model

The audit_logs table captures all events:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  
  -- Who
  user_id UUID REFERENCES users(id),
  user_email VARCHAR(255),
  user_ip VARCHAR(45),
  user_agent TEXT,
  
  -- What
  action VARCHAR(100) NOT NULL, -- 'create', 'update', 'delete', 'login', etc.
  entity_type VARCHAR(100) NOT NULL, -- 'time_entry', 'employee', 'tenant', etc.
  entity_id UUID NOT NULL,
  
  -- Details
  changes JSONB, -- Before/after values
  metadata JSONB, -- Additional context
  
  -- When
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Implementation Requirement:**
- Automatic logging via middleware
- Comprehensive entity coverage
- Detailed change tracking
- Performance optimization for high volume

### 6.4 Retention Period for Audit Logs

Audit logs must be retained:
- **Minimum:** Same as related data (4+ years)
- **Recommended:** 1 additional year beyond data retention
- **Archiving:** After 2 years, move to archive tables

**Implementation Requirement:**
- Aligned retention policies
- Archive strategy for old logs
- Performance optimization for large log volumes

### 6.5 Access Controls

Access to audit logs is restricted:
- **Employees:** Own actions only
- **Managers:** Team member actions
- **Admins:** All tenant logs
- **Platform Owners:** Emergency access only

**Implementation Requirement:**
- Role-based access control
- Purpose limitation for access
- Logging of audit log access (meta-audit)

### 6.6 Tamper-Proof Design

The audit system is designed to be tamper-proof:
- Append-only implementation
- No update/delete operations
- Database-level restrictions
- Separate security context for audit system

**Technical Implementation:**
- Database constraints preventing modification
- Separate service account for audit writing
- Checksum verification for log integrity
- Regular integrity checks

### 6.7 Audit Log API

The audit log API provides:
- Filtered search by entity, action, date
- Pagination for large result sets
- Export functionality for investigations
- Detail view with full context

**Implementation Requirement:**
- Performance optimization for queries
- Comprehensive filtering options
- Secure access controls
- Export rate limiting

---

## 7. Employee Rights (GDPR Articles 15-22)

### 7.1 Right to Access (Article 15)

Employees have the right to access:
- All personal data stored about them
- Purpose of processing
- Recipients of data
- Retention period
- Source of data not collected from them

**Implementation in Torre Tempo:**
- Self-service employee portal
- Complete data view
- Export functionality (JSON, CSV, PDF)
- Metadata and processing information
- Audit log of their records

**Technical Requirements:**
- Comprehensive data gathering across tables
- Performance optimization for large datasets
- Proper authentication before access
- Logging of access requests

### 7.2 Right to Rectification (Article 16)

Employees have the right to correct inaccurate data:
- Personal profile information
- Time entry corrections
- Location data disputes

**Implementation in Torre Tempo:**
- Self-service correction for profile data
- Correction request workflow for time entries
- Manager approval process
- Audit trail of all corrections
- Notification of approval/rejection

**Technical Requirements:**
- Validation of correction requests
- Approval workflow
- Before/after value tracking
- Notification system

### 7.3 Right to Erasure (Article 17)

Employees have a limited right to erasure due to:
- Legal obligation to retain time records (4 years)
- Legitimate interests of employer

**Implementation in Torre Tempo:**
- Request process for erasure
- Clear explanation of legal limitations
- Alternative: Restricted processing
- Execution after retention period
- Full documentation of decision

**Technical Requirements:**
- Request tracking system
- Legal basis documentation
- Automated execution after retention
- Secure deletion process

### 7.4 Right to Restriction (Article 18)

Employees can request restriction of processing when:
- Data accuracy is contested
- Processing is unlawful but deletion not wanted
- Data no longer needed but required for legal claims

**Implementation in Torre Tempo:**
- Flag records as "restricted"
- Limited visibility of restricted data
- Clear visual indication of restriction
- Process to lift restriction
- Audit trail of restriction actions

**Technical Requirements:**
- Database flags for restricted records
- Modified queries to respect restrictions
- UI indicators for restricted data
- Workflow for managing restrictions

### 7.5 Right to Data Portability (Article 20)

Employees have the right to receive their data in a structured format:
- Personal profile data
- Time entries
- Schedule information
- Performance data

**Implementation in Torre Tempo:**
- Export functionality in multiple formats
- Complete dataset export
- Machine-readable format (JSON)
- Human-readable format (PDF)
- Secure download process

**Technical Requirements:**
- Comprehensive data gathering
- Multiple format support
- Performance optimization for large exports
- Rate limiting to prevent abuse

### 7.6 Right to Object (Article 21)

Employees have a limited right to object to processing:
- Geolocation capture can be objected to
- Objection must be balanced against legal requirements
- Alternative measures may be required

**Implementation in Torre Tempo:**
- Objection request process
- Documentation of objections
- Alternative measures where possible
- Clear communication of decisions
- Appeal process for rejected objections

**Technical Requirements:**
- Request tracking system
- Alternative processing options
- Documentation storage
- Communication templates

### 7.7 Automated Decision-Making (Article 22)

Torre Tempo does not implement fully automated decision-making:
- All significant decisions require human review
- Automated flags require human confirmation
- Employees are informed of automation logic
- Human override always available

**Implementation Requirements:**
- Clear indication of automated processes
- Human review step in all workflows
- Explanation of automation criteria
- Appeal process for automated flags

### 7.8 Implementation Guide

#### Response Timeline
- Acknowledge requests within 72 hours
- Fulfill requests within 30 days
- Extension possible for complex requests (additional 60 days)
- Document all communication

#### Request Verification
- Verify identity before processing requests
- Secure communication channels
- Documentation of verification process
- Rejection of unverified requests

#### Request Tracking
- Log all requests in audit_logs
- Track status and resolution
- Document decision rationale
- Maintain communication history

**Technical Requirements:**
- Request management system
- Status tracking
- Documentation storage
- Communication templates

---

## 8. Inspector-Readiness Mode

### 8.1 What Labor Inspectors Look For

Spanish labor inspectors typically examine:
- Complete time records for all employees
- Evidence of 4-year retention compliance
- Immutable audit trail for modifications
- Geolocation compliance documentation
- Employee consent/transparency evidence
- Works Council consultation documentation
- DPIA for high-risk processing

**Implementation Requirement:**
- Inspector-ready reports
- Documentation organization
- Quick access to compliance evidence
- Comprehensive audit trail

### 8.2 Compliance Bundle Export (Module 2 Feature)

The Compliance Pack module provides:
- **Signed PDF Export:**
  - Digital signature for authenticity
  - Tamper-evident format
  - Official timestamp
  - Sequential page numbering

- **Bundle Contents:**
  - All time entries for inspection period
  - Modification audit trail
  - Approval history
  - Geolocation records (if enabled)
  - Employee acknowledgments
  - System configuration evidence

- **Export Process:**
  - Date range selection
  - Employee selection
  - Department filtering
  - Format options
  - Delivery options

**Technical Requirements:**
- Digital signature integration
- PDF generation optimization
- Large dataset handling
- Secure delivery mechanism

### 8.3 How to Prepare for Inspection

#### Before Inspection Notice
- Regular compliance self-audits
- Documentation organization
- DPIA completion and review
- Works Council consultation documentation
- Employee acknowledgment tracking
- Audit log review

#### Upon Inspection Notice
- Identify inspection scope
- Prepare relevant documentation
- Generate compliance bundle
- Review for completeness
- Prepare explanation of system
- Identify responsible personnel

#### During Inspection
- Demonstrate system functionality
- Show audit trail capabilities
- Explain compliance measures
- Provide requested exports
- Document inspector questions
- Address any concerns raised

**Implementation Requirement:**
- Inspection preparation checklist
- Documentation templates
- Quick-access compliance dashboard
- Contact information for support

### 8.4 Common Inspection Failures and How to Avoid Them

#### Incomplete Records
- **Failure:** Missing clock-in/out for some days
- **Prevention:** Daily completeness check
- **System Feature:** Missing entry alerts

#### Unapproved Modifications
- **Failure:** Changes without proper approval
- **Prevention:** Strict approval workflow
- **System Feature:** Approval enforcement

#### Insufficient Audit Trail
- **Failure:** Unable to show who changed what and when
- **Prevention:** Comprehensive audit logging
- **System Feature:** Detailed audit reports

#### Geolocation Non-Compliance
- **Failure:** Continuous tracking or missing transparency
- **Prevention:** Event-only tracking, clear notices
- **System Feature:** Compliant geolocation implementation

#### Missing Documentation
- **Failure:** Unable to produce DPIA or Works Council documentation
- **Prevention:** Document storage in system
- **System Feature:** compliance_documents table

**Implementation Requirement:**
- Pre-inspection checklist
- Common failure prevention guide
- Self-audit functionality
- Documentation completeness verification

---

## 9. Security and Encryption

### 9.1 Data Encryption at Rest

All sensitive data is encrypted at rest:
- Employee personal data
- Geolocation coordinates
- Authentication credentials
- Audit logs

**Implementation:**
- Database-level encryption
- Transparent Data Encryption (TDE)
- Field-level encryption for sensitive fields
- Secure key management

**Technical Requirements:**
- PostgreSQL encryption
- Key rotation procedures
- Encryption performance optimization
- Backup encryption

### 9.2 Data Encryption in Transit

All data is encrypted in transit:
- HTTPS/TLS for all web traffic
- Minimum TLS 1.2, preferred TLS 1.3
- Strong cipher suites
- Certificate validation

**Implementation:**
- TLS termination at load balancer
- HSTS implementation
- Certificate automation
- Regular security scanning

**Technical Requirements:**
- Nginx TLS configuration
- Certificate management
- Cipher suite selection
- Regular vulnerability scanning

### 9.3 Geolocation Data Encryption

Geolocation data receives special protection:
- Field-level encryption in database
- Separate encryption keys
- Strict access controls
- Minimal retention in client

**Implementation:**
- Application-level encryption
- Purpose-specific keys
- Key rotation procedures
- Access logging

**Technical Requirements:**
- Encryption library selection
- Key management system
- Performance optimization
- Secure key storage

### 9.4 Access Controls

Access is controlled through:
- Role-Based Access Control (RBAC)
- Principle of least privilege
- Just-in-time access for administrators
- Regular access review

**Implementation:**
- Granular permission system
- Role hierarchy
- Permission inheritance
- Access request workflow

**Technical Requirements:**
- Permission enforcement at API level
- UI adaptation to permissions
- Permission audit logging
- Regular permission review

### 9.5 Authentication Requirements

Authentication is secured through:
- Strong password policies
- Multi-factor authentication (MFA) for admins
- Session management
- Account lockout protection

**Implementation:**
- Password strength enforcement
- MFA integration
- Session timeout controls
- Brute force protection

**Technical Requirements:**
- Authentication service
- MFA integration
- Session management
- Account security monitoring

### 9.6 Session Management

Sessions are secured through:
- Short session timeouts
- Secure cookie attributes
- Invalidation on password change
- Device tracking

**Implementation:**
- Configurable session timeouts
- HTTP-only, secure cookies
- SameSite cookie protection
- Session revocation capability

**Technical Requirements:**
- Session storage mechanism
- Cookie security configuration
- Session tracking
- Forced logout capability

### 9.7 API Security

APIs are secured through:
- Authentication for all endpoints
- Rate limiting
- Input validation
- Output encoding

**Implementation:**
- JWT authentication
- Rate limiting middleware
- Request validation
- Response sanitization

**Technical Requirements:**
- Authentication middleware
- Rate limiting configuration
- Validation library
- Security headers

### 9.8 Backup Encryption

Backups are secured through:
- Encryption before storage
- Secure transfer
- Access controls
- Regular testing

**Implementation:**
- Backup encryption process
- Secure storage location
- Access logging
- Restoration testing

**Technical Requirements:**
- Backup encryption tool
- Secure storage configuration
- Access control implementation
- Restoration verification

### 9.9 Key Management

Encryption keys are managed through:
- Secure key storage
- Regular key rotation
- Separation of duties
- Key backup procedures

**Implementation:**
- Key management service
- Rotation schedule
- Access controls
- Recovery procedures

**Technical Requirements:**
- Key management system
- Rotation automation
- Access logging
- Secure backup

---

## 10. Pre-Launch Compliance Checklist

### 10.1 Legal Documentation

- [ ] DPIA completed and documented
- [ ] Works Council consulted (if applicable)
- [ ] Employee transparency policy written and distributed
- [ ] Geolocation written policy published
- [ ] Privacy policy published and accessible
- [ ] Terms of service documented
- [ ] Data processing agreements with subprocessors

**Implementation Requirement:**
- Document templates provided
- Storage in compliance_documents table
- Version control for all documents
- Distribution tracking

### 10.2 Technical Configuration

- [ ] Data retention policy configured (4+ years)
- [ ] Audit trail tested and verified immutable
- [ ] Geolocation configured as event-only
- [ ] Access controls implemented and tested
- [ ] Encryption verified for sensitive data
- [ ] Authentication security configured
- [ ] Backup and recovery tested

**Implementation Requirement:**
- Configuration checklist
- Technical verification tests
- Documentation of settings
- Security testing

### 10.3 Employee Rights Implementation

- [ ] Employee self-service portal tested
- [ ] Data export functionality verified
- [ ] Correction request workflow tested
- [ ] Objection handling process documented
- [ ] Access request handling tested
- [ ] Response time monitoring implemented

**Implementation Requirement:**
- User acceptance testing
- Process documentation
- Response time tracking
- Training materials

### 10.4 Inspection Readiness

- [ ] Compliance bundle export tested
- [ ] Inspector-ready reports configured
- [ ] Audit log search functionality verified
- [ ] Documentation organized and accessible
- [ ] Staff trained on inspection procedures
- [ ] Contact information for support documented

**Implementation Requirement:**
- Export testing
- Report verification
- Documentation organization
- Training materials

### 10.5 Security Verification

- [ ] Vulnerability assessment completed
- [ ] Penetration testing conducted
- [ ] Security headers implemented
- [ ] TLS configuration verified
- [ ] Access control review completed
- [ ] Logging and monitoring configured

**Implementation Requirement:**
- Security testing procedures
- Remediation tracking
- Configuration verification
- Monitoring setup

### 10.6 Final Verification

- [ ] GDPR/LOPDGDD compliance verified by legal counsel
- [ ] RDL 8/2019 compliance verified
- [ ] Technical implementation reviewed by security expert
- [ ] User acceptance testing completed
- [ ] Incident response plan documented
- [ ] Data breach notification procedure documented

**Implementation Requirement:**
- Final review checklist
- Sign-off procedure
- Documentation of verification
- Go-live criteria

### 10.7 Post-Launch Monitoring

- [ ] Compliance monitoring schedule established
- [ ] Regular audit procedures documented
- [ ] Periodic review schedule set
- [ ] Feedback mechanism implemented
- [ ] Compliance update process defined
- [ ] Regulatory change monitoring process

**Implementation Requirement:**
- Monitoring schedule
- Review procedures
- Feedback collection
- Update process

---

## Appendix A: Regulatory References

### A.1 GDPR Key Articles

- **Article 5:** Principles of processing
- **Article 6:** Lawfulness of processing
- **Article 9:** Special categories of data
- **Article 12-14:** Information provisions
- **Article 15-22:** Data subject rights
- **Article 24:** Responsibility of the controller
- **Article 25:** Data protection by design and default
- **Article 30:** Records of processing activities
- **Article 32:** Security of processing
- **Article 35:** Data protection impact assessment
- **Article 37-39:** Data Protection Officer

### A.2 LOPDGDD Key Articles

- **Article 87:** Right to digital disconnection
- **Article 88:** Right to privacy in digital device usage
- **Article 89:** Right to privacy against video surveillance
- **Article 90:** Right to privacy against geolocation systems
- **Article 91:** Digital rights in employment relationships

### A.3 Royal Decree-Law 8/2019 Key Provisions

- **Article 10:** Working time registration
- **Article 11:** Social Security violations and sanctions

### A.4 AEPD Guidelines and Decisions

- Guide on the use of cookies
- Guide on data processing in employment relationships
- Guide on DPIAs
- Guidance on geolocation in employment context
- Relevant enforcement decisions

---

## Appendix B: Document Templates

### B.1 Employee Privacy Notice

```markdown
# Employee Privacy Notice: Torre Tempo Time Tracking System

## 1. Who We Are
[COMPANY NAME] is the data controller for your personal data processed in the Torre Tempo system.

## 2. What Data We Collect
- Personal details (name, employee ID, contact information)
- Employment details (position, department, manager)
- Time tracking data (clock-in/out times, breaks, total hours)
- Geolocation data at clock-in/out (if enabled)
- Device information (device ID, IP address)

## 3. Why We Process Your Data
- To comply with Spanish labor law (RDL 8/2019)
- To manage working time and attendance
- To calculate payroll accurately
- To ensure workplace safety and security
- To manage workforce effectively

## 4. Our Legal Basis
- Legal obligation (RDL 8/2019)
- Legitimate interests (accurate time recording, fraud prevention)
- Contract performance (employment contract)

## 5. How Long We Keep Your Data
- Time records: Minimum 4 years (legal requirement)
- Personal data: Duration of employment plus 4 years
- Audit logs: 4+ years

## 6. Who Has Access
- Your direct manager
- HR department
- Payroll processors
- System administrators
- Labor inspectors (when legally required)

## 7. Your Rights
- Access your data
- Request corrections
- Export your data
- Object to processing (with limitations)
- Lodge a complaint with the AEPD

## 8. How to Exercise Your Rights
To exercise your rights, please contact:
[DPO/HR CONTACT INFORMATION]

## 9. Changes to This Notice
We will notify you of any significant changes to this privacy notice.

Last updated: [DATE]
```

### B.2 Data Breach Response Plan

```markdown
# Data Breach Response Plan

## 1. Breach Detection and Reporting
- Immediate reporting to [SECURITY CONTACT]
- Initial assessment within 24 hours
- Containment measures implemented immediately
- Documentation of breach circumstances

## 2. Severity Assessment
- Data types affected
- Number of data subjects affected
- Potential harm to individuals
- Systemic vulnerabilities exposed

## 3. Notification Requirements
- AEPD: Within 72 hours of detection (if required)
- Affected individuals: Without undue delay (if high risk)
- Documentation of notification decisions

## 4. Containment and Recovery
- Immediate technical measures
- Access restriction
- System isolation if necessary
- Evidence preservation

## 5. Investigation
- Root cause analysis
- Extent of breach determination
- Impact assessment
- Documentation of findings

## 6. Remediation
- Technical fixes
- Process improvements
- Training updates
- Preventive measures

## 7. Documentation
- Complete breach register entry
- Investigation report
- Notification records
- Remediation actions

## 8. Contact Information
- Data Protection Officer: [CONTACT]
- IT Security: [CONTACT]
- Legal Counsel: [CONTACT]
- AEPD: [CONTACT]
```

---

## Appendix C: Compliance FAQs

### C.1 General Compliance

**Q: Is Torre Tempo GDPR compliant?**  
A: Yes, Torre Tempo is designed for GDPR compliance with features including data minimization, purpose limitation, storage limitation, and data subject rights implementation. However, tenants must use the system appropriately and complete required documentation.

**Q: Is Torre Tempo compliant with Spanish labor law?**  
A: Yes, Torre Tempo is specifically designed to comply with Royal Decree-Law 8/2019 regarding time tracking requirements, including 4-year retention, complete time records, and immutable audit trails.

**Q: Do we need a Data Protection Officer (DPO)?**  
A: The need for a DPO depends on your organization's size and processing activities. If you process large amounts of employee data or use extensive monitoring, a DPO is recommended or may be required.

### C.2 Geolocation

**Q: Can we track employees continuously?**  
A: No. Continuous tracking is disproportionate and likely illegal under GDPR/LOPDGDD. Torre Tempo only captures location at clock-in/out events.

**Q: Do we need employee consent for geolocation?**  
A: No. Consent is not a valid legal basis in employment contexts due to the power imbalance. Torre Tempo uses legitimate interest and legal obligation as the legal basis.

**Q: Is geolocation mandatory in Torre Tempo?**  
A: No. Geolocation is configurable per tenant and can be disabled entirely.

### C.3 Data Retention

**Q: Can we delete time records before 4 years?**  
A: No. Spanish labor law requires a minimum 4-year retention period for time records.

**Q: What happens to data after the retention period?**  
A: After the configured retention period (minimum 4 years), data is eligible for hard deletion or anonymization.

**Q: Can employees request deletion of their time records?**  
A: Employees can request deletion, but the legal obligation to retain records for 4 years overrides this right during the retention period.

### C.4 Inspections

**Q: What should we do if we receive a labor inspection notice?**  
A: Use the Inspector-Readiness Mode to prepare compliance bundles, organize documentation, and ensure all records are complete and accurate.

**Q: Can inspectors access Torre Tempo directly?**  
A: No. Inspectors should be provided with exports and documentation rather than direct system access.

**Q: What are the most common compliance issues found in inspections?**  
A: Common issues include incomplete records, unauthorized modifications, insufficient audit trails, and missing documentation (DPIA, Works Council consultation).

---

## Legal Disclaimer

This document provides guidance based on current understanding of applicable regulations as of February 2026. It does not constitute legal advice. Tenants should consult with qualified legal counsel to ensure compliance with all applicable laws in their specific circumstances.

Torre Tempo provides the technical foundation for compliance, but proper configuration, documentation, and usage remain the responsibility of each tenant.

© 2026 Lakeside La Torre Murcia Group SL. All rights reserved.