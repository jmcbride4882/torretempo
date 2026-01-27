# Inspectorate Export Specification

Purpose: Provide a consistent, audit ready export pack for ITSS requests.

## Export package structure
- /exports/{org}/{yyyy-mm}/
  - time_records.csv
  - breaks.csv
  - geolocation_events.csv
  - audit_log.csv
  - summary.pdf
  - checksums.txt

## PDF pack
The API can also generate a signed PDF pack with a SHA-256 HMAC signature embedded in the document.

## time_records.csv
Columns
- employee_id
- employee_name
- employee_nif
- date
- start_time
- end_time
- timezone
- total_work_minutes
- total_break_minutes
- overtime_minutes
- part_time_flag
- schedule_id
- status

## breaks.csv
Columns
- employee_id
- date
- break_start
- break_end
- paid_flag

## geolocation_events.csv
Columns
- employee_id
- event_type (clock_in|clock_out|break_start|break_end)
- timestamp
- latitude
- longitude
- accuracy_meters
- device_id

## audit_log.csv
Columns
- timestamp
- actor_id
- actor_role
- action
- entity_type
- entity_id
- old_value
- new_value
- reason

## summary.pdf
Required sections
- Company identification
- Recording method and effective date
- Monthly totals per employee
- Overtime summary
- Part time summary totals

## checksums.txt
- SHA-256 checksums for all files
- Signed with selected export_signature_method

## Compliance requirements
- 4 year retention minimum
- Records available to employees, representatives, and ITSS
