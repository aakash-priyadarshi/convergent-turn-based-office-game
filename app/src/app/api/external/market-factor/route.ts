import { json } from '@/lib/api-helpers';
import { createServiceClient } from '@/lib/supabase/server';

const CACHE_KEY = 'market_factor';
const STALE_MS = 24 * 60 * 60 * 1000; // 24 hours

/** 
 * SWR cache pattern: serve cached value immediately.
 * If stale (>24h), refresh in background. Default = 1.0.
 */
export async function GET() {
  const service = createServiceClient();

  const { data: cached } = await service
    .from('external_cache')
    .select('*')
    .eq('key', CACHE_KEY)
    .single();

  const now = Date.now();
  const value = cached?.value_json?.value ?? 1.0;
  const fetchedAt = cached?.fetched_at ? new Date(cached.fetched_at).getTime() : 0;
  const isStale = now - fetchedAt > STALE_MS;

  // If stale or missing, refresh (simulate external API)
  if (isStale) {
    const freshValue = generateMarketFactor();
    await service.from('external_cache').upsert({
      key: CACHE_KEY,
      value_json: { value: freshValue },
      fetched_at: new Date().toISOString(),
    });
    return json({ value: freshValue, stale: false });
  }

  return json({ value, stale: false });
}

/** 
 * Simulates an external market API.
 * In production this would call a real external service.
 * Returns a factor between 0.8 and 1.2 based on day-of-year.
 */
function generateMarketFactor(): number {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );
  // Deterministic daily variation: sine wave over the year
  const factor = 1.0 + 0.2 * Math.sin((dayOfYear / 365) * 2 * Math.PI);
  return Math.round(factor * 100) / 100;
}
