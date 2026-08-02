-- Defense-in-depth RLS for Talibly's Supabase-facing public schema.
-- The application server currently connects with a privileged Postgres role,
-- so server actions must continue to authenticate users and scope every query.

CREATE TABLE IF NOT EXISTS "stripe_webhook_events" (
	"stripe_event_id" text PRIMARY KEY NOT NULL,
	"event_type" text NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.is_org_member(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_org_admin(target_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.organization_id = target_org_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role IN ('admin', 'principal')
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_view_user(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT target_user_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.memberships target_membership
      WHERE target_membership.user_id = target_user_id
        AND target_membership.status = 'active'
        AND public.is_org_admin(target_membership.organization_id)
    );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.is_linked_guardian(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    JOIN public.students s ON s.id = sg.student_id
    JOIN public.memberships m
      ON m.organization_id = s.organization_id
     AND m.user_id = sg.guardian_user_id
    WHERE sg.student_id = target_student_id
      AND sg.guardian_user_id = auth.uid()
      AND m.status = 'active'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_access_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = target_student_id
      AND (
        s.user_id = auth.uid()
        OR public.is_org_admin(s.organization_id)
        OR public.is_linked_guardian(s.id)
        OR EXISTS (
          SELECT 1
          FROM public.class_enrollments ce
          JOIN public.classes c ON c.id = ce.class_id
          JOIN public.memberships m
            ON m.organization_id = c.organization_id
           AND m.user_id = c.primary_teacher_id
          WHERE ce.student_id = s.id
            AND c.organization_id = s.organization_id
            AND c.primary_teacher_id = auth.uid()
            AND c.deleted_at IS NULL
            AND m.status = 'active'
            AND m.role = 'teacher'
        )
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_teach_student(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = target_student_id
      AND (
        public.is_org_admin(s.organization_id)
        OR EXISTS (
          SELECT 1
          FROM public.class_enrollments ce
          JOIN public.classes c ON c.id = ce.class_id
          JOIN public.memberships m
            ON m.organization_id = c.organization_id
           AND m.user_id = c.primary_teacher_id
          WHERE ce.student_id = s.id
            AND c.organization_id = s.organization_id
            AND c.primary_teacher_id = auth.uid()
            AND c.deleted_at IS NULL
            AND m.status = 'active'
            AND m.role = 'teacher'
        )
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_access_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = target_class_id
      AND (
        public.is_org_admin(c.organization_id)
        OR (
          c.primary_teacher_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.organization_id = c.organization_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role = 'teacher'
          )
        )
        OR EXISTS (
          SELECT 1
          FROM public.class_enrollments ce
          JOIN public.students s ON s.id = ce.student_id
          WHERE ce.class_id = c.id
            AND (s.user_id = auth.uid() OR public.is_linked_guardian(s.id))
        )
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_manage_class(target_class_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.classes c
    WHERE c.id = target_class_id
      AND (
        public.is_org_admin(c.organization_id)
        OR (
          c.primary_teacher_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM public.memberships m
            WHERE m.organization_id = c.organization_id
              AND m.user_id = auth.uid()
              AND m.status = 'active'
              AND m.role = 'teacher'
          )
        )
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_complete_homework(target_student_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.students s
    WHERE s.id = target_student_id
      AND (
        s.user_id = auth.uid()
        OR public.is_linked_guardian(s.id)
        OR public.is_org_admin(s.organization_id)
      )
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_access_thread(target_thread_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.message_threads t
    WHERE t.id = target_thread_id
      AND (
        t.created_by = auth.uid()
        OR public.is_org_admin(t.organization_id)
        OR (t.scope = 'school_wide' AND public.is_org_member(t.organization_id))
        OR (t.class_id IS NOT NULL AND public.can_access_class(t.class_id))
        OR (t.student_id IS NOT NULL AND public.can_access_student(t.student_id))
      )
  );
$$;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_user(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_linked_guardian(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_teach_student(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_manage_class(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_complete_homework(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_access_thread(uuid) FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_linked_guardian(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_teach_student(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_class(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_complete_homework(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_thread(uuid) TO authenticated;
--> statement-breakpoint

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hifz_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hifz_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.homework_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trial_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tuition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

REVOKE ALL ON TABLE public.activity_log, public.attendance_records,
  public.class_enrollments, public.classes, public.consents,
  public.contact_submissions, public.hifz_milestones, public.hifz_records,
  public.homework_assignments, public.homework_completions, public.media_uploads,
  public.memberships, public.message_reads, public.message_threads, public.messages,
  public.notifications, public.organizations, public.payments, public.student_guardians,
  public.student_notes, public.students, public.stripe_webhook_events,
  public.trial_placements, public.tuition_plans, public.users
FROM anon;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_log,
  public.attendance_records, public.class_enrollments, public.classes,
  public.consents, public.hifz_milestones, public.hifz_records,
  public.homework_assignments, public.homework_completions, public.media_uploads,
  public.memberships, public.message_reads, public.message_threads, public.messages,
  public.notifications, public.organizations, public.payments, public.student_guardians,
  public.student_notes, public.students, public.trial_placements,
  public.tuition_plans, public.users
TO authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE public.contact_submissions, public.stripe_webhook_events FROM authenticated;
--> statement-breakpoint

CREATE POLICY "organizations_select_member" ON public.organizations
  FOR SELECT TO authenticated USING (public.is_org_member(id));
CREATE POLICY "organizations_update_admin" ON public.organizations
  FOR UPDATE TO authenticated USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));
--> statement-breakpoint
CREATE POLICY "users_select_visible" ON public.users
  FOR SELECT TO authenticated USING (public.can_view_user(id));
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
--> statement-breakpoint
CREATE POLICY "memberships_select_self_or_admin" ON public.memberships
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "memberships_insert_admin" ON public.memberships
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "memberships_update_admin" ON public.memberships
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "memberships_delete_admin" ON public.memberships
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "students_select_authorized" ON public.students
  FOR SELECT TO authenticated USING (public.can_access_student(id));
CREATE POLICY "students_insert_admin" ON public.students
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "students_update_admin" ON public.students
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "students_delete_admin" ON public.students
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "student_guardians_select_authorized" ON public.student_guardians
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid() OR public.can_access_student(student_id));
CREATE POLICY "student_guardians_insert_admin" ON public.student_guardians
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id AND public.is_org_admin(s.organization_id)
  ));
CREATE POLICY "student_guardians_update_admin" ON public.student_guardians
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id AND public.is_org_admin(s.organization_id)
  ));
CREATE POLICY "student_guardians_delete_admin" ON public.student_guardians
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.id = student_id AND public.is_org_admin(s.organization_id)
  ));
--> statement-breakpoint
CREATE POLICY "classes_select_authorized" ON public.classes
  FOR SELECT TO authenticated USING (public.can_access_class(id));
CREATE POLICY "classes_insert_admin" ON public.classes
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "classes_update_admin" ON public.classes
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "classes_delete_admin" ON public.classes
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "class_enrollments_select_authorized" ON public.class_enrollments
  FOR SELECT TO authenticated
  USING (public.can_access_class(class_id) AND public.can_access_student(student_id));
CREATE POLICY "class_enrollments_insert_admin" ON public.class_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND public.is_org_admin(c.organization_id)
  ));
CREATE POLICY "class_enrollments_delete_admin" ON public.class_enrollments
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.classes c
    WHERE c.id = class_id AND public.is_org_admin(c.organization_id)
  ));
--> statement-breakpoint
CREATE POLICY "attendance_select_authorized" ON public.attendance_records
  FOR SELECT TO authenticated USING (public.can_access_student(student_id));
CREATE POLICY "attendance_insert_staff" ON public.attendance_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "attendance_update_staff" ON public.attendance_records
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR recorded_by = auth.uid())
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "attendance_delete_admin" ON public.attendance_records
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "hifz_records_select_authorized" ON public.hifz_records
  FOR SELECT TO authenticated USING (public.can_access_student(student_id));
CREATE POLICY "hifz_records_insert_staff" ON public.hifz_records
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "hifz_records_update_staff" ON public.hifz_records
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR recorded_by = auth.uid())
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "hifz_records_delete_admin" ON public.hifz_records
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "hifz_milestones_select_authorized" ON public.hifz_milestones
  FOR SELECT TO authenticated USING (public.can_access_student(student_id));
CREATE POLICY "hifz_milestones_insert_staff" ON public.hifz_milestones
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "hifz_milestones_update_staff" ON public.hifz_milestones
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR recorded_by = auth.uid())
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (recorded_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "hifz_milestones_delete_admin" ON public.hifz_milestones
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "student_notes_select_authorized" ON public.student_notes
  FOR SELECT TO authenticated USING (
    public.is_org_admin(organization_id)
    OR public.can_teach_student(student_id)
    OR created_by = auth.uid()
    OR (visible_to_parent AND public.can_access_student(student_id))
  );
CREATE POLICY "student_notes_insert_staff" ON public.student_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (created_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "student_notes_update_staff" ON public.student_notes
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR created_by = auth.uid())
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (created_by = auth.uid() AND public.can_teach_student(student_id))
  );
CREATE POLICY "student_notes_delete_staff" ON public.student_notes
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id) OR created_by = auth.uid());
--> statement-breakpoint
CREATE POLICY "homework_assignments_select_authorized" ON public.homework_assignments
  FOR SELECT TO authenticated USING (public.can_access_class(class_id));
CREATE POLICY "homework_assignments_insert_staff" ON public.homework_assignments
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.can_manage_class(class_id));
CREATE POLICY "homework_assignments_update_staff" ON public.homework_assignments
  FOR UPDATE TO authenticated
  USING (public.is_org_admin(organization_id) OR created_by = auth.uid())
  WITH CHECK (public.is_org_admin(organization_id) OR public.can_manage_class(class_id));
CREATE POLICY "homework_assignments_delete_staff" ON public.homework_assignments
  FOR DELETE TO authenticated
  USING (public.is_org_admin(organization_id) OR created_by = auth.uid());
--> statement-breakpoint
CREATE POLICY "homework_completions_select_authorized" ON public.homework_completions
  FOR SELECT TO authenticated USING (public.can_access_student(student_id));
CREATE POLICY "homework_completions_insert_authorized" ON public.homework_completions
  FOR INSERT TO authenticated
  WITH CHECK (completed_by = auth.uid() AND public.can_complete_homework(student_id));
CREATE POLICY "homework_completions_update_authorized" ON public.homework_completions
  FOR UPDATE TO authenticated
  USING (completed_by = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (completed_by = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "homework_completions_delete_authorized" ON public.homework_completions
  FOR DELETE TO authenticated
  USING (completed_by = auth.uid() OR public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "tuition_plans_select_authorized" ON public.tuition_plans
  FOR SELECT TO authenticated USING (
    public.is_org_admin(organization_id)
    OR guardian_user_id = auth.uid()
    OR public.is_linked_guardian(student_id)
  );
CREATE POLICY "tuition_plans_insert_admin" ON public.tuition_plans
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "tuition_plans_update_admin" ON public.tuition_plans
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "tuition_plans_delete_admin" ON public.tuition_plans
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "payments_select_authorized" ON public.payments
  FOR SELECT TO authenticated
  USING (public.is_org_admin(organization_id) OR payer_user_id = auth.uid());
CREATE POLICY "payments_insert_admin" ON public.payments
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "payments_update_admin" ON public.payments
  FOR UPDATE TO authenticated USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "payments_delete_admin" ON public.payments
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "notifications_select_authorized" ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "notifications_insert_admin" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "notifications_update_authorized" ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "notifications_delete_authorized" ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "message_threads_select_authorized" ON public.message_threads
  FOR SELECT TO authenticated USING (public.can_access_thread(id));
CREATE POLICY "message_threads_insert_staff" ON public.message_threads
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.is_org_member(organization_id));
CREATE POLICY "message_threads_update_staff" ON public.message_threads
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (created_by = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "message_threads_delete_staff" ON public.message_threads
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "messages_select_authorized" ON public.messages
  FOR SELECT TO authenticated USING (public.can_access_thread(thread_id));
CREATE POLICY "messages_insert_authorized" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (sender_user_id = auth.uid() AND public.can_access_thread(thread_id));
CREATE POLICY "messages_update_sender" ON public.messages
  FOR UPDATE TO authenticated USING (sender_user_id = auth.uid())
  WITH CHECK (sender_user_id = auth.uid());
CREATE POLICY "messages_delete_sender" ON public.messages
  FOR DELETE TO authenticated USING (sender_user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "message_reads_select_self" ON public.message_reads
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages msg
    WHERE msg.id = message_id AND public.can_access_thread(msg.thread_id)
  ));
CREATE POLICY "message_reads_insert_self" ON public.message_reads
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.messages msg
    WHERE msg.id = message_id AND public.can_access_thread(msg.thread_id)
  ));
CREATE POLICY "message_reads_update_self" ON public.message_reads
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "message_reads_delete_self" ON public.message_reads
  FOR DELETE TO authenticated USING (user_id = auth.uid());
--> statement-breakpoint
CREATE POLICY "consents_select_authorized" ON public.consents
  FOR SELECT TO authenticated
  USING (guardian_user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "consents_insert_authorized" ON public.consents
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (guardian_user_id = auth.uid() AND public.is_linked_guardian(student_id))
  );
CREATE POLICY "consents_update_authorized" ON public.consents
  FOR UPDATE TO authenticated
  USING (guardian_user_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (guardian_user_id = auth.uid() AND public.is_linked_guardian(student_id))
  );
CREATE POLICY "consents_delete_authorized" ON public.consents
  FOR DELETE TO authenticated
  USING (guardian_user_id = auth.uid() OR public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "media_uploads_select_staff" ON public.media_uploads
  FOR SELECT TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "media_uploads_insert_staff" ON public.media_uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin(organization_id)
    OR (uploaded_by = auth.uid() AND public.is_org_member(organization_id))
  );
CREATE POLICY "media_uploads_update_staff" ON public.media_uploads
  FOR UPDATE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (uploaded_by = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "media_uploads_delete_staff" ON public.media_uploads
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid() OR public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "trial_placements_select_staff" ON public.trial_placements
  FOR SELECT TO authenticated
  USING (assigned_teacher_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "trial_placements_insert_admin" ON public.trial_placements
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));
CREATE POLICY "trial_placements_update_staff" ON public.trial_placements
  FOR UPDATE TO authenticated
  USING (assigned_teacher_id = auth.uid() OR public.is_org_admin(organization_id))
  WITH CHECK (assigned_teacher_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "trial_placements_delete_admin" ON public.trial_placements
  FOR DELETE TO authenticated USING (public.is_org_admin(organization_id));
--> statement-breakpoint
CREATE POLICY "activity_log_select_authorized" ON public.activity_log
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid() OR public.is_org_admin(organization_id));
CREATE POLICY "activity_log_insert_admin" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (public.is_org_admin(organization_id));

-- contact_submissions and stripe_webhook_events deliberately have no client
-- policies or authenticated grants. They are server-only tables.
