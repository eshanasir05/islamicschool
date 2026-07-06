import { getClassStudents } from '@/app/(teacher)/actions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db, schema } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { parseClassPrefs } from '@/lib/teacher-prefs';
import HifzClient from './hifz-client';

type Props = { params: Promise<{ classId: string }> };

export default async function HifzPage({ params }: Props) {
  const { classId } = await params;
  const students = await getClassStudents(classId);

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const teacherRow = user
    ? await db.query.users.findFirst({ where: eq(schema.users.id, user.id), columns: { classPrefs: true } })
    : undefined;
  const defaultStream = parseClassPrefs(teacherRow?.classPrefs).defaultHifzStream;

  return <HifzClient classId={classId} students={students} defaultStream={defaultStream} />;
}
