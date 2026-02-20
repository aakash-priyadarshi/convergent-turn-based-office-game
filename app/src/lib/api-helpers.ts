import { createServerSupabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/** Helper: get authenticated user or return 401 */
export async function requireAuth() {
  const supabase = await createServerSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { user: null, supabase, error: 'Unauthorized' };
  return { user, supabase, error: null };
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
