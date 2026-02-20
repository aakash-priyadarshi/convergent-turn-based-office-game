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
    cash: 1000000,
    quality: 50,
    engineers: 4,
    sales: 2,
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
    expect(outcomes.new_engineers).toBe(5);
    expect(outcomes.new_sales).toBe(3);
    expect(newState.current_quarter).toBe(2);
  });

  it('advances year after Q4', () => {
    const state = makeState({ current_quarter: 4, current_year: 1 });
    const { newState } = advanceQuarter(state, defaultDecisions);
    expect(newState.current_quarter).toBe(1);
    expect(newState.current_year).toBe(2);
  });

  it('detects bankruptcy when cash goes to zero', () => {
    const state = makeState({ cash: 10000 }); // very low cash for $30k salaries
    const decisions: Decisions = {
      price: 1,
      engineers_to_hire: 5,
      sales_to_hire: 5,
      salary_pct: 200,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.status).toBe('lost');
  });

  it('detects win when Year 10 completes with positive cash', () => {
    const state = makeState({ current_year: 10, current_quarter: 4, cash: 500000 });
    const decisions: Decisions = {
      price: 500,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    // After Y10Q4, year becomes 11 → win if cash > 0
    expect(outcomes.status).toBe('won');
  });

  it('does not win before Year 10 completes', () => {
    const state = makeState({ current_year: 9, current_quarter: 4, cash: 5000000 });
    const decisions: Decisions = {
      price: 500,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.status).toBe('active');
  });

  it('applies market factor', () => {
    const state = makeState();
    const { outcomes: normal } = advanceQuarter(state, defaultDecisions, 1.0);
    const { outcomes: boosted } = advanceQuarter(state, defaultDecisions, 2.0);
    expect(boosted.units_sold).toBeGreaterThan(normal.units_sold);
  });

  it('quality increases by engineers * 0.5 each quarter (spec formula)', () => {
    const state = makeState({ quality: 50, engineers: 4, sales: 2 });
    const decisions: Decisions = {
      price: 100,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    // quality += 4 * 0.5 = 52
    expect(outcomes.new_quality).toBe(52);
  });

  it('quality caps at 100', () => {
    const state = makeState({ quality: 99, engineers: 10, sales: 2 });
    const decisions: Decisions = {
      price: 100,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    expect(outcomes.new_quality).toBe(100);
  });

  it('uses spec salary formula: salary_pct/100 * 30000 per person', () => {
    const state = makeState({ engineers: 4, sales: 2 });
    const decisions: Decisions = {
      price: 100,
      engineers_to_hire: 0,
      sales_to_hire: 0,
      salary_pct: 100,
    };
    const { outcomes } = advanceQuarter(state, decisions);
    // 6 people × $30,000 = $180,000
    expect(outcomes.costs).toBe(180000);
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
