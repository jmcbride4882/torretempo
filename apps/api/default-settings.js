module.exports = {
  company: {
    controller_legal_name: "",
    controller_cif: "",
    controller_address: "",
    controller_contact_email: "",
    controller_contact_phone: "",
    has_dpo: false,
    dpo_name: "",
    dpo_email: "",
    dpo_phone: ""
  },
  representatives: {
    has_worker_reps: false,
    reps_consultation_record: "",
    no_reps_statement: "",
    recording_method_version: "",
    recording_method_effective_date: ""
  },
  time: {
    standard_daily_hours: 8,
    standard_weekly_hours: 40,
    break_rules: {
      min_break_minutes: 30,
      paid_breaks: false,
      break_threshold_hours: 6
    },
    overtime_policy: {
      daily_overtime_threshold: 8,
      weekly_overtime_threshold: 40,
      approval_required: true
    },
    payroll_provider_name: "",
    part_time_monthly_summary_delivery_method: "payroll_attachment"
  },
  geo: {
    geo_capture_events: ["clock_in", "clock_out", "break_start", "break_end"],
    geo_precision: "exact",
    geo_approx_radius_meters: 250,
    geo_visibility_roles: ["HR", "Manager"],
    geo_retention_years: 4,
    geo_notice_version: ""
  },
  privacy: {
    data_retention_years: 4,
    legal_hold_enabled: true,
    privacy_notice_version: "",
    byod_policy_version: "",
    disconnection_policy_version: "",
    record_of_processing_version: ""
  },
  hosting: {
    hosting_provider: "",
    hosting_region: "EU",
    subprocessors_list: [],
    data_processing_agreement_ref: ""
  },
  email: {
    reset_url_base: "https://time.lsltgroup.es/reset.html",
    smtp_host: "",
    smtp_port: 587,
    smtp_secure: false,
    smtp_user: "",
    smtp_pass: "",
    smtp_from: ""
  },
  rota: {
    reminders_enabled: true,
    checkin_lead_minutes: 30,
    checkout_lead_minutes: 15,
    scheduler_interval_minutes: 5
  },
  exports: {
    inspectorate_export_format: "pdf_csv",
    export_signature_method: "hash_checksum",
    audit_log_retention_years: 4,
    cert_path: "",
    cert_password: "",
    cert_original_name: "",
    cert_uploaded_at: ""
  }
};
