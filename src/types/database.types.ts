export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          actor_profile_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          new_data: Json | null
          old_data: Json | null
          school_id: string | null
        }
        Insert: {
          action: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id?: string | null
        }
        Update: {
          action?: string
          actor_profile_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          attendance_date: string
          created_at: string
          id: string
          marked_by: string | null
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          school_id: string
          status: string
          student_id: string
        }
        Update: {
          attendance_date?: string
          created_at?: string
          id?: string
          marked_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_devices: {
        Row: {
          connection_type: string
          created_at: string
          created_by: string | null
          device_name: string
          id: string
          model: string | null
          school_id: string
          serial_number: string | null
          status: string
          updated_at: string
          vendor: string | null
        }
        Insert: {
          connection_type?: string
          created_at?: string
          created_by?: string | null
          device_name: string
          id?: string
          model?: string | null
          school_id: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Update: {
          connection_type?: string
          created_at?: string
          created_by?: string | null
          device_name?: string
          id?: string
          model?: string | null
          school_id?: string
          serial_number?: string | null
          status?: string
          updated_at?: string
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "biometric_devices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_devices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      biometric_student_mappings: {
        Row: {
          created_at: string
          created_by: string | null
          device_id: string
          id: string
          machine_user_id: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          device_id: string
          id?: string
          machine_user_id: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          device_id?: string
          id?: string
          machine_user_id?: string
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "biometric_mapping_device_school_fkey"
            columns: ["device_id", "school_id"]
            isOneToOne: false
            referencedRelation: "biometric_devices"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "biometric_mapping_student_school_fkey"
            columns: ["student_id", "school_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "school_id"]
          },
          {
            foreignKeyName: "biometric_student_mappings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "biometric_student_mappings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_locations: {
        Row: {
          bus_id: string
          id: string
          latitude: number
          longitude: number
          recorded_at: string
        }
        Insert: {
          bus_id: string
          id?: string
          latitude: number
          longitude: number
          recorded_at?: string
        }
        Update: {
          bus_id?: string
          id?: string
          latitude?: number
          longitude?: number
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_locations_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
        ]
      }
      bus_logs: {
        Row: {
          bus_id: string | null
          event_time: string
          event_type: string
          id: string
          recorded_by: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          bus_id?: string | null
          event_time?: string
          event_type: string
          id?: string
          recorded_by?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          bus_id?: string | null
          event_time?: string
          event_type?: string
          id?: string
          recorded_by?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bus_logs_bus_id_fkey"
            columns: ["bus_id"]
            isOneToOne: false
            referencedRelation: "buses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_logs_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bus_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      buses: {
        Row: {
          authorization_reference: string | null
          bus_number: string
          created_at: string
          driver_profile_id: string | null
          id: string
          route_name: string | null
          school_id: string
          vehicle_number: string | null
        }
        Insert: {
          authorization_reference?: string | null
          bus_number: string
          created_at?: string
          driver_profile_id?: string | null
          id?: string
          route_name?: string | null
          school_id: string
          vehicle_number?: string | null
        }
        Update: {
          authorization_reference?: string | null
          bus_number?: string
          created_at?: string
          driver_profile_id?: string | null
          id?: string
          route_name?: string | null
          school_id?: string
          vehicle_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buses_driver_profile_id_fkey"
            columns: ["driver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buses_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_autopay_mandates: {
        Row: {
          consent_recorded_at: string | null
          created_at: string
          frequency: string | null
          id: string
          max_amount: number | null
          next_charge_at: string | null
          provider_mandate_id: string | null
          provider_name: string
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          consent_recorded_at?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          max_amount?: number | null
          next_charge_at?: string | null
          provider_mandate_id?: string | null
          provider_name: string
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          consent_recorded_at?: string | null
          created_at?: string
          frequency?: string | null
          id?: string
          max_amount?: number | null
          next_charge_at?: string | null
          provider_mandate_id?: string | null
          provider_name?: string
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_autopay_mandates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_autopay_mandates_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payment_transactions: {
        Row: {
          amount: number
          created_at: string
          failure_reason: string | null
          fee_id: string
          id: string
          idempotency_key: string | null
          metadata: Json
          payment_method: string
          provider_name: string | null
          provider_order_id: string | null
          provider_payment_id: string | null
          school_id: string
          status: string
          student_id: string
          submitted_at: string | null
          transaction_reference: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          failure_reason?: string | null
          fee_id: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          payment_method: string
          provider_name?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          school_id: string
          status?: string
          student_id: string
          submitted_at?: string | null
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          failure_reason?: string | null
          fee_id?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json
          payment_method?: string
          provider_name?: string | null
          provider_order_id?: string | null
          provider_payment_id?: string | null
          school_id?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          transaction_reference?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payment_transactions_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_transactions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_transactions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payment_transactions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount_paid: number
          created_at: string
          fee_id: string
          id: string
          payment_date: string
          payment_method: string | null
          receipt_number: string | null
          received_by: string | null
          school_id: string
          student_id: string
          transaction_reference: string | null
        }
        Insert: {
          amount_paid: number
          created_at?: string
          fee_id: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          school_id: string
          student_id: string
          transaction_reference?: string | null
        }
        Update: {
          amount_paid?: number
          created_at?: string
          fee_id?: string
          id?: string
          payment_date?: string
          payment_method?: string | null
          receipt_number?: string | null
          received_by?: string | null
          school_id?: string
          student_id?: string
          transaction_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_fee_id_fkey"
            columns: ["fee_id"]
            isOneToOne: false
            referencedRelation: "fees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_session: string | null
          amount: number
          billing_frequency: string
          class_name: string
          created_at: string
          created_by: string | null
          due_day: number | null
          fee_type: string
          id: string
          is_active: boolean
          late_fee_amount: number
          notes: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          academic_session?: string | null
          amount: number
          billing_frequency?: string
          class_name: string
          created_at?: string
          created_by?: string | null
          due_day?: number | null
          fee_type: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          notes?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          academic_session?: string | null
          amount?: number
          billing_frequency?: string
          class_name?: string
          created_at?: string
          created_by?: string | null
          due_day?: number | null
          fee_type?: string
          id?: string
          is_active?: boolean
          late_fee_amount?: number
          notes?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fees: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          discount_amount: number
          due_date: string | null
          fee_structure_id: string | null
          fee_type: string
          id: string
          late_fee_amount: number
          notes: string | null
          period: string | null
          school_id: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          fee_structure_id?: string | null
          fee_type: string
          id?: string
          late_fee_amount?: number
          notes?: string | null
          period?: string | null
          school_id: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          discount_amount?: number
          due_date?: string | null
          fee_structure_id?: string | null
          fee_type?: string
          id?: string
          late_fee_amount?: number
          notes?: string | null
          period?: string | null
          school_id?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fees_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fees_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          assigned_by: string | null
          class_name: string
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          school_id: string
          section: string | null
          subject: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_by?: string | null
          class_name: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          school_id: string
          section?: string | null
          subject: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string | null
          class_name?: string
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          school_id?: string
          section?: string | null
          subject?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_submissions: {
        Row: {
          attachment_url: string | null
          created_at: string
          homework_id: string
          id: string
          marks: number | null
          reviewed_by: string | null
          school_id: string
          status: string
          student_id: string
          submission_text: string | null
          submitted_at: string | null
          teacher_feedback: string | null
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          homework_id: string
          id?: string
          marks?: number | null
          reviewed_by?: string | null
          school_id: string
          status?: string
          student_id: string
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          homework_id?: string
          id?: string
          marks?: number | null
          reviewed_by?: string | null
          school_id?: string
          status?: string
          student_id?: string
          submission_text?: string | null
          submitted_at?: string | null
          teacher_feedback?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "homework_submissions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "homework_submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      login_account_security: {
        Row: {
          failed_attempts: number
          first_failed_at: string | null
          identity_hash: string
          last_failed_at: string | null
          last_ip_hash: string | null
          locked_until: string | null
        }
        Insert: {
          failed_attempts?: number
          first_failed_at?: string | null
          identity_hash: string
          last_failed_at?: string | null
          last_ip_hash?: string | null
          locked_until?: string | null
        }
        Update: {
          failed_attempts?: number
          first_failed_at?: string | null
          identity_hash?: string
          last_failed_at?: string | null
          last_ip_hash?: string | null
          locked_until?: string | null
        }
        Relationships: []
      }
      login_ip_security: {
        Row: {
          failed_attempts: number
          ip_hash: string
          last_failed_at: string | null
          locked_until: string | null
          window_started_at: string | null
        }
        Insert: {
          failed_attempts?: number
          ip_hash: string
          last_failed_at?: string | null
          locked_until?: string | null
          window_started_at?: string | null
        }
        Update: {
          failed_attempts?: number
          ip_hash?: string
          last_failed_at?: string | null
          locked_until?: string | null
          window_started_at?: string | null
        }
        Relationships: []
      }
      marks: {
        Row: {
          created_at: string
          exam_name: string
          id: string
          marks_obtained: number
          maximum_marks: number
          school_id: string
          student_id: string
          subject: string
        }
        Insert: {
          created_at?: string
          exam_name: string
          id?: string
          marks_obtained: number
          maximum_marks: number
          school_id: string
          student_id: string
          subject: string
        }
        Update: {
          created_at?: string
          exam_name?: string
          id?: string
          marks_obtained?: number
          maximum_marks?: number
          school_id?: string
          student_id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "marks_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      notices: {
        Row: {
          audience: string
          class_name: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          message: string
          publish_at: string
          school_id: string
          section: string | null
          title: string
        }
        Insert: {
          audience?: string
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message: string
          publish_at?: string
          school_id: string
          section?: string | null
          title: string
        }
        Update: {
          audience?: string
          class_name?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          message?: string
          publish_at?: string
          school_id?: string
          section?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notices_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_queue: {
        Row: {
          attendance_id: string | null
          created_at: string
          id: string
          message: string
          recipient_phone: string
          school_id: string
          status: string
          student_id: string
        }
        Insert: {
          attendance_id?: string | null
          created_at?: string
          id?: string
          message: string
          recipient_phone: string
          school_id: string
          status?: string
          student_id: string
        }
        Update: {
          attendance_id?: string | null
          created_at?: string
          id?: string
          message?: string
          recipient_phone?: string
          school_id?: string
          status?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_attendance_id_fkey"
            columns: ["attendance_id"]
            isOneToOne: false
            referencedRelation: "attendance"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_queue_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parents: {
        Row: {
          created_at: string
          id: string
          parent_name: string
          profile_id: string | null
          relationship: string | null
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_name: string
          profile_id?: string | null
          relationship?: string | null
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_name?: string
          profile_id?: string | null
          relationship?: string | null
          school_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "parents_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          full_name: string
          id: string
          login_id: string | null
          must_change_password: boolean
          role: string
          school_id: string | null
        }
        Insert: {
          account_status?: string
          created_at?: string
          full_name: string
          id: string
          login_id?: string | null
          must_change_password?: boolean
          role: string
          school_id?: string | null
        }
        Update: {
          account_status?: string
          created_at?: string
          full_name?: string
          id?: string
          login_id?: string | null
          must_change_password?: boolean
          role?: string
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_events: {
        Row: {
          audience: string
          created_at: string
          created_by: string | null
          description: string | null
          end_time: string | null
          event_date: string
          id: string
          school_id: string
          start_time: string | null
          title: string
          venue: string | null
        }
        Insert: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          id?: string
          school_id: string
          start_time?: string | null
          title: string
          venue?: string | null
        }
        Update: {
          audience?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          id?: string
          school_id?: string
          start_time?: string | null
          title?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_payment_settings: {
        Row: {
          autopay_enabled: boolean
          created_at: string
          created_by: string | null
          currency_code: string
          enabled_methods: string[]
          id: string
          online_gateway: string | null
          online_gateway_enabled: boolean
          qr_storage_path: string | null
          receipt_prefix: string
          school_id: string
          updated_at: string
          upi_enabled: boolean
          upi_payee_name: string | null
          upi_vpa: string | null
        }
        Insert: {
          autopay_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency_code?: string
          enabled_methods?: string[]
          id?: string
          online_gateway?: string | null
          online_gateway_enabled?: boolean
          qr_storage_path?: string | null
          receipt_prefix?: string
          school_id: string
          updated_at?: string
          upi_enabled?: boolean
          upi_payee_name?: string | null
          upi_vpa?: string | null
        }
        Update: {
          autopay_enabled?: boolean
          created_at?: string
          created_by?: string | null
          currency_code?: string
          enabled_methods?: string[]
          id?: string
          online_gateway?: string | null
          online_gateway_enabled?: boolean
          qr_storage_path?: string | null
          receipt_prefix?: string
          school_id?: string
          updated_at?: string
          upi_enabled?: boolean
          upi_payee_name?: string | null
          upi_vpa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_payment_settings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_payment_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_request_rate_limits: {
        Row: {
          ip_hash: string
          last_submitted_at: string
        }
        Insert: {
          ip_hash: string
          last_submitted_at: string
        }
        Update: {
          ip_hash?: string
          last_submitted_at?: string
        }
        Relationships: []
      }
      school_requests: {
        Row: {
          academic_session: string | null
          address: string | null
          affiliation_number: string | null
          alternate_phone: string | null
          board: string | null
          branches_count: number | null
          city: string | null
          classes_offered: string[]
          contact_email: string
          contact_person: string
          created_at: string
          district: string | null
          document_urls: string[]
          estimated_students: number | null
          estimated_teachers: number | null
          id: string
          instruction_medium: string | null
          logo_url: string | null
          message: string | null
          phone: string
          pincode: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_code: string | null
          school_name: string
          school_type: string | null
          state: string | null
          status: string
          supported_languages: string[]
          updated_at: string
          website: string | null
        }
        Insert: {
          academic_session?: string | null
          address?: string | null
          affiliation_number?: string | null
          alternate_phone?: string | null
          board?: string | null
          branches_count?: number | null
          city?: string | null
          classes_offered?: string[]
          contact_email: string
          contact_person: string
          created_at?: string
          district?: string | null
          document_urls?: string[]
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          instruction_medium?: string | null
          logo_url?: string | null
          message?: string | null
          phone: string
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_code?: string | null
          school_name: string
          school_type?: string | null
          state?: string | null
          status?: string
          supported_languages?: string[]
          updated_at?: string
          website?: string | null
        }
        Update: {
          academic_session?: string | null
          address?: string | null
          affiliation_number?: string | null
          alternate_phone?: string | null
          board?: string | null
          branches_count?: number | null
          city?: string | null
          classes_offered?: string[]
          contact_email?: string
          contact_person?: string
          created_at?: string
          district?: string | null
          document_urls?: string[]
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          instruction_medium?: string | null
          logo_url?: string | null
          message?: string | null
          phone?: string
          pincode?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_code?: string | null
          school_name?: string
          school_type?: string | null
          state?: string | null
          status?: string
          supported_languages?: string[]
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      school_settings: {
        Row: {
          academic_year: string | null
          address: string | null
          attendance_cutoff: string | null
          city: string | null
          display_name: string | null
          email: string | null
          id: string
          logo_url: string | null
          phone: string | null
          school_id: string
          settings: Json
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_year?: string | null
          address?: string | null
          attendance_cutoff?: string | null
          city?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          school_id: string
          settings?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_year?: string | null
          address?: string | null
          attendance_cutoff?: string | null
          city?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          phone?: string | null
          school_id?: string
          settings?: Json
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          academic_session: string | null
          address: string | null
          affiliation_number: string | null
          alternate_phone: string | null
          approval_status: string
          board: string | null
          branches_count: number | null
          city: string | null
          classes_offered: string[]
          contact_email: string | null
          created_at: string
          district: string | null
          document_urls: string[]
          estimated_students: number | null
          estimated_teachers: number | null
          id: string
          instruction_medium: string | null
          logo_url: string | null
          name: string
          phone: string | null
          pincode: string | null
          school_code: string | null
          school_type: string | null
          state: string | null
          supported_languages: string[]
          website: string | null
        }
        Insert: {
          academic_session?: string | null
          address?: string | null
          affiliation_number?: string | null
          alternate_phone?: string | null
          approval_status?: string
          board?: string | null
          branches_count?: number | null
          city?: string | null
          classes_offered?: string[]
          contact_email?: string | null
          created_at?: string
          district?: string | null
          document_urls?: string[]
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          instruction_medium?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          pincode?: string | null
          school_code?: string | null
          school_type?: string | null
          state?: string | null
          supported_languages?: string[]
          website?: string | null
        }
        Update: {
          academic_session?: string | null
          address?: string | null
          affiliation_number?: string | null
          alternate_phone?: string | null
          approval_status?: string
          board?: string | null
          branches_count?: number | null
          city?: string | null
          classes_offered?: string[]
          contact_email?: string | null
          created_at?: string
          district?: string | null
          document_urls?: string[]
          estimated_students?: number | null
          estimated_teachers?: number | null
          id?: string
          instruction_medium?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          pincode?: string | null
          school_code?: string | null
          school_type?: string | null
          state?: string | null
          supported_languages?: string[]
          website?: string | null
        }
        Relationships: []
      }
      students: {
        Row: {
          admission_number: string | null
          class_name: string
          created_at: string
          guardian_contact: string | null
          id: string
          profile_id: string | null
          roll_number: string
          school_id: string
          section: string | null
          student_name: string
        }
        Insert: {
          admission_number?: string | null
          class_name: string
          created_at?: string
          guardian_contact?: string | null
          id?: string
          profile_id?: string | null
          roll_number: string
          school_id: string
          section?: string | null
          student_name: string
        }
        Update: {
          admission_number?: string | null
          class_name?: string
          created_at?: string
          guardian_contact?: string | null
          id?: string
          profile_id?: string | null
          roll_number?: string
          school_id?: string
          section?: string | null
          student_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "students_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_rate_limits: {
        Row: {
          ip_hash: string
          last_submitted_at: string
        }
        Insert: {
          ip_hash: string
          last_submitted_at: string
        }
        Update: {
          ip_hash?: string
          last_submitted_at?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          created_at: string
          id: string
          message: string
          requester_contact: string | null
          requester_name: string
          requester_profile_id: string | null
          school_id: string | null
          status: string
          subject: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          requester_contact?: string | null
          requester_name: string
          requester_profile_id?: string | null
          school_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          requester_contact?: string | null
          requester_name?: string
          requester_profile_id?: string | null
          school_id?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_requester_profile_id_fkey"
            columns: ["requester_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_attendance: {
        Row: {
          attendance_date: string
          check_in_time: string
          created_at: string
          id: string
          method: string
          school_id: string
          status: string
          teacher_id: string
        }
        Insert: {
          attendance_date?: string
          check_in_time?: string
          created_at?: string
          id?: string
          method: string
          school_id: string
          status?: string
          teacher_id: string
        }
        Update: {
          attendance_date?: string
          check_in_time?: string
          created_at?: string
          id?: string
          method?: string
          school_id?: string
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_attendance_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_attendance_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          class_name: string
          created_at: string
          id: string
          school_id: string
          teacher_id: string
        }
        Insert: {
          class_name: string
          created_at?: string
          id?: string
          school_id: string
          teacher_id: string
        }
        Update: {
          class_name?: string
          created_at?: string
          id?: string
          school_id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          created_at: string
          id: string
          profile_id: string | null
          school_id: string
          subject: string | null
          teacher_name: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id?: string | null
          school_id: string
          subject?: string | null
          teacher_name: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string | null
          school_id?: string
          subject?: string | null
          teacher_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "teachers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teachers_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      timetable_entries: {
        Row: {
          class_name: string
          created_at: string
          end_time: string | null
          id: string
          period_number: number
          room: string | null
          school_id: string
          section: string | null
          start_time: string | null
          subject: string
          teacher_id: string | null
          weekday: number
        }
        Insert: {
          class_name: string
          created_at?: string
          end_time?: string | null
          id?: string
          period_number: number
          room?: string | null
          school_id: string
          section?: string | null
          start_time?: string | null
          subject: string
          teacher_id?: string | null
          weekday: number
        }
        Update: {
          class_name?: string
          created_at?: string
          end_time?: string | null
          id?: string
          period_number?: number
          room?: string | null
          school_id?: string
          section?: string | null
          start_time?: string | null
          subject?: string
          teacher_id?: string | null
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_public_form_rate_limit: {
        Args: { p_form: string; p_ip_hash: string }
        Returns: boolean
      }
      lookup_auth_user_id_by_email: {
        Args: { p_email: string }
        Returns: string
      }
      review_school_request_atomic: {
        Args: {
          p_decision: string
          p_rejection_reason?: string
          p_request_id: string
          p_reviewer_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
