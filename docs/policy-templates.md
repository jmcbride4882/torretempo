# Policy and Notice Templates (Placeholders)

Placeholders use {{key}} names that map to admin settings.

## Time Recording Policy (ET art. 34.9)
Title: Time Recording Method

Company: {{controller_legal_name}} (CIF {{controller_cif}})
Effective date: {{recording_method_effective_date}}
Version: {{recording_method_version}}

Purpose
This policy defines the time recording method to comply with ET art. 34.9 and 12.4.

Recording method
- Daily records include start and end time for each employee.
- Breaks are recorded according to configured break rules.
- Corrections require a reason and manager approval.

Representatives consultation
[If has_worker_reps]
The method was consulted with worker representatives on {{reps_consultation_record}}.
[If not has_worker_reps]
No worker representatives exist. This method is set by employer decision and documented as: {{no_reps_statement}}.

Retention and access
- Records and monthly summaries are retained for at least {{data_retention_years}} years.
- Records are available to employees, their legal representatives, and ITSS upon request.

Part time summary
- Daily records are totaled monthly and delivered with payroll.
- Monthly summaries are retained for at least {{data_retention_years}} years.

## Employee Privacy Notice (GDPR arts. 12-15)
Controller
{{controller_legal_name}} (CIF {{controller_cif}})
{{controller_address}}
Contact: {{controller_contact_email}} / {{controller_contact_phone}}

[If has_dpo]
DPO: {{dpo_name}}, {{dpo_email}}, {{dpo_phone}}

Purpose of processing
- Time recording and compliance with labor law.
- Management of schedules, breaks, overtime, and approvals.
- Geolocation for on clock time events only.

Legal basis
- Legal obligation for time recording.
- Legitimate interest or contract necessity for geolocation limited to on clock events.

Recipients
- Authorized HR, managers, and auditors.
- Service providers listed in subprocessors.

International transfers
- None. Data is hosted in EU regions only.

Retention
- Time records and summaries retained for at least {{data_retention_years}} years.
- Audit logs retained for at least {{audit_log_retention_years}} years.

Rights
Employees can request access, rectification, limitation, and erasure where applicable.
Requests can be sent to {{controller_contact_email}}.

## Geolocation Notice (LOPDGDD art. 90)
Purpose
Geolocation is used only to support time recording authenticity for on clock events.

When location is collected
- Clock in, clock out, break start, break end.

What is collected
- Latitude, longitude, accuracy, timestamp.

Retention
- Geolocation retained for {{geo_retention_years}} years.

Rights
- Access, rectification, limitation, and erasure where applicable.
Requests: {{controller_contact_email}}

## BYOD and Device Use Policy (LOPDGDD art. 87)
Purpose
Defines criteria for use of personal devices for time recording.

Rules
- The app is used only for time recording and related functions.
- The employer accesses device data only for labor compliance and device integrity.
- Employees are informed of usage criteria and privacy safeguards.

Contact
{{controller_contact_email}}

## Digital Disconnection Policy (LOPDGDD art. 88)
Purpose
Guarantee rest time and personal privacy outside working hours.

Rules
- No requirement to respond outside scheduled working hours.
- Notifications are limited to urgent operational needs.
- Managers must respect disconnection windows.

Working hours
- Standard daily hours: {{standard_daily_hours}}
- Standard weekly hours: {{standard_weekly_hours}}

Contact
{{controller_contact_email}}
