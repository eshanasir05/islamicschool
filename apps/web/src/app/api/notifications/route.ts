import { db, schema } from '@/lib/db';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { and, count, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import { type NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const [items, unreadRows] = await Promise.all([
    db.query.notifications.findMany({
      where: eq(schema.notifications.userId, user.id),
      orderBy: desc(schema.notifications.createdAt),
      limit: 20,
    }),
    db
      .select({ unread: count() })
      .from(schema.notifications)
      .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt))),
  ]);

  return NextResponse.json({ items, unreadCount: unreadRows[0]?.unread ?? 0 });
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  if (body.action === 'markAllRead') {
    await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(and(eq(schema.notifications.userId, user.id), isNull(schema.notifications.readAt)));
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'markRead' && typeof body.id === 'string') {
    await db
      .update(schema.notifications)
      .set({ readAt: new Date() })
      .where(and(eq(schema.notifications.id, body.id), eq(schema.notifications.userId, user.id)));
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'delete' && typeof body.id === 'string') {
    await db
      .delete(schema.notifications)
      .where(and(eq(schema.notifications.id, body.id), eq(schema.notifications.userId, user.id)));
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'deleteRead') {
    await db
      .delete(schema.notifications)
      .where(and(eq(schema.notifications.userId, user.id), isNotNull(schema.notifications.readAt)));
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
