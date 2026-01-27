# Admin Compliance Settings

Purpose: Admin portal settings that drive compliance for Lakeside La Torre Murcia Group SL time tracking.

## Activation gate
Time tracking cannot be enabled until all required fields are completed and validated.

## Settings schema

### Company (Controller)
- controller_legal_name (string, required)
- controller_cif (string, required)
- controller_address (string, required)
- controller_contact_email (string, required)
- controller_contact_phone (string, required)
- has_dpo (boolean, required)
- dpo_name (string, required if has_dpo)
- dpo_email (string, required if has_dpo)
- dpo_phone (string, optional)

### Representatives
- has_worker_reps (boolean, required)
- reps_consultation_record (string or file ref, required if has_worker_reps)
- no_reps_statement (string, required if not has_worker_reps)
- recording_method_version (string, required)
- recording_method_effective_date (date, required)

### Time and Payroll
- standard_daily_hours (number, required)
- standard_weekly_hours (number, required)
- break_rules (object, required)
  - min_break_minutes (number)
  - paid_breaks (boolean)
  - break_threshold_hours (number)
- overtime_policy (object, required)
  - daily_overtime_threshold (number)
  - weekly_overtime_threshold (number)
  - approval_required (boolean)
- payroll_provider_name (string, required)
- part_time_monthly_summary_delivery_method (enum, required)
  - payroll_attachment | email | hr_portal

### Geolocation (On Clock Only)
- geo_capture_events (array, required)
  - clock_in | clock_out | break_start | break_end
- geo_precision (enum, required)
  - exact | approx_radius
- geo_approx_radius_meters (number, required if geo_precision = approx_radius)
- geo_visibility_roles (array, required)
- geo_retention_years (number, required, min 4)
- geo_notice_version (string, required)

### Privacy and Compliance
- data_retention_years (number, required, min 4)
- legal_hold_enabled (boolean, required)
- privacy_notice_version (string, required)
- byod_policy_version (string, required)
- disconnection_policy_version (string, required)
- record_of_processing_version (string, required)

### Hosting and Processors
- hosting_provider (string, required)
- hosting_region (string, required, EU)
- subprocessors_list (array, required)
- data_processing_agreement_ref (string or url, required)

### Email and Reset
- reset_url_base (string, optional)
- smtp_host (string, optional)
- smtp_port (number, optional)
- smtp_secure (boolean, optional)
- smtp_user (string, optional)
- smtp_pass (string, optional)
- smtp_from (string, optional)

### Directories
- locations (array)
- departments (array)

### Rota reminders
- reminders_enabled (boolean)
- checkin_lead_minutes (number)
- checkout_lead_minutes (number)
- scheduler_interval_minutes (number)

### Exports and Audit
- inspectorate_export_format (enum, required)
  - pdf | csv | pdf_csv
- export_signature_method (enum, required)
  - company_certificate | hash_checksum
- audit_log_retention_years (number, required, min 4)
- cert_path (string, optional)
- cert_password (string, optional)
- cert_original_name (string, optional)
- cert_uploaded_at (date, optional)

### System updates
- updates_enabled (boolean)
- update_token (string)
- update_script_path (string)
- db import/export (admin actions)

## Validation rules
- data_retention_years >= 4
- geo_retention_years >= 4
- audit_log_retention_years >= 4
- geo_capture_events must be event based only
- if has_worker_reps = false, no_reps_statement is required
- if has_worker_reps = true, reps_consultation_record is required
- time tracking feature flag cannot enable unless all required fields pass

## Policy and notice template mapping
- Time recording policy: Company + Representatives + Time and Payroll
- Employee privacy notice: Company + DPO + Hosting and Processors + Privacy and Compliance
- Geolocation notice: Geolocation + Privacy and Compliance
- BYOD policy: Company + Privacy and Compliance
- Digital disconnection policy: Time and Payroll + Privacy and Compliance
- Record of processing: Company + Hosting and Processors + Privacy and Compliance + Time and Payroll + Geolocation

## Audit trail
- Log all settings changes with actor, timestamp, old and new values
- Provide exportable compliance change log

## Legal references (Spain)
- Estatuto de los Trabajadores art. 34.9 and 12.4
- LISOS art. 7.5 and 40.1.b
- GDPR arts. 5, 6, 12-15, 24-25, 30, 32, 35
- LOPDGDD arts. 87-91
