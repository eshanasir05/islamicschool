import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { getGuardianStudents } from '../actions';

export default async function ParentHome() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in');

  const students = await getGuardianStudents(user.id);

  if (students.length === 0) {
    return (
      <main className="app-main">
        <div className="feed-empty" style={{ marginTop: 48 }}>
          <h3>No students linked</h3>
          <p>Contact your school to link your children to your account.</p>
        </div>
      </main>
    );
  }

  redirect(`/parent/${students[0]!.id}`);
}
