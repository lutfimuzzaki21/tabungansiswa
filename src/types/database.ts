export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'admin' | 'teacher' | 'student';
export type TransactionType =
  | 'deposit'
  | 'withdrawal'
  | 'loan_disbursement'
  | 'loan_repayment'
  | 'final_payout'
  | 'adjustment'
  | 'reversal';
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed';
export type LoanStatus = 'active' | 'paid' | 'cancelled';
export type PeriodStatus = 'draft' | 'closed';
export type ClosureStatus = 'draft' | 'signed' | 'cancelled';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          role: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
        };
        Update: {
          full_name?: string;
          role?: UserRole;
          avatar_url?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      teachers: {
        Row: {
          id: string;
          profile_id: string;
          employee_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          employee_id?: string | null;
        };
        Update: {
          profile_id?: string;
          employee_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'teachers_profile_id_fkey';
            columns: ['profile_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      classes: {
        Row: {
          id: string;
          name: string;
          grade_level: string | null;
          academic_year: string | null;
          class_teacher_id: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          grade_level?: string | null;
          academic_year?: string | null;
          class_teacher_id?: string | null;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          grade_level?: string | null;
          academic_year?: string | null;
          class_teacher_id?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          profile_id: string | null;
          nis: string;
          full_name: string;
          class_id: string | null;
          academic_year: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id?: string | null;
          nis: string;
          full_name: string;
          class_id?: string | null;
          academic_year?: string | null;
          is_active?: boolean;
        };
        Update: {
          profile_id?: string | null;
          nis?: string;
          full_name?: string;
          class_id?: string | null;
          academic_year?: string | null;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: 'students_class_id_fkey';
            columns: ['class_id'];
            referencedRelation: 'classes';
            referencedColumns: ['id'];
          },
        ];
      };
      savings_accounts: {
        Row: {
          id: string;
          student_id: string;
          balance: number;
          total_deposits: number;
          total_withdrawals: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          student_id: string;
          balance?: number;
          total_deposits?: number;
          total_withdrawals?: number;
        };
        Update: {
          student_id?: string;
          balance?: number;
          total_deposits?: number;
          total_withdrawals?: number;
        };
        Relationships: [];
      };
      savings_transactions: {
        Row: {
          id: string;
          transaction_number: string;
          savings_account_id: string;
          student_id: string;
          type: TransactionType;
          amount: number;
          balance_before: number;
          balance_after: number;
          status: TransactionStatus;
          reference_id: string | null;
          idempotency_key: string | null;
          proof_url: string | null;
          proof_path: string | null;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          transaction_number: string;
          savings_account_id: string;
          student_id: string;
          type: TransactionType;
          amount: number;
          balance_before: number;
          balance_after: number;
          status?: TransactionStatus;
          reference_id?: string | null;
          idempotency_key?: string | null;
          proof_url?: string | null;
          proof_path?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
        };
        Update: {
          status?: TransactionStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      loans: {
        Row: {
          id: string;
          borrowed_by: string | null;
          principal_amount: number;
          amount_repaid: number;
          amount_outstanding: number;
          status: LoanStatus;
          due_date: string | null;
          description: string | null;
          notes: string | null;
          disbursement_transaction_id: string | null;
          recorded_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          borrowed_by?: string | null;
          principal_amount: number;
          amount_repaid?: number;
          amount_outstanding: number;
          status?: LoanStatus;
          due_date?: string | null;
          description?: string | null;
          notes?: string | null;
          disbursement_transaction_id?: string | null;
          recorded_by?: string | null;
        };
        Update: {
          status?: LoanStatus;
          amount_repaid?: number;
          amount_outstanding?: number;
          description?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      loan_repayments: {
        Row: {
          id: string;
          loan_id: string;
          amount: number;
          repayment_transaction_id: string | null;
          notes: string | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          loan_id: string;
          amount: number;
          repayment_transaction_id?: string | null;
          notes?: string | null;
          recorded_by?: string | null;
        };
        Update: {
          amount?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      closure_periods: {
        Row: {
          id: string;
          name: string;
          academic_year: string | null;
          semester: string | null;
          closed_at: string | null;
          status: PeriodStatus;
          notes: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          academic_year?: string | null;
          semester?: string | null;
          status?: PeriodStatus;
          notes?: string | null;
          created_by?: string | null;
        };
        Update: {
          name?: string;
          academic_year?: string | null;
          semester?: string | null;
          status?: PeriodStatus;
          notes?: string | null;
        };
        Relationships: [];
      };
      savings_closures: {
        Row: {
          id: string;
          closure_period_id: string;
          student_id: string;
          savings_account_id: string | null;
          total_deposits: number;
          total_withdrawals: number;
          loans_outstanding: number;
          balance_snapshot: number;
          final_amount: number;
          status: ClosureStatus;
          signed_by: string | null;
          signed_at: string | null;
          signature_data: string | null;
          signature_image_url: string | null;
          document_url: string | null;
          document_path: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          closure_period_id: string;
          student_id: string;
          savings_account_id?: string | null;
          total_deposits?: number;
          total_withdrawals?: number;
          loans_outstanding?: number;
          balance_snapshot?: number;
          final_amount?: number;
          status?: ClosureStatus;
          signed_by?: string | null;
          signed_at?: string | null;
          signature_data?: string | null;
          signature_image_url?: string | null;
          document_url?: string | null;
          document_path?: string | null;
          notes?: string | null;
        };
        Update: {
          status?: ClosureStatus;
          signed_by?: string | null;
          signed_at?: string | null;
          signature_data?: string | null;
          signature_image_url?: string | null;
          document_url?: string | null;
          document_path?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          actor_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Json | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          actor_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          user_agent?: string | null;
        };
        Update: {
          action?: string;
          entity_type?: string;
          details?: Json | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      record_deposit: {
        Args: {
          p_student_id: string;
          p_amount: number;
          p_proof_url?: string | null;
          p_proof_path?: string | null;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
          p_recorded_by?: string | null;
        };
        Returns: Json;
      };
      record_withdrawal: {
        Args: {
          p_student_id: string;
          p_amount: number;
          p_proof_url?: string | null;
          p_proof_path?: string | null;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
          p_recorded_by?: string | null;
        };
        Returns: Json;
      };
      disburse_teacher_loan: {
        Args: {
          p_borrowed_by: string;
          p_amount: number;
          p_due_date?: string | null;
          p_description?: string | null;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      repay_teacher_loan: {
        Args: {
          p_loan_id: string;
          p_amount: number;
          p_notes?: string | null;
          p_idempotency_key?: string | null;
        };
        Returns: Json;
      };
      generate_txn_number: {
        Args: Record<string, never>;
        Returns: string;
      };
      is_teacher_or_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      transaction_type: TransactionType;
      transaction_status: TransactionStatus;
      loan_status: LoanStatus;
      period_status: PeriodStatus;
      closure_status: ClosureStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
