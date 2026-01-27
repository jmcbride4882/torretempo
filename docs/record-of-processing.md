# Record of Processing Activities (GDPR art. 30)

Controller
- {{controller_legal_name}} (CIF {{controller_cif}})
- {{controller_address}}
- Contact: {{controller_contact_email}} / {{controller_contact_phone}}

[If has_dpo]
DPO: {{dpo_name}}, {{dpo_email}}, {{dpo_phone}}

## Processing activity 1: Time recording and compliance
Purpose
- Record daily start and end times, breaks, and totals.

Data subjects
- Employees of Lakeside La Torre Murcia Group SL.

Categories of data
- Identity and employment details.
- Time entries, breaks, schedules, approvals.
- Audit log entries.

Recipients
- HR, managers, auditors.
- Processors listed in subprocessors_list.

Retention
- Time records and summaries: {{data_retention_years}} years.
- Audit logs: {{audit_log_retention_years}} years.

Security measures
- RBAC, MFA for admins.
- Encryption in transit and at rest.
- Audit logging for sensitive access.

## Processing activity 2: Geolocation for on clock events
Purpose
- Authenticate time records for on clock events only.

Data subjects
- Employees using the mobile app.

Categories of data
- Geolocation events (lat, lon, accuracy, timestamp, device id).

Recipients
- Authorized HR and managers; processors listed in subprocessors_list.

Retention
- Geolocation: {{geo_retention_years}} years.

Security measures
- Access controls and logging.
- TLS in transit, encryption at rest.
