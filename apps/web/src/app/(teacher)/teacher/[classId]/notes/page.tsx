import { getClassStudents } from '@/app/(teacher)/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { parseClassPrefs } from '@/lib/teacher-prefs';
import NotesClient from './notes-client';

type Props = { params: Promise<{ classId: string }> };

export default async function NotesPage({ params }: Props) {
  const { classId } = await params;
  const students = await getClassStudents(classId);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const teacherRow = user
    ? await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { classPrefs: true } })
    : undefined;
  const defaultNoteType = parseClassPrefs(teacherRow?.classPrefs).defaultNoteType;

  return <NotesClient classId={classId} students={students} defaultNoteType={defaultNoteType} />;
}
