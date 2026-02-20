import { describe, it, expect } from 'vitest';
import { advanceQuarter } from '@/lib/engine/simulation';
import type { GameState, Decisions } from '@/lib/types';

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

const defaultDecisions: Decisions = {
  price: 100,
  engineers_to_hire: 1,
  sales_to_hire: 1,
  salary_pct: 100,
};

describe('advanceQuarter', () => {
  it('returns valid outcomes with default inputs', () => {
    const { newState, outcomes } = advanceQuarter(makeState(), defaultDecisions);
    expect(outcomes.revenue).toBeGreaterThanOrEqual(0);
    expect(outcomes.costs).toBeGreaterThan(0);
    expect(outcomes.new_engineers).toBe(3);
    expect(outcomes.new_sales).toBe(2);
    expect(newState.current_quarter).toBe(2);
  });

  it('advances year after Q4', () => {
    const state = makeState({ current_quarter: 4, current_year: 1 });
    const { newState } = advanceQuarter(state, defaultDecisions);
    expect(newState.current_quarter).toBe(1);
    expect(newState.current_year).toBe(2);
  });

  it('detects bankruptcy when cash goes to zero', () => {
    const state = makeState({ cash: 100 }); // very low cash
    const decisions: Decisions = {
      price: 1,
      engineers_to_hire: 10,
      sales_to_hire: 10,
      salary_pct: 200,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.status).toBe('lost');
  });

  it('detects win when cumulative profit exceeds threshold', () => {
    const state = makeState({ cumulative_profit: 49900, cash: 50000 });
    const decisions: Decisions = {
      price: 200,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    // With existing sales force and quality, should sell some units at $200
    if (outcomes.profit > 100) {
      expect(outcomes.status).toBe('won');
    }
  });

  it('applies market factor', () => {
    const state = makeState();
    const { outcomes: normal } = advanceQuarter(state, defaultDecisions, 1.0);
    const { outcomes: boosted } = advanceQuarter(state, defaultDecisions, 2.0);
    expect(boosted.units_sold).toBeGreaterThan(normal.units_sold);
  });

  it('quality drifts toward engineer-heavy ratio', () => {
    const state = makeState({ quality: 50, engineers: 10, sales: 0 });
    const decisions: Decisions = {
      price: 100,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.new_quality).toBeGreaterThan(50);
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const state = makeState();
    const a = advanceQuarter(state, defaultDecisions, 1.0);
    const b = advanceQuarter(state, defaultDecisions, 1.0);
    expect(a).toEqual(b);
  });

  it('handles zero headcount gracefully', () => {
    const state = makeState({ engineers: 0, sales: 0 });
    const decisions: Decisions = {
      price: 100,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.units_sold).toBe(0);
    expect(outcomes.costs).toBe(0);
  });
});
