REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE
  public.activity_logs,
  public.biometric_devices,
  public.biometric_student_mappings,
  public.fee_payment_transactions,
  public.fee_structures,
  public.school_payment_settings,
  public.school_requests,
  public.school_settings
FROM authenticated;
