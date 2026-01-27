# DPIA - Geolocation for Time Recording (On Clock Only)

Company: {{controller_legal_name}} (CIF {{controller_cif}})
Version: {{geo_notice_version}}
Date: {{recording_method_effective_date}}

## 1. Processing description
- Activity: Geolocation for time recording events.
- Scope: Employees using approved devices.
- Events: Clock in, clock out, break start, break end.
- Data: Latitude, longitude, accuracy, timestamp, device id.

## 2. Purpose and lawful basis
Purpose
- Authenticate time records and prevent fraud.

Lawful basis
- Legal obligation for time recording.
- Legitimate interest or contract necessity for geolocation limited to on clock events.

## 3. Data flow
- Collection in mobile app at event time.
- Transmission over TLS to EU region.
- Storage in geo_events with audit log.
- Access limited to authorized roles.

## 4. Necessity and proportionality
- Event based only (no background tracking).
- No geolocation when off clock.
- Precision set to {{geo_precision}}.
- Retention aligned to legal retention period.

## 5. Risk assessment
Risks
- Location misuse or over collection.
- Unauthorized access to location data.
- Data breach or loss.
- Employee monitoring beyond necessity.

## 6. Mitigations
- Collect only on clock events.
- Strict role based access and audit logging.
- Encryption in transit and at rest.
- Retention limited to {{geo_retention_years}} years.
- Employee notice delivered before use.
- No biometrics or background tracking.

## 7. Residual risk
- Residual risk is assessed as {{residual_risk_level}}.
- Decision: {{residual_risk_decision}}.

## 8. Consultation
- Worker representatives: {{has_worker_reps}}.
- Consultation record: {{reps_consultation_record}}.

## 9. Approval
- Approved by: {{dpia_approver_name}}
- Date: {{dpia_approval_date}}
