import { describe, it, expect } from 'vitest';
import { getRecommendation, getAllRecommendations } from '@/lib/engine/bots';
import type { GameState } from '@/lib/types';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    id: 'test-id',
    owner_id: 'owner-id',
    status: 'active',
    current_year: 1,
    current_quarter: 1,
    cash: 10000,
    quality: 50,
    engineers: 2,
    sales: 1,
    cumulative_profit: 0,
    version: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  };
}

describe('bot strategies', () => {
  it('CFO recommends conservative hiring and higher price', () => {
    const rec = getRecommendation('cfo', makeState());
    expect(rec.decisions.price).toBeGreaterThan(100);
    expect(rec.decisions.engineers_to_hire).toBeLessThanOrEqual(1);
    expect(rec.decisions.salary_pct).toBeLessThanOrEqual(100);
    expect(rec.reasoning).toBeTruthy();
  });

  it('Growth recommends aggressive hiring and low price', () => {
    const rec = getRecommendation('growth', makeState());
    expect(rec.decisions.price).toBeLessThanOrEqual(80);
    expect(rec.decisions.engineers_to_hire + rec.decisions.sales_to_hire).toBeGreaterThanOrEqual(2);
  });

  it('Quality recommends high salary and premium price', () => {
    const rec = getRecommendation('quality', makeState());
    expect(rec.decisions.salary_pct).toBeGreaterThan(100);
    expect(rec.decisions.price).toBeGreaterThan(100);
    expect(rec.decisions.engineers_to_hire).toBeGreaterThan(0);
  });

  it('Growth scales down hiring when cash is low', () => {
    const lowCash = makeState({ cash: 2000 });
    const rec = getRecommendation('growth', lowCash);
    expect(rec.decisions.engineers_to_hire).toBeLessThanOrEqual(1);
    expect(rec.decisions.sales_to_hire).toBeLessThanOrEqual(1);
  });

  it('getAllRecommendations returns 3 strategies', () => {
    const recs = getAllRecommendations(makeState());
    expect(recs).toHaveLength(3);
    expect(recs.map((r) => r.strategy)).toEqual(['cfo', 'growth', 'quality']);
  });

  it('produces deterministic results', () => {
    const state = makeState();
    const a = getRecommendation('cfo', state);
    const b = getRecommendation('cfo', state);
    expect(a).toEqual(b);
  });
});
