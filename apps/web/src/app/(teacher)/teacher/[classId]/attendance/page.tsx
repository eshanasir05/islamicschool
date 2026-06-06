import { getClassStudents } from '@/app/(teacher)/actions';
import AttendanceClient from './attendance-client';

type Props = { params: Promise<{ classId: string }> };

export default async function AttendancePage({ params }: Props) {
  const { classId } = await params;
  const students = await getClassStudents(classId);

  return <AttendanceClient classId={classId} students={students} />;
}
