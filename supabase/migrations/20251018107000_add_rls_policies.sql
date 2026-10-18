-- RLS policies (basic structure) - refined in app logic; ensure safe defaults
-- Profiles: users can view own profile; teachers/admins can view all? (adjust per app needs)
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Students: teachers/admins can do all; students can view own
CREATE POLICY "Students read own or teacher" ON public.students
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher','admin')) OR
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role='student' AND p.id = students.profile_id)
    )
  );

-- Savings accounts: similar
CREATE POLICY "Savings accounts access" ON public.savings_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher','admin')) OR
    EXISTS (SELECT 1 FROM public.students s JOIN public.profiles p ON p.id = auth.uid() WHERE s.id = savings_accounts.student_id AND s.profile_id = p.id AND p.role='student')
  );

-- Savings transactions: similar
CREATE POLICY "Transactions access" ON public.savings_transactions
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('teacher','admin')) OR
    EXISTS (SELECT 1 FROM public.students s JOIN public.profiles p ON p.id = auth.uid() WHERE s.id = savings_transactions.student_id AND s.profile_id = p.id AND p.role='student')
  );

-- Classes: teachers/admins full read; students can read classes they belong to? simple allow read for authenticated
CREATE POLICY "Classes read for teachers/students" ON public.classes
  FOR SELECT USING (auth.role() = 'authenticated');
