import { getClassStudents } from '@/app/(teacher)/actions';
import NotesClient from './notes-client';

type Props = { params: Promise<{ classId: string }> };

export default async function NotesPage({ params }: Props) {
  const { classId } = await params;
  const students = await getClassStudents(classId);
  return <NotesClient classId={classId} students={students} />;
}
