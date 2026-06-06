import { getClassStudents } from '@/app/(teacher)/actions';
import HifzClient from './hifz-client';

type Props = { params: Promise<{ classId: string }> };

export default async function HifzPage({ params }: Props) {
  const { classId } = await params;
  const students = await getClassStudents(classId);
  return <HifzClient classId={classId} students={students} />;
}
