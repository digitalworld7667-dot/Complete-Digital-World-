CREATE INDEX IF NOT EXISTS idx_biometric_devices_created_by_fk
  ON public.biometric_devices (created_by);

CREATE INDEX IF NOT EXISTS idx_biometric_student_mappings_device_school_fk
  ON public.biometric_student_mappings (device_id, school_id);

CREATE INDEX IF NOT EXISTS idx_biometric_student_mappings_student_school_fk
  ON public.biometric_student_mappings (student_id, school_id);

CREATE INDEX IF NOT EXISTS idx_biometric_student_mappings_created_by_fk
  ON public.biometric_student_mappings (created_by);
